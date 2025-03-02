import Anthropic from '@anthropic-ai/sdk';
import { customProvider } from 'ai';

// Constants
export const DEFAULT_CHAT_MODEL: string = 'oak-bay-bylaws';

// Model configuration with environment variable fallbacks for flexibility
export const DEFAULT_MODEL_ID = process.env.CLAUDE_MODEL || 'claude-3-7-sonnet-20250219'; 
export const FALLBACK_MODEL_ID = process.env.CLAUDE_FALLBACK_MODEL || 'claude-3-5-sonnet-20240620';

// Log model configuration on startup
console.log(`Claude AI configuration:`);
console.log(` - Primary model: ${DEFAULT_MODEL_ID}`);
console.log(` - Fallback model: ${FALLBACK_MODEL_ID}`);

// Initialize the Anthropic client
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '', // Empty string will cause explicit errors
});

// Validate environment during initialization
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY environment variable is not set. Chat functionality will fail.');
}

// Custom provider for title generation
export const myProvider = customProvider({
  languageModels: {
    'title-model': {
      specificationVersion: 'v1',
      provider: 'anthropic',
      modelId: DEFAULT_MODEL_ID,
      supportsImageUrls: true,
      supportsStructuredOutputs: true,
      defaultObjectGenerationMode: 'json',
      async doGenerate(options) {
        // Extract prompt content
        const system = extractSystemPrompt(options.prompt);
        const userContent = extractUserContent(options.prompt);
        
        try {
          const response = await anthropic.messages.create({
            model: DEFAULT_MODEL_ID,
            max_tokens: 1000,
            system,
            messages: [{ role: 'user', content: userContent }],
            temperature: 0.5,
            stream: false
          });
          
          return {
            text: extractTextContent(response),
            finishReason: 'stop',
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            warnings: [],
            rawCall: {
              rawPrompt: options.prompt,
              rawSettings: {
                model: DEFAULT_MODEL_ID,
                max_tokens: 1000,
                temperature: 0.5
              }
            }
          };
        } catch (error) {
          console.error('Error in title generation:', error);
          throw error;
        }
      },
      async doStream() {
        throw new Error('Streaming not implemented for title-model');
      }
    }
  }
});

// Helper functions
function extractSystemPrompt(prompt: any): string {
  if (!prompt?.length) return '';
  return prompt[0]?.role === 'system' && typeof prompt[0].content === 'string' 
    ? prompt[0].content 
    : '';
}

function extractUserContent(prompt: any): string {
  if (!prompt?.length || prompt.length < 2) return '';
  return prompt[1]?.role === 'user' && typeof prompt[1].content === 'string'
    ? prompt[1].content
    : '';
}

function extractTextContent(response: any): string {
  if (!response?.content?.length) return '';
  const textBlock = response.content.find((block: any) => block.type === 'text');
  return textBlock && 'text' in textBlock ? textBlock.text : '';
}

// Chat model definitions
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
