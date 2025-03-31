"use server";

import { type Message, generateText } from "ai";
import { cookies } from "next/headers";

import type { VisibilityType } from "@/components/visibility-selector";
import { myProvider } from "@/lib/ai/models";
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisibilityById,
} from "@/lib/db/queries";

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: Message;
}) {
  try {
    // Format the message in a way the AI can understand
    const messageContent =
      typeof message.content === "string"
        ? message.content
        : JSON.stringify(message.content);

    const { text: title } = await generateText({
      model: myProvider.languageModel("title-model"),
      system: `You will generate a short title based on the user message. 
      The title should be under 80 characters, summarize the message content, 
      and not use quotes or colons.`,
      prompt: messageContent.substring(0, 1000), // Limit length for safety
    });

    return title || "New Chat"; // Fallback title
  } catch (error) {
    console.error("Error generating title:", error);
    return "New Chat"; // Safe fallback
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisibilityById({ chatId, visibility });
}
