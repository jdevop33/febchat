/**
 * Artifacts components module
 * 
 * This module exports all artifact-related components for easy imports
 */

// Core artifact components
export { Artifact } from './artifact';
export { ArtifactMessages } from './artifact-messages';
export { ArtifactActions } from '../artifact-actions';
export { ArtifactCloseButton } from '../artifact-close-button';

// Types
export type { ArtifactKind, UIArtifact } from '@/types/artifacts/artifact-types';