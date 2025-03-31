/**
 * Types for the Oak Bay Bylaw Knowledge Base system
 */

/**
 * Options for bylaw search
 */
export interface BylawSearchOptions {
  /** Maximum number of results to return */
  limit?: number;

  /** Whether to include raw vector scores */
  includeScores?: boolean;

  /** Filter parameters for the search */
  filters?:
    | BylawSearchFilters
    | {
        bylawNumber?: string;
        category?: string;
        dateFrom?: string;
        dateTo?: string;
      };

  /** Reranking strategy */
  reranking?: "default" | "semantic" | "hybrid";

  /** Whether to exclude bylaw content that couldn't be verified */
  verifiedOnly?: boolean;

  /** Whether to cache results */
  useCache?: boolean;

  /** Minimum score threshold for search results */
  minScore?: number;

  /** User ID for personalized results */
  userId?: string;
}

/**
 * Filters for bylaw search
 */
export interface BylawSearchFilters {
  /** Filter by bylaw number(s) */
  bylawNumbers?: string[];

  /** Filter by bylaw categories */
  categories?: string[];

  /** Filter by whether bylaw is consolidated */
  consolidated?: boolean;

  /** Filter by date range */
  dateRange?: {
    start?: string;
    end?: string;
  };
}

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

  /** The section title when available */
  sectionTitle?: string;

  /** The date the bylaw was enacted, ISO format */
  dateEnacted: string | undefined;

  /** The category of the bylaw, e.g. "zoning", "trees", "noise" */
  category: string;

  /** The date the bylaw was last updated, ISO format */
  lastUpdated: string | undefined;

  /** Optional URL to the official bylaw */
  url?: string;

  /** Path to local PDF file */
  pdfPath?: string;

  /** URL to official bylaw PDF on municipal website */
  officialUrl?: string;

  /** Indicates if the bylaw is a consolidated version */
  isConsolidated?: boolean;

  /** Date of consolidation if applicable */
  consolidatedDate?: string;

  /** Indicates if the bylaw citation has been verified */
  isVerified?: boolean;

  /** Additional metadata fields */
  [key: string]: string | boolean | undefined;
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
 * Extended metadata for search results
 */
export interface BylawMetadata extends ChunkMetadata {
  /** The extracted text content for verification */
  text?: string;
}

/**
 * Result from a bylaw search
 */
export interface BylawSearchResult {
  /** The text content of the matching chunk */
  text: string;

  /** Metadata for the matching chunk */
  metadata: BylawMetadata;

  /** The relevance score of the match, 0-1 */
  score: number;

  /** Optional unique ID for the result */
  id?: string;
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
