import { anthropic } from '@ai-sdk/anthropic';
import { createAI } from 'ai';

export const DEFAULT_CHAT_MODEL: string = 'oak-bay-bylaws';

export const AI = createAI({
  provider: anthropic,
  model: 'claude-3-7-sonnet-20240229',
  mode: 'chat',
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
