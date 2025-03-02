import Anthropic from '@anthropic-ai/sdk';
import { customProvider } from 'ai';

// Constants
export const DEFAULT_CHAT_MODEL: string = 'oak-bay-bylaws';
export const DEFAULT_MODEL_ID = 'claude-3-7-sonnet-20250219'; 
export const FALLBACK_MODEL_ID = 'claude-3-5-sonnet-20240620';

// Log configuration
console.log(`Model configuration:`);
console.log(` - Primary: ${DEFAULT_MODEL_ID}`);
console.log(` - Fallback: ${FALLBACK_MODEL_ID}`);

// Initialize Anthropic client with better error handling
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  timeout: 60000 // 60 second timeout
});

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
