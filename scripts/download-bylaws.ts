import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { knownBylawUrls } from "../lib/utils/bylaw-maps";

// Directory to save PDFs to
const PDF_DIR = path.resolve(__dirname, "../public/pdfs");

// Ensure PDF directory exists
if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
  console.log(`Created directory: ${PDF_DIR}`);
}

/**
 * Download a file from a URL to the filesystem
 *
 * @param url URL of the file to download
 * @param destPath Destination path on the filesystem
 * @returns Promise that resolves when download is complete
 */
const downloadFile = (url: string, destPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Handle file:///, http://, https:// URLs
    const protocol = https;
    if (url.startsWith("http://")) {
      // You'd use http instead of https for http URLs
      console.warn(`Warning: Downloading from non-secure URL: ${url}`);
    } else if (!url.startsWith("https://")) {
      reject(new Error(`Unsupported protocol in URL: ${url}`));
      return;
    }

    const file = fs.createWriteStream(destPath);

    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        if (response.headers.location) {
          console.log(`Following redirect: ${response.headers.location}`);
          // Close the current file stream
          file.close();
          fs.unlinkSync(destPath);

          // Recursive call to follow the redirect
          downloadFile(response.headers.location, destPath)
            .then(resolve)
            .catch(reject);
          return;
        }
        reject(new Error("Redirect with no location header"));
        return;
      }

      // Check if the request was successful
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }

      // Pipe the response to the file
      response.pipe(file);

      // Handle errors during download
      response.on("error", (err) => {
        fs.unlinkSync(destPath);
        reject(err);
      });

      // Resolve the promise when the download is complete
      file.on("finish", () => {
        file.close();
        resolve();
      });

      // Handle errors when writing to the file
      file.on("error", (err) => {
        fs.unlinkSync(destPath);
        reject(err);
      });
    });

    // Handle errors with the request
    request.on("error", (err) => {
      fs.unlinkSync(destPath);
      reject(err);
    });

    // End the request
    request.end();
  });
};

/**
 * Extract filename from URL
 *
 * @param url URL to extract filename from
 * @returns Filename
 */
const getFilenameFromUrl = (url: string): string => {
  const parts = url.split("/");
  return parts[parts.length - 1];
};

/**
 * Download all bylaws
 */
const downloadAllBylaws = async () => {
  const total = Object.keys(knownBylawUrls).length;
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`Downloading ${total} bylaw PDFs to ${PDF_DIR}`);
  console.log(
    "--------------------------------------------------------------------------------",
  );

  for (const [bylawNumber, url] of Object.entries(knownBylawUrls)) {
    const filename = getFilenameFromUrl(url);
    const destPath = path.join(PDF_DIR, filename);

    // Skip if file already exists
    if (fs.existsSync(destPath)) {
      console.log(`✓ Skipping [${bylawNumber}] ${filename} (already exists)`);
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`⬇ Downloading [${bylawNumber}] ${filename}...`);
      await downloadFile(url, destPath);
      process.stdout.write(" ✓ Done\n");
      downloaded++;
    } catch (error) {
      process.stdout.write(` ✘ Failed: ${error}\n`);
      failed++;
    }
  }

  console.log(
    "--------------------------------------------------------------------------------",
  );
  console.log(
    `Download complete: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`,
  );
};

// Run the download
downloadAllBylaws().catch(console.error);
