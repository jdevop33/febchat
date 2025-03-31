// @ts-nocheck
/*
 * This file has TypeScript errors that need to be fixed:
 * * - Property 'query' does not exist on type
 * TODO: Fix these TypeScript errors and remove this directive
 */

/**
 * Fallback search implementation for when Pinecone/vector search is unavailable
 * This module provides a simple text-based search using the PDF files directly
 */

import fs from "node:fs";
import path from "node:path";
import { extractFromPDF } from "../bylaw/processing/pdf-extractor";
import { getPineconeIndex } from "./pinecone-client";
import type { BylawSearchOptions, BylawSearchResult } from "./types";

// Cache for extracted PDF content
const pdfContentCache = new Map<string, string>();

/**
 * Fallback search function that works directly with the PDF files
 */
export async function fallbackSearch(
  query: string,
  options: BylawSearchOptions = {},
): Promise<BylawSearchResult[]> {
  console.log("Using fallback search mechanism");

  try {
    // First try to use Pinecone metadata filtering as a fallback mechanism
    try {
      const index = getPineconeIndex();

      // Search with metadata filter only
      // For Pinecone v5+, we must provide a vector even for filter-only queries
      const searchResults = await index.query({
        topK: options.limit || 10,
        includeMetadata: true,
        filter: {},
        vector: new Array(1536).fill(0), // Dummy vector for filter-only queries
      });

      if (searchResults.matches && searchResults.matches.length > 0) {
        console.log(
          `Found ${searchResults.matches.length} results with metadata-only search`,
        );

        // Calculate simple text match scores
        const results = await enhanceResultsWithKeywordScoring(
          searchResults.matches.map((match) => ({
            id: match.id,
            text: (match.metadata?.text as string) || "",
            metadata: match.metadata as any,
            score: 0, // Will be calculated below
          })),
          query,
        );

        return results.slice(0, options.limit || 5);
      }
    } catch (error) {
      console.error(
        "Metadata search failed, falling back to direct PDF search:",
        error,
      );
    }

    // If Pinecone failed completely, try direct PDF search
    return directPDFSearch(query, options);
  } catch (error) {
    console.error("Error in fallback search:", error);

    // Return empty results rather than throwing
    return [];
  }
}

/**
 * Enhanced scoring for results using simple keyword matching
 */
async function enhanceResultsWithKeywordScoring(
  results: BylawSearchResult[],
  query: string,
): Promise<BylawSearchResult[]> {
  // Extract keywords from query (simple implementation)
  const keywords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);

  // Score results based on keyword matches
  const scoredResults = results.map((result) => {
    const text = result.text.toLowerCase();

    // Count keyword matches
    let matches = 0;
    let totalPosition = 0;

    for (const keyword of keywords) {
      const position = text.indexOf(keyword);
      if (position !== -1) {
        matches++;
        totalPosition += position; // Lower positions (earlier in text) are better
      }
    }

    // Calculate score based on matches and positions
    const matchScore = keywords.length > 0 ? matches / keywords.length : 0;
    const positionScore =
      matches > 0 ? 1 - totalPosition / (text.length * matches) : 0;

    // Combined score (70% match rate, 30% position)
    const score = matchScore * 0.7 + positionScore * 0.3;

    return {
      ...result,
      score,
    };
  });

  // Sort by score (descending)
  return scoredResults.sort((a, b) => b.score - a.score);
}

/**
 * Direct PDF search as a last resort fallback
 */
async function directPDFSearch(
  query: string,
  options: BylawSearchOptions = {},
): Promise<BylawSearchResult[]> {
  console.log("Using direct PDF search as last resort");

  try {
    // Get list of PDF files
    const pdfDir = path.join(process.cwd(), "public", "pdfs");
    const pdfFiles = fs
      .readdirSync(pdfDir)
      .filter((file) => file.toLowerCase().endsWith(".pdf"))
      .map((file) => path.join(pdfDir, file));

    console.log(`Found ${pdfFiles.length} PDF files to search`);

    // Extract content from PDFs (use cache for previously processed files)
    const results: BylawSearchResult[] = [];

    // Limit the number of files to process for performance
    const filesToProcess = pdfFiles.slice(0, 10); // Process max 10 files

    for (const file of filesToProcess) {
      try {
        // Get content from cache or extract it
        let content = pdfContentCache.get(file);

        if (!content) {
          console.log(`Extracting content from ${path.basename(file)}`);
          const extraction = await extractFromPDF(file, {});
          content = extraction.text;

          // Store in cache
          pdfContentCache.set(file, content);
        }

        // Simple keyword matching
        const keywords = query.toLowerCase().split(/\s+/);
        let matches = 0;

        for (const keyword of keywords) {
          if (content.toLowerCase().includes(keyword)) {
            matches++;
          }
        }

        // If there are matches, add to results
        if (matches > 0) {
          const score = matches / keywords.length;

          // Extract bylaw number from filename
          const filename = path.basename(file, ".pdf");
          const bylawMatch = filename.match(/^(?:bylaw-)?(\d+)(?:[-,\s]|$)/i);
          const bylawNumber = bylawMatch ? bylawMatch[1] : undefined;

          // Create a simple chunk of the matched content
          const matchPos = content
            .toLowerCase()
            .indexOf(keywords[0].toLowerCase());
          const start = Math.max(0, matchPos - 200);
          const end = Math.min(content.length, matchPos + 400);
          const chunk = content.substring(start, end);

          results.push({
            id: `fallback-${path.basename(file)}-${results.length}`,
            text: chunk,
            metadata: {
              bylawNumber: bylawNumber || "",
              title: filename,
              section: "unknown",
              dateEnacted: "unknown",
              lastUpdated: new Date().toISOString(),
              text: chunk, // ensure metadata has text field
              // Add any other required properties
              originalFilename: path.basename(file),
              category: "",
              verified: false, // Using verified instead of isVerified to match the proper type
              url: `file://${file}`, // Use url instead of pdfPath
              // Remove officialUrl as it's not in the metadata type
              // isConsolidated property not in metadata type
            },
            score,
          });
        }
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }

    // Sort by score (descending) and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 5);
  } catch (error) {
    console.error("Error in direct PDF search:", error);
    return [];
  }
}
