import { streamText } from 'ai';
import type { Message } from 'ai';

import { auth } from '@/app/(auth)/auth';
// Import the pre-configured AI SDK models
import { primaryModel, fallbackModel, DEFAULT_MODEL_ID, FALLBACK_MODEL_ID } from '@/lib/ai/models';
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

    // Convert to AI SDK format
    const aiMessages = messages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : String(msg.content)
    }));

    // Create a stream with proper AI SDK pattern
    try {
      console.log(`Chat API: Using AI SDK with model: ${DEFAULT_MODEL_ID}`);
      
      // Use AI SDK's streamText function with primary model
      const stream = await streamText({
        model: primaryModel,
        messages: aiMessages,
        system: systemPrompt({ selectedChatModel }),
        temperature: 0.5,
        maxTokens: 2000,
        onError: async (error) => {
          console.error("Chat API: Primary model failed, falling back:", error);
          
          // Fall back to secondary model
          try {
            console.log(`Chat API: Trying fallback model: ${FALLBACK_MODEL_ID}`);
            const fallbackResult = await streamText({
              model: fallbackModel,
              messages: aiMessages,
              system: systemPrompt({ selectedChatModel }),
              temperature: 0.7,
              maxTokens: 2000,
            });
            
            return fallbackResult;
          } catch (fallbackError) {
            console.error("Chat API: Fallback model also failed:", fallbackError);
            throw fallbackError;
          }
        }
      });
      
      // Create response with data stream
      const response = stream.toDataStreamResponse();
      
      // Save message after response stream starts
      let fullContent = '';
      
      // Create a cloned stream to capture the full response for saving to DB
      const clonedStream = stream.clone();
      
      // Process the cloned stream in the background to save the full message
      (async () => {
        try {
          for await (const chunk of clonedStream) {
            if (chunk.type === 'text') {
              fullContent += chunk.text;
            }
          }
          
          // Save complete response to database
          await saveMessages({
            messages: [{
              id: messageId,
              chatId: id,
              role: 'assistant',
              content: fullContent,
              createdAt: new Date(),
            }],
          });
          console.log("Chat API: Assistant response saved to database");
        } catch (error) {
          console.error("Error saving complete response:", error);
        }
      })();
      
      return response;
    } catch (error) {
      console.error('Chat API: Error in streaming response:', error);
      
      // Ultimate fallback for catastrophic errors
      try {
        console.log("Chat API: Trying simplified fallback");
        
        // Use a simple text response
        const fallbackText = "I apologize, but I encountered an issue processing your request. Please try again.";
        
        // Save to database
        await saveMessages({
          messages: [{
            id: messageId,
            chatId: id,
            role: 'assistant',
            content: fallbackText,
            createdAt: new Date(),
          }],
        });
        
        // Return simple response
        return new Response(
          JSON.stringify({ text: fallbackText }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (finalError) {
        console.error("Chat API: All fallbacks failed:", finalError);
        return createErrorResponse(
          'An error occurred', 
          'All fallback options failed',
          500
        );
      }
    }
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
