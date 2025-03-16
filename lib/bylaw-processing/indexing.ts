/**
 * Bylaw Indexing Service
 *
 * This module handles the indexing of bylaw documents into the vector database.
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import { getPineconeIndex } from '../vector-search/pinecone-client';
import type { BylawMetadata } from '../vector-search/types';
import {
  extractFromPDF,
  cleanText,
  extractBylawMetadata,
} from './pdf-extractor';
import { chunkBylawText } from './chunking';

/**
 * Process and index a single bylaw PDF
 */
export async function processBylawPDF(
  filePath: string,
  metadata: Partial<BylawMetadata> = {},
): Promise<string[]> {
  try {
    // Step 1: Extract text and metadata from PDF
    const { text, metadata: extractedMetadata } = await extractFromPDF(
      filePath,
      metadata,
    );

    // Step 2: Clean and normalize the text
    const cleanedText = cleanText(text);

    // Step 3: Extract metadata from text if not provided
    const textMetadata = extractBylawMetadata(cleanedText);

    // Step 4: Combine all metadata with proper precedence
    // Explicitly extract and prioritize bylaw numbers to avoid override confusion
    const bylawNumber = 
      // First priority: explicitly provided metadata (most reliable)
      metadata.bylawNumber || 
      // Second priority: filename-based extraction (fairly reliable)
      extractedMetadata.bylawNumber || 
      // Third priority: content-based extraction (least reliable)
      textMetadata.bylawNumber;
    
    console.log('Bylaw number sources:');
    console.log(`- Explicitly provided: ${metadata.bylawNumber || 'None'}`);
    console.log(`- From filename: ${extractedMetadata.bylawNumber || 'None'}`);
    console.log(`- From content: ${textMetadata.bylawNumber || 'None'}`);
    console.log(`- Final choice: ${bylawNumber || 'None'}`);
    
    // Do the same for title
    const title = 
      metadata.title || 
      textMetadata.title || 
      extractedMetadata.title;
    
    // Combine all metadata
    const combinedMetadata: Partial<BylawMetadata> = {
      // Start with content-based metadata (lowest priority)
      ...textMetadata,
      // Override with file properties (medium priority)
      ...extractedMetadata,
      // Override with explicitly provided metadata (highest priority)
      ...metadata,
      // Set specific fields with our priority logic
      bylawNumber: bylawNumber || undefined,
      title: title || undefined,
      // Add timestamp
      lastUpdated: new Date().toISOString(),
      
      // For debugging: record the sources
      _metadataSources: {
        fromContent: Object.keys(textMetadata),
        fromFile: Object.keys(extractedMetadata),
        fromExplicit: Object.keys(metadata),
      }
    };

    // Step 5: Chunk the text
    const chunks = chunkBylawText(cleanedText, combinedMetadata);

    // Step 6: Generate embeddings and index chunks
    return await indexBylawChunks(chunks);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error processing bylaw PDF ${filePath}:`, error);
    throw new Error(`Failed to process bylaw PDF: ${errorMessage}`);
  }
}

/**
 * Index bylaw chunks into Pinecone
 */
export async function indexBylawChunks(
  chunks: Array<{ text: string; metadata: Partial<BylawMetadata> }>,
): Promise<string[]> {
  try {
    // Get OpenAI embeddings model using environment variables
    const embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small',
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    // Get Pinecone index
    const index = getPineconeIndex();

    // Generate IDs for chunks
    const chunkIds = chunks.map((_, i) => {
      const metadata = chunks[i].metadata;
      return `bylaw-${metadata.bylawNumber}-${metadata.section}-${i}`;
    });

    // Generate embeddings in batches
    console.log(`Generating embeddings for ${chunks.length} chunks...`);
    const texts = chunks.map((chunk) => chunk.text);
    const embeddingsResults = await embeddings.embedDocuments(texts);

    // Prepare vectors for Pinecone
    const vectors = chunks.map((chunk, i) => ({
      id: chunkIds[i],
      values: embeddingsResults[i],
      metadata: {
        ...chunk.metadata,
        text: chunk.text,
      },
    }));

    // Upsert vectors to Pinecone in batches
    console.log(`Upserting ${vectors.length} vectors to Pinecone...`);

    // Batch size of 100 (Pinecone recommendation)
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
      console.log(
        `Upserted batch ${i / batchSize + 1}/${Math.ceil(vectors.length / batchSize)}`,
      );
    }

    return chunkIds;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error indexing bylaw chunks:', error);
    throw new Error(`Failed to index bylaw chunks: ${errorMessage}`);
  }
}

/**
 * Delete vectors from Pinecone by bylaw number
 */
export async function deleteBylawVectors(bylawNumber: string): Promise<void> {
  try {
    // Get Pinecone index
    const index = getPineconeIndex();

    // Delete vectors by filter
    await index.deleteMany({
      filter: {
        bylawNumber: { $eq: bylawNumber },
      },
    });

    console.log(`Deleted vectors for bylaw ${bylawNumber}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error deleting vectors for bylaw ${bylawNumber}:`, error);
    throw new Error(`Failed to delete vectors: ${errorMessage}`);
  }
}
