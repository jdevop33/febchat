/**
 * Bylaw Citation Validation Script
 *
 * This script performs a verification of all bylaws in the system against their actual PDF content.
 * It checks for inaccuracies in citations, section numbers, and content.
 *
 * Usage:
 * pnpm tsx scripts/validate-bylaw-citations.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import pdfParse from 'pdf-parse';
import db from '@/lib/db';
import { bylaw, bylawSection } from '@/lib/db/schema';
import { mockBylawData } from '../lib/bylaw-search';
import * as VerificationDB from '../lib/vector/verification-database';

/**
 * Extract core text from a bylaw PDF
 */
async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    return pdfData.text;
  } catch (error) {
    console.error(`Error extracting text from ${filePath}:`, error);
    return '';
  }
}

/**
 * Check if text content is present in the PDF
 */
function checkContentInPDF(pdfText: string, contentToCheck: string): boolean {
  // Normalize both texts for comparison (remove extra spaces, line breaks, etc.)
  const normalizedPDF = pdfText.replace(/\s+/g, ' ').toLowerCase();
  const normalizedContent = contentToCheck.replace(/\s+/g, ' ').toLowerCase();

  return normalizedPDF.includes(normalizedContent);
}

/**
 * Validate bylaw content against PDF
 */
async function validateBylawCitation(
  bylawNumber: string,
  section: string,
  content: string,
): Promise<boolean> {
  // Get filename mapping
  const filename = VerificationDB.getFilenameForBylaw(bylawNumber);
  if (!filename) {
    console.warn(`⚠️ No PDF filename mapping found for bylaw ${bylawNumber}`);
    return false;
  }

  const pdfPath = path.join(process.cwd(), 'public', 'pdfs', filename);
  if (!fs.existsSync(pdfPath)) {
    console.warn(
      `⚠️ PDF file not found for bylaw ${bylawNumber} at path ${pdfPath}`,
    );
    return false;
  }

  // Extract PDF text
  const pdfText = await extractTextFromPDF(pdfPath);
  if (!pdfText) {
    console.warn(`⚠️ Failed to extract text from PDF for bylaw ${bylawNumber}`);
    return false;
  }

  // Check if content is in PDF
  const isValid = checkContentInPDF(pdfText, content);

  // Check for section reference
  const sectionPattern = new RegExp(
    `\\b${section.replace(/[()]/g, '\\$&')}\\b`,
    'i',
  );
  const hasSectionReference = sectionPattern.test(pdfText);

  return isValid && hasSectionReference;
}

/**
 * Validate all mock bylaw data
 */
async function validateMockBylawData() {
  console.log('🔍 Validating mock bylaw data...');

  for (const [index, item] of mockBylawData.entries()) {
    const bylawNumber = item.metadata.bylawNumber as string;
    const section = item.metadata.section as string;
    const content = item.text;

    // Only validate items with sufficient data
    if (bylawNumber && section && content) {
      console.log(
        `\nChecking [${index + 1}/${mockBylawData.length}] Bylaw ${bylawNumber}, Section ${section}`,
      );
      const isValid = await validateBylawCitation(
        bylawNumber,
        section,
        content,
      );

      if (isValid) {
        console.log(`✅ Valid: Bylaw ${bylawNumber}, Section ${section}`);
      } else {
        console.error(`❌ INVALID: Bylaw ${bylawNumber}, Section ${section}`);
        console.error(`Content: "${content.substring(0, 100)}..."`);
      }
    }
  }
}

/**
 * Validate database bylaw data
 */
async function validateDatabaseBylawData() {
  console.log('\n🔍 Validating database bylaw data...');

  // Get all bylaw sections from database
  const sections = await db
    .select()
    .from(bylawSection)
    .catch((err) => {
      console.error('Error querying database:', err);
      return null;
    });

  // Get related bylaw data
  const bylawData =
    sections && sections.length > 0 ? await db.select().from(bylaw) : [];

  if (!sections || sections.length === 0) {
    console.log('No sections found in database to validate');
    return;
  }

  console.log(`Found ${sections.length} sections in database`);

  for (const [index, section] of sections.entries()) {
    const bylawNumber = section.bylawNumber;
    const sectionNumber = section.sectionNumber;
    const content = section.content;

    console.log(
      `\nChecking [${index + 1}/${sections.length}] Bylaw ${bylawNumber}, Section ${sectionNumber}`,
    );
    const isValid = await validateBylawCitation(
      bylawNumber,
      sectionNumber,
      content,
    );

    if (isValid) {
      console.log(`✅ Valid: Bylaw ${bylawNumber}, Section ${sectionNumber}`);
    } else {
      console.error(
        `❌ INVALID: Bylaw ${bylawNumber}, Section ${sectionNumber}`,
      );
      console.error(`Content: "${content.substring(0, 100)}..."`);
    }
  }
}

/**
 * Main validation function
 */
async function main() {
  try {
    console.log('Starting bylaw citation validation');

    // Validate mock data
    await validateMockBylawData();

    // Validate database data
    await validateDatabaseBylawData();

    console.log('\n✅ Validation complete');
  } catch (error) {
    console.error('Error during validation:', error);
  } finally {
    // No need for disconnection with Drizzle
  }
}

// Run the validation
main();
