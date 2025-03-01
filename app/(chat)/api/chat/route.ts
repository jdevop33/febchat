import type { Message } from 'ai';
import { createDataStreamResponse } from 'ai';

import { auth } from '@/app/(auth)/auth';
import { anthropic } from '@/lib/ai/models';
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

// Import types for Anthropic API
import type { AnthropicError } from '@anthropic-ai/sdk';

import { generateTitleFromUserMessage } from '../../actions';

export const maxDuration = 300;

// Helper functions to keep the main API code clean
const createErrorResponse = (message: string, details?: string, status = 500) => {
  return new Response(
    JSON.stringify({ error: message, details }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
};

const formatMessagesForAnthropic = (messages: Array<Message>) => {
  return messages.map(msg => {
    let content: string | unknown[];
    
    if (typeof msg.content === 'string') {
      content = msg.content;
    } else if (Array.isArray(msg.content)) {
      content = msg.content;
    } else {
      try {
        content = JSON.stringify(msg.content);
      } catch (e) {
        content = String(msg.content);
      }
    }
    
    // Force the role to be a valid Anthropic role
    const role = msg.role === 'user' ? 'user' as const : 'assistant' as const;
    return { role, content };
  });
};

// Main API endpoint for chat
export async function POST(request: Request) {
  try {
    // Check API key at the beginning - fail fast if missing
    if (!process.env.ANTHROPIC_API_KEY) {
      return createErrorResponse(
        'Server configuration error: Missing API key',
        'The API key for the AI service is not configured. Please contact support.'
      );
    }

    // Parse request
    const {
      id,
      messages,
      selectedChatModel,
    }: { id: string; messages: Array<Message>; selectedChatModel: string } =
      await request.json();

    // User authentication
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse('Unauthorized', undefined, 401);
    }

    // Get user message and validate
    const userMessage = getMostRecentUserMessage(messages);
    if (!userMessage) {
      return createErrorResponse('No user message found', undefined, 400);
    }

    // Get or create chat
    const chat = await getChatById({ id });
    if (!chat) {
      const title = await generateTitleFromUserMessage({ message: userMessage });
      await saveChat({ id, userId: session.user.id, title });
    }

    // Save user message
    await saveMessages({
      messages: [{ ...userMessage, createdAt: new Date(), chatId: id }],
    });

    try {
      // Import tools
      const { searchBylawsTool } = await import('@/lib/ai/tools/search-bylaws');
      
      // TOOLS INTEGRATION IS COMPLEX - FOR NOW, LET'S USE THE DIRECT CALL APPROACH
      // We'll invoke the bylaw search function directly
      let bylawResults = null;
      
      try {
        // Search for bylaws related to the user's query 
        const userQuery = userMessage.content.toString();
        console.log(`Searching bylaws for: ${userQuery}`);
        
        // Instead of using tool directly, use the function it wraps
        const searchResults = await searchBylaws(userQuery, 
          userQuery.toLowerCase().includes('tree') ? { category: 'trees' } : undefined
        );
        
        // Format results like the tool would
        if (searchResults && searchResults.length > 0) {
          const formattedResults = searchResults.map(result => ({
            bylawNumber: result.metadata.bylawNumber || 'Unknown',
            title: result.metadata.title || 'Untitled Bylaw',
            section: result.metadata.section || 'Unknown Section',
            content: result.text,
            url: result.metadata.url || `https://oakbay.civicweb.net/document`
          }));
          
          bylawResults = {
            found: true,
            results: formattedResults
          };
        } else {
          bylawResults = {
            found: false,
            message: 'No relevant bylaws found.'
          };
        }
        
        console.log(`Bylaw search returned ${bylawResults.found ? bylawResults.results.length : 0} results`);
      } catch (e) {
        console.error("Error searching bylaws:", e);
      }
      
      // Setup parameters for Anthropic API
      let enhancedSystemMessage = systemPrompt({ selectedChatModel });
      
      // Enhance the system message with bylaw results if found
      if (bylawResults && bylawResults.found) {
        const formattedBylawInfo = bylawResults.results.map(result => {
          return `
Bylaw: ${result.bylawNumber} (${result.title})
Section: ${result.section}
Content: ${result.content}
`;
        }).join("\n---\n");
        
        enhancedSystemMessage += `\n\nRELEVANT BYLAW INFORMATION:\n${formattedBylawInfo}\n\nWhen answering user questions, use ONLY the bylaw information provided above. Cite the exact bylaw number and section in your response.`;
      }
      
      // Use the current Claude 3.7 Sonnet model
      const modelName = 'claude-3-7-sonnet-20250219';
      const formattedMessages = formatMessagesForAnthropic(messages);
      
      console.log(`Using model: ${modelName}`);
      console.log(`System prompt length: ${enhancedSystemMessage.length}`);
      console.log(`Messages count: ${formattedMessages.length}`);
      
      let response;
      try {
        // Create Anthropic message stream (simplified - no tools)
        response = await anthropic.messages.create({
          model: modelName,
          max_tokens: 2000,
          system: enhancedSystemMessage,
          messages: formattedMessages,
          temperature: 0.5,
          stream: true
        });
        
        console.log("Successfully created Anthropic stream");
      } catch (apiError) {
        console.error("Anthropic API error:", apiError);
        
        // Fall back to Claude 3.5 Sonnet if Claude 3.7 fails
        console.log("Falling back to Claude 3.5 Sonnet model");
        response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 2000,
          system: enhancedSystemMessage,
          messages: formattedMessages,
          temperature: 0.7,
          stream: true
        });
      }
      
      // Extract the stream from the response
      let stream;
      let streamId = '';
      
      // The response is either from the try block or the catch block
      if (response) {
        stream = response;
        streamId = typeof response === 'object' && '_request_id' in response ? 
          response._request_id : '';
      } else {
        throw new Error('Failed to create Anthropic response stream');
      }
      
      // Prepare message ID for saving later
      const messageId = generateUUID();
      
      // Return streaming response
      return createDataStreamResponse({
        execute: async (writer) => {
          let completion = '';
          
          try {
            // Process stream chunks - simplified for reliability
            for await (const chunk of stream) {
              if (chunk.type === 'content_block_delta' && 'text' in chunk.delta) {
                const text = chunk.delta.text;
                completion += text;
                writer.writeData({ text });
              }
            }
            
            // Save complete response to database
            if (completion.trim().length === 0) {
              completion = "I'm sorry, I wasn't able to generate a response. Please try again.";
            }
            
            await saveMessages({
              messages: [{
                id: messageId,
                chatId: id,
                role: 'assistant',
                content: completion,
                createdAt: new Date(),
              }],
            });
          } catch (e) {
            console.error('Error processing stream:', e);
            writer.writeData({ 
              text: "\n\nI apologize, but there was an error processing the response. Please try again." 
            });
          }
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle specific error types
      if (errorMessage.includes('API key') || errorMessage.includes('key') || errorMessage.includes('auth')) {
        return createErrorResponse(
          'Authentication error with the AI provider',
          'The server is unable to connect to the AI service. Please try again later or contact support.',
          401
        );
      }
      
      if (errorMessage.includes('model')) {
        return createErrorResponse(
          'The selected AI model is unavailable. Please try another model.',
          process.env.NODE_ENV === 'development' ? errorMessage : undefined,
          400
        );
      }
      
      // Generic error
      return createErrorResponse(
        'Our AI service is temporarily unavailable',
        'We are experiencing connectivity issues with our AI provider. This is likely a temporary issue - please try again in a few minutes.'
      );
    }
  } catch (error) {
    console.error('Unexpected error in chat API:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return createErrorResponse(
      'An unexpected error occurred',
      process.env.NODE_ENV === 'development' ? errorMessage : undefined
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