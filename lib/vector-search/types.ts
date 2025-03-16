/**
 * Types for the vector search system
 */

/**
 * Metadata for a bylaw document chunk
 */
export interface BylawMetadata {
  /** The bylaw number (e.g., "4620") */
  bylawNumber: string;

  /** The title of the bylaw (e.g., "Tree Protection Bylaw") */
  title: string;

  /** The section number (e.g., "3.1") */
  section: string;

  /** The date the bylaw was enacted (ISO format) */
  dateEnacted: string;

  /** The category of the bylaw (e.g., "zoning", "trees", "noise") */
  category: string;

  /** The date of the last update to the bylaw (ISO format) */
  lastUpdated: string;

  /** The text content of the chunk */
  text: string;

  /** Optional URL to the source bylaw document */
  url?: string;
  
  /** Original filename of the PDF document (for debugging) */
  originalFilename?: string;
  
  /** If this bylaw is consolidated with other bylaws */
  consolidatedTo?: string;
  
  /** For debugging - sources of metadata */
  metadataSource?: Record<string, string>;
  
  /** For debugging - tracking metadata sources */
  _metadataSources?: {
    fromContent?: string[];
    fromFile?: string[];
    fromExplicit?: string[];
  };
}

/**
 * A bylaw search result
 */
export interface BylawSearchResult {
  /** The unique ID of the document chunk */
  id: string;

  /** The text content of the chunk */
  text: string;

  /** The metadata associated with the chunk */
  metadata: BylawMetadata;

  /** The similarity score (0-1) */
  score: number;
}

/**
 * Options for bylaw search
 */
export interface BylawSearchOptions {
  /** Maximum number of results to return */
  limit?: number;

  /** Minimum similarity score threshold */
  minScore?: number;

  /** Metadata filters to apply */
  filters?: Record<string, any>;
}

/**
 * Filters for bylaw search
 */
export interface BylawSearchFilters {
  /** Filter by category */
  category?: string;

  /** Filter by bylaw number */
  bylawNumber?: string;

  /** Filter by date range (from) */
  dateFrom?: string;

  /** Filter by date range (to) */
  dateTo?: string;
}

/**
 * The result format for the bylaw search tool
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
