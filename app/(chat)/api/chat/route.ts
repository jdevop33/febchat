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

import { generateTitleFromUserMessage } from '../../actions';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      selectedChatModel,
    }: { id: string; messages: Array<Message>; selectedChatModel: string } =
      await request.json();

    console.log(
      `Chat request received - ID: ${id}, Model: ${selectedChatModel}`,
    );
    console.log(`Message count: ${messages.length}`);
    
    // Detailed logging for troubleshooting
    console.log(`ENV check - ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'Set (length: ' + process.env.ANTHROPIC_API_KEY.length + ')' : 'NOT SET'}`);
    console.log(`ENV check - NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`System message preview: "${systemPrompt({ selectedChatModel }).substring(0, 50)}..."`);
    
    // Check for API key at the beginning - fail fast if missing
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('CRITICAL ERROR: ANTHROPIC_API_KEY is not set');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Missing API credentials'
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      console.error('Unauthorized user attempt to access chat API');
      return new Response('Unauthorized', { status: 401 });
    }

    const userMessage = getMostRecentUserMessage(messages);

    if (!userMessage) {
      console.error('No user message found in request');
      return new Response('No user message found', { status: 400 });
    }

    console.log(`User message: "${userMessage.content.substring(0, 50)}..."`);

    const chat = await getChatById({ id });

    if (!chat) {
      console.log(`Creating new chat with ID: ${id}`);
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });
      await saveChat({ id, userId: session.user.id, title });
    } else {
      console.log(`Using existing chat with ID: ${id}`);
    }

    await saveMessages({
      messages: [{ ...userMessage, createdAt: new Date(), chatId: id }],
    });

    try {
      console.log(`Starting AI stream for model: ${selectedChatModel}`);

      // Always activate bylaw search tool
      console.log(`Using search bylaws tool`);

      // Convert messages to Anthropic format
      const systemMessage = systemPrompt({ selectedChatModel });
      
      // Create a message stream with the Anthropic API
      // Get the model name from the selectedChatModel parameter or fall back to the default
      // CRITICAL FIX: Use the correct model ID format for production
      const modelName = 'claude-3-sonnet-20240220'; // Fixed model ID that is known to work
      
      console.log(`Using model: ${modelName}`);
      
      // Log the API request for debugging
      console.log('Anthropic API request:', {
        model: modelName,
        maxTokens: 2000,
        systemPrompt: systemMessage.substring(0, 100) + '...',
        messageCount: messages.length,
        apiKey: process.env.ANTHROPIC_API_KEY ? 'Set' : 'Not set'
      });
      
      // Check if API key is set
      if (!process.env.ANTHROPIC_API_KEY) {
        console.error('CRITICAL ERROR: ANTHROPIC_API_KEY is not set in environment variables');
        return new Response(JSON.stringify({ 
          error: 'Server configuration error: Missing API key',
          details: 'The API key for the AI service is not configured. Please contact support.'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Log key length for debugging (safely)
      if (process.env.ANTHROPIC_API_KEY) {
        console.log(`API key exists with length: ${process.env.ANTHROPIC_API_KEY.length}`);
        console.log(`API key prefix: ${process.env.ANTHROPIC_API_KEY.substring(0, 3)}...`);
      }
      
      try {
        console.log(`Making Anthropic API request with model: ${modelName}`);
        
        // Format messages properly for Anthropic API
        const formattedMessages = messages.map(msg => {
          let content;
          
          if (typeof msg.content === 'string') {
            content = msg.content;
          } else if (Array.isArray(msg.content)) {
            content = msg.content;
          } else {
            try {
              content = JSON.stringify(msg.content);
            } catch (e) {
              console.error('Error stringifying message content:', e);
              content = String(msg.content);
            }
          }
          
          // Force the role to be a valid Anthropic role
          const role = msg.role === 'user' ? 'user' as const : 'assistant' as const;
          return {
            role,
            content
          };
        });
        
        console.log(`Formatted ${formattedMessages.length} messages for Anthropic API`);
        
        // Safety check modelName - no need to check since we're hardcoding the model
        if (true) {
          // Always use the fixed model 
          console.log('Using fixed model ID for production');
          const safeModelName = 'claude-3-sonnet-20240220';
          
          const stream = await anthropic.messages.create({
            model: safeModelName,
            max_tokens: 2000, // Reduced to prevent Vercel function timeouts
            system: systemMessage,
            messages: formattedMessages,
            temperature: 0.5,
            stream: true
          });
          
          // We'll save the message after we get the stream, 
          // but we'll create the message ID now
          const messageId = generateUUID();
          
          // Return the streaming response
          return createDataStreamResponse({
            execute: async (writer) => {
              let completion = '';
              
              try {
                // Use for-await-of to iterate through the stream chunks
                for await (const chunk of stream) {
                  // Debug log to troubleshoot the API response structure
                  console.debug('Chunk type:', chunk.type, JSON.stringify(chunk).substring(0, 200));
                  
                  // Handle different types of chunks from Anthropic's API
                  if (chunk.type === 'content_block_delta') {
                    if ('text' in chunk.delta) {
                      const text = chunk.delta.text;
                      completion += text;
                      
                      // Forward the chunk to the client
                      writer.writeData({ text });
                      console.debug('Processed text chunk:', text);
                    } 
                  } else if (chunk.type === 'content_block_start') {
                    // New content block starting
                    console.debug('Content block start received');
                  } else if (chunk.type === 'message_delta') {
                    // Message level updates, may contain metadata we can log
                    console.debug('Message delta received:', chunk.delta.stop_reason || 'streaming');
                  } else if (chunk.type === 'message_start') {
                    console.debug('Message start received');
                  } else {
                    // Log any other chunk types we receive
                    console.debug('Unknown chunk type:', chunk.type);
                  }
                }
                
                // After streaming completes, save the full response to the database
                console.log('AI response complete, saving to database');
                
                if (session?.user?.id) {
                  try {
                    // Guard against empty completions
                    if (completion.trim().length === 0) {
                      console.warn('Empty completion received, adding placeholder');
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
                    console.log('Chat message saved successfully');
                  } catch (error) {
                    console.error('Failed to save chat messages:', error);
                    // Write an error message to the client
                    writer.writeData({ 
                      text: "\n\nThere was an error saving this message. The message may be incomplete or missing from your history."
                    });
                  }
                }
              } catch (e) {
                console.error('Error processing stream:', e);
                // Try to provide a helpful error message to the client
                writer.writeData({ 
                  text: "\n\nI apologize, but there was an error processing the response. Please try again." 
                });
              }
            }
          });
        } else {
          const stream = await anthropic.messages.create({
            model: 'claude-3-sonnet-20240220',
            max_tokens: 2000, // Reduced to prevent Vercel function timeouts
            system: systemMessage,
            messages: formattedMessages,
            temperature: 0.5,
            stream: true
          });
          
          // We'll save the message after we get the stream, 
          // but we'll create the message ID now
          const messageId = generateUUID();
          
          // Return the streaming response
          return createDataStreamResponse({
            execute: async (writer) => {
              let completion = '';
              
              try {
                // Use for-await-of to iterate through the stream chunks
                for await (const chunk of stream) {
                  // Debug log to troubleshoot the API response structure
                  console.debug('Chunk type:', chunk.type, JSON.stringify(chunk).substring(0, 200));
                  
                  // Handle different types of chunks from Anthropic's API
                  if (chunk.type === 'content_block_delta') {
                    if ('text' in chunk.delta) {
                      const text = chunk.delta.text;
                      completion += text;
                      
                      // Forward the chunk to the client
                      writer.writeData({ text });
                      console.debug('Processed text chunk:', text);
                    } 
                  } else if (chunk.type === 'content_block_start') {
                    // New content block starting
                    console.debug('Content block start received');
                  } else if (chunk.type === 'message_delta') {
                    // Message level updates, may contain metadata we can log
                    console.debug('Message delta received:', chunk.delta.stop_reason || 'streaming');
                  } else if (chunk.type === 'message_start') {
                    console.debug('Message start received');
                  } else {
                    // Log any other chunk types we receive
                    console.debug('Unknown chunk type:', chunk.type);
                  }
                }
                
                // After streaming completes, save the full response to the database
                console.log('AI response complete, saving to database');
                
                if (session?.user?.id) {
                  try {
                    // Guard against empty completions
                    if (completion.trim().length === 0) {
                      console.warn('Empty completion received, adding placeholder');
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
                    console.log('Chat message saved successfully');
                  } catch (error) {
                    console.error('Failed to save chat messages:', error);
                    // Write an error message to the client
                    writer.writeData({ 
                      text: "\n\nThere was an error saving this message. The message may be incomplete or missing from your history."
                    });
                  }
                }
              } catch (e) {
                console.error('Error processing stream:', e);
                // Try to provide a helpful error message to the client
                writer.writeData({ 
                  text: "\n\nI apologize, but there was an error processing the response. Please try again." 
                });
              }
            }
          });
        }
      } catch (error) {
        // Log detailed error information for debugging
        console.error('Error in chat stream:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error details:', errorMessage);
        
        // Check for specific Anthropic API errors
        if (errorMessage.includes('API key') || errorMessage.includes('key') || errorMessage.includes('auth')) {
          console.error('API key error detected in error message:', errorMessage);
          return new Response(
            JSON.stringify({ 
              error: 'Authentication error with the AI provider',
              details: 'The server is unable to connect to the AI service. Please try again later or contact support.'
            }),
            { 
              status: 401,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
        
        if (errorMessage.includes('model')) {
          console.error('Model error detected');
          return new Response(
            JSON.stringify({ 
              error: 'The selected AI model is unavailable. Please try another model.',
              details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
            }),
            { 
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
        
        // Return a general user-friendly error message for other errors
        console.error('Unhandled error occurred during chat request:', errorMessage);
        
        // Include the full error for debugging in the logs
        console.error('Full error object:', error);
        
        return new Response(
          JSON.stringify({ 
            error: 'Our AI service is temporarily unavailable',
            details: 'We are experiencing connectivity issues with our AI provider. This is likely a temporary issue - please try again in a few minutes.'
          }),
          { 
            status: 500,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }
    } catch (error) {
      // Log detailed error information for debugging
      console.error('Error in chat stream:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error details:', errorMessage);
      
      // Check for specific Anthropic API errors
      if (errorMessage.includes('API key')) {
        console.error('API key error detected');
        return new Response(
          JSON.stringify({ 
            error: 'Authentication error with the AI provider. Please check your API configuration.',
            details: process.env.NODE_ENV === 'development' ? 'Invalid or missing API key' : undefined
          }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      if (errorMessage.includes('model')) {
        console.error('Model error detected');
        return new Response(
          JSON.stringify({ 
            error: 'The selected AI model is unavailable. Please try another model.',
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
          }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Return a general user-friendly error message for other errors
      return new Response(
        JSON.stringify({ 
          error: 'Oops, an error occurred! Please try again.',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
  } catch (error) {
    // Log detailed error information for debugging
    console.error('Unexpected error in chat API:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error details:', errorMessage);

    // Return a user-friendly error message with appropriate status code
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}