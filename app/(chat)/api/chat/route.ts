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

// Import the correct types from Anthropic SDK
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

// Define message types based on the Anthropic API specification
type UserMessage = { role: 'user'; content: string };
type AssistantMessage = { role: 'assistant'; content: string };

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
      const role = msgRole === 'user' || msgRole === 'tool' ? 'user' as const : 'assistant' as const;
      
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
  // Log all request details for debugging
  console.log("Chat API: Request received", {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries([...request.headers.entries()].map(([key, value]) => 
      [key, key.toLowerCase().includes('auth') ? '[REDACTED]' : value]
    ))
  });
  
  try {
    console.log("Chat API: Starting request processing");
    
    // Log environment check
    console.log("Chat API: Environment check", {
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      selectedModel: process.env.CLAUDE_MODEL,
      fallbackModel: process.env.CLAUDE_FALLBACK_MODEL
    });
    
    // Check API key at the beginning - fail fast if missing
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("Chat API: Missing API key");
      return createErrorResponse(
        'Server configuration error: Missing API key',
        'The API key for the AI service is not configured. Please contact support.'
      );
    }

    // Parse request
    let requestData;
    try {
      requestData = await request.json();
      console.log("Chat API: Request parsed successfully");
    } catch (parseError) {
      console.error("Chat API: Failed to parse request JSON:", parseError);
      return createErrorResponse('Invalid JSON in request', undefined, 400);
    }
    
    // Validate request structure
    if (!requestData || typeof requestData !== 'object') {
      console.error("Chat API: Invalid request structure:", requestData);
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
      // Import tools and needed functions with error handling
      console.log("Chat API: Importing bylaw search tools");
      
      let searchBylawsTool, searchBylaws, createToolExecutor;
      
      try {
        const toolsModule = await import('@/lib/ai/tools/search-bylaws');
        const searchModule = await import('@/lib/bylaw-search');
        const fixToolsModule = await import('@/lib/ai/fix-tools');
        
        searchBylawsTool = toolsModule.searchBylawsTool;
        searchBylaws = searchModule.searchBylaws;
        createToolExecutor = fixToolsModule.createToolExecutor;
        
        console.log("Chat API: Successfully imported all modules");
      } catch (importError) {
        console.error("Chat API: Failed to import required modules:", importError);
        return createErrorResponse(
          'Server configuration error',
          'Failed to load required components. Please try again later.',
          500
        );
      }
      
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
      
      // Enhance the system message with bylaw results if found - with length limits
      if (bylawResults?.found && bylawResults.results) {
        // Limit to top 5 results to prevent exceeding token limits
        const limitedResults = bylawResults.results.slice(0, 5);
        console.log(`Using ${limitedResults.length} of ${bylawResults.results.length} bylaw results`);
        
        const formattedBylawInfo = limitedResults.map(result => {
          // Limit content length to reduce token usage
          const contentPreview = typeof result.content === 'string' 
            ? result.content.substring(0, 800) 
            : String(result.content || '').substring(0, 800);
            
          return `
Bylaw: ${result.bylawNumber || 'Unknown'} (${result.title || 'Untitled Bylaw'})
Section: ${result.section || 'Unknown Section'}
Content: ${contentPreview || 'No content available'}${contentPreview.length >= 800 ? '...' : ''}
`;
        }).join("\n---\n");
        
        // Measure and log the size of the bylaw info being added
        console.log(`Bylaw info size: ${formattedBylawInfo.length} characters`);
        
        enhancedSystemMessage += `\n\nRELEVANT BYLAW INFORMATION:\n${formattedBylawInfo}\n\nWhen answering user questions, use ONLY the bylaw information provided above. Cite the exact bylaw number and section in your response.`;
      }
      
      // Use the configured model from environment or default
      const modelName = DEFAULT_MODEL_ID;
      let formattedMessages = formatMessagesForAnthropic(messages);
      
      // Ensure messages array follows Anthropic API requirements
      
      // 1. Ensure we have at least one valid message
      if (formattedMessages.length === 0) {
        // Force a minimal message set if empty 
        const defaultMessage: UserMessage = { role: 'user', content: 'Hello' };
        formattedMessages = [defaultMessage];
      }
      
      // 2. Ensure the first message is from the user (Anthropic requirement)
      if (formattedMessages[0].role !== 'user') {
        const userMessage: UserMessage = { role: 'user', content: 'Hello' };
        formattedMessages.unshift(userMessage);
      }
      
      // 3. Ensure alternating user/assistant pattern (Anthropic requirement)
      // If two consecutive messages have the same role, insert a placeholder
      for (let i = 1; i < formattedMessages.length; i++) {
        if (formattedMessages[i].role === formattedMessages[i-1].role) {
          if (formattedMessages[i].role === 'user') {
            // Insert assistant message between consecutive user messages
            const assistantMessage: AssistantMessage = { 
              role: 'assistant', 
              content: 'I understand. Please continue.' 
            };
            formattedMessages.splice(i, 0, assistantMessage);
          } else {
            // Insert user message between consecutive assistant messages
            const userMessage: UserMessage = { 
              role: 'user', 
              content: 'Please continue.' 
            };
            formattedMessages.splice(i, 0, userMessage);
          }
        }
      }
      
      // 4. Ensure the last message is not from assistant
      if (formattedMessages.length > 0 && formattedMessages[formattedMessages.length - 1].role === 'assistant') {
        const finalUserMessage: UserMessage = { 
          role: 'user', 
          content: 'Please respond to my question' 
        };
        formattedMessages.push(finalUserMessage);
      }
      
      // Add extensive debugging info to track exactly what's happening
      console.log('=== DETAILED API CALL DIAGNOSTICS ===');
      console.log(`Using model: ${modelName}`);
      console.log(`System prompt length: ${enhancedSystemMessage.length} characters`);
      console.log(`System prompt snippet: ${enhancedSystemMessage.substring(0, 100)}...`);
      console.log(`Messages count: ${formattedMessages.length}`);
      console.log(`Message roles sequence: ${formattedMessages.map(m => m.role.charAt(0)).join('')}`);
      
      // Log more details about each message (without exposing full content)
      formattedMessages.forEach((msg, idx) => {
        const contentPreview = typeof msg.content === 'string' 
          ? `${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`
          : '[complex content]';
        console.log(`Message #${idx}: role=${msg.role}, content_length=${msg.content.length}, preview="${contentPreview}"`);
      });
      
      // Log additional environment info
      console.log('Environment:', {
        nodeEnv: process.env.NODE_ENV,
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY?.length,
        vercelEnv: process.env.VERCEL_ENV || 'unknown'
      });
      
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
        // Log the first 2 formatted messages to help debug issues (without exposing full content)
        console.log("API Request Preview:");
        console.log(`- Model: ${modelName}`);
        console.log(`- Max tokens: 2000`);
        console.log(`- System prompt length: ${enhancedSystemMessage.length} chars`);
        console.log(`- Total messages: ${formattedMessages.length}`);
        console.log(`- First message role: ${formattedMessages[0]?.role || 'none'}`);
        console.log(`- Message pattern: ${formattedMessages.map(m => m.role.charAt(0)).join('')}`);
        
        // Validate message format before sending to API
        const messageFormatErrors = [];
        
        if (formattedMessages.length === 0) {
          messageFormatErrors.push("Messages array is empty");
        }
        
        if (formattedMessages.length > 0 && formattedMessages[0].role !== 'user') {
          messageFormatErrors.push("First message must be from 'user'");
        }
        
        // Check for alternating pattern
        for (let i = 1; i < formattedMessages.length; i++) {
          if (formattedMessages[i].role === formattedMessages[i-1].role) {
            messageFormatErrors.push(`Messages at position ${i-1} and ${i} both have role '${formattedMessages[i].role}'`);
          }
        }
        
        if (messageFormatErrors.length > 0) {
          console.error("Message format validation errors:", messageFormatErrors);
          
          // Attempt to fix the format before giving up
          console.log("Attempting to fix message format issues...");
          
          // Create a minimal valid message set
          const validUserMessage: UserMessage = {
            role: 'user',
            content: 'Hello, I need information about Oak Bay bylaws.'
          };
          formattedMessages = [validUserMessage];
        }
        
        // Create Anthropic message stream
        console.log("Sending request to Anthropic API...");
        
        try {
          // Log the exact request parameters (helps debug API issues)
          const requestParams = {
            model: modelName,
            maxTokens: 2000,
            systemPromptLength: enhancedSystemMessage.length,
            messageCount: formattedMessages.length,
            messagePattern: formattedMessages.map(m => m.role.charAt(0)).join(''),
            temperature: 0.5,
            stream: true
          };
          console.log("API Request parameters:", requestParams);
          
          response = await anthropic.messages.create({
            model: modelName,
            max_tokens: 2000,
            system: enhancedSystemMessage,
            messages: formattedMessages,
            temperature: 0.5,
            stream: true
          });
        } catch (requestError) {
          console.error("Failed to create request:", requestError);
          // Handle stack trace safely
          if (requestError instanceof Error) {
            console.error("Stack trace:", requestError.stack);
          }
          throw requestError; // Re-throw to be caught by the outer catch
        }
        
        console.log("Successfully created Anthropic stream");
      } catch (apiError) {
        console.error("Anthropic API error:", apiError);
        
        // Detailed error analysis
        let errorDetails = "Unknown error";
        let statusCode = 0;
        
        if (typeof apiError === 'object' && apiError !== null) {
          // Try to extract useful error information
          errorDetails = JSON.stringify(apiError, (key, value) => {
            // Exclude any huge values that might bloat logs
            if (typeof value === 'string' && value.length > 500) {
              return value.substring(0, 500) + '... [truncated]';
            }
            return value;
          }, 2);
          
          // Try to get status code
          if ('status' in apiError) {
            statusCode = Number(apiError.status);
          }
        }
        
        console.error(`Anthropic API error details: [Status: ${statusCode}]`, errorDetails);
        
        // For specific error codes, provide more helpful responses
        if (statusCode === 401) {
          console.error("Authentication error with API key");
          return createErrorResponse(
            'Authentication error',
            'API key may be invalid or expired. Please check server configuration.',
            401
          );
        }
        
        if (statusCode === 400) {
          console.error("Bad request error - likely invalid message format or content");
          
          // Add specific debugging for 400 errors
          console.log("Message format debug info:");
          console.log(`- First message role: ${formattedMessages[0]?.role}`);
          console.log(`- Message sequence: ${formattedMessages.map(m => m.role.charAt(0)).join('')}`);
          console.log(`- System prompt length: ${enhancedSystemMessage.length}`);
          
          return createErrorResponse(
            'Invalid request format',
            'The AI service rejected our request format. Please try a simpler query.',
            400
          );
        }
        
        if (statusCode === 429) {
          console.error("Rate limit exceeded");
          return createErrorResponse(
            'Rate limit exceeded',
            'Too many requests to the AI service. Please try again in a few moments.',
            429
          );
        }
        
        if (statusCode === 413 || statusCode === 414 || errorDetails.includes('too long') || errorDetails.includes('token limit')) {
          console.error("Content too large error");
          return createErrorResponse(
            'Content too large',
            'The request contains too much text. Try a shorter query with more specific details.',
            413
          );
        }
        
        // Fall back to the configured fallback model with simplified parameters
        console.log(`Falling back to ${FALLBACK_MODEL_ID} model`);
        
        try {
          // Create an extremely minimal valid message for fallback
          // Ensure it's as simple as possible to avoid format errors
          const userQuery = typeof userMessage?.content === 'string' 
            ? userMessage.content.substring(0, 200)  // Limit length
            : 'What can you tell me about Oak Bay bylaws?';
            
          console.log(`Using fallback with simplified query: "${userQuery}"`);
          
          const fallbackUserMessage: UserMessage = {
            role: 'user',
            content: userQuery
          };
          const fallbackMessages: MessageParam[] = [fallbackUserMessage];
          
          // Use very short system prompt
          const shortSystemPrompt = "You are a helpful bylaw assistant for Oak Bay. Be concise.";
          
          // Log the exact fallback request
          console.log("Fallback request details:", {
            model: FALLBACK_MODEL_ID,
            systemPrompt: shortSystemPrompt,
            message: userQuery,
          });
          
          response = await anthropic.messages.create({
            model: FALLBACK_MODEL_ID,
            max_tokens: 800,                // Reduced token count
            system: shortSystemPrompt,      // Minimal system prompt
            messages: fallbackMessages,     // Single user message
            temperature: 0.7,              
            stream: true
          });
          
          console.log("Successfully created fallback stream");
        } catch (fallbackError) {
          console.error("Fallback model error:", fallbackError);
          
          // Extract any useful error information
          let fallbackErrorDetails = "Unknown fallback error";
          if (typeof fallbackError === 'object' && fallbackError !== null) {
            fallbackErrorDetails = JSON.stringify(fallbackError, (key, value) => {
              if (typeof value === 'string' && value.length > 100) {
                return value.substring(0, 100) + '...';
              }
              return value;
            });
            
            console.error("Fallback error details:", fallbackErrorDetails);
          }
          
          // At this point, we've tried everything - return a helpful error to the user
          return createErrorResponse(
            'Unable to generate a response',
            'Our AI service is currently having difficulties. Please try again in a few minutes or with a simpler query.',
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
              // Track when we last received a chunk to detect stalls
              let lastChunkTime = Date.now();
              let chunkTimeout: NodeJS.Timeout | null = null;
              
              // Create a timeout that will trigger if we go too long between chunks
              const resetChunkTimeout = () => {
                if (chunkTimeout) clearTimeout(chunkTimeout);
                chunkTimeout = setTimeout(() => {
                  const secondsSinceLastChunk = (Date.now() - lastChunkTime) / 1000;
                  console.error(`Stream stalled: No chunks received for ${secondsSinceLastChunk.toFixed(1)} seconds`);
                  throw new Error(`Stream stalled after ${totalChunks} chunks`);
                }, 15000); // 15 second timeout between chunks
              };
              
              resetChunkTimeout();
              
              for await (const chunk of stream) {
                // Reset the timeout since we got a new chunk
                resetChunkTimeout();
                
                // Track time between chunks
                const now = Date.now();
                const secsSinceLastChunk = (now - lastChunkTime) / 1000;
                if (secsSinceLastChunk > 2) {
                  console.log(`Delay of ${secsSinceLastChunk.toFixed(1)}s between chunks ${totalChunks} and ${totalChunks+1}`);
                }
                lastChunkTime = now;
                
                totalChunks++;
                
                // Parse and validate the chunk
                if (!chunk) {
                  console.warn(`Received empty chunk at position ${totalChunks}`);
                  continue;
                }
                
                // Log chunk type for debugging
                if (totalChunks === 1 || totalChunks % 50 === 0) {
                  console.log(`Processing chunk #${totalChunks} of type: ${chunk.type}`);
                }
                
                // Check for different chunk types with robust error handling
                if (chunk.type === 'content_block_delta' && chunk.delta && 'text' in chunk.delta) {
                  const text = chunk.delta.text;
                  if (typeof text === 'string') {
                    textChunks++;
                    completion += text;
                    writer.writeData({ text });
                  } else {
                    console.warn(`Chunk ${totalChunks}: Delta text is not a string: ${typeof text}`);
                  }
                } else if (chunk.type === 'message_delta' && 'stop_reason' in chunk.delta) {
                  console.log(`Stream complete with stop reason: ${chunk.delta.stop_reason}`);
                } else {
                  // Log other chunk types without flooding the logs
                  if (totalChunks < 5 || totalChunks % 100 === 0) {
                    console.log(`Chunk ${totalChunks}: Unhandled type "${chunk.type}"`);
                  }
                }
              }
              
              // Clean up the timeout
              if (chunkTimeout) clearTimeout(chunkTimeout);
              
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
    
    // Get stack trace for better debugging
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error details:', errorMessage);
    
    // In production, provide a generic error message but log the details
    return createErrorResponse(
      'An unexpected error occurred',
      process.env.NODE_ENV === 'development' ? errorMessage : 'Please try again later or contact support.'
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
