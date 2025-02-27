import Anthropic from '@anthropic-ai/sdk';
import { customProvider } from 'ai';

export const DEFAULT_CHAT_MODEL: string = 'oak-bay-bylaws';

// Initialize the Anthropic client
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',  // Fallback to empty string if not set
});

export const myProvider = customProvider({
  languageModels: {
    'title-model': {
      specificationVersion: 'v1',
      provider: 'anthropic',
      modelId: 'claude-3-7-sonnet-20240229',
      supportsImageUrls: true,
      supportsStructuredOutputs: true,
      defaultObjectGenerationMode: 'json',
      async doGenerate(options) {
        const stream = await anthropic.messages.create({
          model: 'claude-3-7-sonnet-20240229',
          max_tokens: 1000,
          system: options.prompt[0].content,
          messages: [
            {
              role: 'user',
              content: options.prompt[1].content
            }
          ],
          temperature: 0.5,
          stream: false
        });
        
        return {
          text: stream.content[0].text,
          finishReason: 'stop',
          usage: {
            promptTokens: 0,
            completionTokens: 0
          },
          warnings: []
        };
      },
      async doStream(options) {
        throw new Error('Streaming not implemented for this model');
      }
    }
  }
});

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'oak-bay-bylaws',
    name: 'Oak Bay Bylaws Assistant',
    description: 'Specialized for Oak Bay municipal bylaw inquiries',
  },
];
