import {
  ArtifactKind,
  type SharedMessageProps,
  type UIArtifact,
  artifactKinds,
} from "@/types/shared/shared-types";
import type {
  Attachment,
  ChatRequestOptions,
  CreateMessage,
  Message,
} from "ai";
import type { Dispatch, SetStateAction } from "react";

// Re-export for backward compatibility
export { ArtifactKind, artifactKinds };
export type { UIArtifact };

// Artifact metadata
export interface ArtifactMetadata {
  [key: string]: any;
}

// Artifact component props interface
export interface ArtifactProps extends SharedMessageProps {
  input: string;
  setInput: (input: string) => void;
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  handleSubmit: (
    event?: {
      preventDefault?: () => void;
    },
    chatRequestOptions?: ChatRequestOptions,
  ) => void;
}

// Artifact messages props
export interface ArtifactMessagesProps extends SharedMessageProps {
  artifactStatus: UIArtifact["status"];
}
