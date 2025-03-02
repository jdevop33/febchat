import { anthropic as anthropicProvider } from '@ai-sdk/anthropic';
import { customProvider } from 'ai';
import { env } from 'node:process';

// Constants
export const DEFAULT_CHAT_MODEL: string = 'oak-bay-bylaws';
export const DEFAULT_MODEL_ID = 'claude-3-7-sonnet-20250219'; 
export const FALLBACK_MODEL_ID = 'claude-3-5-sonnet-20240620';

// Environment check
const isProduction = env.NODE_ENV === 'production';

// Log configuration
console.log(`Environment: ${env.NODE_ENV || 'development'}`);
console.log(`Model configuration:`);
console.log(` - Primary: ${DEFAULT_MODEL_ID}`);
console.log(` - Fallback: ${FALLBACK_MODEL_ID}`);

// In production, ensure API key is set
if (isProduction && !env.ANTHROPIC_API_KEY) {
  console.error('CRITICAL ERROR: ANTHROPIC_API_KEY environment variable is not set in production!');
  throw new Error('Anthropic API key missing in production environment');
}

// Create AI SDK model instances with anthropicProvider
export const primaryModel = anthropicProvider(DEFAULT_MODEL_ID, {
  apiKey: env.ANTHROPIC_API_KEY,
});

export const fallbackModel = anthropicProvider(FALLBACK_MODEL_ID, {
  apiKey: env.ANTHROPIC_API_KEY,
});

// Title model for generating chat titles
export const titleModel = anthropicProvider(DEFAULT_MODEL_ID, {
  apiKey: env.ANTHROPIC_API_KEY
});

// Helper functions for handling AI SDK prompt types
function extractSystemPrompt(prompt: any): string {
  if (!prompt?.length) return '';
  // Handle AI SDK prompt structure
  const firstItem = prompt[0];
  if (firstItem?.role === 'system') {
    // Handle multiple content formats
    if (typeof firstItem.content === 'string') {
      return firstItem.content;
    } else if (Array.isArray(firstItem.content)) {
      // If it's an array of content parts, extract the text
      for (const part of firstItem.content) {
        if (part.type === 'text') {
          return part.text;
        }
      }
    }
  }
  return '';
}

function extractUserContent(prompt: any): string {
  if (!prompt?.length || prompt.length < 2) return '';
  // Handle AI SDK prompt structure
  const userItem = prompt.find((item: any) => item.role === 'user') || prompt[1];
  
  // Handle multiple content formats
  if (typeof userItem?.content === 'string') {
    return userItem.content;
  } else if (Array.isArray(userItem?.content)) {
    // If it's an array of content parts, join the text parts
    return userItem.content
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join("\n");
  }
  return '';
}

function extractTextContent(response: Anthropic.Message): string {
  if (!response?.content?.length) return '';
  
  // Handle different content block types safely
  for (const block of response.content) {
    if (block.type === 'text' && 'text' in block) {
      return block.text;
    }
  }
  
  return '';
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
