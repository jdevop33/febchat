/**
 * Shared bylaw utilities for both client and server environments
 *
 * This provides a single source of truth for bylaw-related utility functions
 * that can be used in both client and server contexts.
 */

// Import the centralized bylaw data
import {
  VALIDATED_BYLAWS,
  knownBylawUrls as _knownBylawUrls,
  bylawTitleMap,
} from "./bylaw-maps";

/**
 * Get external PDF URL for a bylaw
 */

export function getExternalPdfUrl(bylawNumber: string, title?: string): string {
  try {
    // Use the imported map
    // If we have a known URL for this bylaw, use it
    if (_knownBylawUrls?.[bylawNumber]) {
      return _knownBylawUrls[bylawNumber];
    }

    // Otherwise, use the standard pattern
    return `https://www.oakbay.ca/municipal-services/bylaws/bylaw-${bylawNumber}`;
  } catch (error) {
    console.error("Error getting external PDF URL:", error);
    // Fallback to a predictable URL format
    return `https://www.oakbay.ca/municipal-services/bylaws/bylaw-${bylawNumber}`;
  }
}

/**
 * Get local PDF path for a bylaw
 */
export function getLocalPdfPath(bylawNumber: string): string {
  return `/pdfs/${bylawNumber}.pdf`;
}

/**
 * Get the best PDF URL to use
 */
export function getBestPdfUrl(bylawNumber: string, title?: string): string {
  // Return the best available URL:
  // 1. If we have a known direct URL, use that
  // 2. Otherwise construct a standard URL pattern

  // First try the external PDF URL
  const externalUrl = getExternalPdfUrl(bylawNumber, title);

  // If we have a specific URL, use it
  if (externalUrl.includes(bylawNumber)) {
    return externalUrl;
  }

  // Otherwise use a standard URL format
  return `https://www.oakbay.ca/municipal-services/bylaws/bylaw-${bylawNumber}`;
}

/**
 * Get the title for a bylaw
 */
export function getBylawTitle(bylawNumber: string): string {
  return bylawTitleMap[bylawNumber] || `Bylaw No. ${bylawNumber}`;
}

/**
 * Section mapping for known bylaws
 * Maps section identifiers to page numbers
 */
export const sectionPageMapping: Record<string, Record<string, number>> = {
  // Anti-Noise Bylaw mappings
  "3210": {
    "3": 2, // Section 3 is on page 2
    "4": 3, // Section 4 is on page 3
    "5": 4,
    "5(7)(a)": 5,
    "5(7)(b)": 5,
    "4(5)(a)": 3,
    "4(5)(b)": 3,
    "7": 6,
  },
  // Zoning Bylaw mappings
  "3531": {
    "1": 1,
    "2": 2,
    "3": 3,
    "4.1": 5,
    "4.2": 6,
    "5.1": 10,
    "6.1": 15,
  },
  // Tree Protection Bylaw mappings
  "4742": {
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
  },
  // Streets & Traffic Bylaw mappings
  "4100": {
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
  },
  // Building and Plumbing Bylaw mappings
  "4247": {
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
  },
};

/**
 * Find page number for a section
 */
export function findSectionPage(bylawNumber: string, section: string): number {
  // Normalize section format for lookup
  const normalizedSection = section.replace(/^(section|part|schedule)\s+/i, "");

  // Check our hardcoded mappings
  if (sectionPageMapping[bylawNumber]?.[normalizedSection]) {
    return sectionPageMapping[bylawNumber][normalizedSection];
  }

  // Fallback to page 1
  return 1;
}

/**
 * Map of estimated page counts for bylaws
 */
export const bylawPageCounts: Record<string, number> = {
  "3210": 12, // Anti-Noise Bylaw
  "3531": 150, // Zoning Bylaw (typically very long)
  "4742": 45, // Tree Protection Bylaw
  "4100": 30, // Streets & Traffic Bylaw
  "4620": 80, // Official Community Plan
  "4719": 25, // Fire Prevention Bylaw
  "4747": 15, // Reserve Funds Bylaw
  "4247": 40, // Building and Plumbing Bylaw
};

/**
 * Get estimated page count for a bylaw
 */
export function getEstimatedPageCount(bylawNumber: string): number {
  // Hardcoded page counts for common bylaws
  return bylawPageCounts[bylawNumber] || 20; // Default to 20 pages
}

/**
 * Check if a bylaw number is in our validated list
 */
export function isValidatedBylaw(bylawNumber: string): boolean {
  return VALIDATED_BYLAWS.includes(bylawNumber);
}

// Re-export the validated bylaws list for convenience
export { VALIDATED_BYLAWS };
