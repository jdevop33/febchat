import { createDataStreamResponse } from 'ai';
import type { Message } from 'ai';

import { auth } from '@/app/(auth)/auth';
// Import the pre-configured Anthropic client and model IDs
import { anthropic, DEFAULT_MODEL_ID, FALLBACK_MODEL_ID } from '@/lib/ai/models';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
} from '@/lib/utils';
import type { BylawToolResult } from '@/lib/bylaw-search/types';
// Import Anthropic SDK for error handling
import Anthropic from '@anthropic-ai/sdk';

import { generateTitleFromUserMessage } from '../../actions';

export const maxDuration = 300; // 5 minutes max duration

// Helper function for error responses
const createErrorResponse = (message: string, details?: string, status = 500) => {
  return new Response(
    JSON.stringify({ error: message, details }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
};

export async function POST(request: Request) {
  console.log("Chat API: Request received");
  try {
    // Check API key at the beginning
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("Chat API: Missing API key");
      return createErrorResponse(
        'Server configuration error: Missing API key',
        'The API key for the AI service is not configured. Please set ANTHROPIC_API_KEY.'
      );
    }

    // Parse request
    let requestData;
    try {
      requestData = await request.json();
      console.log("Chat API: Request data parsed");
    } catch (parseError) {
      console.error("Chat API: JSON parse error:", parseError);
      return createErrorResponse('Invalid JSON in request', undefined, 400);
    }

    const { id, messages, selectedChatModel } = requestData;
    console.log(`Chat API: Processing request for chat ID: ${id}`);

    // Validate required fields
    if (!id || !messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("Chat API: Missing required fields");
      return createErrorResponse('Invalid request format', 'Missing required fields', 400);
    }

    // User authentication
    const session = await auth();
    if (!session?.user?.id) {
      console.error("Chat API: User not authenticated");
      return createErrorResponse('Unauthorized', undefined, 401);
    }

    // Get user message
    const userMessage = getMostRecentUserMessage(messages);
    if (!userMessage || typeof userMessage.content !== 'string' || userMessage.content.trim() === '') {
      console.error("Chat API: Invalid or empty user message");
      return createErrorResponse('Invalid user message', undefined, 400);
    }

    // Get or create chat
    let chat;
    try {
      chat = await getChatById({ id });
      if (!chat) {
        console.log(`Chat API: Creating new chat with ID: ${id}`);
        const title = await generateTitleFromUserMessage({ message: userMessage });
        await saveChat({ id, userId: session.user.id, title });
      }
    } catch (chatError) {
      console.error("Chat API: Error getting/creating chat:", chatError);
      return createErrorResponse(
        'Database error',
        'Error accessing chat data',
        500
      );
    }

    // Save user message
    try {
      await saveMessages({
        messages: [{ ...userMessage, createdAt: new Date(), chatId: id }],
      });
      console.log("Chat API: User message saved");
    } catch (saveError) {
      console.error("Chat API: Error saving user message:", saveError);
      return createErrorResponse(
        'Database error',
        'Error saving message data',
        500
      );
    }

    // Create message ID for later saving
    const messageId = generateUUID();

    // Create simple messages format for Claude with proper typing
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
      content: typeof msg.content === 'string' 
        ? [{ type: 'text' as const, text: msg.content }]
        : [{ type: 'text' as const, text: String(msg.content) }]
    }));

    // Return streaming response
    return createDataStreamResponse({
      execute: async (writer) => {
        let completion = '';
        
        try {
          // Create stream with fallback option
          let stream;
          try {
            console.log(`Chat API: Trying primary model: ${DEFAULT_MODEL_ID}`);
            stream = await anthropic.messages.create({
              model: DEFAULT_MODEL_ID,
              max_tokens: 2000,
              system: systemPrompt({ selectedChatModel }),
              messages: formattedMessages,
              temperature: 0.5,
              stream: true
            });
          } catch (error) {
            console.error("Chat API: Primary model failed, falling back:", error);
            stream = await anthropic.messages.create({
              model: FALLBACK_MODEL_ID,
              max_tokens: 2000,
              system: systemPrompt({ selectedChatModel }),
              messages: formattedMessages,
              temperature: 0.7,
              stream: true
            });
          }
          
          // Process stream - with proper type handling for Anthropic stream chunks
          for await (const chunk of stream) {
            try {
              // Only handle content_block_delta chunks safely
              if (chunk.type === 'content_block_delta' && chunk.delta) {
                // We need to safely handle the delta content
                // Different delta types have different structures
                if ('text' in chunk.delta && typeof chunk.delta.text === 'string') {
                  const text = chunk.delta.text;
                  completion += text;
                  writer.writeData({ text });
                }
              }
            } catch (chunkError) {
              console.error("Error processing chunk:", chunkError);
              // Continue processing remaining chunks
            }
          }
          
          // Save complete response to database
          await saveMessages({
            messages: [{
              id: messageId,
              chatId: id,
              role: 'assistant',
              content: completion,
              createdAt: new Date(),
            }],
          });
          console.log("Chat API: Assistant response saved to database");
        } catch (error) {
          console.error('Chat API: Error in streaming response:', error);
          
          // Non-streaming fallback as last resort
          try {
            console.log("Chat API: Trying non-streaming fallback");
            const response = await anthropic.messages.create({
              model: FALLBACK_MODEL_ID,
              max_tokens: 1000,
              system: "You are a helpful assistant for Oak Bay bylaws. Be concise and direct.",
              messages: [{ 
                role: 'user' as const, 
                content: [{ 
                  type: 'text' as const, 
                  text: typeof userMessage.content === 'string' 
                    ? userMessage.content.substring(0, 500) 
                    : 'Hello' 
                }]
              }],
              temperature: 0.7,
              stream: false
            });
            
            const textContent = response.content[0];
            const text = textContent && 'text' in textContent ? textContent.text : "I apologize, but I encountered an issue processing your request.";
            writer.writeData({ text });
            
            // Save to database
            await saveMessages({
              messages: [{
                id: messageId,
                chatId: id,
                role: 'assistant',
                content: text,
                createdAt: new Date(),
              }],
            });
            console.log("Chat API: Fallback response saved to database");
          } catch (finalError) {
            console.error("Chat API: All fallbacks failed:", finalError);
            writer.writeData({ 
              text: "\n\nI apologize, but there was an error processing your request. Please try again." 
            });
          }
        }
      }
    });
  } catch (error) {
    console.error('Unexpected error in chat API:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return createErrorResponse('Not Found', undefined, 404);
  }

  const session = await auth();
  if (!session?.user?.id) {
    return createErrorResponse('Unauthorized', undefined, 401);
  }

  try {
    const chat = await getChatById({ id });
    if (!chat || chat.userId !== session.user.id) {
      return createErrorResponse('Unauthorized', undefined, 401);
    }

    await deleteChatById({ id });
    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return createErrorResponse(
      'An error occurred while processing your request',
      process.env.NODE_ENV === 'development' ? String(error) : undefined
    );
  }
}
