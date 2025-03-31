/**
 * Pinecone Vector Database Client
 *
 * This module provides a connection to the Pinecone vector database,
 * which is used to store and search embeddings of bylaw documents.
 *
 * Updated for Pinecone SDK v5.0.2+ with improved error handling and retries
 */

import { Pinecone } from "@pinecone-database/pinecone";

let pineconeInstance: Pinecone | null = null;
let connectionAttempts = 0;
const MAX_RETRIES = 3;

/**
 * Get or create a Pinecone client instance
 * Uses singleton pattern to avoid multiple connections
 * Implements retry logic and better error handling
 */
export function getPineconeClient(): Pinecone {
  if (pineconeInstance) return pineconeInstance;

  const apiKey = process.env.PINECONE_API_KEY;

  if (!apiKey) {
    console.error("Missing Pinecone API key in environment variables");
    throw new Error(
      "Pinecone API key must be defined in environment variables",
    );
  }

  // Create Pinecone client using v5.0+ SDK
  const config: any = { apiKey };

  // Add environment if specified (optional in newer SDK versions)
  if (process.env.PINECONE_ENVIRONMENT) {
    config.environment = process.env.PINECONE_ENVIRONMENT;
  }

  try {
    pineconeInstance = new Pinecone(config);
    connectionAttempts = 0; // Reset counter on successful connection
    return pineconeInstance;
  } catch (error) {
    console.error("Failed to initialize Pinecone client:", error);
    throw new Error(
      `Failed to initialize Pinecone client: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get the Pinecone index for bylaws with retry logic
 */
export function getPineconeIndex() {
  try {
    const pinecone = getPineconeClient();
    const indexName = process.env.PINECONE_INDEX || "oak-bay-bylaws-v2";

    console.log(`Connecting to Pinecone index: ${indexName}`);
    return pinecone.index(indexName);
  } catch (error) {
    connectionAttempts++;
    console.error(
      `Error connecting to Pinecone index (attempt ${connectionAttempts}/${MAX_RETRIES}):`,
      error,
    );

    if (connectionAttempts < MAX_RETRIES) {
      console.log(
        `Retrying connection to Pinecone index (attempt ${connectionAttempts + 1}/${MAX_RETRIES})...`,
      );
      // Wait a bit before retrying (exponential backoff)
      const delay = Math.min(1000 * 2 ** connectionAttempts, 8000);
      return new Promise((resolve) => {
        setTimeout(() => {
          try {
            const index = getPineconeClient().index(
              process.env.PINECONE_INDEX || "oak-bay-bylaws-v2",
            );
            resolve(index);
          } catch (retryError) {
            console.error("Retry failed:", retryError);
            throw new Error(
              `Failed to connect to Pinecone index after retry: ${retryError instanceof Error ? retryError.message : String(retryError)}`,
            );
          }
        }, delay);
      });
    }

    // Reset counter after max retries
    connectionAttempts = 0;

    throw new Error(
      `Failed to connect to Pinecone index after ${MAX_RETRIES} attempts: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
