/**
 * Documents components module
 *
 * This module exports all document-related components for easy imports
 */

// Document components
export { DocumentToolCall, DocumentToolResult } from "./document";
export { DocumentPreview } from "./document-preview";
export { DocumentSkeleton } from "./document-skeleton";

// Types
export type {
  DocumentPreviewProps,
  DocumentToolCallProps,
  DocumentToolResultProps,
  DocumentHeaderProps,
} from "@/types/documents/document-types";
