/**
 * Script to organize bylaw PDFs by renaming them with a consistent format
 * This helps with metadata extraction during indexing
 * 
 * Usage:
 * pnpm tsx scripts/organize-bylaws.ts <directory>
 */

import fs from 'node:fs';
import path from 'node:path';

// Get directory from command line args
const inputDir = process.argv[2] || './public/pdfs';

if (!fs.existsSync(inputDir)) {
  console.error(`Error: Directory '${inputDir}' does not exist.`);
  process.exit(1);
}

console.log(`Organizing bylaw PDFs in directory: ${inputDir}`);

// Read all PDF files in the directory
const files = fs
  .readdirSync(inputDir)
  .filter(file => file.toLowerCase().endsWith('.pdf'));

console.log(`Found ${files.length} PDF files.`);

// Function to extract bylaw number from filename
function extractBylawInfo(filename: string): { number?: string, title?: string } {
  // Initialize result
  const result: { number?: string, title?: string } = {};
  
  // Remove file extension
  const basename = path.basename(filename, '.pdf');
  
  // Pattern 1: "4747, Reserve Funds Bylaw, 2020 CONSOLIDATED" format
  const patternWithComma = /^(\d+)(?:,\s+)(.+)/;
  const commaMatch = basename.match(patternWithComma);
  if (commaMatch) {
    result.number = commaMatch[1];
    result.title = commaMatch[2];
    return result;
  }
  
  // Pattern 2: "4747 Reserve Funds Bylaw 2020 CONSOLIDATED" format
  const patternWithSpace = /^(\d+)(?:\s+)(.+)/;
  const spaceMatch = basename.match(patternWithSpace);
  if (spaceMatch) {
    result.number = spaceMatch[1];
    result.title = spaceMatch[2];
    return result;
  }
  
  // Pattern 3: Files that have the bylaw number in format "Bylaw No. 4861, 2024"
  const patternWithNo = /Bylaw No\.?\s+(\d+)(?:,|\s|$)/i;
  const noMatch = basename.match(patternWithNo);
  if (noMatch) {
    result.number = noMatch[1];
    return result;
  }
  
  return result;
}

// Function to create a consistent filename format
function createFormattedFilename(original: string, info: { number?: string, title?: string }): string {
  if (!info.number) {
    // If we couldn't extract a bylaw number, keep the original name
    return original;
  }
  
  // Clean up title if available
  let cleanTitle = '';
  if (info.title) {
    // Remove CONSOLIDATED text for cleaner titles
    cleanTitle = info.title.replace(/\s*CONSOLIDATED\s*(?:to.*)?$/i, '')
      // Remove dates at the end
      .replace(/\s*\d{4}(?:\s*$|\s*\(.*\)$)/, '')
      // Clean up commas and multiple spaces
      .replace(/\s+/g, ' ').trim();
  }
  
  // Create new filename in format "bylaw-XXXX-clean-title.pdf"
  const newName = cleanTitle 
    ? `bylaw-${info.number}-${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`
    : `bylaw-${info.number}.pdf`;
  
  return newName;
}

// Track statistics
let renamed = 0;
let unchanged = 0;
let errors = 0;

// Process each file
for (const file of files) {
  try {
    const filePath = path.join(inputDir, file);
    
    // Skip directories
    if (fs.statSync(filePath).isDirectory()) {
      continue;
    }
    
    // Extract bylaw info
    const bylawInfo = extractBylawInfo(file);
    
    // Format new filename
    const newFilename = createFormattedFilename(file, bylawInfo);
    
    // Only rename if different from original
    if (newFilename !== file) {
      const newPath = path.join(inputDir, newFilename);
      
      // Check if destination already exists
      if (fs.existsSync(newPath)) {
        console.log(`⚠️ Skipping "${file}" → "${newFilename}" (destination already exists)`);
        unchanged++;
        continue;
      }
      
      // Rename the file
      fs.renameSync(filePath, newPath);
      console.log(`✅ Renamed "${file}" → "${newFilename}"`);
      renamed++;
    } else {
      console.log(`ℹ️ Keeping "${file}" (no changes needed)`);
      unchanged++;
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error);
    errors++;
  }
}

console.log('\nSummary:');
console.log(`✅ ${renamed} files renamed`);
console.log(`ℹ️ ${unchanged} files unchanged`);
console.log(`❌ ${errors} errors encountered`);
console.log('\nNext steps:');
console.log('1. Review the renamed files to ensure accuracy');
console.log('2. Run the bylaw indexing script: pnpm tsx scripts/index-bylaws.ts ./public/pdfs');