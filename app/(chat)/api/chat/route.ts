import type { Message } from 'ai';
import { createDataStreamResponse } from 'ai';
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
import type { ContentBlockDeltaEvent, ContentBlockStartEvent, MessageDeltaEvent } from '@anthropic-ai/sdk/resources/messages';

export const maxDuration = 300; // 5 minutes max duration for the request

// Helper functions to keep the main API code clean
const createErrorResponse = (message: string, details?: string, status = 500) => {
  // Create standardized error responses following Anthropic's error format
  return new Response(
    JSON.stringify({ 
      type: "error", 
      error: {
        type: status === 400 ? "invalid_request_error" :
              status === 401 ? "authentication_error" :
              status === 403 ? "permission_error" :
              status === 404 ? "not_found_error" :
              status === 413 ? "request_too_large" :
              status === 429 ? "rate_limit_error" :
              status === 500 ? "api_error" :
              status === 529 ? "overloaded_error" : "api_error",
        message
      },
      details
    }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
};

// Message type definitions based on Anthropic API 
type TextContent = { type: 'text'; text: string };
type UserMessage = { role: 'user'; content: TextContent[] | string };
type AssistantMessage = { role: 'assistant'; content: TextContent[] | string };
type MessageContent = TextContent[] | string;
type MessageParam = { role: 'user' | 'assistant'; content: TextContent[] | string };

/**
 * Format messages for Anthropic API according to their specification:
 * https://docs.anthropic.com/en/api/migrating-from-text-completions-to-messages
 * 
 * Claude API requires:
 * 1. First message must be from user
 * 2. Messages must alternate between user and assistant
 * 3. Last message should be from user
 */
const formatMessagesForAnthropic = (messages: Array<Message>): any[] => {
  // Filter out any system messages (will be handled separately via the system parameter)
  let filteredMessages = messages
    .filter(msg => msg.role !== 'system')
    .map(msg => {
      // Convert message role to appropriate Anthropic role
      // Anthropic only supports 'user' and 'assistant' roles
      const msgRole = msg.role as string;
      const role = msgRole === 'user' || msgRole === 'tool' ? 'user' as const : 'assistant' as const;
      
      // Handle content based on type
      try {
        // Format content according to Anthropic API requirements
        if (typeof msg.content === 'string') {
          // Convert string content to structured format with type: 'text'
          const text = msg.content.trim() || "Hello";
          return { 
            role, 
            content: [{ type: 'text', text }] 
          };
        } else if (Array.isArray(msg.content)) {
          // Handle array content
          if (!msg.content || (msg.content as any[]).length === 0) {
            return { 
              role, 
              content: [{ type: 'text', text: "Hello" }] 
            };
          }
          
          // Check if it's already correctly formatted
          const contentArray = msg.content as any[];
          if (contentArray.every(item => 
            typeof item === 'object' && item !== null && 
            'type' in item && 
            (item.type === 'text' || item.type === 'image')
          )) {
            // Already in correct format for Anthropic API
            return { role, content: msg.content };
          } else {
            // Convert to text format
            return { 
              role, 
              content: [{ 
                type: 'text', 
                text: JSON.stringify(msg.content) 
              }]
            };
          }
        } else if (typeof msg.content === 'object' && msg.content !== null) {
          // Convert object to text content
          return { 
            role, 
            content: [{ 
              type: 'text', 
              text: JSON.stringify(msg.content) 
            }]
          };
        } else {
          // Default fallback
          return { 
            role, 
            content: [{ type: 'text', text: "Hello" }] 
          };
        }
      } catch (e) {
        // Error fallback
        console.error("Message formatting error:", e);
        return { 
          role, 
          content: [{ type: 'text', text: "Hello" }] 
        };
      }
    });
    
  // Ensure there's at least one message
  if (filteredMessages.length === 0) {
    console.log("No valid messages found, adding default user message");
    filteredMessages = [{ 
      role: 'user', 
      content: [{ type: 'text', text: "Hello, I need information about Oak Bay bylaws." }]
    }];
    return filteredMessages;
  }
  
  // Ensure the first message is from the user
  if (filteredMessages[0].role !== 'user') {
    console.log("First message is not from user, adding default user message at beginning");
    filteredMessages.unshift({ 
      role: 'user', 
      content: [{ type: 'text', text: "Hello, I need information about Oak Bay bylaws." }]
    });
  }
  
  // Ensure messages alternate between user and assistant
  const correctedMessages: any[] = [filteredMessages[0]];
  
  for (let i = 1; i < filteredMessages.length; i++) {
    const prevRole = correctedMessages[correctedMessages.length - 1].role;
    const currentMsg = filteredMessages[i];
    
    if (currentMsg.role === prevRole) {
      // Insert an empty message from the other role to maintain alternating pattern
      const insertRole = prevRole === 'user' ? 'assistant' : 'user';
      console.log(`Adding placeholder ${insertRole} message to maintain alternating pattern`);
      correctedMessages.push({ 
        role: insertRole as 'assistant' | 'user', 
        content: [{ 
          type: 'text', 
          text: insertRole === 'assistant' ? "I understand." : "Please continue." 
        }]
      });
    }
    
    correctedMessages.push(currentMsg);
  }
  
  // Ensure the last message is from the user
  if (correctedMessages[correctedMessages.length - 1].role === 'assistant') {
    console.log("Last message is from assistant, adding user prompt at end");
    correctedMessages.push({ 
      role: 'user', 
      content: [{ 
        type: 'text', 
        text: "Please answer my question about Oak Bay bylaws." 
      }] 
    });
  }
  
  return correctedMessages;
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
    
    // Log environment check with detailed information
    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    const apiKeyValid = apiKey && apiKey.trim() !== '' && apiKey.startsWith('sk-ant-');
    
    console.log("Chat API: Environment check", {
      hasAnthropicKey: !!apiKey,
      apiKeyLooksValid: apiKeyValid,
      apiKeyLength: apiKey ? apiKey.length : 0,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      selectedModel: process.env.CLAUDE_MODEL || DEFAULT_MODEL_ID,
      fallbackModel: process.env.CLAUDE_FALLBACK_MODEL || FALLBACK_MODEL_ID
    });
    
    // Check API key at the beginning - fail fast if missing or invalid
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
        'The API key for the AI service appears to be invalid. Please contact support.'
      );
    }
    
    // Test API key with minimal request
    try {
      console.log("Chat API: Testing API key validity with minimal request");
      await anthropic.messages.create({
        model: FALLBACK_MODEL_ID, // Use fallback model for the test
        max_tokens: 5,
        system: "Test message",
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }],
        stream: false
      });
      console.log("Chat API: API key validation successful");
    } catch (apiKeyError) {
      console.error("Chat API: API key validation failed:", apiKeyError);
      return createErrorResponse(
        'Authentication error with AI provider',
        'The server failed to authenticate with the AI service. Please try again later.',
        401
      );
    }

    // Parse request
    let requestData: any;
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
      return createErrorResponse('Invalid request format', 'Request body must be a valid JSON object', 400);
    }
    
    const { id, messages, selectedChatModel } = requestData;
    
    // Validate required fields with detailed errors
    if (!id) {
      console.error("Chat API: Missing chat ID");
      return createErrorResponse('Chat ID is required', 'Please provide a valid chat ID', 400);
    }
    
    if (!messages) {
      console.error("Chat API: Missing messages array");
      return createErrorResponse('Messages array is required', 'Please provide a messages array', 400);
    }
    
    if (!Array.isArray(messages)) {
      console.error("Chat API: Messages is not an array", typeof messages);
      return createErrorResponse('Messages must be an array', 'The messages property must be an array', 400);
    }
    
    if (messages.length === 0) {
      console.error("Chat API: Empty messages array");
      return createErrorResponse('Messages array cannot be empty', 'Please provide at least one message', 400);
    }
    
    // Log basic info about the request
    console.log(`Chat API: Processing request with ${messages.length} messages for chat ID ${id}`);
    
    // Validate message format
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      // Check if message is properly formed
      if (!msg || typeof msg !== 'object') {
        console.error(`Chat API: Invalid message at index ${i}`, msg);
        return createErrorResponse(
          'Invalid message format', 
          `Message at position ${i} is not a valid object`,
          400
        );
      }
      
      // Check role validity
      const msgRole = msg.role as string;
      if (!msgRole || !['user', 'assistant', 'system', 'tool'].includes(msgRole)) {
        console.error(`Chat API: Invalid message role at index ${i}:`, msgRole);
        return createErrorResponse(
          'Invalid message role',
          `Message at position ${i} has an invalid role. Must be one of: user, assistant, system, tool`,
          400
        );
      }
      
      // Check content (allowing empty content only for assistant messages)
      const hasEmptyContent = !msg.content || 
          (typeof msg.content === 'string' && msg.content.trim() === '') ||
          (Array.isArray(msg.content) && msg.content.length === 0);
      
      if (hasEmptyContent && msgRole !== 'assistant') {
        console.error(`Chat API: Empty content in message at index ${i} with role ${msgRole}`);
        return createErrorResponse(
          'Empty message content', 
          `Message at position ${i} has empty content. Only assistant messages can have empty content.`,
          400
        );
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
      
      let searchBylawsTool: any;
      let searchBylaws: any;
      let createToolExecutor: any;
      
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
            
          const executeSearchTool = createToolExecutor(
            searchBylawsTool.execute as any // Use type assertion to avoid complex type issues
          ) as (params: SearchBylawParams) => Promise<BylawToolResult>;
          
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
            const formattedResults = searchResults.map((result: { metadata: { bylawNumber: any; title: any; section: any; url: any; }; text: any; }) => ({
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
      
      // Create a simplified message format for better reliability
      // Instead of using the complex formatting logic which might cause issues,
      // simplify to just the latest user message for more reliable operation
      const userQuery = typeof userMessage.content === 'string' 
        ? userMessage.content.substring(0, 1000) // Limit length for safety
        : 'What can you tell me about Oak Bay bylaws?';
      
      console.log("Chat API: Using simplified messaging with user query:", `${userQuery.substring(0, 50)}...`);
      
      // Create a simple, reliable message format
      const simplifiedMessages: Array<MessageParam> = [
        { 
          role: 'user',
          content: [{ 
            type: 'text', 
            text: userQuery 
          }]
        }
      ];
      
      // Use the original formatting function as backup only if needed for complex conversations
      let formattedMessages = simplifiedMessages;
      
      // Only use the complex formatter for multi-turn conversations
      if (messages.length > 2) {
        try {
          const complexFormattedMessages = formatMessagesForAnthropic(messages);
          // Verify the formatting is valid
          if (complexFormattedMessages.length > 0 && 
              complexFormattedMessages[0].role === 'user' &&
              (complexFormattedMessages.length === 1 || 
               complexFormattedMessages[complexFormattedMessages.length-1].role !== 'assistant')) {
            console.log("Chat API: Using complex message formatting for multi-turn conversation");
            formattedMessages = complexFormattedMessages;
          } else {
            console.log("Chat API: Complex formatting produced invalid messages, using simplified format");
          }
        } catch (formatError) {
          console.error("Chat API: Error in message formatting, using simplified format:", formatError);
        }
      } else {
        console.log("Chat API: Using simplified message format for short conversation");
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
      
      // Response from the Anthropic API when streaming is enabled
      let response: any; // Using any type to accommodate streaming response
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
            content: [{ 
              type: 'text',
              text: 'Hello, I need information about Oak Bay bylaws.'
            }]
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
          
          // Create streaming response using Anthropic's Messages API
          // Following guidance from https://docs.anthropic.com/en/api/client-sdks
          response = await anthropic.messages.create({
            model: modelName,
            max_tokens: 2000,
            system: enhancedSystemMessage,
            messages: formattedMessages,
            temperature: 0.5,
            stream: true // Enable streaming mode for incremental responses
          });
        } catch (requestError) {
          console.error("Failed to create request:", requestError);
          
          // Identify specific Anthropic API errors
          if (requestError instanceof Anthropic.APIError) {
            console.error(`Anthropic API Error (${requestError.status}): ${requestError.name}`);
            console.error("Error details:", requestError.message);
            
            // Log additional debug information
            if (requestError.headers) {
              console.error("Response headers:", requestError.headers);
            }
          } else if (requestError instanceof Error) {
            // Handle stack trace safely for other errors
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
              return `${value.substring(0, 500)}... [truncated]`;
            }
            return value;
          }, 2);
          
          // Try to get status code
          if ('status' in apiError) {
            statusCode = Number(apiError.status);
          }
        }
        
        console.error(`Anthropic API error details: [Status: ${statusCode}]`, errorDetails);
        
        // For specific error codes, provide more helpful responses following Anthropic error formats
        // See: https://docs.anthropic.com/en/api/errors
        if (statusCode === 401) {
          console.error("Authentication error with API key");
          return createErrorResponse(
            'API key may be invalid or expired',
            'Please check server configuration.',
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
            'The AI service rejected our request format',
            'Please try a simpler query with less context.',
            400
          );
        }
        
        if (statusCode === 429) {
          console.error("Rate limit exceeded");
          return createErrorResponse(
            'Too many requests to the AI service',
            'Please try again in a few moments. Our system is experiencing high demand.',
            429
          );
        }
        
        if (statusCode === 413 || statusCode === 414 || errorDetails.includes('too long') || errorDetails.includes('token limit')) {
          console.error("Content too large error");
          return createErrorResponse(
            'The request contains too much text',
            'Try a shorter query with more specific details. Your conversation history may be too long.',
            413
          );
        }
        
        if (statusCode === 500 || statusCode === 502 || statusCode === 503 || statusCode === 504) {
          console.error("Server error from API provider");
          return createErrorResponse(
            'AI service is temporarily unavailable',
            'Our AI provider is experiencing issues. Please try again in a few minutes.',
            503
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
            content: [{ type: 'text', text: userQuery }]
          };
          const fallbackMessages: any[] = [fallbackUserMessage];
          
          // Use very short system prompt
          const shortSystemPrompt = "You are a helpful bylaw assistant for Oak Bay. Be concise.";
          
          // Log the exact fallback request
          console.log("Fallback request details:", {
            model: FALLBACK_MODEL_ID,
            systemPrompt: shortSystemPrompt,
            message: userQuery,
          });
          
          // Fallback to a simpler model with minimal content
          // Using the same structure as recommended in the Anthropic docs
          response = await anthropic.messages.create({
            model: FALLBACK_MODEL_ID,
            max_tokens: 800,                // Reduced token count
            system: shortSystemPrompt,      // Minimal system prompt
            messages: fallbackMessages,     // Single user message with proper structure
            temperature: 0.7,              
            stream: true                    // Stream the response
          });
          
          console.log("Successfully created fallback stream");
        } catch (fallbackError) {
          console.error("Fallback model error:", fallbackError);
          
          // Extract any useful error information
          let fallbackErrorDetails = "Unknown fallback error";
          if (typeof fallbackError === 'object' && fallbackError !== null) {
            fallbackErrorDetails = JSON.stringify(fallbackError, (key, value) => {
              if (typeof value === 'string' && value.length > 100) {
                return `${value.substring(0, 100)}...`;
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
      
      // Return streaming response with simplified streaming logic
      return createDataStreamResponse({
        execute: async (writer) => {
          let completion = '';
          let streamErrors = false;
          let totalChunks = 0;
          let textChunks = 0;
          
          // Function to save the completion to the database
          const saveCompletionToDatabase = async (text: string) => {
            try {
              await saveMessages({
                messages: [{
                  id: messageId,
                  chatId: id,
                  role: 'assistant',
                  content: text,
                  createdAt: new Date(),
                }],
              });
              console.log('Successfully saved message to database');
              return true;
            } catch (dbError) {
              console.error('Failed to save message to database:', dbError);
              return false;
            }
          };
          
          try {
            // Single global timeout for the entire streaming operation
            const streamTimeout = setTimeout(() => {
              console.error('Stream processing timed out after 60 seconds');
              streamErrors = true;
              const timeoutMessage = "\n\nI apologize, but the response timed out. Please try again with a shorter query.";
              writer.writeData({ text: timeoutMessage });
              
              // Save timeout message to database
              if (completion.trim().length === 0) {
                saveCompletionToDatabase(timeoutMessage.trim());
              }
            }, 60000); // 60 second global timeout
            
            try {
              // Simplified chunk tracking
              let lastChunkTime = Date.now();
              let chunkTimeout: ReturnType<typeof setTimeout> | null = null;
              
              // Simplified chunk stall detection
              const resetChunkTimeout = () => {
                if (chunkTimeout) clearTimeout(chunkTimeout);
                chunkTimeout = setTimeout(() => {
                  const secondsSinceLastChunk = (Date.now() - lastChunkTime) / 1000;
                  console.error(`Stream stalled: No chunks received for ${secondsSinceLastChunk.toFixed(1)} seconds`);
                  // Instead of throwing, we'll handle this gracefully
                  const stallMessage = "\n\nI apologize, but the response was interrupted. Please try again.";
                  writer.writeData({ text: stallMessage });
                  completion += stallMessage;
                }, 10000); // 10 second timeout
              };
              
              // Define chunk timeout for safely typing setTimeout
              const chunkTimeoutMs = 10000;
              
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
                
                // Log chunk type for debugging (only log occasionally to avoid flooding)
                if (totalChunks === 1 || totalChunks % 50 === 0) {
                  console.log(`Processing chunk #${totalChunks} of type: ${chunk.type}`);
                }
                
                try {
                  // Process different event types from Anthropic's streaming API
                  // Following event types from https://docs.anthropic.com/en/api/messages-streaming#raw-http-stream-response
                  
                  if (!chunk || !chunk.type) {
                    console.warn(`Chunk ${totalChunks}: Missing type or malformed chunk`);
                    continue;
                  }
                  
                  switch(chunk.type) {
                    case 'message_start':
                      // Message has started - stream beginning
                      console.log('Message generation started');
                      break;
                      
                    case 'content_block_start': {
                      // Handle the start of a content block (often includes initial text)
                      const startEvent = chunk as ContentBlockStartEvent;
                      if (startEvent.content_block?.type === 'text' && 
                          startEvent.content_block.text) {
                        const text = startEvent.content_block.text;
                        textChunks++;
                        completion += text;
                        writer.writeData({ text });
                        console.log(`Content block started with ${text.length} characters`);
                      } else if (startEvent.content_block?.type) {
                        console.log(`Content block of type '${startEvent.content_block.type}' started`);
                      }
                      break;
                    }
                      
                    case 'content_block_delta': {
                      // Handle incremental text updates (most common event type)
                      const deltaEvent = chunk as ContentBlockDeltaEvent;
                      // Handle TextDelta from Anthropic's streaming API
                      const delta = deltaEvent.delta as any;
                      if (delta?.text) {
                        const text = delta.text;
                        textChunks++;
                        completion += text;
                        writer.writeData({ text });
                      }
                      break;
                    }
                      
                    case 'content_block_stop':
                      // A content block has finished
                      console.log(`Content block ended after chunk ${totalChunks}`);
                      break;
                      
                    case 'message_delta': {
                      // Message metadata has been updated - includes token usage and stop reason
                      // Cast to any to safely access properties
                      const msgDelta = chunk as MessageDeltaEvent;
                      const deltaProp = msgDelta.delta as any;
                      if (deltaProp?.stop_reason) {
                        console.log(`Stream complete with stop reason: ${deltaProp.stop_reason}`);
                      }
                      if (deltaProp?.usage) {
                        console.log('Token usage:', deltaProp.usage);
                      }
                      break;
                    }
                      
                    case 'message_stop':
                      // Message has completed - final event
                      console.log('Message generation completed');
                      break;
                      
                    case 'error':
                      // An error occurred during generation
                      console.error(`Error in stream: ${JSON.stringify(chunk)}`);
                      if (chunk.error) {
                        const errorType = chunk.error.type || 'unknown_error';
                        const errorMsg = chunk.error.message || 'Unknown error';
                        console.error(`Stream error (${errorType}): ${errorMsg}`);
                        streamErrors = true;
                        writer.writeData({ 
                          text: `\n\nI apologize, but there was an error: ${errorMsg}` 
                        });
                      } else {
                        console.error('Unknown stream error');
                        streamErrors = true;
                        writer.writeData({ 
                          text: "\n\nI apologize, but there was an unknown error with the AI service." 
                        });
                      }
                      break;
                      
                    case 'ping':
                      // Ping events are just keep-alive messages
                      // No need to process these
                      break;
                      
                    default:
                      // Log unhandled event types (only occasionally to avoid log spam)
                      if (totalChunks < 5 || totalChunks % 100 === 0) {
                        console.log(`Chunk ${totalChunks}: Unhandled type "${chunk.type}"`);
                      }
                  }
                } catch (chunkError) {
                  console.error(`Error processing chunk #${totalChunks}:`, chunkError);
                  // Continue processing other chunks rather than breaking the entire stream
                }
              }
              
              // Clean up the timeout
              if (chunkTimeout) clearTimeout(chunkTimeout);
              
              console.log(`Stream processed ${totalChunks} total chunks, ${textChunks} text chunks`);
              
              // If no text was received but no error occurred, add a message
              if (textChunks === 0 && !streamErrors) {
                const errorMsg = "I apologize, but I wasn't able to generate a proper response. Please try again.";
                completion = errorMsg;
                writer.writeData({ text: errorMsg });
              }
            } catch (streamError) {
              streamErrors = true;
              console.error('Error during stream processing:', streamError);
              const errorMsg = "\n\nI apologize, but there was an error while generating the response. Please try again.";
              writer.writeData({ text: errorMsg });
              
              // Add error message to completion if it's empty
              if (!completion.trim()) {
                completion = errorMsg.trim();
              }
            } finally {
              // Clear both timeouts
              clearTimeout(streamTimeout);
              
              // Ensure we have a valid completion to save
              if (completion.trim().length === 0) {
                const fallbackMessage = "I'm sorry, I wasn't able to generate a response. Please try again.";
                completion = fallbackMessage;
                
                if (!streamErrors) {
                  writer.writeData({ text: fallbackMessage });
                }
              }
              
              // Save the response to the database using our utility function
              await saveCompletionToDatabase(completion);
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
    
    // Enhanced error reporting with more diagnostic information
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      
      // Log additional properties that might be useful
      const errorObj = Object.getOwnPropertyNames(error).reduce((acc, prop) => {
        try {
          // @ts-ignore - Dynamically access properties
          acc[prop] = error[prop];
        } catch (e) {
          acc[prop] = 'Error accessing property';
        }
        return acc;
      }, {} as Record<string, any>);
      
      console.error('Error properties:', JSON.stringify(errorObj, null, 2));
    }
    
    // Format a better error message for the user
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error details:', errorMessage);
    
    // In development, provide more detailed errors
    if (process.env.NODE_ENV === 'development') {
      return createErrorResponse(
        'An unexpected error occurred in the chat API',
        `Error: ${errorMessage}\n\nCheck server logs for more details.`,
        500
      );
    } else {
      // In production, use a more user-friendly message
      return createErrorResponse(
        'Our chat service is experiencing technical difficulties',
        'Please try again in a few moments. If the problem persists, contact support.',
        500
      );
    }
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
