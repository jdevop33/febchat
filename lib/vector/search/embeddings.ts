/**
 * Embedding utilities for vector search
 */
import { OpenAIEmbeddings } from "@langchain/openai";
import type { EmbeddingModel } from "./types";

// Cached embeddings model
let embeddingsModel: EmbeddingModel | null = null;

/**
 * Initialize the OpenAI embeddings model with caching
 */
export function getEmbeddingsModel(): EmbeddingModel {
  if (!embeddingsModel) {
    embeddingsModel = new OpenAIEmbeddings({
      modelName: "text-embedding-3-small",
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }
  return embeddingsModel;
}

/**
 * Reset the embeddings model (primarily for testing)
 */
export function resetEmbeddingsModel(): void {
  embeddingsModel = null;
}
