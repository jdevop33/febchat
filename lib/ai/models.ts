import { customProvider } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export const DEFAULT_CHAT_MODEL: string = 'oak-bay-bylaws';

export const myProvider = customProvider({
  languageModels: {
    'oak-bay-bylaws': anthropic('claude-3-7-sonnet-20240229'),
  },
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
