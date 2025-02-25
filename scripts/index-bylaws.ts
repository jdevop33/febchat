/**
 * Script to index bylaw PDFs into Pinecone
 * 
 * Usage:
 * pnpm tsx scripts/index-bylaws.ts <directory>
 * 
 * Works with both Windows and Unix paths
 */

import fs from 'fs';
import path from 'path';
import { processBylawPDF } from '../lib/bylaw-processing/indexing';

// Load environment variables in development
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Get directory from command line args
const directory = process.argv[2];

if (!directory) {
  console.error('Error: Please provide a directory containing bylaw PDFs.');
  console.error('Usage: pnpm tsx scripts/index-bylaws.ts <directory>');
  process.exit(1);
}

// Normalize path for cross-platform compatibility
const normalizedDirectory = path.normalize(directory);

// Check if directory exists
if (!fs.existsSync(normalizedDirectory)) {
  console.error(`Error: Directory '${normalizedDirectory}' does not exist.`);
  console.error('Make sure you have full access to this directory and that the path is correct.');
  process.exit(1);
}

/**
 * Process all PDF files in a directory
 */
async function processBylawDirectory(dir: string) {
  try {
    console.log(`Processing bylaw directory: ${dir}`);
    
    // Verify Pinecone credentials are available
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_ENVIRONMENT) {
      console.error('\nError: Pinecone API key or environment not found in environment variables.');
      console.error('Make sure you have set up your .env.local file or Vercel environment variables.');
      console.error('See SETUP-INSTRUCTIONS.md for details.\n');
      process.exit(1);
    }
    
    // Verify OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error('\nError: OpenAI API key not found in environment variables.');
      console.error('Make sure you have set up your .env.local file or Vercel environment variables.');
      console.error('See SETUP-INSTRUCTIONS.md for details.\n');
      process.exit(1);
    }
    
    // Get list of PDF files
    const files = fs.readdirSync(dir)
      .filter(file => file.toLowerCase().endsWith('.pdf'))
      .map(file => path.join(dir, file));
    
    console.log(`Found ${files.length} PDF files to process.`);
    
    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Processing file ${i+1}/${files.length}: ${path.basename(file)}`);
      
      try {
        // Extract bylaw number from filename if possible
        const filename = path.basename(file, '.pdf');
        const bylawNumberMatch = filename.match(/bylaw[-_]?(\d+)/i);
        
        // Process the file
        const chunkIds = await processBylawPDF(file, {
          bylawNumber: bylawNumberMatch ? bylawNumberMatch[1] : undefined,
        });
        
        console.log(`Successfully processed file with ${chunkIds.length} chunks.`);
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
      }
    }
    
    console.log('Directory processing complete.');
  } catch (error) {
    console.error('Error processing directory:', error);
  }
}

// Main execution
(async () => {
  try {
    console.log('Starting bylaw indexing process...');
    console.log(`Using directory: ${normalizedDirectory}`);
    
    await processBylawDirectory(normalizedDirectory);
    
    console.log('\n✅ Bylaw indexing complete!');
    console.log('Your bylaws have been successfully processed and indexed in Pinecone.');
    console.log('You can now start the application with: pnpm dev');
  } catch (error) {
    console.error('\n❌ Error during bylaw indexing:', error);
    console.error('Check the error message above and see SETUP-INSTRUCTIONS.md for troubleshooting.');
    process.exit(1);
  }
})();