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
        // Parse the prompt content correctly for Anthropic's API
        let system = "";
        let userContent = "";
        
        if (options.prompt && options.prompt.length > 0) {
          if (options.prompt[0].role === 'system') {
            system = typeof options.prompt[0].content === 'string' 
              ? options.prompt[0].content 
              : '';
          }
          
          if (options.prompt.length > 1 && options.prompt[1].role === 'user') {
            userContent = typeof options.prompt[1].content === 'string'
              ? options.prompt[1].content
              : '';
          }
        }
        
        const response = await anthropic.messages.create({
          model: 'claude-3-7-sonnet-20240229',
          max_tokens: 1000,
          system: system,
          messages: [
            {
              role: 'user',
              content: userContent
            }
          ],
          temperature: 0.5,
          stream: false
        });
        
        // Extract text content safely
        let textContent = '';
        if (response.content && response.content.length > 0) {
          const textBlock = response.content.find(block => block.type === 'text');
          if (textBlock && 'text' in textBlock) {
            textContent = textBlock.text;
          }
        }
        
        return {
          text: textContent,
          finishReason: 'stop',
          usage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
          },
          warnings: [],
          rawCall: {
            rawPrompt: options.prompt,
            rawSettings: {
              model: 'claude-3-7-sonnet-20240229',
              max_tokens: 1000,
              temperature: 0.5
            }
          }
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
