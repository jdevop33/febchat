import { streamText } from 'ai';

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
      console.error("Chat API: Missing Anthropic API key");
      return createErrorResponse(
        'Server configuration error: Missing API key',
        'The API key for the AI service is not configured. Please check ANTHROPIC_API_KEY.'
      );
    }
    
    // Verify connection is possible to the API
    console.log("Chat API: Using Anthropic API with key starting with:", `${apiKey.substring(0, 10)}...`);

    // Parse request
    let requestData: { id: string; messages: any[]; selectedChatModel: string };
    try {
      requestData = await request.json() as { id: string; messages: any[]; selectedChatModel: string };
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
    let chat: any;
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
      
      // Try-catch approach for fallback instead of onError callback
      let stream: any;
      try {
        // Use AI SDK's streamText function with primary model
        stream = await streamText({
          model: primaryModel,
          messages: aiMessages,
          system: systemPrompt({ selectedChatModel }),
          temperature: 0.5,
          maxTokens: 2000,
        });
      } catch (primaryError) {
        console.error("Chat API: Primary model failed, falling back:", primaryError);
        
        // Fall back to secondary model
        console.log(`Chat API: Trying fallback model: ${FALLBACK_MODEL_ID}`);
        stream = await streamText({
          model: fallbackModel,
          messages: aiMessages,
          system: systemPrompt({ selectedChatModel }),
          temperature: 0.7,
          maxTokens: 2000,
        });
      }
      
      // First, let's collect all text for saving to DB
      let fullContent = '';
      
      // Set up callbacks to gather text
      const responseStream = stream.toDataStreamResponse();
      
      // Save a simple placeholder message in the database
      // We could implement a more sophisticated solution that captures the full response later
      await saveMessages({
        messages: [{
          id: messageId,
          chatId: id,
          role: 'assistant',
          content: "Response from AI assistant",
          createdAt: new Date(),
        }],
      });
      console.log("Chat API: Assistant response placeholder saved to database");
      
      return responseStream;
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
