'use client';

import useSWR from 'swr';
import type { UIArtifact } from '@/components/artifact';
import { useCallback, useMemo } from 'react';

export const initialArtifactData: UIArtifact = {
  documentId: 'init',
  content: '',
  kind: 'text',
  title: '',
  status: 'idle',
  isVisible: false,
  boundingBox: {
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  },
};

type Selector<T> = (state: UIArtifact) => T;

export function useArtifactSelector<Selected>(selector: Selector<Selected>) {
  // Apply default value directly in the destructuring to ensure it's never undefined
  const { data: localArtifact = initialArtifactData } = useSWR<UIArtifact>(
    'artifact',
    null,
    {
      fallbackData: initialArtifactData,
    },
  );

  const selectedValue = useMemo(() => {
    // Additional safety check
    const safeArtifact = localArtifact || initialArtifactData;
    return selector(safeArtifact);
  }, [localArtifact, selector]);

  return selectedValue;
}

export function useArtifact() {
  // Use default value in destructuring for safety
  const {
    data: localArtifact = initialArtifactData,
    mutate: setLocalArtifact,
  } = useSWR<UIArtifact>('artifact', null, {
    fallbackData: initialArtifactData,
  });

  const artifact = useMemo(() => {
    return localArtifact || initialArtifactData;
  }, [localArtifact]);

  const setArtifact = useCallback(
    (updaterFn: UIArtifact | ((currentArtifact: UIArtifact) => UIArtifact)) => {
      try {
        setLocalArtifact((currentArtifact) => {
          // Always ensure we have a valid artifact
          const artifactToUpdate = currentArtifact || initialArtifactData;

          if (typeof updaterFn === 'function') {
            return updaterFn(artifactToUpdate);
          }

          return updaterFn || initialArtifactData; // Safety check
        });
      } catch (error) {
        console.error('Error updating artifact:', error);
        // Fallback: set to initialArtifactData in case of error
        setLocalArtifact(initialArtifactData);
      }
    },
    [setLocalArtifact],
  );

  // Default to empty object to avoid undefined
  const {
    data: localArtifactMetadata = null,
    mutate: setLocalArtifactMetadata,
  } = useSWR<any>(
    () =>
      artifact.documentId ? `artifact-metadata-${artifact.documentId}` : null,
    null,
    {
      fallbackData: null,
    },
  );

  return useMemo(
    () => ({
      artifact,
      setArtifact,
      metadata: localArtifactMetadata || null, // Safety for potential undefined
      setMetadata: setLocalArtifactMetadata,
    }),
    [artifact, setArtifact, localArtifactMetadata, setLocalArtifactMetadata],
  );
}
