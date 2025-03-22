import type { Document } from '@/lib/db/schema';
import type { 
  ArtifactKind, 
  UIArtifact, 
  SharedDocumentProps,
  SharedEditorProps 
} from '@/types/shared/shared-types';

// Document types
export interface DocumentPreviewProps extends SharedDocumentProps {
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

// Re-export editor common properties interface
export type { SharedEditorProps as EditorCommonProps };