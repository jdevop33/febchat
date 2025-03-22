/**
 * Pinecone Namespace Upload Script
 *
 * This script uploads PDF vectors to a specific namespace in the Pinecone index.
 * Using namespaces allows better organization of vectors and more efficient queries.
 *
 * Usage:
 * pnpm tsx scripts/pinecone-namespace-upload.ts <namespace> [pdf-file]
 */

import fs from 'node:fs';
import path from 'node:path';
import { Pinecone } from '@pinecone-database/pinecone';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Constants
const PDF_DIRECTORY = path.resolve(process.cwd(), 'public', 'pdfs');
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

// Parse command line arguments
const namespace = process.argv[2] || 'bylaws';
const specificPdf = process.argv[3];

async function main() {
  try {
    // Validate environment
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY is required');
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required');
    }

    // Get Pinecone client
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    // Get index
    const indexName = process.env.PINECONE_INDEX || 'oak-bay-bylaws-v2';
    console.log(
      `Connecting to Pinecone index '${indexName}', namespace '${namespace}'...`,
    );

    const index = pinecone.index(indexName);

    // Get namespace
    const namespaceClient = index.namespace(namespace);

    // Get list of PDFs to process
    let files: string[] = [];

    if (specificPdf) {
      // Process a specific PDF file
      const pdfPath = path.resolve(specificPdf);
      if (fs.existsSync(pdfPath) && pdfPath.toLowerCase().endsWith('.pdf')) {
        files = [pdfPath];
      } else {
        throw new Error(`PDF file not found: ${specificPdf}`);
      }
    } else {
      // Process all PDFs in the directory
      files = fs
        .readdirSync(PDF_DIRECTORY)
        .filter((file) => file.toLowerCase().endsWith('.pdf'))
        .map((file) => path.join(PDF_DIRECTORY, file));
    }

    console.log(
      `Found ${files.length} PDF files to process for namespace '${namespace}'`,
    );

    // Initialize embeddings model
    const embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small',
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    // Process each file
    for (const file of files) {
      try {
        const filename = path.basename(file);
        console.log(`Processing ${filename}...`);

        // Extract metadata from filename
        const bylawNumber = extractBylawNumber(filename);

        // Load PDF
        const loader = new PDFLoader(file, { splitPages: false });
        const docs = await loader.load();
        const pdfText = docs.map((doc) => doc.pageContent).join('\n');

        // Split into chunks
        const textSplitter = new RecursiveCharacterTextSplitter({
          chunkSize: CHUNK_SIZE,
          chunkOverlap: CHUNK_OVERLAP,
        });

        const chunks = await textSplitter.createDocuments([pdfText]);
        console.log(`  Split into ${chunks.length} chunks`);

        // Generate embeddings
        const texts = chunks.map((chunk) => chunk.pageContent);
        console.log('  Generating embeddings...');
        const embeddingsResult = await embeddings.embedDocuments(texts);

        // Create vectors
        const vectors = chunks.map((chunk, i) => {
          const chunkMetadata = {
            bylawNumber: bylawNumber || 'unknown',
            filename,
            text: chunk.pageContent,
            source: namespace,
          };

          return {
            id: `${namespace}-${bylawNumber || filename}-${i}`,
            values: embeddingsResult[i],
            metadata: chunkMetadata,
          };
        });

        // Upsert to namespace
        console.log(
          `  Upserting ${vectors.length} vectors to namespace '${namespace}'...`,
        );

        // Batch upserts
        const batchSize = 100;
        for (let i = 0; i < vectors.length; i += batchSize) {
          const batch = vectors.slice(i, i + batchSize);
          await namespaceClient.upsert(batch);
          console.log(
            `    Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`,
          );
        }

        console.log(`✅ Successfully processed ${filename}`);
      } catch (error) {
        console.error(`❌ Error processing ${path.basename(file)}:`, error);
      }
    }

    console.log(`\n✅ All files processed for namespace '${namespace}'`);

    // Test a query
    console.log(`\nTesting a query in namespace '${namespace}'...`);

    const queryEmbedding = await embeddings.embedQuery('parking regulations');

    const queryResult = await namespaceClient.query({
      vector: queryEmbedding,
      topK: 3,
      includeMetadata: true,
    });

    console.log(`Found ${queryResult.matches?.length || 0} results`);

    if (queryResult.matches && queryResult.matches.length > 0) {
      console.log('\nTop result:');
      const topResult = queryResult.matches[0];
      console.log(`  ID: ${topResult.id}`);
      console.log(`  Score: ${topResult.score}`);
      console.log(`  Bylaw: ${topResult.metadata?.bylawNumber || 'Unknown'}`);

      // Show a snippet of the content
      const content = topResult.metadata?.text as string;
      if (content) {
        console.log(`  Content snippet: "${content.substring(0, 150)}..."`);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

/**
 * Extract bylaw number from filename
 */
function extractBylawNumber(filename: string): string | undefined {
  // Pattern 1: "bylaw-XXXX-title.pdf" format
  const organizedMatch = filename.match(/^bylaw-(\d+)/i);
  if (organizedMatch) return organizedMatch[1];

  // Pattern 2: "4747, ..." format
  const commaMatch = filename.match(/^(\d+)(?:,\s+)/);
  if (commaMatch) return commaMatch[1];

  // Pattern 3: "4747 ..." format
  const spaceMatch = filename.match(/^(\d+)(?:\s+)/);
  if (spaceMatch) return spaceMatch[1];

  // Pattern 4: "Bylaw No. 4861, ..." format
  const noMatch = filename.match(/Bylaw No\.?\s+(\d+)(?:,|\s|$)/i);
  if (noMatch) return noMatch[1];

  return undefined;
}

// Run
main();
