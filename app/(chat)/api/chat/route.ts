import {
  type Message,
  StreamingTextResponse,
} from 'ai';

import { auth } from '@/app/(auth)/auth';
import { AI } from '@/lib/ai/models';
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
import { searchBylawsTool } from '@/lib/ai/tools/search-bylaws';

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

      const aiResponse = await AI.chat({
        model: 'claude-3-7-sonnet-20240229',
        system: systemPrompt({ selectedChatModel }),
        messages,
        tools: {
          searchBylaws: searchBylawsTool,
        },
        temperature: 0.5,
      });

      console.log('AI response complete, saving to database');

      if (session.user?.id) {
        try {
          // Save the response message
          await saveMessages({
            messages: [{
              id: generateUUID(),
              chatId: id,
              role: 'assistant',
              content: aiResponse.content,
              createdAt: new Date(),
            }],
          });
          console.log('Chat message saved successfully');
        } catch (error) {
          console.error('Failed to save chat messages:', error);
        }
      }

      // Return the streaming response
      return new StreamingTextResponse(aiResponse.getTextStream());
    } catch (error) {
      console.error('Error in chat stream:', error);
      return new Response('Oops, an error occurred! Please try again.', { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error in chat API:', error);
    return new Response('An unexpected error occurred', { status: 500 });
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
