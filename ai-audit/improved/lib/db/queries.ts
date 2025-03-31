import "server-only";
import { env } from "node:process";
import { genSaltSync, hashSync } from "bcrypt-ts";
import { and, asc, desc, eq, gt, gte, inArray } from "drizzle-orm";
import db from "./index";
import * as schema from "./schema";

const { user, chat, message, vote, document, suggestion } = schema;

export type { User, Chat, Message, Document, Suggestion } from "./schema";

class DbOperationError extends Error {
  constructor(operation: string, originalError: unknown) {
    const message = `Database operation '${operation}' failed: ${originalError instanceof Error ? originalError.message : String(originalError)}`;
    super(message);
    this.name = "DbOperationError";
  }
}

export async function getUser(email: string): Promise<schema.User[]> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    throw new DbOperationError("getUser", error);
  }
}

export async function createUser(
  email: string,
  password: string,
): Promise<unknown> {
  const saltRounds = Number.parseInt(env.PASSWORD_SALT_ROUNDS || "12", 10);
  const salt = genSaltSync(saltRounds);
  const hash = hashSync(password, salt);

  try {
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    throw new DbOperationError("createUser", error);
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility = "private",
}: {
  id: string;
  userId: string;
  title: string;
  visibility?: "public" | "private";
}): Promise<unknown> {
  if (!id || typeof id !== "string" || id.length > 100) {
    throw new Error("Invalid chat ID");
  }
  if (!userId || typeof userId !== "string" || userId.length > 100) {
    throw new Error("Invalid user ID");
  }
  title =
    !title || typeof title !== "string" || title === ""
      ? "New Chat"
      : title.length > 255
        ? `${title.substring(0, 252)}...`
        : title;
  visibility =
    visibility !== "public" && visibility !== "private"
      ? "private"
      : visibility;

  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (error) {
    throw new DbOperationError("saveChat", error);
  }
}

export async function deleteChatById(id: string): Promise<unknown> {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    throw new DbOperationError("deleteChatById", error);
  }
}

export async function getChatsByUserId(id: string): Promise<unknown> {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    throw new DbOperationError("getChatsByUserId", error);
  }
}

export async function getChatById(id: string): Promise<unknown> {
  try {
    return (await db.select().from(chat).where(eq(chat.id, id)))[0];
  } catch (error) {
    throw new DbOperationError("getChatById", error);
  }
}

export async function saveMessages(messages: schema.Message[]): Promise<void> {
  if (!messages.length) {
    return;
  }
  try {
    await db.insert(message).values(messages);
  } catch (error) {
    throw new DbOperationError("saveMessages", error);
  }
}

export async function getMessagesByChatId(id: string): Promise<unknown> {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    throw new DbOperationError("getMessagesByChatId", error);
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}): Promise<unknown> {
  try {
    const chat = await getChatById(chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    const messageExists = (
      await db
        .select()
        .from(message)
        .where(and(eq(message.id, messageId), eq(message.chatId, chatId)))
    )[0];
    if (!messageExists) {
      throw new Error("Message not found in chat");
    }

    const existingVote = (
      await db
        .select()
        .from(vote)
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)))
    )[0];
    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    } else {
      return await db.insert(vote).values({
        chatId,
        messageId,
        isUpvoted: type === "up",
      });
    }
  } catch (error) {
    throw new DbOperationError("voteMessage", error);
  }
}

export async function getVotesByChatId(id: string): Promise<unknown[]> {
  try {
    const chatExists = await getChatById(id);
    if (!chatExists) {
      return [];
    }
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    return [];
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: "text" | "code" | "image" | "sheet";
  content: string;
  userId: string;
}): Promise<unknown> {
  try {
    return await db.insert(document).values({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    throw new DbOperationError("saveDocument", error);
  }
}

export async function getDocumentsById(id: string): Promise<unknown[]> {
  try {
    return await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));
  } catch (error) {
    throw new DbOperationError("getDocumentsById", error);
  }
}

export async function getDocumentById(id: string): Promise<unknown> {
  try {
    return (
      await db
        .select()
        .from(document)
        .where(eq(document.id, id))
        .orderBy(desc(document.createdAt))
    )[0];
  } catch (error) {
    throw new DbOperationError("getDocumentById", error);
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}): Promise<void> {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );
    await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    throw new DbOperationError("deleteDocumentsByIdAfterTimestamp", error);
  }
}

export async function saveSuggestions(
  suggestions: schema.Suggestion[],
): Promise<void> {
  if (!suggestions.length) {
    return;
  }
  try {
    await db.insert(suggestion).values(suggestions);
  } catch (error) {
    throw new DbOperationError("saveSuggestions", error);
  }
}

export async function getSuggestionsByDocumentId(
  documentId: string,
): Promise<unknown[]> {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(eq(suggestion.documentId, documentId));
  } catch (error) {
    throw new DbOperationError("getSuggestionsByDocumentId", error);
  }
}

export async function getMessageById(id: string): Promise<unknown> {
  try {
    return (await db.select().from(message).where(eq(message.id, id)))[0];
  } catch (error) {
    throw new DbOperationError("getMessageById", error);
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}): Promise<void> {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );
    const messageIds = messagesToDelete.map((msg: { id: string }) => msg.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );
      await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    throw new DbOperationError("deleteMessagesByChatIdAfterTimestamp", error);
  }
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}): Promise<unknown> {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    throw new DbOperationError("updateChatVisibilityById", error);
  }
}

export const updateChatVisiblityById = (
  ...args: Parameters<typeof updateChatVisibilityById>
) => {
  console.warn(
    "DEPRECATED: updateChatVisiblityById is deprecated due to a typo. " +
      "Please use updateChatVisibilityById instead.",
  );
  return updateChatVisibilityById(...args);
};
