import type { Message } from 'ai';
import { createDataStreamResponse } from 'ai';

import { auth } from '@/app/(auth)/auth';
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
import type { MessageStreamEvent } from '@anthropic-ai/sdk/resources/messages';

import { generateTitleFromUserMessage } from '../../actions';

export const maxDuration = 300; // 5 minutes max duration for the request

// Helper functions to keep the main API code clean
const createErrorResponse = (message: string, details?: string, status = 500) => {
  return new Response(
    JSON.stringify({ error: message, details }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
};

// Import the correct MessageParam type from anthropic
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

/**
 * Format messages for Anthropic API
 * This function converts our app's messages to proper Anthropic API format
 */
const formatMessagesForAnthropic = (messages: Array<Message>): MessageParam[] => {
  // Filter out any system messages (will be handled separately)
  return messages
    .filter(msg => msg.role !== 'system')
    .map(msg => {
      // Convert message role to appropriate Anthropic role
      const msgRole = msg.role as string;
      const role = msgRole === 'user' || msgRole === 'tool' ? 'user' : 'assistant';
      
      // Handle content based on type
      if (typeof msg.content === 'string') {
        // For string content, ensure it's not empty
        const textContent = msg.content.trim() || "Hello";
        return { role, content: textContent };
      } else if (Array.isArray(msg.content)) {
        // For array content, stringify it to avoid type issues
        try {
          // Get content array safely
          const contentArray = msg.content as any[];
          
          // If content is empty, use a default message
          if (!contentArray || contentArray.length === 0) {
            return { role, content: "Hello" };
          }
          
          // Convert complex content to string for simplicity
          return { role, content: JSON.stringify(contentArray) };
        } catch (e) {
          console.error("Error processing array content:", e);
          return { role, content: "Hello" };
        }
      } else {
        // For other types, convert to string
        try {
          const jsonContent = JSON.stringify(msg.content);
          return { role, content: jsonContent || "Hello" };
        } catch (e) {
          console.error("Error stringifying message content:", e);
          return { role, content: "Hello" };
        }
      }
    });
};

// Using the proper imported type from bylaw-search/types.ts
// No need to redefine it here

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
    const requestData = await request.json();
    
    // Validate request structure
    if (!requestData || typeof requestData !== 'object') {
      return createErrorResponse('Invalid request format', undefined, 400);
    }
    
    const { id, messages, selectedChatModel } = requestData;
    
    // Validate required fields
    if (!id) {
      return createErrorResponse('Chat ID is required', undefined, 400);
    }
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return createErrorResponse('Messages array is required and cannot be empty', undefined, 400);
    }
    
    // Validate message format
    for (const msg of messages) {
      const msgRole = msg.role as string;
      if (!msgRole || !['user', 'assistant', 'system', 'tool'].includes(msgRole)) {
        return createErrorResponse(
          'All messages must have a valid role (user, assistant, system, or tool)',
          undefined, 
          400
        );
      }
      
      // Allow empty content only for assistant messages
      if ((!msg.content || 
          (typeof msg.content === 'string' && msg.content.trim() === '') ||
          (Array.isArray(msg.content) && msg.content.length === 0)
         ) && msgRole !== 'assistant') {
        return createErrorResponse('Messages must have non-empty content', undefined, 400);
      }
    }

    // User authentication
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse('Unauthorized', undefined, 401);
    }

    // Get user message and validate
    const userMessage = getMostRecentUserMessage(messages);
    if (!userMessage) {
      return createErrorResponse('No user message found in messages array', undefined, 400);
    }
    
    // Validate user message content
    if (typeof userMessage.content !== 'string' || userMessage.content.trim() === '') {
      return createErrorResponse('User message must have non-empty text content', undefined, 400);
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
      // Import tools and needed functions
      const { searchBylawsTool } = await import('@/lib/ai/tools/search-bylaws');
      const { searchBylaws } = await import('@/lib/bylaw-search');
      const { createToolExecutor } = await import('@/lib/ai/fix-tools');
      
      // TOOLS INTEGRATION IS COMPLEX - FOR NOW, LET'S USE THE DIRECT CALL APPROACH
      // We'll invoke the bylaw search function directly
      let bylawResults: BylawToolResult | null = null;
      
      try {
        // Search for bylaws related to the user's query 
        const userQuery = typeof userMessage.content === 'string' 
          ? userMessage.content 
          : Array.isArray(userMessage.content) 
            ? JSON.stringify(userMessage.content) 
            : '';
            
        console.log(`Searching bylaws for: ${userQuery}`);
        
        try {
          // Use the wrapped tool executor to handle TypeScript issues
          // Define the type explicitly to match the tool's parameters
          type SearchBylawParams = { 
            query: string; 
            category?: string; 
            bylawNumber?: string;
          };
            
          const executeSearchTool = createToolExecutor<SearchBylawParams, BylawToolResult>(
            searchBylawsTool.execute as any // Use type assertion to avoid complex type issues
          );
          
          bylawResults = await executeSearchTool({
            query: userQuery,
            category: userQuery.toLowerCase().includes('tree') ? 'trees' : undefined
          });
        } catch (toolError) {
          // If tool approach fails, fall back to direct function call
          console.error("Tool execution failed, falling back to direct function call:", toolError);
          
          // Create a filter if needed
          const filter: Record<string, string> = {};
          if (userQuery.toLowerCase().includes('tree')) {
            filter.category = 'trees';
          }
          
          // Call the search function directly
          const searchResults = await searchBylaws(userQuery, filter);
          
          if (searchResults && searchResults.length > 0) {
            // Format results in the same way the tool would
            const formattedResults = searchResults.map(result => ({
              bylawNumber: result.metadata.bylawNumber || 'Unknown',
              title: result.metadata.title || 'Untitled Bylaw',
              section: result.metadata.section || 'Unknown Section',
              content: result.text || '',
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
        }
        
        // Log the number of results, safely handling undefined results
        console.log(`Bylaw search returned ${bylawResults?.found ? (bylawResults.results?.length || 0) : 0} results`);
      } catch (e) {
        console.error("Error searching bylaws:", e);
        bylawResults = null; // Ensure bylawResults is null if an error occurs
      }
      
      // Setup parameters for Anthropic API
      let enhancedSystemMessage = systemPrompt({ selectedChatModel });
      
      // Enhance the system message with bylaw results if found
      if (bylawResults?.found && bylawResults.results) {
        const formattedBylawInfo = bylawResults.results.map(result => {
          return `
Bylaw: ${result.bylawNumber || 'Unknown'} (${result.title || 'Untitled Bylaw'})
Section: ${result.section || 'Unknown Section'}
Content: ${result.content || 'No content available'}
`;
        }).join("\n---\n");
        
        enhancedSystemMessage += `\n\nRELEVANT BYLAW INFORMATION:\n${formattedBylawInfo}\n\nWhen answering user questions, use ONLY the bylaw information provided above. Cite the exact bylaw number and section in your response.`;
      }
      
      // Use the configured model from environment or default
      const modelName = DEFAULT_MODEL_ID;
      let formattedMessages = formatMessagesForAnthropic(messages);
      
      // Ensure we have at least one valid message
      if (formattedMessages.length === 0) {
        // Force a minimal message set if empty
        formattedMessages = [{ role: 'user', content: 'Hello' }];
      }
      
      // Ensure alternating user/assistant pattern (Anthropic requirement)
      // If the last message is from assistant, add a user message
      if (formattedMessages.length > 0 && formattedMessages[formattedMessages.length - 1].role === 'assistant') {
        formattedMessages.push({ role: 'user', content: 'Please respond to my question' });
      }
      
      console.log(`Using model: ${modelName}`);
      console.log(`System prompt length: ${enhancedSystemMessage.length}`);
      console.log(`Messages count: ${formattedMessages.length}`);
      console.log(`Message roles: ${formattedMessages.map(m => m.role).join(', ')}`);
      
      // Debug log the messages being sent (redacted for privacy)
      console.log(`Messages being sent to Anthropic (first 50 chars): ${
        formattedMessages.map(m => `${m.role}: ${
          typeof m.content === 'string' 
            ? m.content.substring(0, 50) + (m.content.length > 50 ? '...' : '')
            : '[complex content]'
        }`).join(' | ')
      }`);
      
      let response: AsyncIterable<MessageStreamEvent>;
      try {
        // Create Anthropic message stream
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
        
        // Add diagnostic information
        console.error("Error details:", 
          typeof apiError === 'object' && apiError !== null 
            ? JSON.stringify(apiError, null, 2)
            : String(apiError)
        );
        
        // Fall back to the configured fallback model with slightly different parameters
        console.log(`Falling back to ${FALLBACK_MODEL_ID} model`);
        
        try {
          response = await anthropic.messages.create({
            model: FALLBACK_MODEL_ID,
            max_tokens: 1000, // Reduce max tokens
            system: enhancedSystemMessage.substring(0, 1000), // Truncate system message
            messages: formattedMessages.slice(-5), // Use only last 5 messages
            temperature: 0.7,
            stream: true
          });
        } catch (fallbackError) {
          console.error("Fallback model error:", fallbackError);
          return createErrorResponse(
            'Unable to generate a response',
            'Both primary and fallback AI models failed to respond. Please try again with a simpler query.',
            503
          );
        }
      }
      
      // Extract the stream from the response
      const stream = response;
      
      // Prepare message ID for saving later
      const messageId = generateUUID();
      
      // Return streaming response
      return createDataStreamResponse({
        execute: async (writer) => {
          let completion = '';
          let streamErrors = false;
          let totalChunks = 0;
          let textChunks = 0;
          
          try {
            // Add timeout for stream processing to prevent hanging
            const timeout = setTimeout(() => {
              console.error('Stream processing timed out after 60 seconds');
              streamErrors = true;
              writer.writeData({ 
                text: "\n\nI apologize, but the response timed out. Please try again with a shorter query." 
              });
            }, 60000);
            
            // Process stream chunks with more detailed logging and error handling
            try {
              for await (const chunk of stream) {
                totalChunks++;
                
                // Check for different chunk types
                if (chunk.type === 'content_block_delta' && chunk.delta && 'text' in chunk.delta) {
                  const text = chunk.delta.text;
                  if (typeof text === 'string') {
                    textChunks++;
                    completion += text;
                    writer.writeData({ text });
                  }
                } else if (chunk.type === 'message_delta' && 'stop_reason' in chunk.delta) {
                  console.log(`Stream complete with stop reason: ${chunk.delta.stop_reason}`);
                }
              }
              
              console.log(`Stream processed ${totalChunks} total chunks, ${textChunks} text chunks`);
            } catch (streamError) {
              streamErrors = true;
              console.error('Error during stream processing:', streamError);
              writer.writeData({ 
                text: "\n\nI apologize, but there was an error while generating the response. Please try again." 
              });
            } finally {
              clearTimeout(timeout);
            }
            
            // Save complete response to database
            if (completion.trim().length === 0) {
              const fallbackMessage = "I'm sorry, I wasn't able to generate a response. Please try again.";
              completion = fallbackMessage;
              
              if (!streamErrors) {
                writer.writeData({ text: fallbackMessage });
              }
            }
            
            try {
              await saveMessages({
                messages: [{
                  id: messageId,
                  chatId: id,
                  role: 'assistant',
                  content: completion,
                  createdAt: new Date(),
                }],
              });
              console.log('Successfully saved message to database');
            } catch (dbError) {
              console.error('Failed to save message to database:', dbError);
              // Don't expose database errors to the user, they already have the response
            }
          } catch (e) {
            console.error('Fatal error in stream execution:', e);
            writer.writeData({ 
              text: "\n\nI apologize, but there was a critical error processing the response. Please try again later." 
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
