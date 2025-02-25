/**
 * Bylaw Vector Search Service
 * 
 * This module provides functionality for searching bylaws using vector similarity.
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import { getPineconeIndex } from './pinecone-client';
import { BylawSearchOptions, BylawSearchResult, BylawSearchFilters } from './types';

/**
 * Initialize the OpenAI embeddings model
 */
function getEmbeddingsModel() {
  return new OpenAIEmbeddings({
    modelName: 'text-embedding-3-small',
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Search for bylaws using vector similarity search
 */
export async function searchBylaws(
  query: string,
  options: BylawSearchOptions = {}
): Promise<BylawSearchResult[]> {
  try {
    // Get embeddings model
    const embeddings = getEmbeddingsModel();
    
    // Generate embedding for query
    const queryEmbedding = await embeddings.embedQuery(query);
    
    // Get Pinecone index
    const index = getPineconeIndex();
    
    // Build filter if provided
    const filter = options.filters ? buildPineconeFilter(options.filters) : undefined;
    
    // Search Pinecone
    const searchResults = await index.query({
      vector: queryEmbedding,
      topK: options.limit || 5,
      includeMetadata: true,
      filter,
    });
    
    // Apply minimum score filter if provided
    let results = searchResults.matches || [];
    if (options.minScore !== undefined) {
      results = results.filter(match => (match.score || 0) >= options.minScore!);
    }
    
    // Format results
    return results.map(match => ({
      id: match.id,
      text: match.metadata?.text as string,
      metadata: match.metadata as any,
      score: match.score || 0,
    }));
  } catch (error) {
    console.error('Error searching bylaws:', error);
    throw new Error('Failed to search bylaws');
  }
}

/**
 * Filter bylaws by metadata fields
 */
export async function filterBylaws(
  filters: BylawSearchFilters
): Promise<BylawSearchResult[]> {
  try {
    // Get Pinecone index
    const index = getPineconeIndex();
    
    // Build filter
    const filter = buildPineconeFilter(filters);
    
    // Search Pinecone with filter only
    const searchResults = await index.query({
      vector: [], // Empty vector for metadata-only filtering
      topK: 10,
      includeMetadata: true,
      filter,
    });
    
    // Format results
    return (searchResults.matches || []).map(match => ({
      id: match.id,
      text: match.metadata?.text as string,
      metadata: match.metadata as any,
      score: match.score || 0,
    }));
  } catch (error) {
    console.error('Error filtering bylaws:', error);
    throw new Error('Failed to filter bylaws');
  }
}

/**
 * Build a Pinecone filter object from search filters
 */
function buildPineconeFilter(filters: Record<string, any>) {
  const filterConditions: any[] = [];
  
  // Process each filter field
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    
    switch (key) {
      case 'category':
        filterConditions.push({ [key]: { $eq: value } });
        break;
        
      case 'bylawNumber':
        filterConditions.push({ bylawNumber: { $eq: value } });
        break;
        
      case 'dateFrom':
        filterConditions.push({ dateEnacted: { $gte: value } });
        break;
        
      case 'dateTo':
        filterConditions.push({ dateEnacted: { $lte: value } });
        break;
        
      // Add more filter types as needed
      
      default:
        if (typeof value === 'string') {
          filterConditions.push({ [key]: { $eq: value } });
        }
    }
  });
  
  // If we have multiple conditions, combine with $and
  return filterConditions.length > 0
    ? { $and: filterConditions }
    : undefined;
}

/**
 * Get a bylaw document by ID
 */
export async function getBylawById(id: string): Promise<BylawSearchResult | null> {
  try {
    // Get Pinecone index
    const index = getPineconeIndex();
    
    // Fetch vector by ID
    const result = await index.fetch([id]);
    
    // If no result, return null
    if (!result.records || !result.records[id]) {
      return null;
    }
    
    const record = result.records[id];
    
    // Format result
    return {
      id,
      text: record.metadata?.text as string,
      metadata: record.metadata as any,
      score: 1, // Direct lookup has perfect score
    };
  } catch (error) {
    console.error('Error getting bylaw by ID:', error);
    throw new Error('Failed to get bylaw by ID');
  }
}