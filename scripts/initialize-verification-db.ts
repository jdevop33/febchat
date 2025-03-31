/**
 * Initialize Verification Database
 *
 * This script initializes the verification database by scanning
 * the PDF directory and creating bylaw entries.
 *
 * Usage:
 * pnpm tsx scripts/initialize-verification-db.ts
 *
 * Updated: Migrated from Prisma to Drizzle ORM
 */

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import pdfParse from "pdf-parse";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Import Drizzle database client
import db from "@/lib/db";
import { bylaw, bylawSection } from "@/lib/db/schema";
import { count, eq } from "drizzle-orm";

async function main() {
  try {
    console.log("Initializing verification database...");

    // Initialize database manually
    console.log("Manual database initialization starting...");

    // Get PDF directory
    const pdfDir = path.join(process.cwd(), "public", "pdfs");

    // Process a specific bylaw in more detail for testing
    await processSpecificBylaw("3210", pdfDir);

    console.log("Verification database initialized successfully");

    // Optional: Print verification database stats
    const [bylawCountResult] = await db.select({ count: count() }).from(bylaw);
    const [sectionCountResult] = await db
      .select({ count: count() })
      .from(bylawSection);

    console.log("Database stats:");
    console.log(`- ${bylawCountResult.count} bylaws`);
    console.log(`- ${sectionCountResult.count} bylaw sections`);
  } catch (error) {
    console.error("Initialization failed:", error);
    process.exit(1);
  }
}

/**
 * Process a specific bylaw in detail, extracting sections
 */
async function processSpecificBylaw(bylawNumber: string, pdfDir: string) {
  try {
    console.log(`Processing bylaw ${bylawNumber} in detail...`);

    // Find the bylaw file
    const files = fs.readdirSync(pdfDir);
    const bylawFile = files.find((file) => file.includes(bylawNumber));

    if (!bylawFile) {
      console.log(`Bylaw ${bylawNumber} not found in PDF directory`);
      return;
    }

    console.log(`Found bylaw file: ${bylawFile}`);

    // Extract consolidated status
    const isConsolidated = /consolidated|consolidation/i.test(bylawFile);

    // Extract title
    let title = bylawFile.replace(/\.pdf$/i, "");
    title = title.replace(/^(\d{4})[-,\s]+/, ""); // Remove bylaw number prefix

    // Load PDF content
    const filePath = path.join(pdfDir, bylawFile);
    const pdfBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(pdfBuffer);
    const pdfText = pdfData.text;

    // Check if bylaw exists
    const existingBylaws = await db
      .select()
      .from(bylaw)
      .where(eq(bylaw.bylawNumber, bylawNumber));

    if (existingBylaws.length) {
      // Update existing bylaw
      await db
        .update(bylaw)
        .set({
          title,
          isConsolidated,
          pdfPath: `/pdfs/${bylawFile}`,
          officialUrl: `https://oakbay.civicweb.net/document/bylaw/${bylawNumber}`,
          lastVerified: new Date(),
        })
        .where(eq(bylaw.bylawNumber, bylawNumber));
    } else {
      // Create new bylaw
      await db.insert(bylaw).values({
        bylawNumber,
        title,
        isConsolidated,
        pdfPath: `/pdfs/${bylawFile}`,
        officialUrl: `https://oakbay.civicweb.net/document/bylaw/${bylawNumber}`,
        lastVerified: new Date(),
      });
    }

    // Extract sections using regex patterns
    const sections: {
      sectionNumber: string;
      title?: string;
      content: string;
    }[] = [];

    // Extract general noise prohibition (Section 3)
    const section3Match = pdfText.match(
      /3\s+\(1\)[^\n]*(?:\n[^\n]+)*?(?=\(2\)|\n\s*4\s+)/s,
    );
    if (section3Match) {
      sections.push({
        sectionNumber: "3",
        title: "General Noise Prohibition",
        content: section3Match[0].trim(),
      });
    }

    // Extract specific prohibitions (Section 4)
    const section4Match = pdfText.match(
      /4\s+No person shall[^\n]*(?:\n[^\n]+)*?(?=\n\s*5\s+The provisions)/s,
    );
    if (section4Match) {
      sections.push({
        sectionNumber: "4",
        title: "Specific Prohibitions",
        content: section4Match[0].trim(),
      });
    }

    // Extract exemptions (Section 5)
    const section5Match = pdfText.match(
      /5\s+The provisions of this Bylaw shall not apply[^6]+/s,
    );
    if (section5Match) {
      sections.push({
        sectionNumber: "5",
        title: "Exemptions",
        content: section5Match[0].trim(),
      });
    }

    // Find construction noise provisions
    // Match section 4(7)
    const constructionMatch = pdfText.match(
      /\(7\)[^\(]*?(?:construction|demolition|erection)[^(]*/i,
    );
    if (constructionMatch) {
      sections.push({
        sectionNumber: "4(7)",
        title: "Construction Noise",
        content: constructionMatch[0].trim(),
      });
    }

    // Find leaf blower provisions
    // Match leaf blower definition
    const leafBlowerDefMatch = pdfText.match(/"LEAF BLOWER"[^;]*;/i);
    if (leafBlowerDefMatch) {
      sections.push({
        sectionNumber: "2(b)",
        title: "Leaf Blower Definition",
        content: leafBlowerDefMatch[0].trim(),
      });
    }

    // Match leaf blower restrictions
    const leafBlowerRegMatch = pdfText.match(
      /\([0-9]\)[^\(]*?leaf blower[^(]*/i,
    );
    if (leafBlowerRegMatch) {
      sections.push({
        sectionNumber: "4(5)",
        title: "Leaf Blower Restrictions",
        content: leafBlowerRegMatch[0].trim(),
      });
    }

    // Delete any existing sections
    await db
      .delete(bylawSection)
      .where(eq(bylawSection.bylawNumber, bylawNumber));

    // Create new sections
    for (const section of sections) {
      await db.insert(bylawSection).values({
        id: crypto.randomUUID(), // Generate UUID
        bylawNumber,
        sectionNumber: section.sectionNumber,
        title: section.title,
        content: section.content,
      });
    }

    console.log(
      `Processed ${sections.length} sections for bylaw ${bylawNumber}`,
    );
  } catch (error) {
    console.error(`Error processing bylaw ${bylawNumber}:`, error);
  }
}

// Run initialization
main();
