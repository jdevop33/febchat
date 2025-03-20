/**
 * PDF Upload Script for Pinecone
 *
 * This script processes PDF files from the specified directory
 * and uploads them to the Pinecone vector database using the llama-text-embed-v2 model.
 *
 * Usage:
 * pnpm tsx scripts/upload-pdfs-to-pinecone.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// PDF directory
const PDF_DIRECTORY = path.resolve(process.cwd(), 'public', 'pdfs');

// Chunk configuration
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

// Metadata extraction from filename
function extractBylawInfo(filename: string): {
  number?: string;
  title?: string;
} {
  const result: { number?: string; title?: string } = {};

  // Remove file extension
  const basename = path.basename(filename, '.pdf');

  // Pattern 1: "bylaw-XXXX-title.pdf" format (our organized format)
  const organizedPattern = /^bylaw-(\d+)(?:-(.+))?$/i;
  const organizedMatch = basename.match(organizedPattern);

  if (organizedMatch) {
    result.number = organizedMatch[1];
    result.title = organizedMatch[2]?.replace(/-/g, ' ');
    return result;
  }

  // Pattern 2: "4747, Reserve Funds Bylaw, 2020 CONSOLIDATED" format
  const patternWithComma = /^(\d+)(?:,\s+)(.+)/;
  const commaMatch = basename.match(patternWithComma);

  if (commaMatch) {
    result.number = commaMatch[1];
    result.title = commaMatch[2];
    return result;
  }

  // Pattern 3: "4747 Reserve Funds Bylaw 2020 CONSOLIDATED" format
  const patternWithSpace = /^(\d+)(?:\s+)(.+)/;
  const spaceMatch = basename.match(patternWithSpace);

  if (spaceMatch) {
    result.number = spaceMatch[1];
    result.title = spaceMatch[2];
    return result;
  }

  // Pattern 4: Files that have the bylaw number in format "Bylaw No. 4861, 2024"
  const patternWithNo = /Bylaw No\.?\s+(\d+)(?:,|\s|$)/i;
  const noMatch = basename.match(patternWithNo);

  if (noMatch) {
    result.number = noMatch[1];
    return result;
  }

  return result;
}

// Process a single PDF file
async function processPDF(filePath: string): Promise<{
  chunks: any[];
  metadata: any;
}> {
  console.log(`Processing ${path.basename(filePath)}...`);

  // Extract metadata from filename
  const fileInfo = extractBylawInfo(path.basename(filePath));

  // Load PDF
  const loader = new PDFLoader(filePath, {
    splitPages: false,
  });

  const docs = await loader.load();

  // Get text content
  const pdfText = docs.map((doc) => doc.pageContent).join('\n');

  // Split into chunks
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });

  const chunks = await textSplitter.createDocuments([pdfText]);

  // Basic metadata from the file
  const stats = fs.statSync(filePath);
  const metadata = {
    bylawNumber: fileInfo.number,
    title: fileInfo.title || path.basename(filePath, '.pdf'),
    filename: path.basename(filePath),
    fileSize: stats.size,
    lastModified: stats.mtime.toISOString(),
    source: 'oak-bay-bylaws',
  };

  return {
    chunks,
    metadata,
  };
}

// Generate embeddings for text chunks
async function generateEmbeddings(
  chunks: any[],
  metadata: any,
): Promise<
  {
    id: string;
    values: number[];
    metadata: any;
  }[]
> {
  // Initialize OpenAI embeddings
  const embeddings = new OpenAIEmbeddings({
    modelName: 'text-embedding-3-small',
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  // Generate embeddings for all chunks
  const texts = chunks.map((chunk) => chunk.pageContent);
  console.log(`Generating embeddings for ${texts.length} chunks...`);

  const embeddingsResult = await embeddings.embedDocuments(texts);

  // Create vector records
  return chunks.map((chunk, i) => {
    const chunkMetadata = {
      ...metadata,
      text: chunk.pageContent,
      chunk: i,
      // Include any page info if available
      page: chunk.metadata?.page,
    };

    return {
      id: `bylaw-${metadata.bylawNumber || 'unknown'}-${i}`,
      values: embeddingsResult[i],
      metadata: chunkMetadata,
    };
  });
}

// Batch upsert to Pinecone
async function upsertToPinecone(
  vectors: {
    id: string;
    values: number[];
    metadata: any;
  }[],
): Promise<void> {
  // Initialize Pinecone client
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || '',
  });

  const indexName = process.env.PINECONE_INDEX || 'oak-bay-bylaws-v2';
  const index = pinecone.index(indexName);

  console.log(
    `Upserting ${vectors.length} vectors to Pinecone index '${indexName}'...`,
  );

  // Batch upserts to avoid API limits
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await index.upsert(batch);
    console.log(
      `Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`,
    );
  }
}

// Main function
async function main() {
  try {
    // Check for required environment variables
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY environment variable is required');
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    // Get list of PDF files
    const files = fs
      .readdirSync(PDF_DIRECTORY)
      .filter((file) => file.toLowerCase().endsWith('.pdf'))
      .map((file) => path.join(PDF_DIRECTORY, file));

    console.log(`Found ${files.length} PDF files in ${PDF_DIRECTORY}`);

    // Process each file
    for (const file of files) {
      try {
        // Process PDF file
        const { chunks, metadata } = await processPDF(file);

        // Generate embeddings
        const vectors = await generateEmbeddings(chunks, metadata);

        // Upsert to Pinecone
        await upsertToPinecone(vectors);

        console.log(`✅ Successfully processed ${path.basename(file)}`);
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error);
      }
    }

    console.log('✅ All PDFs have been processed and uploaded to Pinecone');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
main();
