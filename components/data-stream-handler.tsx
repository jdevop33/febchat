'use client';

import { useChat } from 'ai/react';
import { useEffect, useRef } from 'react';
import { artifactDefinitions } from './artifacts/artifact';
import type { ArtifactKind } from '@/types/artifacts/artifact-types';
import type { Suggestion } from '@/lib/db/schema';
import { initialArtifactData, useArtifact } from '@/hooks/use-artifact';

export type DataStreamDelta = {
  type:
    | 'text-delta'
    | 'code-delta'
    | 'sheet-delta'
    | 'image-delta'
    | 'title'
    | 'id'
    | 'suggestion'
    | 'clear'
    | 'finish'
    | 'kind';
  content: string | Suggestion;
};

export function DataStreamHandler({ id }: { id: string }) {
  // Fix destructuring error: directly capture all values from useChat instead of accessing .data later
  const {
    data = [], // Provide empty array default to avoid undefined
    messages,
    append,
    reload,
    isLoading,
  } = useChat({ id, api: '/api/chat' });

  const { artifact, setArtifact, setMetadata } = useArtifact();
  const lastProcessedIndex = useRef(-1);

  useEffect(() => {
    // Directly use data from destructured useChat result with fallback
    const dataStream = Array.isArray(data) ? data : [];

    // Additional safety check
    if (dataStream.length === 0) return;

    const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
    lastProcessedIndex.current = dataStream.length - 1;

    // Check if newDeltas is an array before trying to iterate
    if (newDeltas.length === 0) return;

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
          return { ...initialArtifactData, status: 'streaming' };
        }

        switch (delta.type) {
          case 'id':
            return {
              ...draftArtifact,
              documentId: delta.content as string,
              status: 'streaming',
            };

          case 'title':
            return {
              ...draftArtifact,
              title: delta.content as string,
              status: 'streaming',
            };

          case 'kind':
            return {
              ...draftArtifact,
              kind: delta.content as ArtifactKind,
              status: 'streaming',
            };

          case 'clear':
            return {
              ...draftArtifact,
              content: '',
              status: 'streaming',
            };

          case 'finish':
            return {
              ...draftArtifact,
              status: 'idle',
            };

          default:
            return draftArtifact;
        }
      });
    });
  }, [data, setArtifact, setMetadata, artifact]); // Updated dependency array to use data directly

  return null;
}
