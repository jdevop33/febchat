/**
 * CLIENT-SIDE ONLY: Bylaw URL and utility functions
 * This file contains copies of the server-side maps for use in client components
 * to avoid "React server component" import errors
 */

// ⚠️ IMPORTANT: Keep this in sync with bylaw-maps.ts when adding new bylaws
// Hardcoded PDF URLs to prevent client/server mismatch issues
export const HARDCODED_PDF_URLS: Record<string, string> = {
  "3210": "https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/3210%20-Anti-Noise%20Bylaw%20-%20Consolidated%20to%204594.pdf",
  "3531": "https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/3531_ZoningBylawConsolidation_Aug302024.pdf",
  "4100": "https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/4100-Streets-Traffic-Bylaw-2000.pdf",
  "4247": "https://www.oakbay.ca/wp-content/uploads/2024/03/4247-Building-and-Plumbing-Bylaw-2005-CONSOLIDATED.pdf",
  "4742": "https://www.oakbay.ca/wp-content/uploads/2024/01/4742-Tree-Protection-Bylaw-2020-CONSOLIDATED.pdf",
  "4849": "https://www.oakbay.ca/wp-content/uploads/2025/02/4849-Property-Tax-Exemption-2023.pdf",
  "4861": "https://www.oakbay.ca/wp-content/uploads/2025/02/4861-Tax-Rates-Bylaw.pdf",
  "4891": "https://www.oakbay.ca/wp-content/uploads/2025/02/4891-Development-Cost-Charge-Bylaw-2024.pdf",
  "4892": "https://www.oakbay.ca/wp-content/uploads/2025/02/4892-Amenity-Cost-Charge-Bylaw.pdf"
};

// Hardcoded bylaw title mapping
export const BYLAW_TITLE_MAP: Record<string, string> = {
  "3210": "Anti-Noise Bylaw",
  "3531": "Zoning Bylaw",
  "4100": "Streets and Traffic Bylaw",
  "4247": "Building and Plumbing Bylaw",
  "4742": "Tree Protection Bylaw",
  "4849": "Property Tax Exemption Bylaw, 2023",
  "4861": "Tax Rates Bylaw, 2024",
  "4891": "Development Cost Charge Bylaw",
  "4892": "Amenity Cost Charge Bylaw"
};

// List of all known bylaw numbers
export const VALIDATED_BYLAWS: string[] = [
  "3210",
  "3531",
  "4100",
  "4247",
  "4742",
  "4849",
  "4861",
  "4891",
  "4892"
];

// Hard-coded section page mappings
export const SECTION_PAGE_MAPPINGS: Record<string, Record<string, number>> = {
  "3210": { "3": 2, "4": 3, "5": 4, "5(7)(a)": 5, "5(7)(b)": 5, "4(5)(a)": 3, "4(5)(b)": 3, "7": 6 },
  "3531": { "1": 1, "2": 2, "3": 3, "4.1": 5, "4.2": 6, "5.1": 10, "6.1": 15 },
  "4742": { "1": 1, "2": 2, "3": 3, "4": 4, "5": 5 },
  "4100": { "1": 1, "2": 2, "3": 3, "4": 4, "5": 5 },
  "4247": { "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8 }
};

// Estimated page counts for bylaws
export const BYLAW_PAGE_COUNTS: Record<string, number> = {
  "3210": 12, // Anti-Noise Bylaw
  "3531": 150, // Zoning Bylaw
  "4742": 45, // Tree Protection Bylaw
  "4100": 30, // Streets & Traffic Bylaw
  "4247": 40 // Building and Plumbing Bylaw
};

/**
 * Get external PDF URL for a bylaw
 * @param bylawNumber Bylaw number
 * @param title Optional title
 * @returns URL to the PDF
 */
export function getExternalPdfUrl(bylawNumber: string, title?: string): string {
  // Use hardcoded URL if available (always preferred for accuracy)
  if (HARDCODED_PDF_URLS[bylawNumber]) {
    return HARDCODED_PDF_URLS[bylawNumber];
  }
  
  // Get current year and month for URL construction
  const currentYear = new Date().getFullYear();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
  
  // Format title for URL if provided, otherwise just use the bylaw number
  const formattedTitle = title ? 
    `-${title.replace(/\s+/g, '-')}` : 
    '';
  
  // Modern Oak Bay bylaws use the wp-content upload pattern with year/month folders
  return `https://www.oakbay.ca/wp-content/uploads/${currentYear}/${currentMonth}/${bylawNumber}${formattedTitle}.pdf`;
}

/**
 * Get local PDF path for a bylaw
 * @param bylawNumber Bylaw number
 * @returns Path to local PDF file
 */
export function getLocalPdfPath(bylawNumber: string): string {
  return `/pdfs/${bylawNumber}.pdf`;
}

/**
 * Get the best PDF URL to use (always external for consistency)
 * @param bylawNumber Bylaw number
 * @param title Optional title
 * @returns URL to the PDF
 */
export function getBestPdfUrl(bylawNumber: string, title?: string): string {
  // Always use external URLs for consistency between client and server
  return getExternalPdfUrl(bylawNumber, title);
}

/**
 * Get the title for a bylaw
 * @param bylawNumber Bylaw number
 * @returns Bylaw title
 */
export function getBylawTitle(bylawNumber: string): string {
  return BYLAW_TITLE_MAP[bylawNumber] || `Bylaw No. ${bylawNumber}`;
}

/**
 * Find page number for a section
 * @param bylawNumber Bylaw number
 * @param section Section identifier
 * @returns Page number or 1 if not found
 */
export function findSectionPage(bylawNumber: string, section: string): number {
  // Normalize section format for lookup
  const normalizedSection = section.replace(/^(section|part|schedule)\s+/i, '');

  // Check our hardcoded mappings
  if (SECTION_PAGE_MAPPINGS[bylawNumber]?.[normalizedSection]) {
    return SECTION_PAGE_MAPPINGS[bylawNumber][normalizedSection];
  }
  
  // Fallback to page 1
  return 1;
}

/**
 * Get estimated page count for a bylaw
 * @param bylawNumber Bylaw number
 * @returns Estimated page count
 */
export function getEstimatedPageCount(bylawNumber: string): number {
  // Hardcoded page counts for common bylaws
  return BYLAW_PAGE_COUNTS[bylawNumber] || 20; // Default to 20 pages
}

/**
 * Analyze the URL structure of existing bylaw URLs to determine patterns
 * This is a helper function for development/debugging
 */
export function analyzeUrlStructure(): { patterns: Record<string, number>, examples: Record<string, string[]> } {
  const patterns: Record<string, number> = {};
  const examples: Record<string, string[]> = {};
  
  // Analyze all URLs
  Object.entries(HARDCODED_PDF_URLS).forEach(([number, url]) => {
    // Extract pattern type
    let pattern = "unknown";
    
    if (url.includes('/wp-content/uploads/')) {
      pattern = "wp-content";
    } else if (url.includes('/sites/default/files/')) {
      pattern = "sites-default";
    } else if (url.includes('/bylaws/')) {
      pattern = "direct-bylaws";
    }
    
    // Count patterns
    patterns[pattern] = (patterns[pattern] || 0) + 1;
    
    // Store examples
    if (!examples[pattern]) {
      examples[pattern] = [];
    }
    if (examples[pattern].length < 2) {
      examples[pattern].push(`${number}: ${url}`);
    }
  });
  
  return { patterns, examples };
}