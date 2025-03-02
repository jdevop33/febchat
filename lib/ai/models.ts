import Anthropic from '@anthropic-ai/sdk';
import { customProvider } from 'ai';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Constants
export const DEFAULT_CHAT_MODEL: string = 'oak-bay-bylaws';

// Model configuration using specific model versions for stability in production
// Using explicit model IDs as recommended in the Anthropic documentation
export const DEFAULT_MODEL_ID = 'claude-3-7-sonnet-20250219'; 
export const FALLBACK_MODEL_ID = 'claude-3-5-sonnet-20240620';

// Log model configuration and environment variables on startup
console.log(`Claude AI configuration:`);
console.log(` - Primary model: ${DEFAULT_MODEL_ID}`);
console.log(` - Fallback model: ${FALLBACK_MODEL_ID}`);

// Check and log critical environment variables (safely)
console.log(`Environment diagnostics:`);
console.log(` - Anthropic API Key: ${process.env.ANTHROPIC_API_KEY ? `${process.env.ANTHROPIC_API_KEY.slice(0, 10)}...` : 'MISSING'}`);
console.log(` - OpenAI API Key: ${process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.slice(0, 10)}...` : 'MISSING'}`);
console.log(` - Postgres URL: ${process.env.POSTGRES_URL ? `${process.env.POSTGRES_URL.slice(0, 20)}...` : 'MISSING'}`);
console.log(` - Pinecone API Key: ${process.env.PINECONE_API_KEY ? `${process.env.PINECONE_API_KEY.slice(0, 10)}...` : 'MISSING'}`);
console.log(` - Pinecone Index: ${process.env.PINECONE_INDEX || 'MISSING'}`);
console.log(` - Node Environment: ${process.env.NODE_ENV || 'development'}`);

// Additional safety check for Anthropic key format
if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
  console.error(`⚠️ WARNING: Anthropic API key has wrong format! Should start with 'sk-ant-'`);
}

// Initialize the Anthropic client with the required headers and configuration
// Following Anthropic TypeScript SDK documentation
export let anthropic: Anthropic;

// Validate API key format and initialize client
const apiKey = process.env.ANTHROPIC_API_KEY || '';

// Check if API key is set
if (!apiKey || apiKey.trim() === '') {
  console.error('CRITICAL ERROR: ANTHROPIC_API_KEY environment variable is not set or empty');
  console.error('Chat functionality will fail until this is fixed');
}

// Check if API key format looks valid (basic check)
if (apiKey && !apiKey.startsWith('sk-ant-')) {
  console.error('WARNING: ANTHROPIC_API_KEY does not start with "sk-ant-" which is the expected format');
  console.error('This may cause authentication errors with the Anthropic API');
}

try {
  // Initialize Anthropic client following the recommended pattern in documentation
  anthropic = new Anthropic({
    apiKey: apiKey,
    // Adding reasonable timeout to prevent hanging requests
    timeout: 60000 // 60 seconds timeout
  });
  console.log("Anthropic client initialized successfully");
} catch (error) {
  console.error("Error initializing Anthropic client:", error);
  // Create a fallback client that will throw more informative errors when used
  anthropic = new Anthropic({
    apiKey: 'invalid_key_see_server_logs'
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
