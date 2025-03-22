/**
 * Enhanced Vector Search Service
 *
 * This module provides an enhanced search mechanism that combines
 * vector search with verification from the bylaw database.
 */

import { getPineconeIndex } from './pinecone-client';
import { getEmbeddingsModel, EmbeddingProvider } from './embedding-models';
import * as VerificationDB from './verification-database';
import db from '@/lib/db';
import { searchQueryLog } from '@/lib/db/schema';

// Interface for search options
export interface SearchOptions {
  topK?: number;
  bylawFilter?: string;
  categoryFilter?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
  excludeBylaws?: string[];
}

// Interface for verified search result
export interface VerifiedSearchResult {
  bylawNumber: string;
  title: string;
  section: string;
  sectionTitle?: string;
  content: string;
  score: number;
  isVerified: boolean;
  pdfPath: string;
  officialUrl: string;
  isConsolidated: boolean;
  consolidatedDate?: string;
  enactmentDate?: string;
  amendedBylaw?: string[];
}

/**
 * Extract potential bylaw references from a query string
 */
export function extractBylawReferences(query: string): string[] {
  const bylawNumberPattern = /bylaw\s+(?:no\.?\s*)?(\d{4})/gi;
  const matches = Array.from(query.matchAll(bylawNumberPattern));
  return matches.map((match) => match[1]);
}

/**
 * Perform enhanced vector search with verification
 */
export async function searchBylawsWithVerification(
  query: string,
  options: SearchOptions = {},
): Promise<VerifiedSearchResult[]> {
  try {
    // Extract potential bylaw numbers from the query
    const bylawNumbers = extractBylawReferences(query);
    const verifiedResults: VerifiedSearchResult[] = [];

    // If we have specific bylaw numbers mentioned, start with them
    if (bylawNumbers.length > 0) {
      // Look up these bylaws directly from the verification database
      for (const bylawNumber of bylawNumbers) {
        const verifiedBylaw = await VerificationDB.verifyBylaw(bylawNumber);

        if (verifiedBylaw) {
          // If we have verified bylaw data, add all sections as high-confidence results
          if (verifiedBylaw.sections && verifiedBylaw.sections.length > 0) {
            // Add each section as a result
            verifiedBylaw.sections.forEach((section) => {
              verifiedResults.push({
                bylawNumber: verifiedBylaw.bylawNumber,
                title: verifiedBylaw.title,
                section: section.sectionNumber,
                sectionTitle: section.title,
                content: section.content,
                score: 1.0, // High confidence for exact bylaw match
                isVerified: true,
                pdfPath: verifiedBylaw.pdfPath,
                officialUrl: verifiedBylaw.officialUrl,
                isConsolidated: verifiedBylaw.isConsolidated,
                consolidatedDate: verifiedBylaw.consolidatedDate || undefined,
                enactmentDate: verifiedBylaw.enactmentDate || undefined,
                amendedBylaw: verifiedBylaw.amendedBylaw || undefined,
              });
            });
          } else {
            // If we don't have sections yet, add the bylaw as a single result
            verifiedResults.push({
              bylawNumber: verifiedBylaw.bylawNumber,
              title: verifiedBylaw.title,
              section: 'all',
              content:
                'Full bylaw content unavailable. Please refer to the PDF.',
              score: 1.0,
              isVerified: true,
              pdfPath: verifiedBylaw.pdfPath,
              officialUrl: verifiedBylaw.officialUrl,
              isConsolidated: verifiedBylaw.isConsolidated,
              consolidatedDate: verifiedBylaw.consolidatedDate || undefined,
              enactmentDate: verifiedBylaw.enactmentDate || undefined,
              amendedBylaw: verifiedBylaw.amendedBylaw || undefined,
            });
          }
        }
      }
    }

    // Prepare to perform vector search with filtering
    const filter: Record<string, any> = {};

    // Apply bylaw filter if specified
    if (options.bylawFilter) {
      filter.bylawNumber = { $eq: options.bylawFilter };
    }
    // Otherwise exclude bylaws we've already handled
    else if (bylawNumbers.length > 0) {
      filter.bylawNumber = {
        $nin: [...bylawNumbers, ...(options.excludeBylaws || [])],
      };
    }
    // Apply category filter if specified
    if (options.categoryFilter) {
      filter.category = { $eq: options.categoryFilter };
    }

    // Get vector search results
    const index = getPineconeIndex();
    const embeddings = getEmbeddingsModel(
      process.env.EMBEDDING_PROVIDER === 'openai'
        ? EmbeddingProvider.OPENAI
        : EmbeddingProvider.LLAMAINDEX,
    );

    // Generate query embedding
    const queryEmbedding = await embeddings.embedQuery(query);

    // Perform vector search
    const searchResults = await index.query({
      vector: queryEmbedding,
      topK: options.topK || 20,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      includeMetadata: true,
    });

    // Process vector search results
    if (searchResults.matches && searchResults.matches.length > 0) {
      // Process and verify each result
      for (const match of searchResults.matches) {
        if (!match.metadata?.bylawNumber) continue;

        const bylawNumber = match.metadata.bylawNumber as string;
        const section = (match.metadata.section as string) || 'unknown';
        const sectionTitle = match.metadata.sectionTitle as string | undefined;
        const content = (match.metadata.text as string) || '';

        // Try to verify against the database
        const verifiedBylaw = await VerificationDB.verifyBylaw(bylawNumber);

        if (verifiedBylaw) {
          // Verified result
          verifiedResults.push({
            bylawNumber,
            title: verifiedBylaw.title,
            section,
            sectionTitle,
            content,
            score: match.score || 0,
            isVerified: true,
            pdfPath: verifiedBylaw.pdfPath,
            officialUrl: verifiedBylaw.officialUrl,
            isConsolidated: verifiedBylaw.isConsolidated,
            consolidatedDate:
              verifiedBylaw.consolidatedDate === null
                ? undefined
                : verifiedBylaw.consolidatedDate,
            enactmentDate:
              verifiedBylaw.enactmentDate === null
                ? undefined
                : verifiedBylaw.enactmentDate,
            amendedBylaw:
              verifiedBylaw.amendedBylaw === null
                ? undefined
                : verifiedBylaw.amendedBylaw,
          });
        } else {
          // Unverified but still relevant result
          verifiedResults.push({
            bylawNumber,
            title: (match.metadata.title as string) || `Bylaw ${bylawNumber}`,
            section,
            sectionTitle,
            content,
            score: match.score || 0,
            isVerified: false,
            pdfPath: `/pdfs/${VerificationDB.getFilenameForBylaw(bylawNumber) || `${bylawNumber}.pdf`}`,
            officialUrl: `https://oakbay.civicweb.net/document/bylaw/${bylawNumber}`,
            isConsolidated: (match.metadata.isConsolidated as boolean) || false,
            consolidatedDate: match.metadata.consolidatedDate as
              | string
              | undefined,
            enactmentDate: match.metadata.enactmentDate as string | undefined,
            amendedBylaw: match.metadata.amendedBylaw
              ? Array.isArray(match.metadata.amendedBylaw)
                ? match.metadata.amendedBylaw
                : [match.metadata.amendedBylaw as string]
              : undefined,
          });

          // Log unverified result for future improvement
          console.warn(`Unverified bylaw in search results: ${bylawNumber}`);

          // Try to find similar bylaws for suggestion
          const similarBylaws =
            await VerificationDB.findSimilarBylaws(bylawNumber);
          if (similarBylaws.length > 0) {
            console.info(
              `Similar bylaws found: ${similarBylaws.map((b) => b.bylawNumber).join(', ')}`,
            );
          }
        }
      }
    }

    // Sort by score and return
    return verifiedResults.sort((a, b) => {
      // First prioritize verified results
      if (a.isVerified !== b.isVerified) {
        return a.isVerified ? -1 : 1;
      }
      // Then sort by score
      return b.score - a.score;
    });
  } catch (error) {
    console.error('Error in enhanced bylaw search:', error);
    return [];
  }
}

/**
 * Record search query for analytics
 */
export async function recordSearchQuery(
  query: string,
  results: VerifiedSearchResult[],
): Promise<void> {
  try {
    await db
      .insert(searchQueryLog)
      .values({
        id: crypto.randomUUID(),
        query,
        resultCount: results.length,
        topResult: results.length > 0 ? results[0].bylawNumber : null,
        timestamp: new Date(),
      })
      .catch((err) => {
        // Just log error and continue - this is non-critical functionality
        console.warn('Search query logging failed (non-critical):', err);
      });
  } catch (error) {
    console.error('Error recording search query:', error);
    // Non-critical functionality, can fail silently
  }
}
