import { auth } from "@/app/(auth)/auth";
// Import the direct API helpers
import { MODEL_ID, callAnthropic } from "@/lib/ai/models";
import { systemPrompt } from "@/lib/ai/prompts";
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from "@/lib/db/queries";
import { generateUUID, getMostRecentUserMessage } from "@/lib/utils";

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
  process.env.RATE_LIMIT_REQUESTS || "10",
  10,
); // Requests per window
const RATE_LIMIT_WINDOW_MS = Number.parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || "60000",
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

import { generateTitleFromUserMessage } from "../../actions";

export const maxDuration = 300; // 5 minutes max duration

// Helper function for error responses
const createErrorResponse = (
  message: string,
  details?: string,
  status = 500,
) => {
  return new Response(JSON.stringify({ error: message, details }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
};

export async function POST(request: Request) {
  // Only log in development
  if (process.env.NODE_ENV === "development") {
    console.log("Chat API: Request received");
  }

  // Declare IP variable at the top level of the function
  let ip = "";
  const startTime = Date.now();

  try {
    // Get client IP for rate limiting
    ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown-ip";

    // Check API key at the beginning
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("Chat API: Missing Anthropic API key");
      return createErrorResponse(
        "Server configuration error",
        process.env.NODE_ENV === "development" ? "Missing API key" : undefined,
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
      if (process.env.NODE_ENV === "development") {
        console.log("Chat API: Request data parsed");
      }
    } catch (parseError) {
      console.error("Chat API: JSON parse error");
      return createErrorResponse("Invalid request format", undefined, 400);
    }

    const { id, messages, selectedChatModel } = requestData;

    // Additional request validation
    if (!id || typeof id !== "string") {
      return createErrorResponse("Invalid chat ID", undefined, 400);
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`Chat API: Processing request for chat ID: ${id}`);
    }

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("Chat API: Missing required fields");
      return createErrorResponse("Invalid request format", undefined, 400);
    }

    // User authentication
    const session = await auth();
    if (!session?.user?.id) {
      console.error("Chat API: User not authenticated");
      return createErrorResponse("Unauthorized", undefined, 401);
    }

    // Apply rate limiting
    const userId = session.user.id;

    if (isRateLimited(userId, ip)) {
      console.warn(`Rate limit exceeded for user ${userId} from IP ${ip}`);
      return createErrorResponse(
        "Too many requests",
        "Please try again later",
        429,
      );
    }

    // Get user message
    const userMessage = getMostRecentUserMessage(messages);
    if (
      !userMessage ||
      typeof userMessage.content !== "string" ||
      userMessage.content.trim() === ""
    ) {
      console.error("Chat API: Invalid or empty user message");
      return createErrorResponse("Invalid user message", undefined, 400);
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
          console.log("Chat API: New chat created successfully");
        } catch (titleError) {
          console.error("Chat API: Error generating title:", titleError);
          // Fall back to a generic title if title generation fails
          console.log(`Chat API: Using fallback title for chat ID: ${id}`);
          await saveChat({ id, userId: session.user.id, title: "New Chat" });
        }
      } else {
        console.log(`Chat API: Found existing chat with ID: ${id}`);
      }
    } catch (chatError) {
      console.error("Chat API: Error getting/creating chat:", chatError);
      // Include more detailed error information in development
      const errorDetails =
        process.env.NODE_ENV === "development"
          ? `Error: ${chatError instanceof Error ? chatError.message : String(chatError)}`
          : "Error accessing chat data";

      return createErrorResponse("Database error", errorDetails, 500);
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
      console.log("Chat API: User message saved successfully");
    } catch (saveError) {
      console.error("Chat API: Error saving user message:", saveError);

      // Include more detailed error information in development
      const errorDetails =
        process.env.NODE_ENV === "development"
          ? `Error: ${saveError instanceof Error ? saveError.message : String(saveError)}`
          : "Error saving message data";

      return createErrorResponse("Database error", errorDetails, 500);
    }

    // Create message ID for later saving
    const messageId = generateUUID();

    // Convert to AI SDK format
    const aiMessages = messages.map((msg) => ({
      role: msg.role,
      content:
        typeof msg.content === "string" ? msg.content : String(msg.content),
    }));

    // Check if streaming is disabled (for troubleshooting)
    const disableStreaming = process.env.DISABLE_STREAMING === "true";

    if (disableStreaming) {
      console.log("Streaming is disabled, using non-streaming mode");
      try {
        // Use direct API call to Anthropic
        const apiResponse = await callAnthropic(
          aiMessages,
          systemPrompt({ selectedChatModel }),
          { stream: false },
        );

        // Extract content from response
        const content =
          apiResponse.content?.[0]?.text || "No response from model";

        // Save the complete message to database
        try {
          await saveMessages({
            messages: [
              {
                id: messageId,
                createdAt: new Date(),
                chatId: id,
                role: "assistant",
                content: content,
              },
            ],
          });
        } catch (saveError) {
          console.error("Error saving assistant message:", saveError);
        }

        // Return the complete response
        return new Response(
          JSON.stringify({
            id: messageId,
            content: content,
            role: "assistant",
            createdAt: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      } catch (error) {
        console.error("Error in non-streaming mode:", error);
        return createErrorResponse(
          "AI service error",
          `Failed to generate response: ${error instanceof Error ? error.message : String(error)}`,
          500,
        );
      }
    }

    // Use streaming mode (default)
    try {
      console.log(`Chat API: Using Claude model (${MODEL_ID})`);

      // Create a direct stream using fetch API instead of AI SDK
      return new Response(
        new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();
            let completeResponse = "";
            let streamingStarted = false;

            try {
              // Additional timeout protection
              const timeout = setTimeout(() => {
                if (!streamingStarted) {
                  console.error("Stream timeout - no data received");
                  controller.error(new Error("Stream timeout"));
                }
              }, 10000); // 10 second timeout

              // Make direct API call to Anthropic
              const response = await fetch(
                "https://api.anthropic.com/v1/messages",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-api-key": process.env.ANTHROPIC_API_KEY || "",
                    "anthropic-version": "2023-06-01",
                    "anthropic-beta": "messages-2023-12-15",
                  },
                  body: JSON.stringify({
                    model: MODEL_ID,
                    messages: aiMessages,
                    system: systemPrompt({ selectedChatModel }),
                    max_tokens: 4000,
                    temperature: 0.5,
                    stream: true,
                  }),
                },
              );

              if (!response.body) {
                throw new Error("No response body from Anthropic API");
              }

              streamingStarted = true;
              clearTimeout(timeout);

              const reader = response.body.getReader();
              const processStream = async () => {
                try {
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk
                      .split("\n")
                      .filter((line) => line.trim() !== "");

                    for (const line of lines) {
                      if (line.startsWith("data: ")) {
                        const data = line.slice(6);
                        if (data === "[DONE]") continue;

                        try {
                          const parsed = JSON.parse(data);
                          if (
                            parsed.type === "content_block_delta" &&
                            parsed.delta &&
                            parsed.delta.text
                          ) {
                            const text = parsed.delta.text;
                            completeResponse += text;

                            // Send the text chunk to the client
                            const json = JSON.stringify({ text });
                            controller.enqueue(encoder.encode(`${json}\n`));
                          }
                        } catch (parseError) {
                          console.error("Error parsing SSE data:", parseError);
                        }
                      }
                    }
                  }

                  // Stream complete, save the full message to the database
                  try {
                    await saveMessages({
                      messages: [
                        {
                          id: messageId,
                          createdAt: new Date(),
                          chatId: id,
                          role: "assistant",
                          content: completeResponse,
                        },
                      ],
                    });
                    console.log("Chat API: Saved complete message to database");
                  } catch (saveError) {
                    console.error(
                      "Chat API: Error saving complete message:",
                      saveError,
                    );
                  }

                  // Close stream
                  controller.close();
                } catch (streamError) {
                  console.error(
                    "Chat API: Stream processing error:",
                    streamError,
                  );

                  // Try to send error message through the stream if possible
                  try {
                    const errorJson = JSON.stringify({
                      error: "Stream error",
                      message:
                        streamError instanceof Error
                          ? streamError.message
                          : String(streamError),
                    });
                    controller.enqueue(encoder.encode(`${errorJson}\n`));
                  } catch (e) {
                    // Ignore errors when sending the error
                  }

                  controller.error(streamError);
                }
              };

              // Start processing
              processStream().catch((error) => {
                console.error("Chat API: Unhandled stream error:", error);
                controller.error(error);
              });
            } catch (error) {
              console.error("Chat API: Stream setup error:", error);
              controller.error(error);
            }
          },
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff",
            "X-Request-Start": startTime.toString(),
          },
        },
      );
    } catch (streamError) {
      console.error("Chat API: Failed to create stream:", streamError);
      return createErrorResponse(
        "Failed to start response stream",
        streamError instanceof Error
          ? streamError.message
          : String(streamError),
        500,
      );
    }
  } catch (error) {
    console.error("Chat API: Unhandled error:", error);
    return createErrorResponse(
      "Server error",
      error instanceof Error ? error.message : String(error),
      500,
    );
  }
}

export async function DELETE(request: Request) {
  try {
    // User authentication
    const session = await auth();
    if (!session?.user?.id) {
      console.error("Delete Chat API: User not authenticated");
      return createErrorResponse("Unauthorized", undefined, 401);
    }

    // Parse request
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      console.error("Delete Chat API: Missing chat ID");
      return createErrorResponse("Missing chat ID", undefined, 400);
    }

    // Delete chat
    console.log(`Delete Chat API: Deleting chat with ID: ${id}`);
    await deleteChatById({ id });
    console.log("Delete Chat API: Chat deleted successfully");

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Delete Chat API: Error deleting chat:", error);
    return createErrorResponse(
      "Failed to delete chat",
      error instanceof Error ? error.message : String(error),
      500,
    );
  }
}
