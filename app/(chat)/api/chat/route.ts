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
      const modelName = selectedChatModel === 'oak-bay-bylaws' ? 'claude-3-7-sonnet-20240229' : selectedChatModel;
      
      console.log(`Using model: ${modelName}`);
      
      const stream = await anthropic.messages.create({
        model: modelName,
        max_tokens: 4000,
        system: systemMessage,
        messages: messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: typeof msg.content === 'string' 
            ? msg.content 
            : Array.isArray(msg.content)
              ? msg.content // Handle array content format
              : JSON.stringify(msg.content) // Fallback for other types
        })),
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
              // Handle different types of chunks from Anthropic's API
              if (chunk.type === 'content_block_delta') {
                if ('text' in chunk.delta) {
                  const text = chunk.delta.text;
                  completion += text;
                  
                  // Forward the chunk to the client
                  writer.writeData({ text });
                } else if ('type' in chunk.delta) {
                  // Some versions of the API return a different structure
                  console.debug('Content block delta with type:', chunk.delta.type);
                  if ('text' in chunk.delta) {
                    // Cast to string to handle unknown type
                    const text = String(chunk.delta.text);
                    completion += text;
                    writer.writeData({ text });
                  }
                }
              } else if (chunk.type === 'message_delta') {
                // Message level updates, may contain metadata we can log
                console.debug('Message delta received:', chunk.delta.stop_reason || 'streaming');
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
    } catch (error) {
      // Log detailed error information for debugging
      console.error('Error in chat stream:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error details:', errorMessage);
      
      // Return a user-friendly error message with appropriate status code
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
