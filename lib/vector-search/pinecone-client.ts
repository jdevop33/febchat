/**
 * Pinecone Vector Database Client
 *
 * This module provides a connection to the Pinecone vector database,
 * which is used to store and search embeddings of bylaw documents.
 * 
 * Updated for Pinecone SDK v5.0.2+
 */

import { Pinecone } from '@pinecone-database/pinecone';

let pineconeInstance: Pinecone | null = null;

/**
 * Get or create a Pinecone client instance
 * Uses singleton pattern to avoid multiple connections
 */
export function getPineconeClient(): Pinecone {
  if (pineconeInstance) return pineconeInstance;

  const apiKey = process.env.PINECONE_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Pinecone API key must be defined in environment variables',
    );
  }

  // Create Pinecone client using v5.0+ SDK
  const config: any = { apiKey };
  
  // Add environment if specified (optional in newer SDK versions)
  if (process.env.PINECONE_ENVIRONMENT) {
    config.environment = process.env.PINECONE_ENVIRONMENT;
  }
  
  pineconeInstance = new Pinecone(config);

  return pineconeInstance;
}

/**
 * Get the Pinecone index for bylaws
 */
export function getPineconeIndex() {
  const pinecone = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX || 'oak-bay-bylaws-v2';
  
  try {
    // In v5+, direct connection to an index using the host URL
    console.log(`Connecting to Pinecone index: ${indexName}`);
    return pinecone.index(indexName);
  } catch (error) {
    console.error(`Error connecting to Pinecone index ${indexName}:`, error);
    throw new Error(`Failed to connect to Pinecone index: ${error instanceof Error ? error.message : String(error)}`);
  }
}
