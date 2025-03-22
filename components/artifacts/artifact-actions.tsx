import { memo } from 'react';

import type { UIArtifact } from '@/types/artifacts/artifact-types';
import { artifactDefinitions } from './artifact';

export interface ArtifactActionsProps {
  artifact: UIArtifact;
  currentVersionIndex: number;
  handleVersionChange: (type: 'next' | 'prev' | 'toggle' | 'latest') => void;
  isCurrentVersion: boolean;
  mode: 'edit' | 'diff';
  metadata: any;
  setMetadata: (metadata: any) => void;
}

function PureArtifactActions({
  artifact,
  currentVersionIndex,
  handleVersionChange,
  isCurrentVersion,
  mode,
  metadata,
  setMetadata,
}: ArtifactActionsProps) {
  const artifactDefinition = artifactDefinitions.find(
    (definition) => definition.kind === artifact.kind,
  );

  if (!artifactDefinition) {
    return null;
  }

  return (
    <div className="mt-1 flex gap-0.5">
      {!isCurrentVersion && (
        <button
          className="group flex h-7 w-7 items-center justify-center transition-all hover:scale-110"
          onClick={() => handleVersionChange('latest')}
        >
          <span className="muted-icon text-current group-hover:text-blue-500">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 5L1 5" />
              <path d="M6 0V10" />
              <path d="M5 19H19" />
              <path d="M19 9V19" />
              <path d="M13 15L19 19L16 21" />
            </svg>
          </span>
        </button>
      )}

      {artifactDefinition?.actions.map((action, index) => {
        return (
          <button
            key={index}
            className={`group flex h-7 w-7 items-center justify-center transition-all ${
              (action.isDisabled?.({
                currentVersionIndex,
                isCurrentVersion,
                mode,
                handleVersionChange,
                content: artifact.content,
                metadata,
                document: null,
              }) ?? false)
                ? 'cursor-not-allowed opacity-50'
                : 'hover:scale-110'
            } `}
            onClick={() => {
              // Check if the action is disabled
              if (
                action.isDisabled?.({
                  currentVersionIndex,
                  isCurrentVersion,
                  mode,
                  handleVersionChange,
                  content: artifact.content,
                  metadata,
                  document: null,
                }) ??
                false
              ) {
                return;
              }

              // Execute the action
              action.onClick({
                currentVersionIndex,
                isCurrentVersion,
                mode,
                handleVersionChange,
                content: artifact.content,
                metadata,
                setMetadata,
                document: null,
                appendMessage: () => {},
              });
            }}
          >
            <span className="muted-icon text-current group-hover:text-blue-500">
              {action.icon}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export const ArtifactActions = memo(PureArtifactActions);
