/**
 * CLIENT-SIDE ONLY: Bylaw URL and utility functions
 * 
 * This is a re-export of shared bylaw utilities to avoid the
 * "React server component" import errors when used in client components.
 * 
 * All implementation details are now in the shared module.
 */

// Re-export everything from the shared implementation
export {
  getExternalPdfUrl,
  getLocalPdfPath,
  getBestPdfUrl,
  getBylawTitle,
  findSectionPage,
  getEstimatedPageCount,
  isValidatedBylaw,
  VALIDATED_BYLAWS,
  sectionPageMapping as SECTION_PAGE_MAPPINGS,
  bylawPageCounts as BYLAW_PAGE_COUNTS
} from '../utils/bylaw-shared';

// Re-export known URLs and titles for direct access
import { knownBylawUrls, bylawTitleMap } from './bylaw-maps';
export const HARDCODED_PDF_URLS = knownBylawUrls;
export const BYLAW_TITLE_MAP = bylawTitleMap;

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
  
  // Add additional pattern types for diagnostic purposes
  patterns["total-hardcoded"] = Object.keys(HARDCODED_PDF_URLS).length;
  
  // Import from the shared module
  const { VALIDATED_BYLAWS } = require('./bylaw-shared');
  patterns["total-validated"] = VALIDATED_BYLAWS.length;
  
  return { patterns, examples };
}