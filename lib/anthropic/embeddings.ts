import Anthropic from '@anthropic-ai/sdk';

/**
 * Custom embeddings class for Anthropic Claude 3 models that implements
 * a LangChain-like interface
 */
export class AnthropicEmbeddings {
  private client: Anthropic;
  private model: string;

  constructor(
    options: {
      anthropicApiKey?: string;
      model?: string;
    } = {},
  ) {
    const apiKey = options.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({ apiKey });
    this.model = options.model || 'claude-3-haiku-20240307';
  }

  /**
   * Generates embeddings for a single text query
   */
  async embedQuery(text: string): Promise<number[]> {
    // Claude embeddings endpoint requires at least 1 character
    const safeText = text?.trim() || 'Empty text';

    try {
      const response = await this.client.embeddings({
        model: this.model,
        input: safeText,
      });

      return response.embedding;
    } catch (error) {
      console.error(`Error embedding query: ${error.message}`);
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
      const batchPromises = batch.map((text) => this.embedQuery(text));
      batches.push(Promise.all(batchPromises));

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const results = await Promise.all(batches);
    return results.flat();
  }
}
