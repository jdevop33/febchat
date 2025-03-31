/**
 * CLIENT-SIDE ONLY: Bylaw URL and utility functions
 *
 * This is a re-export of shared bylaw utilities to avoid the
 * "React server component" import errors when used in client components.
 *
 * All implementation details are now in the shared module.
 */

// Define a fallback list of validated bylaws to avoid undefined errors
// This ensures the component will never fail even if imports fail
const FALLBACK_VALIDATED_BYLAWS = [
  "3210",
  "3531",
  "4100",
  "4247",
  "4742",
  "4849",
  "4861",
  "4891",
  "4892",
  "3578",
  "4672",
  "3545",
  "4371",
  "4183",
  "3946",
  "4013",
];

// Define the interface for bylaw-shared module
interface BylawShared {
  getExternalPdfUrl: (bylawNumber: string, title?: string) => string;
  getLocalPdfPath: (bylawNumber: string) => string;
  getBestPdfUrl: (bylawNumber: string, title?: string) => string;
  getBylawTitle: (bylawNumber: string) => string;
  findSectionPage: (bylawNumber: string, section: string) => number;
  getEstimatedPageCount: (bylawNumber: string) => number;
  isValidatedBylaw: (bylawNumber: string) => boolean;
  VALIDATED_BYLAWS: string[];
  sectionPageMapping: Record<string, Record<string, number>>;
  bylawPageCounts: Record<string, number>;
}

// Try to import from the shared module, but provide fallbacks if it fails
let bylaw_shared: BylawShared;
try {
  bylaw_shared = require("../utils/bylaw-shared");
} catch (error) {
  console.error("Error importing bylaw-shared:", error);
  // Define fallback implementations
  bylaw_shared = {
    getExternalPdfUrl: (bylawNumber: string) =>
      `https://www.oakbay.ca/municipal-services/bylaws/bylaw-${bylawNumber}`,
    getLocalPdfPath: (bylawNumber: string) => `/pdfs/${bylawNumber}.pdf`,
    getBestPdfUrl: (bylawNumber: string) => `/pdfs/${bylawNumber}.pdf`,
    getBylawTitle: (bylawNumber: string) => `Bylaw No. ${bylawNumber}`,
    findSectionPage: () => 1,
    getEstimatedPageCount: () => 20,
    isValidatedBylaw: (bylawNumber: string) =>
      FALLBACK_VALIDATED_BYLAWS.includes(bylawNumber),
    VALIDATED_BYLAWS: FALLBACK_VALIDATED_BYLAWS,
    sectionPageMapping: {},
    bylawPageCounts: {},
  };
}

// Always export the values, with fallbacks if needed
export const getExternalPdfUrl = bylaw_shared.getExternalPdfUrl;
export const getLocalPdfPath = bylaw_shared.getLocalPdfPath;
export const getBestPdfUrl = bylaw_shared.getBestPdfUrl;
export const getBylawTitle = bylaw_shared.getBylawTitle;
export const findSectionPage = bylaw_shared.findSectionPage;
export const getEstimatedPageCount = bylaw_shared.getEstimatedPageCount;
export const isValidatedBylaw = bylaw_shared.isValidatedBylaw;
export const VALIDATED_BYLAWS =
  bylaw_shared.VALIDATED_BYLAWS || FALLBACK_VALIDATED_BYLAWS;
export const SECTION_PAGE_MAPPINGS = bylaw_shared.sectionPageMapping || {};
export const BYLAW_PAGE_COUNTS = bylaw_shared.bylawPageCounts || {};

// Re-export known URLs and titles for direct access
import { bylawTitleMap, knownBylawUrls } from "./bylaw-maps";
export const HARDCODED_PDF_URLS = knownBylawUrls;
export const BYLAW_TITLE_MAP = bylawTitleMap;

/**
 * Analyze the URL structure of existing bylaw URLs to determine patterns
 * This is a helper function for development/debugging
 */
export function analyzeUrlStructure(): {
  patterns: Record<string, number>;
  examples: Record<string, string[]>;
} {
  const patterns: Record<string, number> = {};
  const examples: Record<string, string[]> = {};

  // Analyze all URLs
  Object.entries(HARDCODED_PDF_URLS).forEach(([number, url]) => {
    // Extract pattern type
    let pattern = "unknown";

    if (url.includes("/wp-content/uploads/")) {
      pattern = "wp-content";
    } else if (url.includes("/sites/default/files/")) {
      pattern = "sites-default";
    } else if (url.includes("/bylaws/")) {
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

  // Add additional pattern types for diagnostic purposes
  patterns["total-hardcoded"] = Object.keys(HARDCODED_PDF_URLS).length;

  // Use the already imported VALIDATED_BYLAWS to avoid require()
  patterns["total-validated"] = VALIDATED_BYLAWS.length;

  return { patterns, examples };
}
