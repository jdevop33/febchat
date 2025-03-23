import type {
  CoreAssistantMessage,
  CoreToolMessage,
  Message,
  ToolInvocation,
} from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import type { Message as DBMessage, Document } from '@/lib/db/schema';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}

interface ApplicationError extends Error {
  info: any;
  status: number;
}

export const fetcher = async (url: string): Promise<any> => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.') as ApplicationError;
    error.info = await res.json();
    error.status = res.status;
    throw error;
  }

  return res.json();
};

export function getLocalStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) as T : null;
  } catch (error) {
    console.error(`Error parsing localStorage key '${key}':`, error);
    return null;
  }
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function addToolMessageToChat({
  toolMessage,
  messages,
}: {
  toolMessage: CoreToolMessage;
  messages: Array<Message>;
}): Array<Message> {
  return messages.map((message) => {
    if (message.toolInvocations) {
      return {
        ...message,
        toolInvocations: message.toolInvocations.map((toolInvocation) => {
          const toolResult = toolMessage.content.find(
            (tool) => tool.toolCallId === toolInvocation.toolCallId,
          );

          return toolResult ? {
            ...toolInvocation,
            state: 'result',
            result: toolResult.result,
          } : toolInvocation;
        }),
      };
    }

    return message;
  });
}

export function convertToUIMessages(
  messages: Array<DBMessage>,
): Array<Message> {
  if (!messages || !messages.length) return [];

  const result: Array<Message> = [];
  messages.forEach((dbMessage) => {
    const { id, role, content } = dbMessage;
    const message: Message = { id, role } as Message;

    if (role === 'tool') {
      return; // Tool Messages are handled differently and not converted directly
    }

    if (typeof content === 'string') {
      message.content = content;
    } else if (Array.isArray(content)) {
      const textParts: string[] = [];
      const toolInvocations: ToolInvocation[] = [];

      content.forEach((part) => {
        switch (part.type) {
          case 'text':
            textParts.push(part.text);
            break;
          case 'tool-call':
            toolInvocations.push({
              state: 'call',
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              args: part.args,
            });
            break;
          case 'reasoning':
            message.reasoning = part.reasoning;
            break;
        }
      });

      message.content = textParts.join('');
      if (toolInvocations.length > 0) message.toolInvocations = toolInvocations;
    }

    result.push(message);
  });

  addToolMessageToChat({ toolMessage: messages.find(m => m.role === 'tool') as CoreToolMessage, messages: result });
  return result;
}

export function sanitizeResponseMessages({
  messages,
  reasoning,
}: {
  messages: Array<CoreAssistantMessage | CoreToolMessage>;
  reasoning: string | undefined;
}): Array<CoreAssistantMessage | (CoreToolMessage & { id: string; })> {
  const toolResultIds = new Set<string>();

  messages.forEach((message) => {
    if (message.role === 'tool') {
      message.content.forEach((content) => {
        if (content.type === 'tool-result') {
          toolResultIds.add(content.toolCallId);
        }
      });
    }
  });

  return messages.map((message) => {
    if (message.role !== 'assistant') return message;

    const sanitizedContent = message.content.filter((content) =>
      content.type === 'tool-call' ? toolResultIds.has(content.toolCallId) : true
    );

    if (reasoning) {
      sanitizedContent.push({ type: 'reasoning', reasoning });
    }

    return { ...message, content: sanitizedContent };
  }).filter(message => message.content.length > 0);
}

export function sanitizeUIMessages(messages: Array<Message>): Array<Message> {
  return messages.map((message) => {
    if (message.toolInvocations) {
      const toolResultIds = new Set(message.toolInvocations.filter(t => t.state === 'result').map(t => t.toolCallId));
      const sanitizedToolInvocations = message.toolInvocations.filter(t =>
        toolResultIds.has(t.toolCallId)
      );
      return { ...message, toolInvocations: sanitizedToolInvocations };
    }
    return message;
  }).filter(message => message.content.length > 0 || message.toolInvocations?.length > 0);
}

export function getMostRecentUserMessage(messages: Array<Message>): Message | undefined {
  return messages.reverse().find(message => message.role === 'user');
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
): Date {
  return documents[index] ? documents[index].createdAt : new Date();
}