/**
 * Types for the Oak Bay Bylaw Knowledge Base system
 */

/**
 * Metadata for a bylaw chunk
 */
export interface ChunkMetadata {
  /** The bylaw number, e.g. "4620" */
  bylawNumber: string;

  /** The title of the bylaw, e.g. "Tree Protection Bylaw" */
  title: string;

  /** The section number, e.g. "3.1" */
  section: string;

  /** The date the bylaw was enacted, ISO format */
  dateEnacted: string;

  /** The category of the bylaw, e.g. "zoning", "trees", "noise" */
  category: string;

  /** The date the bylaw was last updated, ISO format */
  lastUpdated: string;

  /** Optional URL to the official bylaw */
  url?: string;

  /** Additional metadata fields */
  [key: string]: string | undefined;
}

/**
 * A chunk of bylaw text with associated metadata
 */
export interface BylawChunk {
  /** The text content of the bylaw chunk */
  text: string;

  /** Metadata for the bylaw chunk */
  metadata: ChunkMetadata;
}

/**
 * Result from a bylaw search
 */
export interface BylawSearchResult {
  /** The text content of the matching chunk */
  text: string;

  /** Metadata for the matching chunk */
  metadata: ChunkMetadata;

  /** The relevance score of the match, 0-1 */
  score: number;
}

/**
 * The formatted result for the AI to use
 */
export interface BylawToolResult {
  /** Whether any matching bylaws were found */
  found: boolean;

  /** Message to display if no bylaws were found */
  message?: string;

  /** The search results */
  results?: Array<{
    bylawNumber: string;
    title: string;
    section: string;
    content: string;
    url?: string;
  }>;
}
