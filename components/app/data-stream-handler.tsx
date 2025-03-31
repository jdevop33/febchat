"use client";

import { artifactDefinitions } from "@/components/artifacts";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import type { Suggestion } from "@/lib/db/schema";
import type { ArtifactKind } from "@/types/artifacts/artifact-types";
import { useChat } from "ai/react";
import { useEffect, useRef } from "react";

export type DataStreamDelta = {
  type:
    | "text-delta"
    | "code-delta"
    | "sheet-delta"
    | "image-delta"
    | "title"
    | "id"
    | "suggestion"
    | "clear"
    | "finish"
    | "kind";
  content: string | Suggestion;
};

export function DataStreamHandler({ id }: { id: string }) {
  // Safely access useChat return values with proper defaults to avoid undefined errors
  const chat = useChat({ id, api: "/api/chat" });

  // Extract needed properties with fallbacks to prevent destructuring errors
  const data = Array.isArray(chat?.data) ? chat.data : [];
  const messages = chat?.messages || [];
  const append = chat?.append || (() => {});
  const reload = chat?.reload || (() => {});
  const isLoading = chat?.isLoading || false;

  const { artifact, setArtifact, setMetadata } = useArtifact();
  const lastProcessedIndex = useRef(-1);

  useEffect(() => {
    // Safety check - if data is not available or empty, exit early
    if (!data || data.length === 0) return;

    // Process only new data since last check
    const newDeltas = data.slice(lastProcessedIndex.current + 1);
    lastProcessedIndex.current = data.length - 1;

    // If no new deltas, exit early
    if (!newDeltas || newDeltas.length === 0) return;

    (newDeltas as DataStreamDelta[]).forEach((delta: DataStreamDelta) => {
      const artifactDefinition = artifactDefinitions.find(
        (artifactDefinition) => artifactDefinition.kind === artifact.kind,
      );

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          streamPart: delta,
          setArtifact,
          setMetadata,
        });
      }

      setArtifact((draftArtifact) => {
        if (!draftArtifact) {
          return { ...initialArtifactData, status: "streaming" };
        }

        switch (delta.type) {
          case "id":
            return {
              ...draftArtifact,
              documentId: delta.content as string,
              status: "streaming",
            };

          case "title":
            return {
              ...draftArtifact,
              title: delta.content as string,
              status: "streaming",
            };

          case "kind":
            return {
              ...draftArtifact,
              kind: delta.content as ArtifactKind,
              status: "streaming",
            };

          case "clear":
            return {
              ...draftArtifact,
              content: "",
              status: "streaming",
            };

          case "finish":
            return {
              ...draftArtifact,
              status: "idle",
            };

          default:
            return draftArtifact;
        }
      });
    });
  }, [data, setArtifact, setMetadata, artifact]); // Only re-run when data or artifact-related props change

  return null;
}
