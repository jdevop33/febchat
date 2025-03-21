/**
 * Utility functions for bylaw-related functionality
 */

// Import centralized bylaw maps
import { knownBylawUrls, bylawTitleMap, VALIDATED_BYLAWS as BYLAW_LIST } from './bylaw-maps';

/**
 * Get external PDF URL for a bylaw from the municipal website
 *
 * @param bylawNumber - The bylaw number as string
 * @param title - Optional title to format the URL for newer bylaws
 * @returns URL string to the PDF on the municipal website
 */
export function getExternalPdfUrl(bylawNumber: string, title?: string): string {
  // First check the centralized mapping
  if (knownBylawUrls[bylawNumber]) {
    return knownBylawUrls[bylawNumber];
  }

  // Determine URL pattern based on bylaw number
  const bylawNum = Number.parseInt(bylawNumber, 10);

  if (Number.isNaN(bylawNum)) {
    // Fallback to main bylaws page if not a valid number
    return 'https://www.oakbay.ca/council-administration/bylaws-policies/oak-bay-municipal-bylaws/';
  }

  if (bylawNum < 4000) {
    // Older bylaws pattern
    return `https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/${bylawNumber}.pdf`;
  } else {
    // Newer bylaws pattern - note URL might vary based on actual upload date
    const currentYear = new Date().getFullYear();
    const currentMonth = (new Date().getMonth() + 1)
      .toString()
      .padStart(2, '0');

    // Format title for URL if available
    const formattedTitle = title ? `-${title.replace(/\s+/g, '-')}` : '';

    return `https://www.oakbay.ca/wp-content/uploads/${currentYear}/${currentMonth}/${bylawNumber}${formattedTitle}.pdf`;
  }
}

/**
 * Get title for a bylaw by number
 * 
 * @param bylawNumber - The bylaw number as string
 * @returns The bylaw title if known, or a default title
 */
export function getBylawTitle(bylawNumber: string): string {
  return bylawTitleMap[bylawNumber] || `Bylaw No. ${bylawNumber}`;
}

/**
 * Map bylaw number to local PDF filename
 *
 * @param bylawNumber - The bylaw number as string
 * @returns The local filename for the bylaw PDF
 */
export function getFilenameForBylaw(bylawNumber: string): string {
  // Extract filename from URL for known bylaws
  if (knownBylawUrls[bylawNumber]) {
    const url = knownBylawUrls[bylawNumber];
    // Extract filename from URL
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    if (filename) return filename;
  }
  
  // Default to just the bylaw number if we can't determine a better filename
  return `${bylawNumber}.pdf`;
}

/**
 * Get local PDF path for a bylaw
 *
 * @param bylawNumber - The bylaw number as string
 * @returns The path to the local PDF file
 */
export function getLocalPdfPath(bylawNumber: string): string {
  return `/pdfs/${getFilenameForBylaw(bylawNumber)}`;
}

/**
 * Get best PDF URL based on environment
 * In production, use external URLs directly
 * In development, use local PDF files
 *
 * @param bylawNumber - The bylaw number as string
 * @param title - Optional title for URL formatting
 * @returns The best PDF URL based on environment
 */
export function getBestPdfUrl(bylawNumber: string, title?: string): string {
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction
    ? getExternalPdfUrl(bylawNumber, title)
    : getLocalPdfPath(bylawNumber);
}

/**
 * Section mapping for known bylaws
 * Maps section identifiers to page numbers
 */
export const sectionPageMapping: Record<string, Record<string, number>> = {
  // Anti-Noise Bylaw mappings
  '3210': {
    '3': 2, // Section 3 is on page 2
    '4': 3, // Section 4 is on page 3
    '5': 4,
    '5(7)(a)': 5,
    '5(7)(b)': 5,
    '4(5)(a)': 3,
    '4(5)(b)': 3,
    '7': 6,
  },
  // Zoning Bylaw mappings
  '3531': {
    '1': 1,
    '2': 2,
    '3': 3,
    '4.1': 5,
    '4.2': 6,
    '5.1': 10,
    '6.1': 15,
  },
  // Tree Protection Bylaw mappings
  '4742': {
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
  },
  // Streets & Traffic Bylaw mappings
  '4100': {
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
  },
  // Building and Plumbing Bylaw mappings
  '4247': {
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
  },
};

/**
 * Find page number for a specific section in a bylaw
 *
 * @param bylawNumber - The bylaw number
 * @param section - The section identifier
 * @returns The page number or null if not found
 */
export function findSectionPage(
  bylawNumber: string,
  section: string,
): number | null {
  // Normalize section format for lookup
  const normalizedSection = section.replace(/^(section|part|schedule)\s+/i, '');

  // If we have mappings for this bylaw and section, return the page number
  if (sectionPageMapping[bylawNumber]?.[normalizedSection]) {
    return sectionPageMapping[bylawNumber][normalizedSection];
  }

  // If no mapping is found, return null (will default to page 1)
  return null;
}

/**
 * Get a realistic page count estimate for a bylaw based on its number
 *
 * @param bylawNumber - The bylaw number
 * @returns Estimated page count
 */
export function getEstimatedPageCount(bylawNumber: string): number {
  // Default page count
  const pageCount = 20;

  // Set specific page counts for known bylaws
  const bylawPageCounts: Record<string, number> = {
    '3210': 12, // Anti-Noise Bylaw
    '3531': 150, // Zoning Bylaw (typically very long)
    '4742': 45, // Tree Protection Bylaw
    '4100': 30, // Streets & Traffic Bylaw
    '4620': 80, // Official Community Plan
    '4719': 25, // Fire Prevention Bylaw
    '4747': 15, // Reserve Funds Bylaw
    '4247': 40, // Building and Plumbing Bylaw
  };

  if (bylawPageCounts[bylawNumber]) {
    return bylawPageCounts[bylawNumber];
  }

  // For unknown bylaws, estimate based on bylaw number (newer bylaws tend to be longer)
  const numericBylawNum = Number.parseInt(bylawNumber, 10);
  if (!Number.isNaN(numericBylawNum)) {
    if (numericBylawNum < 4000) return 10 + (numericBylawNum % 10);
    else if (numericBylawNum < 4500) return 20 + (numericBylawNum % 15);
    else return 25 + (numericBylawNum % 20);
  }

  return pageCount;
}

// Re-export the list of validated bylaws from the centralized map
export const VALIDATED_BYLAWS = BYLAW_LIST;
