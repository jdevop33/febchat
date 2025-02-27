/**
 * Pinecone Vector Database Client
 *
 * This module provides a connection to the Pinecone vector database,
 * which is used to store and search embeddings of bylaw documents.
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

  pineconeInstance = new Pinecone({
    apiKey,
  });

  return pineconeInstance;
}

/**
 * Get the Pinecone index for bylaws
 */
export function getPineconeIndex() {
  const pinecone = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX || 'oak-bay-bylaws';

  return pinecone.index(indexName);
}
