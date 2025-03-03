import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { customProvider } from 'ai';
import { env } from 'node:process';

// Constants - Using Claude 3.7 Sonnet for everything
export const DEFAULT_CHAT_MODEL = 'oak-bay-bylaws';
export const MODEL_ID = 'claude-3-7-sonnet-20250219';

// Environment check
const isProduction = env.NODE_ENV === 'production';

// Log configuration
console.log(`Environment: ${env.NODE_ENV || 'development'}`);
console.log(`Using Claude 3.7 Sonnet for all functionality`);

// In production, ensure API key is set
if (isProduction && !env.ANTHROPIC_API_KEY) {
  console.error('CRITICAL ERROR: ANTHROPIC_API_KEY environment variable is not set in production!');
  throw new Error('Anthropic API key missing in production environment');
}

// Create a simplified provider that uses Claude 3.7 Sonnet for everything
export const myProvider = customProvider({
  languageModels: {
    'oak-bay-bylaws': anthropic(MODEL_ID),
    'chat-model-small': anthropic(MODEL_ID),
    'chat-model-large': anthropic(MODEL_ID),
    'title-model': anthropic(MODEL_ID),
    'artifact-model': anthropic(MODEL_ID),
  },
  imageModels: {
    'small-model': openai.image('dall-e-3'),
    'large-model': openai.image('dall-e-3'),
  },
});

// For compatibility with existing code
export const primaryModel = anthropic(MODEL_ID);
export const fallbackModel = anthropic(MODEL_ID);
export const titleModel = anthropic(MODEL_ID);

// Chat model definitions - keeping this simple
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
