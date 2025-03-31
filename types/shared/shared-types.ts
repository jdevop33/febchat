import type { Vote } from "@/lib/db/schema";
import type { ChatRequestOptions, Message } from "ai";

// Shared artifact kinds
export const artifactKinds = ["text", "code", "image", "sheet"] as const;
export type ArtifactKind = (typeof artifactKinds)[number];

// Common UI Artifact interface used across components
export interface UIArtifact {
  title: string;
  documentId: string;
  kind: ArtifactKind;
  content: string;
  isVisible: boolean;
  status: "streaming" | "idle";
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

// Shared Message props used across components
export interface SharedMessageProps {
  chatId: string;
  isLoading: boolean;
  votes?: Array<Vote>;
  messages?: Array<Message>; // Optional for MessageProps
  setMessages: (
    messages: Message[] | ((messages: Message[]) => Message[]),
  ) => void;
  reload: (
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  isReadonly: boolean;
}

// Shared document props
export interface SharedDocumentProps {
  isReadonly: boolean;
  artifactKind?: ArtifactKind;
  title?: string;
  content?: string;
  status?: UIArtifact["status"];
}

// Shared editor props
export interface SharedEditorProps {
  content: string;
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  status: UIArtifact["status"];
  saveContent?: (updatedContent: string, debounce: boolean) => void;
  onSaveContent?: (updatedContent: string, debounce: boolean) => void;
  suggestions?: any[];
  isInline?: boolean;
  getDocumentContentById?: (index: number) => string;
  isLoading?: boolean;
  metadata?: any;
  setMetadata?: (metadata: any) => void;
  mode?: "edit" | "diff";
}
