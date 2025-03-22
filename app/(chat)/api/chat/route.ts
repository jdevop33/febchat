import { streamText } from 'ai';

import { auth } from '@/app/(auth)/auth';
// Import the pre-configured AI SDK models
import { primaryModel, MODEL_ID } from '@/lib/ai/models';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { generateUUID, getMostRecentUserMessage } from '@/lib/utils';

// Simple in-memory rate limiter
// In production, use a distributed solution like Redis
interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const USER_RATE_LIMITS: Record<string, RateLimitInfo> = {};
const IP_RATE_LIMITS: Record<string, RateLimitInfo> = {};

// Rate limit settings
const RATE_LIMIT_REQUESTS = Number.parseInt(
  process.env.RATE_LIMIT_REQUESTS || '10',
  10,
); // Requests per window
const RATE_LIMIT_WINDOW_MS = Number.parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || '60000',
  10,
); // 1 minute window

function isRateLimited(userId: string, ip: string): boolean {
  const now = Date.now();

  // Check user rate limit if logged in
  if (userId) {
    if (!USER_RATE_LIMITS[userId] || USER_RATE_LIMITS[userId].resetTime < now) {
      USER_RATE_LIMITS[userId] = {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW_MS,
      };
    } else if (USER_RATE_LIMITS[userId].count >= RATE_LIMIT_REQUESTS) {
      return true; // User is rate limited
    } else {
      USER_RATE_LIMITS[userId].count++;
    }
  }

  // Always also check IP rate limit (prevents abuse even with stolen credentials)
  if (!IP_RATE_LIMITS[ip] || IP_RATE_LIMITS[ip].resetTime < now) {
    IP_RATE_LIMITS[ip] = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
  } else if (IP_RATE_LIMITS[ip].count >= RATE_LIMIT_REQUESTS * 2) {
    // IP gets double the user limit
    return true; // IP is rate limited
  } else {
    IP_RATE_LIMITS[ip].count++;
  }

  return false;
}

import { generateTitleFromUserMessage } from '../../actions';

export const maxDuration = 300; // 5 minutes max duration

// Helper function for error responses
const createErrorResponse = (
  message: string,
  details?: string,
  status = 500,
) => {
  return new Response(JSON.stringify({ error: message, details }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};

export async function POST(request: Request) {
  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Chat API: Request received');
  }

  // Declare IP variable at the top level of the function
  let ip = '';

  try {
    // Get client IP for rate limiting
    ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown-ip';

    // Check API key at the beginning
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('Chat API: Missing Anthropic API key');
      return createErrorResponse(
        'Server configuration error',
        process.env.NODE_ENV === 'development' ? 'Missing API key' : undefined,
      );
    }

    // Parse request
    let requestData: { id: string; messages: any[]; selectedChatModel: string };
    try {
      requestData = (await request.json()) as {
        id: string;
        messages: any[];
        selectedChatModel: string;
      };
      if (process.env.NODE_ENV === 'development') {
        console.log('Chat API: Request data parsed');
      }
    } catch (parseError) {
      console.error('Chat API: JSON parse error');
      return createErrorResponse('Invalid request format', undefined, 400);
    }

    const { id, messages, selectedChatModel } = requestData;

    if (process.env.NODE_ENV === 'development') {
      console.log(`Chat API: Processing request for chat ID: ${id}`);
    }

    // Validate required fields
    if (!id || !messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Chat API: Missing required fields');
      return createErrorResponse('Invalid request format', undefined, 400);
    }

    // User authentication
    const session = await auth();
    if (!session?.user?.id) {
      console.error('Chat API: User not authenticated');
      return createErrorResponse('Unauthorized', undefined, 401);
    }

    // Apply rate limiting
    const userId = session.user.id;
    // IP was already captured at the beginning of the function

    if (isRateLimited(userId, ip)) {
      console.warn(`Rate limit exceeded for user ${userId} from IP ${ip}`);
      return createErrorResponse(
        'Too many requests',
        'Please try again later',
        429,
      );
    }

    // Get user message
    const userMessage = getMostRecentUserMessage(messages);
    if (
      !userMessage ||
      typeof userMessage.content !== 'string' ||
      userMessage.content.trim() === ''
    ) {
      console.error('Chat API: Invalid or empty user message');
      return createErrorResponse('Invalid user message', undefined, 400);
    }

    // Get or create chat
    let chat: any;
    try {
      // Add more detailed error logging
      console.log(`Chat API: Attempting to get chat with ID: ${id}`);
      chat = await getChatById({ id });

      if (!chat) {
        console.log(
          `Chat API: Chat not found, creating new chat with ID: ${id}`,
        );
        try {
          const title = await generateTitleFromUserMessage({
            message: userMessage,
          });
          console.log(`Chat API: Generated title: "${title}"`);

          console.log(`Chat API: Saving new chat with ID: ${id}`);
          await saveChat({ id, userId: session.user.id, title });
          console.log('Chat API: New chat created successfully');
        } catch (titleError) {
          console.error('Chat API: Error generating title:', titleError);
          // Fall back to a generic title if title generation fails
          console.log(`Chat API: Using fallback title for chat ID: ${id}`);
          await saveChat({ id, userId: session.user.id, title: 'New Chat' });
        }
      } else {
        console.log(`Chat API: Found existing chat with ID: ${id}`);
      }
    } catch (chatError) {
      console.error('Chat API: Error getting/creating chat:', chatError);
      // Include more detailed error information in development
      const errorDetails =
        process.env.NODE_ENV === 'development'
          ? `Error: ${chatError instanceof Error ? chatError.message : String(chatError)}`
          : 'Error accessing chat data';

      return createErrorResponse('Database error', errorDetails, 500);
    }

    // Save user message
    try {
      console.log(`Chat API: Saving user message to chat ID: ${id}`);
      const messageToSave = {
        ...userMessage,
        createdAt: new Date(),
        chatId: id,
      };

      await saveMessages({
        messages: [messageToSave],
      });
      console.log('Chat API: User message saved successfully');
    } catch (saveError) {
      console.error('Chat API: Error saving user message:', saveError);

      // Include more detailed error information in development
      const errorDetails =
        process.env.NODE_ENV === 'development'
          ? `Error: ${saveError instanceof Error ? saveError.message : String(saveError)}`
          : 'Error saving message data';

      return createErrorResponse('Database error', errorDetails, 500);
    }

    // Create message ID for later saving
    const messageId = generateUUID();

    // Convert to AI SDK format
    const aiMessages = messages.map((msg) => ({
      role: msg.role,
      content:
        typeof msg.content === 'string' ? msg.content : String(msg.content),
    }));

    // Create a stream with Claude 3.7 Sonnet
    try {
      console.log(`Chat API: Using Claude 3.7 Sonnet (${MODEL_ID})`);

      // Use AI SDK's streamText function with Claude 3.7 Sonnet
      const stream = await streamText({
        model: primaryModel,
        messages: aiMessages,
        system: systemPrompt({ selectedChatModel }),
        temperature: 0.5,
        maxTokens: 4000,
        providerOptions: {
          anthropic: {
            // Enable extended thinking for complex queries
            thinking: { type: 'enabled', budgetTokens: 8000 },
          },
        },
      });

      // Set up the response stream with security headers
      const responseStream = stream.toDataStreamResponse({
        sendReasoning: true, // Enable sending reasoning to the client
        headers: {
          // Security headers
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
          'Surrogate-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Content-Security-Policy': "default-src 'self'",
          'Strict-Transport-Security':
            'max-age=31536000; includeSubDomains; preload',
        },
      });

      // Save a placeholder message in the database
      await saveMessages({
        messages: [
          {
            id: messageId,
            chatId: id,
            role: 'assistant',
            content: 'Response from Claude 3.7 Sonnet',
            createdAt: new Date(),
          },
        ],
      });
      console.log('Chat API: Assistant response placeholder saved to database');

      return responseStream;
    } catch (error) {
      console.error('Chat API: Error in streaming response:', error);

      // Fallback for catastrophic errors
      const fallbackText =
        'I apologize, but I encountered an issue processing your request. Please try again.';

      // Save to database
      await saveMessages({
        messages: [
          {
            id: messageId,
            chatId: id,
            role: 'assistant',
            content: fallbackText,
            createdAt: new Date(),
          },
        ],
      });

      // Return simple response
      return new Response(JSON.stringify({ text: fallbackText }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Unexpected error in chat API:', error);
    return new Response(
      JSON.stringify({
        error: 'An unexpected error occurred',
        details:
          process.env.NODE_ENV === 'development' ? String(error) : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
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
      process.env.NODE_ENV === 'development' ? String(error) : undefined,
    );
  }
}
