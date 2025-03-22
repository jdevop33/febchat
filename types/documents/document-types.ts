import type { ArtifactKind, UIArtifact } from '../artifacts/artifact-types';
import type { Document } from '@/lib/db/schema';

// Document types
export interface DocumentPreviewProps {
  isReadonly: boolean;
  result?: any;
  args?: any;
}

export interface DocumentToolResultProps {
  type: 'create' | 'update' | 'request-suggestions';
  result: { id: string; title: string; kind: ArtifactKind };
  isReadonly: boolean;
}

export interface DocumentToolCallProps {
  type: 'create' | 'update' | 'request-suggestions';
  args: { title: string };
  isReadonly: boolean;
}

export interface DocumentHeaderProps {
  title: string;
  kind: ArtifactKind;
  isStreaming: boolean;
}

export interface DocumentContentProps {
  document: Document;
}

export interface HitboxLayerProps {
  hitboxRef: React.RefObject<HTMLDivElement>;
  result: any;
  setArtifact: (
    updaterFn: UIArtifact | ((currentArtifact: UIArtifact) => UIArtifact),
  ) => void;
}

export interface LoadingSkeletonProps {
  artifactKind: ArtifactKind;
}

// Editor common properties
export interface EditorCommonProps {
  content: string;
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  status: UIArtifact['status'];
  saveContent?: (updatedContent: string, debounce: boolean) => void;
  suggestions: any[];
  onSaveContent?: (updatedContent: string, debounce: boolean) => void;
  isInline?: boolean;
  getDocumentContentById?: (index: number) => string;
  isLoading?: boolean;
  metadata?: any;
  setMetadata?: (metadata: any) => void;
  mode?: 'edit' | 'diff';
}
