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

export function useArtifactSelector<Selected>(selector: Selector<Selected>): Selected {
  const { data: localArtifact = initialArtifactData } = useSWR<UIArtifact>('artifact', null, {
    fallbackData: initialArtifactData,
  });

  return useMemo(() => selector(localArtifact), [localArtifact, selector]);
}

export function useArtifact() {
  const {
    data: localArtifact = initialArtifactData,
    mutate: setLocalArtifact,
  } = useSWR<UIArtifact>('artifact', null, {
    fallbackData: initialArtifactData,
  });

  const setArtifact = useCallback(
    (updaterFn: UIArtifact | ((currentArtifact: UIArtifact) => UIArtifact)) => {
      setLocalArtifact(prevArtifact => {
        const currentArtifact = prevArtifact || initialArtifactData;

        if (typeof updaterFn === 'function') {
          return updaterFn(currentArtifact);
        }

        return updaterFn;
      }, false);
    },
    [setLocalArtifact],
  );

  const { data: localArtifactMetadata, mutate: setLocalArtifactMetadata } = useSWR<any>(
    () => artifact.documentId ? `artifact-metadata-${artifact.documentId}` : null,
  );

  const artifact = useMemo(() => localArtifact, [localArtifact]);

  return {
    artifact,
    setArtifact,
    metadata: localArtifactMetadata || null,
    setMetadata: setLocalArtifactMetadata,
  };
}