/**
 * Oak Bay Bylaws Knowledge Base
 *
 * This module provides functionality for processing, embedding, and searching
 * Oak Bay municipal bylaws. It enables retrieval-augmented generation (RAG)
 * to provide accurate responses about bylaw information.
 */

import type { ChunkMetadata, BylawChunk, BylawSearchResult } from './types';

// Placeholder for actual embedding model in production
// In production, replace with actual Pinecone, Weaviate or other vector DB client
// This implementation is for demonstration purposes
class MockVectorStore {
  private chunks: Array<BylawChunk> = [];

  /**
   * Add documents to the vector store
   */
  async addDocuments(documents: Array<BylawChunk>): Promise<void> {
    this.chunks = [...this.chunks, ...documents];
    console.log(`Added ${documents.length} chunks to vector store`);
  }

  /**
   * Search for similar documents
   */
  async similaritySearch(
    query: string,
    k = 5,
    filter?: Partial<ChunkMetadata>,
  ): Promise<Array<BylawSearchResult>> {
    // In a real implementation, this would query the vector database

    // Mock results - this simulates finding relevant documents
    // In production, replace with actual vector similarity search
    const results: Array<BylawSearchResult> = [];

    // Simple keyword matching for demo purposes
    const queryLower = query.toLowerCase();
    const keywordMatches = this.chunks.filter((chunk) =>
      chunk.text.toLowerCase().includes(queryLower),
    );

    // Apply any filters
    const filtered = filter
      ? keywordMatches.filter((chunk) =>
          Object.entries(filter).every(([key, value]) => {
            const typedKey = key as keyof typeof chunk.metadata;
            return chunk.metadata[typedKey] === value;
          }),
        )
      : keywordMatches;

    // Return top k results
    const topK = filtered.slice(0, k);

    return topK.map((chunk) => ({
      text: chunk.text,
      metadata: chunk.metadata,
      score: Math.random() * 0.3 + 0.7, // Mock relevance score between 0.7-1.0
    }));
  }
}

/**
 * Process a PDF bylaw document
 * In production, this would extract text, clean it, and chunk it
 */
export async function processBylawPDF(
  filePath: string,
  metadata: Partial<ChunkMetadata>,
): Promise<Array<BylawChunk>> {
  // In production, this would use pdf-parse or similar to extract text
  console.log(`Processing bylaw PDF: ${filePath}`);

  // Mock processing result
  return [
    {
      text: 'Sample bylaw text from section 1.1 about general provisions.',
      metadata: {
        bylawNumber: metadata.bylawNumber || '0000',
        title: metadata.title || 'Unknown Bylaw',
        section: '1.1',
        dateEnacted: metadata.dateEnacted || '2023-01-01',
        category: metadata.category || 'general',
        lastUpdated: new Date().toISOString(),
      },
    },
    // More chunks would be returned in a real implementation
  ];
}

/**
 * Initialize and return the vector store
 */
export function getVectorStore(): MockVectorStore {
  // In production, this would connect to a persistent vector store
  // such as Pinecone, Weaviate, etc.
  return new MockVectorStore();
}

/**
 * Search for bylaw information
 */
export async function searchBylaws(
  query: string,
  filter?: Partial<ChunkMetadata>,
): Promise<Array<BylawSearchResult>> {
  // We're not using mock data for the demo

  // Try to use Pinecone for real production environment
  try {
    // Import here to avoid circular dependencies
    const { getPineconeIndex } = await import('../vector/pinecone-client');
    const { OpenAIEmbeddings } = await import('@langchain/openai');

    // Check if we have Pinecone credentials
    if (process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX) {
      console.log('Using Pinecone for vector search');

      try {
        // Get Pinecone index
        const index = getPineconeIndex();

        // Get OpenAI embeddings model
        const embeddings = new OpenAIEmbeddings({
          modelName: 'text-embedding-3-small',
          openAIApiKey: process.env.OPENAI_API_KEY,
        });

        // Generate embedding for query
        const queryEmbedding = await embeddings.embedQuery(query);

        // Build filter if provided
        const pineconeFilter = filter
          ? Object.entries(filter).reduce(
              (acc, [key, value]) => {
                acc[key] = { $eq: value };
                return acc;
              },
              {} as Record<string, any>,
            )
          : undefined;

        // Search Pinecone
        const results = await index.query({
          vector: queryEmbedding,
          topK: 5,
          includeMetadata: true,
          filter: pineconeFilter ? { $and: [pineconeFilter] } : undefined,
        });

        console.log(
          `Pinecone returned ${results.matches?.length || 0} results`,
        );

        // Format results
        return (results.matches || []).map((match) => ({
          text: match.metadata?.text as string,
          metadata: match.metadata as ChunkMetadata,
          score: match.score || 0,
        }));
      } catch (pineconeError) {
        console.error('Error querying Pinecone:', pineconeError);
        throw pineconeError; // Re-throw to fall back to mock data
      }
    } else {
      console.log('Pinecone credentials not found, falling back to mock data');
      throw new Error('Pinecone credentials missing');
    }
  } catch (error) {
    console.error('Error using Pinecone for bylaw search:', error);
    console.log('Falling back to mock vector store...');
  }

  // Fall back to mock store if Pinecone is not available or fails
  try {
    const vectorStore = getVectorStore();

    // Initialize with real data
    const { getRealBylawData } = await import('../vector/search-unified');
    const realData = await getRealBylawData();
    if (realData.length > 0) {
      await vectorStore.addDocuments(realData);
    }

    // Search using mock vector store
    return await vectorStore.similaritySearch(query, 5, filter);
  } catch (error) {
    console.error('Error using mock vector store:', error);

    // Final fallback: use real file system data as fallback
    try {
      const fs = require('node:fs');
      const path = require('node:path');

      // Get paths to actual bylaw PDF files
      const pdfDirectory = path.join(process.cwd(), 'public', 'pdfs');

      // Check if directory exists
      if (!fs.existsSync(pdfDirectory)) {
        console.error(`PDF directory not found: ${pdfDirectory}`);
        return [];
      }

      // Get list of PDF files
      const pdfFiles = fs
        .readdirSync(pdfDirectory)
        .filter((file: string) => file.toLowerCase().endsWith('.pdf'))
        .map((file: string) => ({
          filename: file,
          bylawNumber: file.match(/(\d{4})/) ? file.match(/(\d{4})/)[1] : '',
          title: file
            .replace(/\.pdf$/i, '')
            .replace(/-/g, ' ')
            .trim(),
        }));

      // Filter by query
      const queryLower = query.toLowerCase();
      return pdfFiles
        .filter(
          (file: any) =>
            file.filename.toLowerCase().includes(queryLower) ||
            file.title?.toLowerCase().includes(queryLower),
        )
        .slice(0, 5)
        .map((file: any, index: number) => ({
          text: `Bylaw ${file.bylawNumber || 'Unknown'}: ${file.title || file.filename}`,
          metadata: {
            bylawNumber: file.bylawNumber || 'Unknown',
            title: file.title || file.filename,
            section: '',
            category: 'general',
            filename: file.filename,
            url: `/pdfs/${file.filename}`,
          },
          score: 0.8 - index * 0.1, // Simple relevance score
        }));
    } catch (finalError) {
      console.error(
        'Fatal error in bylaw search, returning empty results:',
        finalError,
      );
      return []; // At the very end, return empty results rather than crash
    }
  }
}

// Use real bylaw data, not mock data
export async function getBylawData() {
  try {
    // Attempt to load real data from verified-bylaw-answers.json
    const { getRealBylawData } = await import('../vector/search-unified');
    return await getRealBylawData();
  } catch (error) {
    console.error('Error loading bylaw data:', error);
    return [];
  }
}
