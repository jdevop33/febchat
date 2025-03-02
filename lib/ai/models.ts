import Anthropic from '@anthropic-ai/sdk';
import { customProvider } from 'ai';

// Constants
export const DEFAULT_CHAT_MODEL: string = 'oak-bay-bylaws';

// Model configuration using specific model versions for stability in production
// Using explicit model IDs as recommended in the Anthropic documentation
export const DEFAULT_MODEL_ID = 'claude-3-7-sonnet-20250219'; 
export const FALLBACK_MODEL_ID = 'claude-3-5-sonnet-20240620';

// Log model configuration on startup
console.log(`Claude AI configuration:`);
console.log(` - Primary model: ${DEFAULT_MODEL_ID}`);
console.log(` - Fallback model: ${FALLBACK_MODEL_ID}`);

// Initialize the Anthropic client with the required headers and configuration
// Following Anthropic TypeScript SDK documentation
export let anthropic: Anthropic;
try {
  // Initialize Anthropic client following the recommended pattern in documentation
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY, // Will default to process.env["ANTHROPIC_API_KEY"]
    // The SDK automatically handles the required headers
  });
  console.log("Anthropic client initialized successfully");
  // Validate API key at initialization time to fail fast
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('WARNING: ANTHROPIC_API_KEY environment variable is not set. Chat functionality will fail.');
  }
} catch (error) {
  console.error("Error initializing Anthropic client:", error);
  // Create a fallback client that will throw more informative errors
  anthropic = new Anthropic({
    apiKey: 'missing_api_key_see_logs'
  });
  console.error('CRITICAL: Anthropic client failed to initialize properly. Chat functionality will not work.');
}

// Validation moved to the initialization block above

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
          // Following the recommended pattern from Anthropic documentation
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
