/**
 * Types for the vector search system
 */

/**
 * Metadata for a bylaw document chunk
 * 
 * IMPORTANT NOTES ON VECTOR DATABASE COMPATIBILITY:
 * - When storing in Pinecone, only primitive types and string arrays are supported
 * - Complex objects (metadataSource, _metadataSources) are stripped before storage
 * - Use simple types whenever possible for optimal vector database compatibility
 */
export interface BylawMetadata {
  /** The bylaw number (e.g., "4620") */
  bylawNumber: string;

  /** The title of the bylaw (e.g., "Tree Protection Bylaw") */
  title: string;

  /** The section number (e.g., "3.1") */
  section: string;
  
  /** The title of the section, if available */
  sectionTitle?: string;

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
  
  /**
   * For debugging - sources of metadata
   * NOTE: Not stored in vector database due to complex type
   */
  metadataSource?: Record<string, string>;
  
  /**
   * For debugging - tracking metadata sources
   * NOTE: Not stored in vector database due to complex type
   */
  _metadataSources?: {
    fromContent?: string[];
    fromFile?: string[];
    fromExplicit?: string[];
  };
  
  /** Verified status - indicates if bylaw info has been manually verified */
  verified?: boolean;
  
  /** Effective date - when the bylaw becomes enforceable (may differ from enactment) */
  effectiveDate?: string;
  
  /** Expiration date - when the bylaw is no longer in effect (if applicable) */
  expirationDate?: string;
  
  /** 
   * Amendment history - list of bylaw numbers that amended this bylaw
   * NOTE: Stored as string array in vector database
   */
  amendments?: string[];
  
  /** 
   * Keywords - extracted or manually added keywords for improved search
   * NOTE: Stored as string array in vector database
   */
  keywords?: string[];
  
  /** Status - whether the bylaw is active, repealed, superseded, etc. */
  status?: 'active' | 'repealed' | 'superseded' | 'draft';
  
  /** 
   * Related bylaws - list of related bylaw numbers
   * NOTE: Stored as string array in vector database
   */
  relatedBylaws?: string[];
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
  
  /** Optional keyword match score for internal use */
  keywordScore?: number;
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
  
  /** User ID for logging and analytics */
  userId?: string;
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
    sectionTitle?: string;
    content: string;
    url?: string;
    isConsolidated?: boolean;
    consolidatedDate?: string;
  }>;
}
