/**
 * Extract Bylaw Content
 *
 * This script extracts and prints specific content from a bylaw PDF.
 *
 * Usage:
 * pnpm tsx scripts/extract-bylaw-content.ts <bylaw-number>
 */

import fs from "node:fs";
import path from "node:path";
import pdfParse from "pdf-parse";

// Bylaw number from command line
const bylawNumber = process.argv[2] || "3210";

async function extractBylawContent() {
  try {
    console.log(`Extracting content from Bylaw No. ${bylawNumber}`);

    // Find the PDF file
    const pdfDir = path.resolve(process.cwd(), "public", "pdfs");
    const files = fs.readdirSync(pdfDir);

    // Find the file that matches the bylaw number
    const bylawFile = files.find((file) => file.includes(bylawNumber));

    if (!bylawFile) {
      throw new Error(`No PDF file found for Bylaw No. ${bylawNumber}`);
    }

    console.log(`Found PDF file: ${bylawFile}`);
    const filePath = path.join(pdfDir, bylawFile);

    // Extract text from PDF
    console.log("Extracting text from PDF...");
    const pdfBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(pdfBuffer);
    const text = pdfData.text;

    console.log("\n----------------------------------------");
    console.log(`BYLAW ${bylawNumber} CONTENT:`);
    console.log("----------------------------------------\n");
    console.log(text.substring(0, 1000));
    console.log("\n...\n");

    // Look for important sections

    // General noise prohibitions (section 3)
    console.log("\n----------------------------------------");
    console.log("GENERAL NOISE PROHIBITIONS (SECTION 3):");
    console.log("----------------------------------------\n");

    const section3Match = text.match(
      /3\s+\([1-9]\)[^\n]*(?:\n[^\n]+)*?(?=\([2-9]\)|\n\s*4\s+)/s,
    );
    if (section3Match) {
      console.log(section3Match[0].trim());
    } else {
      console.log("Section 3 not found.");
    }

    // Specific prohibited noises (Section 4)
    console.log("\n----------------------------------------");
    console.log("SPECIFIC NOISE PROHIBITIONS (SECTION 4):");
    console.log("----------------------------------------\n");

    const section4Match = text.match(
      /4\s+No person shall[^\n]*(?:\n[^\n]+)*?(?=\n\s*5\s+The provisions)/s,
    );
    if (section4Match) {
      console.log(section4Match[0].trim());
    } else {
      console.log(
        "Section 4 not found - this contains the construction noise regulations.",
      );

      // Try to find section 4 manually by looking for key elements
      if (
        text.includes("No person shall") &&
        text.includes(
          "operate, use or permit to be operated or used, the following:",
        )
      ) {
        // Extract section 4 and its subsections
        const section4Lines = [];
        const lines = text.split("\n");
        let inSection4 = false;

        for (const line of lines) {
          if (line.trim().startsWith("4") && line.includes("No person shall")) {
            inSection4 = true;
          }

          if (inSection4) {
            section4Lines.push(line);
          }

          if (
            inSection4 &&
            line.trim().startsWith("5") &&
            line.includes("provisions of this Bylaw shall not apply")
          ) {
            inSection4 = false;
            break;
          }
        }

        if (section4Lines.length > 0) {
          console.log(section4Lines.join("\n"));
        }
      }

      // Try an alternative approach by looking for specific subsections
      console.log("\nConstruction-related regulations:");
      const constructionRegex =
        /\([0-9]\)[^\(]*?(?:construction|demolition|erection)[^(]*/gi;
      let constructionMatch: RegExpExecArray | null;
      let i = 1;
      let constructionResult: RegExpExecArray | null =
        constructionRegex.exec(text);
      while (constructionResult !== null) {
        constructionMatch = constructionResult;
        console.log(`Regulation ${i}:\n${constructionMatch[0].trim()}\n`);
        i++;
        constructionResult = constructionRegex.exec(text);
      }

      // Look specifically for hours restrictions
      console.log("\nHours restrictions:");
      const hoursRegex =
        /(?:between|before|after)[^(]*?(?:\d+:\d+|\d+) (?:a\.m\.|p\.m\.|AM|PM)[^(]*?(?:Sunday|Saturday|holiday)/gi;
      let hoursMatch: RegExpExecArray | null;
      i = 1;
      let hoursResult: RegExpExecArray | null = hoursRegex.exec(text);
      while (hoursResult !== null) {
        hoursMatch = hoursResult;
        console.log(`Restriction ${i}:\n${hoursMatch[0].trim()}\n`);
        i++;
        hoursResult = hoursRegex.exec(text);
      }
    }

    // Leaf blowers
    console.log("\n----------------------------------------");
    console.log("LEAF BLOWER SECTION:");
    console.log("----------------------------------------\n");

    // Find all mentions of leaf blowers
    const leafSections = [];

    // Find definition
    const leafDefinition = text.match(/"LEAF BLOWER"[^;]*;/i);
    if (leafDefinition) {
      leafSections.push(leafDefinition[0].trim());
    }

    // Find regulations
    const leafRegex = /\([0-9]\)[^\(]*?leaf blower[^(]*/gi;
    let leafMatch: RegExpExecArray | null;
    let leafResult: RegExpExecArray | null = leafRegex.exec(text);
    while (leafResult !== null) {
      leafMatch = leafResult;
      leafSections.push(leafMatch[0].trim());
      leafResult = leafRegex.exec(text);
    }

    if (leafSections.length > 0) {
      leafSections.forEach((section, i) => {
        console.log(`Section ${i + 1}:\n${section}\n`);
      });
    } else {
      console.log("No leaf blower section found.");
    }

    // Exemptions
    console.log("\n----------------------------------------");
    console.log("EXEMPTIONS SECTION:");
    console.log("----------------------------------------\n");

    // Find exemptions section - try to match section 5 specifically
    const exemptionSections = [];

    // Try to extract the entire exemptions section (specific to this bylaw structure)
    const section5Match = text.match(
      /5\s+The provisions of this Bylaw shall not apply[^6]+/s,
    );
    if (section5Match) {
      exemptionSections.push(section5Match[0].trim());
    } else {
      // Fallback to looking for individual exemptions
      const exemptionRegex =
        /[^.]*?(?:provisions of this Bylaw shall not apply|exempted from)[^.]*?\.(?:[^\(]*?\.){0,5}/gis;
      let match: RegExpExecArray | null;
      let exemptionResult: RegExpExecArray | null = exemptionRegex.exec(text);
      while (exemptionResult !== null) {
        match = exemptionResult;
        exemptionSections.push(match[0].trim());
        exemptionResult = exemptionRegex.exec(text);
      }
    }

    if (exemptionSections.length > 0) {
      exemptionSections.forEach((section, i) => {
        console.log(`Section ${i + 1}:\n${section}\n`);
      });
    } else {
      console.log("No exemption section found.");
    }

    console.log("\n----------------------------------------");
  } catch (error) {
    console.error("Error extracting bylaw content:", error);
  }
}

// Run extraction
extractBylawContent();
