import { openai } from '@ai-sdk/openai';
import { fireworks } from '@ai-sdk/fireworks';
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';

export const DEFAULT_CHAT_MODEL: string = 'bylaw-search';

export const myProvider = customProvider({
  languageModels: {
    'bylaw-search': openai('gpt-4o'),
    'bylaw-expert': openai('gpt-4o'),
    'bylaw-interpreter': wrapLanguageModel({
      model: fireworks('accounts/fireworks/models/deepseek-r1'),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    }),
    'document-model': openai('gpt-4-turbo'),
    'general-assistant': openai('gpt-4o-mini'),
  },
  imageModels: {
    'document-image': openai.image('dall-e-3'),
  },
});

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'bylaw-search',
    name: 'Bylaw Search',
    description: 'Specialized for Oak Bay municipal bylaw inquiries',
  },
  {
    id: 'bylaw-expert',
    name: 'Bylaw Expert',
    description: 'Advanced interpretation of complex municipal regulations',
  },
  {
    id: 'bylaw-interpreter',
    name: 'Bylaw Interpreter',
    description: 'Detailed reasoning for bylaw interpretation questions',
  },
  {
    id: 'general-assistant',
    name: 'General Assistant',
    description: 'Fast, general-purpose municipal information',
  },
];
