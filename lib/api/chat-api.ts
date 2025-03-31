/**
 * Chat API Client
 *
 * Provides client-side functions for interacting with the chat API endpoints
 */

import { nanoid } from "nanoid";

/**
 * Types for chat API interactions
 */
export interface ChatApiMessage {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  createdAt: Date;
}

export interface ChatApiRequest {
  messages: ChatApiMessage[];
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export interface ChatApiResponse {
  message: ChatApiMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Sends a chat request to the API
 */
export async function sendChatRequest(
  request: ChatApiRequest,
): Promise<ChatApiResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Chat API error: ${error}`);
  }

  return response.json();
}

/**
 * Creates a new chat
 */
export async function createChat(title: string): Promise<{ id: string }> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Create chat error: ${error}`);
  }

  return response.json();
}

/**
 * Fetches chat history
 */
export async function getChatHistory(): Promise<
  { id: string; title: string; updatedAt: string }[]
> {
  const response = await fetch("/api/history");

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Get chat history error: ${error}`);
  }

  return response.json();
}

/**
 * Creates a client-side message object
 */
export function createClientMessage(
  content: string,
  role: "user" | "assistant" | "system" = "user",
): ChatApiMessage {
  return {
    id: nanoid(),
    content,
    role,
    createdAt: new Date(),
  };
}
