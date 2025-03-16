/**
 * Script to index bylaw PDFs into Pinecone
 *
 * Usage:
 * pnpm tsx scripts/index-bylaws.ts <directory or file>
 *
 * Works with both Windows and Unix paths
 */

import fs from 'node:fs';
import path from 'node:path';
import { processBylawPDF } from '../lib/bylaw-processing/indexing';

// Load environment variables in development
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Get path from command line args
const inputPath = process.argv[2];

if (!inputPath) {
  console.error('Error: Please provide a directory or file path.');
  console.error('Usage: pnpm tsx scripts/index-bylaws.ts <directory or file>');
  process.exit(1);
}

// Normalize path for cross-platform compatibility
const normalizedPath = path.normalize(inputPath);

// Check if path exists
if (!fs.existsSync(normalizedPath)) {
  console.error(`Error: Path '${normalizedPath}' does not exist.`);
  console.error(
    'Make sure you have full access to this path and that it is correct.',
  );
  process.exit(1);
}

/**
 * Process a single PDF file
 */
async function processBylawFile(filePath: string) {
  try {
    console.log(`Processing bylaw file: ${filePath}`);

    // Verify Pinecone credentials are available
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
      console.error(
        '\nError: Pinecone API key or index name not found in environment variables.',
      );
      console.error(
        'Make sure you have set up your .env.local file or Vercel environment variables.',
      );
      console.error('See SETUP-INSTRUCTIONS.md for details.\n');
      process.exit(1);
    }

    // Verify OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error(
        '\nError: OpenAI API key not found in environment variables.',
      );
      console.error(
        'Make sure you have set up your .env.local file or Vercel environment variables.',
      );
      console.error('See SETUP-INSTRUCTIONS.md for details.\n');
      process.exit(1);
    }

    // Print the API key and Pinecone index for debugging (first 10 characters)
    console.log(
      `Using API key: ${process.env.OPENAI_API_KEY.substring(0, 10)}...`,
    );
    console.log(
      `Using Pinecone index: ${process.env.PINECONE_INDEX || 'oak-bay-bylaws-v2'}`,
    );
    console.log(
      `Using embedding model: ${process.env.EMBEDDING_PROVIDER === 'openai' ? 'OpenAI text-embedding-3-small' : 'llama-text-embed-v2'}`
    );

    // Extract bylaw number from filename if possible
    const filename = path.basename(filePath, '.pdf');
    
    // More comprehensive bylaw number extraction - use multiple patterns
    let bylawNumber: string | undefined;
    
    // Pattern 1: Explicit bylaw number pattern like "bylaw-4620"
    const explicitBylawMatch = filename.match(/bylaw[-_\s]?(\d+)/i);
    if (explicitBylawMatch) {
      bylawNumber = explicitBylawMatch[1];
    }
    
    // Pattern 2: Starting with number pattern like "4620 - Something"
    if (!bylawNumber) {
      const startingNumberMatch = filename.match(/^(\d+)(?:[,\s_-]|$)/i);
      if (startingNumberMatch) {
        bylawNumber = startingNumberMatch[1];
      }
    }
    
    // Pattern 3: Number followed by comma or parentheses like "No. 4620," or "No. 4620 ("
    if (!bylawNumber) {
      const commaNumberMatch = filename.match(/No\.?\s+(\d+)[,\(\s]/i);
      if (commaNumberMatch) {
        bylawNumber = commaNumberMatch[1];
      }
    }
    
    console.log(`Processing file: ${filename}`);
    console.log(`Extracted bylaw number from filename: ${bylawNumber || 'None'}`);

    // Process the file with extracted metadata
    const chunkIds = await processBylawPDF(filePath, {
      bylawNumber: bylawNumber,
      originalFilename: filename // Store the original filename for reference
    });

    console.log(`Successfully processed file with ${chunkIds.length} chunks.`);
  } catch (error) {
    console.error(`Error processing file:`, error);
    throw error;
  }
}

/**
 * Process all PDF files in a directory
 */
async function processBylawDirectory(dir: string) {
  try {
    console.log(`Processing bylaw directory: ${dir}`);

    // Verify Pinecone credentials are available
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
      console.error(
        '\nError: Pinecone API key or environment not found in environment variables.',
      );
      console.error(
        'Make sure you have set up your .env.local file or Vercel environment variables.',
      );
      console.error('See SETUP-INSTRUCTIONS.md for details.\n');
      process.exit(1);
    }

    // Verify OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error(
        '\nError: OpenAI API key not found in environment variables.',
      );
      console.error(
        'Make sure you have set up your .env.local file or Vercel environment variables.',
      );
      console.error('See SETUP-INSTRUCTIONS.md for details.\n');
      process.exit(1);
    }

    // Print the API key and Pinecone index for debugging (first 10 characters)
    console.log(
      `Using API key: ${process.env.OPENAI_API_KEY.substring(0, 10)}...`,
    );
    console.log(
      `Using Pinecone index: ${process.env.PINECONE_INDEX || 'oak-bay-bylaws-v2'}`,
    );
    console.log(
      `Using embedding model: ${process.env.EMBEDDING_PROVIDER === 'openai' ? 'OpenAI text-embedding-3-small' : 'llama-text-embed-v2'}`
    );

    // Get list of PDF files
    const files = fs
      .readdirSync(dir)
      .filter((file) => file.toLowerCase().endsWith('.pdf'))
      .map((file) => path.join(dir, file));

    console.log(`Found ${files.length} PDF files to process.`);

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(
        `Processing file ${i + 1}/${files.length}: ${path.basename(file)}`,
      );

      try {
        await processBylawFile(file);
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
      }
    }

    console.log('Directory processing complete.');
  } catch (error) {
    console.error('Error processing directory:', error);
    throw error;
  }
}

// Main execution
(async () => {
  try {
    console.log('Starting bylaw indexing process...');
    console.log(`Using path: ${normalizedPath}`);

    const stats = fs.statSync(normalizedPath);

    if (stats.isDirectory()) {
      await processBylawDirectory(normalizedPath);
    } else if (
      stats.isFile() &&
      normalizedPath.toLowerCase().endsWith('.pdf')
    ) {
      await processBylawFile(normalizedPath);
    } else {
      console.error('Error: Path must be a directory or a PDF file.');
      process.exit(1);
    }

    console.log('\n✅ Bylaw indexing complete!');
    console.log(
      'Your bylaws have been successfully processed and indexed in Pinecone.',
    );
    console.log('You can now start the application with: pnpm dev');
  } catch (error) {
    console.error('\n❌ Error during bylaw indexing:', error);
    console.error(
      'Check the error message above and see SETUP-INSTRUCTIONS.md for troubleshooting.',
    );
    process.exit(1);
  }
})();
