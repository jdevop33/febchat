/**
 * Oak Bay Bylaws Knowledge Base
 * 
 * This module provides functionality for processing, embedding, and searching
 * Oak Bay municipal bylaws. It enables retrieval-augmented generation (RAG)
 * to provide accurate responses about bylaw information.
 */

import { ChunkMetadata, BylawChunk, BylawSearchResult } from './types';

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
    k: number = 5,
    filter?: Partial<ChunkMetadata>
  ): Promise<Array<BylawSearchResult>> {
    // In a real implementation, this would query the vector database
    
    // Mock results - this simulates finding relevant documents
    // In production, replace with actual vector similarity search
    const results: Array<BylawSearchResult> = [];
    
    // Simple keyword matching for demo purposes
    const queryLower = query.toLowerCase();
    const keywordMatches = this.chunks.filter(chunk => 
      chunk.text.toLowerCase().includes(queryLower)
    );
    
    // Apply any filters
    const filtered = filter 
      ? keywordMatches.filter(chunk => 
          Object.entries(filter).every(([key, value]) => 
            chunk.metadata[key as keyof ChunkMetadata] === value
          )
        )
      : keywordMatches;
      
    // Return top k results
    const topK = filtered.slice(0, k);
    
    return topK.map(chunk => ({
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
  metadata: Partial<ChunkMetadata>
): Promise<Array<BylawChunk>> {
  // In production, this would use pdf-parse or similar to extract text
  console.log(`Processing bylaw PDF: ${filePath}`);
  
  // Mock processing result
  return [
    {
      text: "Sample bylaw text from section 1.1 about general provisions.",
      metadata: {
        bylawNumber: metadata.bylawNumber || "0000",
        title: metadata.title || "Unknown Bylaw",
        section: "1.1",
        dateEnacted: metadata.dateEnacted || "2023-01-01",
        category: metadata.category || "general",
        lastUpdated: new Date().toISOString(),
      }
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
  filter?: Partial<ChunkMetadata>
): Promise<Array<BylawSearchResult>> {
  // Try to use Pinecone for real production environment
  try {
    // Import here to avoid circular dependencies
    const { getPineconeIndex } = await import('../vector-search/pinecone-client');
    const { OpenAIEmbeddings } = await import('@langchain/openai');
    
    // Check if we have Pinecone credentials
    if (process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX) {
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
      const pineconeFilter = filter ? 
        Object.entries(filter).reduce((acc, [key, value]) => {
          acc[key] = { $eq: value };
          return acc;
        }, {} as Record<string, any>) : 
        undefined;
      
      // Search Pinecone
      const results = await index.query({
        vector: queryEmbedding,
        topK: 5,
        includeMetadata: true,
        filter: pineconeFilter ? { $and: [pineconeFilter] } : undefined
      });
      
      // Format results
      return (results.matches || []).map(match => ({
        text: match.metadata?.text as string,
        metadata: match.metadata as ChunkMetadata,
        score: match.score || 0
      }));
    }
  } catch (error) {
    console.error("Error using Pinecone for bylaw search:", error);
    console.log("Falling back to mock vector store...");
  }
  
  // Fall back to mock store if Pinecone is not available or fails
  try {
    const vectorStore = getVectorStore();
    
    // First, initialize the mock vector store with our sample data if not done already
    if (mockBylawData.length > 0) {
      await vectorStore.addDocuments(mockBylawData);
    }
    
    // Search using mock vector store
    return await vectorStore.similaritySearch(query, 5, filter);
  } catch (error) {
    console.error("Error using mock vector store:", error);
    
    // Final fallback: just filter mock data directly
    return mockBylawData
      .filter(item => item.text.toLowerCase().includes(query.toLowerCase()))
      .filter(item => {
        if (!filter) return true;
        return Object.entries(filter).every(([key, value]) => 
          item.metadata[key as keyof ChunkMetadata] === value
        );
      })
      .slice(0, 5)
      .map(chunk => ({
        text: chunk.text,
        metadata: chunk.metadata,
        score: 0.85 // Mock relevance score
      }));
  }
}

// Example mock data
export const mockBylawData = [
  {
    text: "No person shall cut, remove or damage any protected tree without first obtaining a tree cutting permit.",
    metadata: {
      bylawNumber: "4620",
      title: "Tree Protection Bylaw",
      section: "3.1",
      dateEnacted: "2021-05-15",
      category: "trees",
      lastUpdated: "2023-01-10T00:00:00Z",
    }
  },
  {
    text: "A protected tree means any tree with a diameter of 30 centimeters or more, measured at 1.4 meters above ground level.",
    metadata: {
      bylawNumber: "4620",
      title: "Tree Protection Bylaw",
      section: "4.2",
      dateEnacted: "2021-05-15",
      category: "trees",
      lastUpdated: "2023-01-10T00:00:00Z",
    }
  },
  {
    text: "Any person who contravenes this bylaw commits an offense and shall be liable to a fine not exceeding $10,000.",
    metadata: {
      bylawNumber: "4620",
      title: "Tree Protection Bylaw",
      section: "7.3",
      dateEnacted: "2021-05-15",
      category: "trees",
      lastUpdated: "2023-01-10T00:00:00Z",
    }
  },
  {
    text: "The minimum lot size for single family residential development shall be 695 square meters.",
    metadata: {
      bylawNumber: "4360",
      title: "Zoning Bylaw",
      section: "5.2",
      dateEnacted: "2020-09-22",
      category: "zoning",
      lastUpdated: "2022-03-18T00:00:00Z",
    }
  },
  {
    text: "Secondary suites are permitted within single family dwellings, subject to the regulations in this section.",
    metadata: {
      bylawNumber: "4360",
      title: "Zoning Bylaw",
      section: "6.3.4",
      dateEnacted: "2020-09-22",
      category: "zoning",
      lastUpdated: "2022-03-18T00:00:00Z",
    }
  },
  {
    text: "Every owner of a dog must ensure that the dog is not running at large within the Municipality.",
    metadata: {
      bylawNumber: "4733",
      title: "Animal Control Bylaw",
      section: "2.1",
      dateEnacted: "2022-01-10",
      category: "animals",
      lastUpdated: "2022-01-10T00:00:00Z",
    }
  },
  {
    text: "Dogs are not permitted on any beach between May 1 and September 30, except in designated areas.",
    metadata: {
      bylawNumber: "4733",
      title: "Animal Control Bylaw",
      section: "3.5",
      dateEnacted: "2022-01-10",
      category: "animals",
      lastUpdated: "2022-01-10T00:00:00Z",
    }
  },
  {
    text: "The annual license fee for each neutered male dog or spayed female dog shall be $30.00.",
    metadata: {
      bylawNumber: "4733",
      title: "Animal Control Bylaw",
      section: "6.2",
      dateEnacted: "2022-01-10",
      category: "animals",
      lastUpdated: "2022-01-10T00:00:00Z",
    }
  },
];