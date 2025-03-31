#!/usr/bin/env ts-node
import { exec } from "node:child_process";
import util from "node:util";
import { Command } from "commander";

// Convert exec to Promise-based
const execAsync = util.promisify(exec);

// Create CLI program
const program = new Command();

program
  .name("bylaw-manager")
  .description("Manage Oak Bay bylaws for FEBCHAT")
  .version("1.0.0");

// Command to run the full pipeline
program
  .command("pipeline")
  .description("Run the full bylaw management pipeline")
  .action(async () => {
    try {
      console.log(
        "╔══════════════════════════════════════════════════════════╗",
      );
      console.log(
        "║                FEBCHAT BYLAW MANAGER                     ║",
      );
      console.log(
        "║            Full Pipeline Processing                      ║",
      );
      console.log(
        "╚══════════════════════════════════════════════════════════╝",
      );

      // 1. Scrape bylaw data
      console.log("\n📋 Step 1: Scraping bylaw data from Oak Bay website...");
      await execAsync("ts-node scripts/scrape-bylaw-urls.ts");

      // 2. Download PDFs
      console.log("\n📥 Step 2: Downloading bylaw PDFs...");
      await execAsync("ts-node scripts/download-bylaws.ts");

      // 3. Upload to Vercel Blob (in production)
      console.log("\n☁️  Step 3: Uploading PDFs to Vercel Blob Storage...");
      if (process.env.NODE_ENV === "production") {
        await execAsync(
          "ts-node -e \"import { uploadAllPdfs } from './lib/storage/vercel-blob'; uploadAllPdfs();\"",
        );
      } else {
        console.log("   Skipping upload (not in production environment)");
      }

      console.log("\n✅ Pipeline completed successfully!");
    } catch (error) {
      console.error("\n❌ Error executing pipeline:", error);
      process.exit(1);
    }
  });

// Command to scrape bylaw data
program
  .command("scrape")
  .description("Scrape bylaw data from Oak Bay website")
  .action(async () => {
    try {
      await execAsync("ts-node scripts/scrape-bylaw-urls.ts");
      console.log("✅ Scraping completed successfully!");
    } catch (error) {
      console.error("❌ Error scraping bylaw data:", error);
      process.exit(1);
    }
  });

// Command to download PDFs
program
  .command("download")
  .description("Download bylaw PDFs")
  .action(async () => {
    try {
      await execAsync("ts-node scripts/download-bylaws.ts");
      console.log("✅ Download completed successfully!");
    } catch (error) {
      console.error("❌ Error downloading bylaws:", error);
      process.exit(1);
    }
  });

// Command to upload PDFs to Vercel Blob Storage
program
  .command("upload")
  .description("Upload bylaw PDFs to Vercel Blob Storage")
  .action(async () => {
    try {
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "⚠️ Not in production environment. Set NODE_ENV=production to enable upload.",
        );
        console.log("   To force upload, use --force option.");
        return;
      }

      await execAsync(
        "ts-node -e \"import { uploadAllPdfs } from './lib/storage/vercel-blob'; uploadAllPdfs();\"",
      );
      console.log("✅ Upload completed successfully!");
    } catch (error) {
      console.error("❌ Error uploading PDFs:", error);
      process.exit(1);
    }
  });

// Execute the program
program.parse(process.argv);
