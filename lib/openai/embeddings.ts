import OpenAI from 'openai';

/**
 * Custom embeddings class that uses OpenAI for embeddings
 * but implements a LangChain-like interface for compatibility
 */
export class PineconeEmbeddings {
  private client: OpenAI;
  private model: string;

  constructor(
    options: {
      openAIApiKey?: string;
      model?: string;
    } = {},
  ) {
    const apiKey = options.openAIApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({ apiKey });
    this.model = options.model || 'text-embedding-3-small';
  }

  /**
   * Generates embeddings for a single text query
   */
  async embedQuery(text: string): Promise<number[]> {
    // Embedding requires at least 1 character
    const safeText = text?.trim() || 'Empty text';

    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: safeText,
      });

      return response.data[0].embedding;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error embedding query: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Generates embeddings for a batch of texts
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    // Process in batches to avoid hitting API limits
    const batchSize = 10; // Adjust as needed
    const batches = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      try {
        // OpenAI can handle multiple inputs in a single request
        const response = await this.client.embeddings.create({
          model: this.model,
          input: batch,
        });
        
        // Extract the embeddings
        const batchEmbeddings = response.data.map((item) => item.embedding);
        batches.push(batchEmbeddings);
        
        // Add a small delay between batches to avoid rate limiting
        if (i + batchSize < texts.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error embedding batch starting at index ${i}:`, errorMessage);
        
        // Fall back to individual queries if batch fails
        console.log(`Falling back to individual queries for batch starting at index ${i}`);
        const batchPromises = batch.map((text) => this.embedQuery(text));
        const batchResults = await Promise.all(batchPromises);
        batches.push(batchResults);
      }
    }

    // Flatten the batches back into a single array
    return batches.flat();
  }
}
