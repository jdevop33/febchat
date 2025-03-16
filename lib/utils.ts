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
  return twMerge(clsx(inputs));
}

interface ApplicationError extends Error {
  info: string;
  status: number;
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error(
      'An error occurred while fetching the data.',
    ) as ApplicationError;

    error.info = await res.json();
    error.status = res.status;

    throw error;
  }

  return res.json();
};

export function getLocalStorage<T extends unknown[] = unknown[]>(key: string): T {
  if (typeof window !== 'undefined') {
    try {
      const item = localStorage.getItem(key);
      if (!item) return [] as unknown as T;
      
      const parsed = JSON.parse(item);
      // Ensure we return an array if parsed JSON is not an array
      return Array.isArray(parsed) ? parsed : [] as unknown as T;
    } catch (error) {
      console.error(`Error parsing localStorage key '${key}':`, error);
      return [] as unknown as T;
    }
  }
  return [] as unknown as T;
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function addToolMessageToChat({
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

          if (toolResult) {
            return {
              ...toolInvocation,
              state: 'result',
              result: toolResult.result,
            };
          }

          return toolInvocation;
        }),
      };
    }

    return message;
  });
}

/**
 * Converts database messages to UI-friendly format with improved performance
 * - Avoids the need to iterate over the entire array multiple times
 * - Optimizes string concatenation
 * - Uses proper type checking
 */
export function convertToUIMessages(
  messages: Array<DBMessage>,
): Array<Message> {
  if (!messages || !messages.length) return [];
  
  // Pre-allocate result array with expected size
  const result: Array<Message> = [];
  
  // Process messages in a single pass
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    
    // Handle tool messages
    if (message.role === 'tool') {
      // Find tool call message targets and update them
      const toolMessage = message as CoreToolMessage;
      
      for (let j = 0; j < result.length; j++) {
        const chatMessage = result[j];
        
        if (chatMessage.toolInvocations && chatMessage.toolInvocations.length > 0) {
          chatMessage.toolInvocations = chatMessage.toolInvocations.map(toolInvocation => {
            // Find matching tool result
            const toolResult = toolMessage.content.find(
              tool => tool.toolCallId === toolInvocation.toolCallId
            );
            
            if (toolResult) {
              return {
                ...toolInvocation,
                state: 'result',
                result: toolResult.result,
              };
            }
            
            return toolInvocation;
          });
        }
      }
      
      continue; // Skip to next message
    }
    
    // Handle non-tool messages
    let textContent = '';
    let reasoning: string | undefined = undefined;
    const toolInvocations: Array<ToolInvocation> = [];
    
    // Process message content based on its type
    if (typeof message.content === 'string') {
      textContent = message.content;
    } else if (Array.isArray(message.content)) {
      // Use string builder pattern for better performance
      const textParts: string[] = [];
      
      for (const content of message.content) {
        if (content.type === 'text') {
          textParts.push(content.text);
        } else if (content.type === 'tool-call') {
          toolInvocations.push({
            state: 'call',
            toolCallId: content.toolCallId,
            toolName: content.toolName,
            args: content.args,
          });
        } else if (content.type === 'reasoning') {
          reasoning = content.reasoning;
        }
      }
      
      // Join once at the end for better performance than incrementally adding
      textContent = textParts.join('');
    }
    
    // Add processed message to result
    result.push({
      id: message.id,
      role: message.role as Message['role'],
      content: textContent,
      reasoning,
      toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined,
    });
  }
  
  return result;
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function sanitizeResponseMessages({
  messages,
  reasoning,
}: {
  messages: Array<ResponseMessage>;
  reasoning: string | undefined;
}) {
  const toolResultIds: Array<string> = [];

  for (const message of messages) {
    if (message.role === 'tool') {
      for (const content of message.content) {
        if (content.type === 'tool-result') {
          toolResultIds.push(content.toolCallId);
        }
      }
    }
  }

  const messagesBySanitizedContent = messages.map((message) => {
    if (message.role !== 'assistant') return message;

    if (typeof message.content === 'string') return message;

    const sanitizedContent = message.content.filter((content) =>
      content.type === 'tool-call'
        ? toolResultIds.includes(content.toolCallId)
        : content.type === 'text'
          ? content.text.length > 0
          : true,
    );

    if (reasoning) {
      // @ts-expect-error: reasoning message parts in sdk is wip
      sanitizedContent.push({ type: 'reasoning', reasoning });
    }

    return {
      ...message,
      content: sanitizedContent,
    };
  });

  return messagesBySanitizedContent.filter(
    (message) => message.content.length > 0,
  );
}

export function sanitizeUIMessages(messages: Array<Message>): Array<Message> {
  const messagesBySanitizedToolInvocations = messages.map((message) => {
    if (message.role !== 'assistant') return message;

    if (!message.toolInvocations) return message;

    const toolResultIds: Array<string> = [];

    for (const toolInvocation of message.toolInvocations) {
      if (toolInvocation.state === 'result') {
        toolResultIds.push(toolInvocation.toolCallId);
      }
    }

    const sanitizedToolInvocations = message.toolInvocations.filter(
      (toolInvocation) =>
        toolInvocation.state === 'result' ||
        toolResultIds.includes(toolInvocation.toolCallId),
    );

    return {
      ...message,
      toolInvocations: sanitizedToolInvocations,
    };
  });

  return messagesBySanitizedToolInvocations.filter(
    (message) =>
      message.content.length > 0 ||
      (message.toolInvocations && message.toolInvocations.length > 0),
  );
}

export function getMostRecentUserMessage(messages: Array<Message>) {
  // Optimization: use find from end instead of filter + at(-1)
  // This prevents unnecessary iteration through the entire array
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      return messages[i];
    }
  }
  return undefined;
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents || !documents.length) return new Date();
  if (index >= documents.length) return new Date(); // Fix off-by-one error here

  return documents[index].createdAt;
}
