import Anthropic from '@anthropic-ai/sdk';
import { customProvider } from 'ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Constants
export const DEFAULT_CHAT_MODEL: string = 'oak-bay-bylaws';
export const DEFAULT_MODEL_ID = 'claude-3-7-sonnet-20250219'; 
export const FALLBACK_MODEL_ID = 'claude-3-5-sonnet-20240620';

// Log configuration
console.log(`Model configuration:`);
console.log(` - Primary: ${DEFAULT_MODEL_ID}`);
console.log(` - Fallback: ${FALLBACK_MODEL_ID}`);

// Safety check for API key format
const apiKey = process.env.ANTHROPIC_API_KEY || '';
if (!apiKey) {
  console.error('CRITICAL ERROR: ANTHROPIC_API_KEY environment variable is not set');
}
if (apiKey && !apiKey.startsWith('sk-ant-')) {
  console.error('WARNING: ANTHROPIC_API_KEY format appears incorrect (should start with sk-ant-)');
}

// Initialize Anthropic client with better error handling
export let anthropic: Anthropic;
try {
  anthropic = new Anthropic({
    apiKey: apiKey,
    timeout: 60000 // 60 second timeout
  });
} catch (error) {
  console.error("Error initializing Anthropic client:", error);
  // Create a fallback client that will throw better errors
  anthropic = new Anthropic({
    apiKey: 'invalid_key_see_server_logs'
  });
}

// Custom provider with simpler implementation
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
        const system = extractSystemPrompt(options.prompt);
        const userContent = extractUserContent(options.prompt);
        
        try {
          const response = await anthropic.messages.create({
            model: DEFAULT_MODEL_ID,
            max_tokens: 1000,
            system,
            messages: [{ 
              role: 'user', 
              content: [{ type: 'text', text: userContent }]
            }],
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
              rawSettings: { model: DEFAULT_MODEL_ID, max_tokens: 1000 }
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
    ? prompt[0].content : '';
}

function extractUserContent(prompt: any): string {
  if (!prompt?.length || prompt.length < 2) return '';
  return prompt[1]?.role === 'user' && typeof prompt[1].content === 'string'
    ? prompt[1].content : '';
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
