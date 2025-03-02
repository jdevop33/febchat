import { createDataStreamResponse } from 'ai';
import type { Message } from 'ai';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

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
  try {
    // Check API key at the beginning
    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!apiKey || apiKey.trim() === '') {
      console.error("Chat API: Missing API key");
      return createErrorResponse(
        'Server configuration error: Missing API key',
        'The API key for the AI service is not configured. Please contact support.'
      );
    }

    // Check API key format
    if (!apiKey.startsWith('sk-ant-')) {
      console.error("Chat API: API key format looks invalid (doesn't start with sk-ant-)");
      return createErrorResponse(
        'Server configuration error: Invalid API key format',
        'The API key appears to be invalid. Please contact support.'
      );
    }

    // Parse request
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      return createErrorResponse('Invalid JSON in request', undefined, 400);
    }

    const { id, messages, selectedChatModel } = requestData;

    // Validate required fields
    if (!id || !messages || !Array.isArray(messages) || messages.length === 0) {
      return createErrorResponse('Invalid request format', 'Missing required fields', 400);
    }

    // User authentication
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse('Unauthorized', undefined, 401);
    }

    // Get user message
    const userMessage = getMostRecentUserMessage(messages);
    if (!userMessage || typeof userMessage.content !== 'string' || userMessage.content.trim() === '') {
      return createErrorResponse('Invalid user message', undefined, 400);
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
      // Search for bylaws related to the user's query
      let bylawResults: BylawToolResult | null = null;
      try {
        const userQuery = typeof userMessage.content === 'string'
          ? userMessage.content
          : '';

        console.log(`Searching bylaws for: ${userQuery}`);

        // Mock bylaw search for now
        bylawResults = {
          found: true,
          results: [
            {
              bylawNumber: '4620',
              title: 'Tree Protection Bylaw',
              section: '3.1',
              content: 'No person shall cut, remove or damage any protected tree without first obtaining a tree cutting permit.',
              url: 'https://oakbay.civicweb.net/document/bylaw/4620'
            },
            {
              bylawNumber: '4620',
              title: 'Tree Protection Bylaw',
              section: '4.2',
              content: 'A protected tree means any tree with a diameter of 30 centimeters or more, measured at 1.4 meters above ground level.',
              url: 'https://oakbay.civicweb.net/document/bylaw/4620'
            },
            {
              bylawNumber: '4360',
              title: 'Zoning Bylaw',
              section: '5.2',
              content: 'The minimum lot size for single family residential development shall be 695 square meters.',
              url: 'https://oakbay.civicweb.net/document/bylaw/4360'
            }
          ]
        };
      } catch (e) {
        console.error("Error searching bylaws:", e);
        bylawResults = null;
      }

      // Enhance system prompt with bylaw results if found
      let enhancedSystemMessage = systemPrompt({ selectedChatModel });
      if (bylawResults?.found && bylawResults.results) {
        const limitedResults = bylawResults.results.slice(0, 5);
        const formattedBylawInfo = limitedResults.map(result => {
          const contentPreview = typeof result.content === 'string'
            ? result.content.substring(0, 800)
            : String(result.content || '').substring(0, 800);

          return `
Bylaw: ${result.bylawNumber || 'Unknown'} (${result.title || 'Untitled Bylaw'})
Section: ${result.section || 'Unknown Section'}
Content: ${contentPreview || 'No content available'}${contentPreview.length >= 800 ? '...' : ''}
`;
        }).join("\n---\n");

        enhancedSystemMessage += `\n\nRELEVANT BYLAW INFORMATION:\n${formattedBylawInfo}\n\nWhen answering user questions, use ONLY the bylaw information provided above. Cite the exact bylaw number and section in your response.`;
      }

      // Use simplified message format for reliability
      const userQuery = typeof userMessage.content === 'string'
        ? userMessage.content.substring(0, 1000)
        : 'What can you tell me about Oak Bay bylaws?';

      // Try the primary model first
      try {
        const messageId = generateUUID();
        const model = DEFAULT_MODEL_ID;

        // Use non-streaming approach for better reliability
        const response = await anthropic.messages.create({
          model,
          max_tokens: 1000,
          system: enhancedSystemMessage,
          messages: [{
            role: 'user',
            content: [{ type: 'text', text: userQuery }]
          }],
          temperature: 0.7
        });

        // Extract the text content
        const textContent = response.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n');

        // Save the message to the database
        await saveMessages({
          messages: [{
            id: messageId,
            chatId: id,
            role: 'assistant',
            content: textContent,
            createdAt: new Date(),
          }],
        });

        // Return the response
        return new Response(
          JSON.stringify({
            id: messageId,
            role: 'assistant',
            content: textContent,
            createdAt: new Date().toISOString()
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      } catch (primaryError) {
        console.error("Error with primary model:", primaryError);

        // Try fallback model
        try {
          const messageId = generateUUID();
          const model = FALLBACK_MODEL_ID;
          const shortSystemPrompt = "You are a helpful bylaw assistant for Oak Bay. Be concise.";

          const response = await anthropic.messages.create({
            model,
            max_tokens: 800,
            system: shortSystemPrompt,
            messages: [{
              role: 'user',
              content: [{ type: 'text', text: userQuery.substring(0, 500) }]
            }],
            temperature: 0.7
          });

          // Extract text content
          const textContent = response.content
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('\n');

          // Save message
          await saveMessages({
            messages: [{
              id: messageId,
              chatId: id,
              role: 'assistant',
              content: textContent,
              createdAt: new Date(),
            }],
          });

          return new Response(
            JSON.stringify({
              id: messageId,
              role: 'assistant',
              content: textContent,
              createdAt: new Date().toISOString()
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        } catch (fallbackError) {
          console.error("Error with fallback model:", fallbackError);
          return createErrorResponse(
            'Unable to generate a response',
            'Our AI service is currently having difficulties. Please try again in a few minutes.'
          );
        }
      }
    } catch (error) {
      console.error('Error in chat functionality:', error);
      
      // Better error categorization
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('API key') || errorMessage.includes('auth')) {
        return createErrorResponse(
          'Authentication error with the AI provider',
          'Please try again later or contact support.',
          401
        );
      }
      
      if (errorMessage.includes('model')) {
        return createErrorResponse(
          'The selected AI model is unavailable',
          'Please try another model.',
          400
        );
      }
      
      return createErrorResponse(
        'Our AI service is temporarily unavailable',
        'Please try again in a few minutes.'
      );
    }
  } catch (error) {
    console.error('Unexpected error in chat API:', error);
    return createErrorResponse(
      'An unexpected error occurred',
      process.env.NODE_ENV === 'development' ? String(error) : undefined
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
