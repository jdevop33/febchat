/**
 * Artifacts components module
 *
 * This module exports all artifact-related components for easy imports
 */

// Core artifact components
export { Artifact } from './create-artifact';
// Temporarily commented out to fix circular imports
// export { ArtifactMessages } from './artifact-messages';
export { ArtifactActions } from './artifact-actions';
export { ArtifactCloseButton } from './artifact-close-button';

// Artifact definitions
import { textArtifact } from '@/artifacts/text/client';
import { codeArtifact } from '@/artifacts/code/client';
import { imageArtifact } from '@/artifacts/image/client';
import { sheetArtifact } from '@/artifacts/sheet/client';

export const artifactDefinitions = [
  textArtifact,
  codeArtifact,
  imageArtifact,
  sheetArtifact
];

// Types
export type {
  ArtifactKind,
  UIArtifact,
} from '@/types/artifacts/artifact-types';
