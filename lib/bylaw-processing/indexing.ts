import path from 'node:path';
import { nanoid } from 'nanoid';
import { getPineconeIndex } from '../vector-search/pinecone-client';
import {
  getEmbeddingsModel,
  EmbeddingProvider,
} from '../vector-search/embedding-models';

// For chunking and PDF processing
import { extractFromPDF } from '../bylaw/processing/pdf-extractor';
import { chunkBylawText } from '../bylaw/processing/chunking';

// Interface for metadata that can be passed to the processor
interface BylawMetadata {
  bylawNumber?: string;
  title?: string;
  date?: string;
  originalFilename?: string;
  [key: string]: string | undefined;
}

/**
 * Process a bylaw PDF, extract text, chunk it, generate embeddings, and index in Pinecone
 *
 * @param filePath Path to the PDF file
 * @param metadata Optional metadata like bylaw number, title, etc.
 * @returns Array of chunk IDs that were created
 */
export async function processBylawPDF(
  filePath: string,
  metadata: BylawMetadata = {},
): Promise<string[]> {
  console.log(`Processing bylaw PDF: ${filePath}`);

  try {
    // Step 1: Extract text from PDF
    console.log('Extracting text from PDF...');
    const { text: extractedText } = await extractFromPDF(filePath, metadata);

    if (!extractedText || extractedText.length === 0) {
      throw new Error('PDF extraction failed: No text content found');
    }

    console.log(`Extracted ${extractedText.length} characters from PDF`);

    // Step 2: Extract bylaw number from text if not provided
    let bylawNumber = metadata.bylawNumber;
    if (!bylawNumber) {
      // Try to extract bylaw number from the text content
      const bylawMatch = extractedText.match(/Bylaw\s+No\.\s+(\d+)/i);
      if (bylawMatch?.[1]) {
        bylawNumber = bylawMatch[1];
        console.log(`Extracted bylaw number from content: ${bylawNumber}`);
      } else {
        // Use filename as a fallback
        bylawNumber = path.basename(filePath, '.pdf').replace(/\D/g, '');
        console.log(`Using filename-derived bylaw number: ${bylawNumber}`);
      }
    }

    // Step 3: Extract title if not provided
    let title = metadata.title;
    if (!title) {
      // Try to extract title from the first few lines
      const firstLines = extractedText.split('\n').slice(0, 10).join(' ');
      const titleMatch = firstLines.match(
        /Bylaw\s+No\.\s+\d+[\s\-]*([^\n\.]+)/i,
      );
      if (titleMatch?.[1]) {
        title = titleMatch[1].trim();
        console.log(`Extracted title from content: ${title}`);
      }
    }

    // Step 4: Chunk the content
    console.log('Chunking content...');
    const chunks = chunkBylawText(extractedText, {
      bylawNumber: bylawNumber,
      title: title,
    });

    console.log(`Created ${chunks.length} chunks from content`);

    // Step 5: Generate embeddings for each chunk
    console.log('Generating embeddings...');

    // Determine which embedding provider to use
    const provider =
      process.env.EMBEDDING_PROVIDER === 'openai'
        ? EmbeddingProvider.OPENAI
        : EmbeddingProvider.LLAMAINDEX;

    const embeddings = getEmbeddingsModel(provider);

    const vectors = [];
    const chunkIds = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkId = `bylaw-${bylawNumber}-chunk-${i}-${nanoid(6)}`;
      chunkIds.push(chunkId);

      try {
        // Generate embedding for this chunk
        const embedding = await embeddings.embedQuery(chunk.text);

        // Create vector record for Pinecone
        vectors.push({
          id: chunkId,
          values: embedding,
          metadata: {
            text: chunk.text,
            bylawNumber: bylawNumber || 'unknown',
            title: title || `Bylaw No. ${bylawNumber}`,
            section: chunk.metadata.section || '',
            chunkIndex: i,
            ...metadata, // Include any additional metadata
          },
        });

        // Log progress for larger documents
        if (i % 10 === 0 || i === chunks.length - 1) {
          console.log(
            `Generated embeddings for ${i + 1}/${chunks.length} chunks`,
          );
        }
      } catch (error) {
        console.error(`Error generating embedding for chunk ${i}:`, error);
        // Continue with next chunk instead of failing entire process
      }
    }

    // Step 6: Upsert vectors to Pinecone
    if (vectors.length > 0) {
      console.log(`Upserting ${vectors.length} vectors to Pinecone...`);

      // Get Pinecone index
      const index = getPineconeIndex();

      // Split vectors into batches to avoid exceeding upsert size limits
      const BATCH_SIZE = 100;
      for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
        const batch = vectors.slice(i, i + BATCH_SIZE);
        await index.upsert(batch);
        console.log(
          `Upserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(vectors.length / BATCH_SIZE)}`,
        );
      }

      console.log('Vector upsert complete');
    } else {
      console.warn('No vectors to upsert - all embedding generation failed');
    }

    return chunkIds;
  } catch (error) {
    console.error('Error processing bylaw PDF:', error);
    throw error;
  }
}
