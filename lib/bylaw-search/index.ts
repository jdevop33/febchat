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
  // Use mock data if MOCK_VECTOR_SEARCH is enabled (for CI and testing)
  if (process.env.MOCK_VECTOR_SEARCH === 'true') {
    console.log('🧪 Using mock vector search data (MOCK_VECTOR_SEARCH=true)');
    // Return mock results immediately
    return mockBylawData
      .filter((item) => item.text.toLowerCase().includes(query.toLowerCase()))
      .filter((item) => {
        if (!filter) return true;
        return Object.entries(filter).every(([key, value]) => {
          const typedKey = key as keyof typeof item.metadata;
          return item.metadata[typedKey] === value;
        });
      })
      .slice(0, 5)
      .map((chunk) => ({
        text: chunk.text,
        metadata: chunk.metadata,
        score: 0.85,
      }));
  }
  
  // Try to use Pinecone for real production environment
  try {
    // Import here to avoid circular dependencies
    const { getPineconeIndex } = await import(
      '../vector-search/pinecone-client'
    );
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

        console.log(`Pinecone returned ${results.matches?.length || 0} results`);

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

    // First, initialize the mock vector store with our sample data if not done already
    if (mockBylawData.length > 0) {
      await vectorStore.addDocuments(mockBylawData);
    }

    // Search using mock vector store
    return await vectorStore.similaritySearch(query, 5, filter);
  } catch (error) {
    console.error('Error using mock vector store:', error);

    // Final fallback: just filter mock data directly
    return mockBylawData
      .filter((item) => item.text.toLowerCase().includes(query.toLowerCase()))
      .filter((item) => {
        if (!filter) return true;
        return Object.entries(filter).every(([key, value]) => {
          const typedKey = key as keyof typeof item.metadata;
          return item.metadata[typedKey] === value;
        });
      })
      .slice(0, 5)
      .map((chunk) => ({
        text: chunk.text,
        metadata: chunk.metadata,
        score: 0.85, // Mock relevance score
      }));
  }
}

// Example mock data
export const mockBylawData = [
  {
    text: 'No person shall make or cause to be made any noise or sound within the geographical limits of The Corporation of the District of Oak Bay which is liable to disturb the quiet, peace, rest, enjoyment, comfort or convenience of individuals or the public.',
    metadata: {
      bylawNumber: '3210',
      title: 'Anti-Noise Bylaw, 1977',
      section: '3(1)',
      sectionTitle: 'General Noise Prohibition',
      dateEnacted: '1977-06-06',
      category: 'noise',
      lastUpdated: '2013-09-30T00:00:00Z',
      isConsolidated: true,
      consolidatedDate: 'September 30, 2013'
    },
  },
  {
    text: 'No owner, tenant or occupier of real property within the geographical limits of The Corporation of the District of Oak Bay shall allow that property to be used so that a noise or sound which originates from that property disturbs or tends to disturb the quiet, peace, rest, enjoyment, comfort or convenience of individuals or the public.',
    metadata: {
      bylawNumber: '3210',
      title: 'Anti-Noise Bylaw, 1977',
      section: '3(2)',
      sectionTitle: 'Property Owner Responsibility',
      dateEnacted: '1977-06-06',
      category: 'noise',
      lastUpdated: '2013-09-30T00:00:00Z',
      isConsolidated: true,
      consolidatedDate: 'September 30, 2013'
    },
  },
  {
    text: 'On Saturday, Sunday or a holiday, the operation of a leaf blower at a time outside the hours of 9:00 a.m. to 5:00 p.m. is prohibited.',
    metadata: {
      bylawNumber: '3210',
      title: 'Anti-Noise Bylaw, 1977',
      section: '4(5)(a)',
      sectionTitle: 'Leaf Blower Restrictions - Weekends and Holidays',
      dateEnacted: '1977-06-06',
      category: 'noise',
      lastUpdated: '2013-09-30T00:00:00Z',
      isConsolidated: true,
      consolidatedDate: 'September 30, 2013'
    },
  },
  {
    text: 'From Monday through Friday, excluding holidays, the operation of a leaf blower at a time outside the hours of 8:00 a.m. to 8:00 p.m. is prohibited.',
    metadata: {
      bylawNumber: '3210',
      title: 'Anti-Noise Bylaw, 1977',
      section: '4(5)(b)',
      sectionTitle: 'Leaf Blower Restrictions - Weekdays',
      dateEnacted: '1977-06-06',
      category: 'noise',
      lastUpdated: '2013-09-30T00:00:00Z',
      isConsolidated: true,
      consolidatedDate: 'September 30, 2013'
    },
  },
  {
    text: 'The erection, demolition, construction, reconstruction, alteration or repair of any building or other structure is permitted between the hours of 7:00 a.m. and 7:00 p.m. on each day except Sunday if such work is authorized by a permit which is not a renewal permit, as defined in the Building and Plumbing Bylaw, 2005.',
    metadata: {
      bylawNumber: '3210',
      title: 'Anti-Noise Bylaw, 1977',
      section: '5(7)(a)',
      sectionTitle: 'Construction Hours - Regular Permits',
      dateEnacted: '1977-06-06',
      category: 'noise',
      lastUpdated: '2013-09-30T00:00:00Z',
      isConsolidated: true,
      consolidatedDate: 'September 30, 2013'
    },
  },
  {
    text: 'The erection, demolition, construction, reconstruction, alteration or repair of any building or other structure is permitted between the hours of 9:00 a.m. and 5:00 p.m. on each day except Sunday if such work is authorized pursuant to a renewal permit, as defined in the Building and Plumbing Bylaw, 2005.',
    metadata: {
      bylawNumber: '3210',
      title: 'Anti-Noise Bylaw, 1977',
      section: '5(7)(b)',
      sectionTitle: 'Construction Hours - Renewal Permits',
      dateEnacted: '1977-06-06',
      category: 'noise',
      lastUpdated: '2013-09-30T00:00:00Z',
      isConsolidated: true,
      consolidatedDate: 'September 30, 2013'
    },
  },
  {
    text: 'Any person who violates any provision of this Bylaw is guilty of an offence and liable upon summary conviction to a fine of not more than One Thousand Dollars ($1,000.00). For the purpose of this clause an offence shall be deemed committed upon each day during or on which a violation occurs or continues.',
    metadata: {
      bylawNumber: '3210',
      title: 'Anti-Noise Bylaw, 1977',
      section: '7',
      sectionTitle: 'Penalties',
      dateEnacted: '1977-06-06',
      category: 'noise',
      lastUpdated: '2013-09-30T00:00:00Z',
      isConsolidated: true,
      consolidatedDate: 'September 30, 2013'
    },
  },
  {
    text: 'The minimum lot area for a single family dwelling shall be 695 square metres (7,481 square feet).',
    metadata: {
      bylawNumber: '3531',
      title: 'Zoning Bylaw',
      section: '5.1',
      sectionTitle: 'Minimum Lot Size',
      dateEnacted: '1986-05-12',
      category: 'zoning',
      lastUpdated: '2024-08-30T00:00:00Z',
      isConsolidated: true,
      consolidatedDate: 'August 30, 2024'
    },
  },
  {
    text: 'No building shall exceed a height of 7.32 metres (24 feet).',
    metadata: {
      bylawNumber: '3531',
      title: 'Zoning Bylaw',
      section: '6.5.1',
      sectionTitle: 'Building Height',
      dateEnacted: '1986-05-12',
      category: 'zoning',
      lastUpdated: '2024-08-30T00:00:00Z',
      isConsolidated: true,
      consolidatedDate: 'August 30, 2024'
    },
  },
  {
    text: 'No more than one (1) secondary suite shall be permitted in any single family dwelling.',
    metadata: {
      bylawNumber: '3531',
      title: 'Zoning Bylaw',
      section: '5.7',
      sectionTitle: 'Secondary Suite Regulations',
      dateEnacted: '1986-05-12',
      category: 'zoning',
      lastUpdated: '2024-08-30T00:00:00Z',
      isConsolidated: true,
      consolidatedDate: 'August 30, 2024'
    },
  },
  {
    text: 'No person shall permit a dog to be on any street or public place or in any public building unless the dog is kept on a leash not exceeding 6 feet in length and is under the immediate control of a competent person.',
    metadata: {
      bylawNumber: '4013',
      title: 'Animal Control Bylaw, 1999',
      section: '4',
      sectionTitle: 'Dogs At Large',
      dateEnacted: '1999-06-20',
      category: 'animals',
      lastUpdated: '2022-02-15T00:00:00Z',
      isConsolidated: true,
      consolidatedDate: 'February 2022'
    },
  },
  {
    text: 'Every application for a licence shall be accompanied by a licence fee in the amount of $30.00 for each dog that is neutered or spayed, or $45.00 for each dog that is not neutered or spayed.',
    metadata: {
      bylawNumber: '4013',
      title: 'Animal Control Bylaw, 1999',
      section: '7',
      sectionTitle: 'Dog Licence Fee',
      dateEnacted: '1999-06-20',
      category: 'animals',
      lastUpdated: '2022-02-15T00:00:00Z',
      isConsolidated: true,
      consolidatedDate: 'February 2022'
    },
  },
  {
    text: 'No person shall permit a dog to be on any public beach, whether on a leash or not, in the area between the westerly municipal boundary of The Corporation and the easterly boundary of Lot 1, Section 46, Plan 2193 (known as the "Oak Bay Marina") between May 1 and September 30 in any year.',
    metadata: {
      bylawNumber: '4013',
      title: 'Animal Control Bylaw, 1999',
      section: '9',
      sectionTitle: 'Dog Beach Restrictions',
      dateEnacted: '1999-06-20',
      category: 'animals',
      lastUpdated: '2022-02-15T00:00:00Z',
      isConsolidated: true,
      consolidatedDate: 'February 2022'
    },
  },
  {
    text: 'Except as authorized by a Permit issued under this Bylaw, no person shall cut, remove or damage any Protected Tree.',
    metadata: {
      bylawNumber: '4742',
      title: 'Tree Protection Bylaw, 2020',
      section: '3.1',
      sectionTitle: 'Protected Tree Removal Prohibition',
      dateEnacted: '2020-03-15',
      category: 'trees',
      lastUpdated: '2020-12-30T00:00:00Z',
      isConsolidated: true,
      consolidatedDate: 'December 2020'
    },
  },
  {
    text: 'Protected Tree means any of the following: (a) any tree with a DBH of 60 cm or greater; (b) an Arbutus, Dogwood, Garry Oak, or Western White Pine tree with a DBH of 10 cm or greater; (c) a Western Red Cedar or Big Leaf Maple tree with a DBH of 30 cm or greater.',
    metadata: {
      bylawNumber: '4742',
      title: 'Tree Protection Bylaw, 2020',
      section: '2.1',
      sectionTitle: 'Protected Tree Definition',
      dateEnacted: '2020-03-15',
      category: 'trees',
      lastUpdated: '2020-12-30T00:00:00Z',
      isConsolidated: true,
      consolidatedDate: 'December 2020'
    },
  },
  {
    text: 'A person who violates any provision of this Bylaw commits an offence and upon conviction is liable to a fine not exceeding $10,000.',
    metadata: {
      bylawNumber: '4742',
      title: 'Tree Protection Bylaw, 2020',
      section: '10.1',
      sectionTitle: 'Penalties',
      dateEnacted: '2020-03-15',
      category: 'trees',
      lastUpdated: '2020-12-30T00:00:00Z',
      isConsolidated: true,
      consolidatedDate: 'December 2020'
    },
  },
];
