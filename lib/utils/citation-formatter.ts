/**
 * Citation Formatter Utilities
 *
 * This module provides utilities for formatting bylaw citations in different styles.
 */

/**
 * Normalize section reference format for internal use/storage
 */
export function normalizeSection(section: string): string {
  // Remove any prefix like "Section", "Part", etc.
  let normalized = section.replace(
    /^(section|part|article|schedule|appendix|s\.|p\.)\s+/i,
    '',
  );

  // Remove trailing period if it exists
  normalized = normalized.replace(/\.$/, '');

  // If it's a roman numeral, convert to uppercase for consistency
  if (/^[IVXLCDM]+$/i.test(normalized)) {
    normalized = normalized.toUpperCase();
  }

  return normalized;
}

/**
 * Enhanced section formatting to handle various citation styles
 */
export function formatSection(section: string, title?: string | null): string {
  // Normalize section first
  const normalizedSection = normalizeSection(section);

  // Check if it's a roman numeral
  const isRomanNumeral = /^[IVXLCDM]+$/i.test(normalizedSection);

  // Check if it's a lettered section like "(a)" or "(iv)"
  const isLetterSection = /^\([a-z0-9]+\)$/i.test(normalizedSection);

  // Check if it's a numeric section with subsections like "1.2.3"
  const isNumericWithSubsections = /^\d+(\.\d+)+$/.test(normalizedSection);

  // Check if it's a simple numeric section like "1" or "42"
  const isSimpleNumeric = /^\d+$/.test(normalizedSection);

  // Format based on type
  let formattedSection: string;
  if (isRomanNumeral) {
    formattedSection = `Part ${normalizedSection}`;
  } else if (isLetterSection) {
    formattedSection = `Subsection ${normalizedSection}`;
  } else if (isNumericWithSubsections) {
    formattedSection = `Section ${normalizedSection}`;
  } else if (isSimpleNumeric) {
    formattedSection = `Section ${normalizedSection}`;
  } else {
    // If we can't determine the type, just use the original section
    formattedSection = section;
  }

  // Add title if provided
  if (title) {
    formattedSection = `${formattedSection}: ${title}`;
  }

  return formattedSection;
}

/**
 * Get section string for a specific citation format
 */
export function getCitationSectionString(
  section: string,
  format: 'standard' | 'legal' | 'apa',
): string {
  // For legal citations, use the section symbol with normalized section
  if (format === 'legal') {
    return `§ ${normalizeSection(section)}`;
  }

  // For other formats, use the enhanced formatting
  return formatSection(section, null);
}

/**
 * Get consolidation info string
 */
export function getConsolidationInfo(
  isConsolidated: boolean,
  consolidatedDate?: string,
): string {
  if (isConsolidated && consolidatedDate) {
    return ` (Consolidated to ${consolidatedDate})`;
  } else if (isConsolidated) {
    return ` (Consolidated)`;
  }
  return '';
}

/**
 * Format a bylaw citation in different styles
 */
export function formatCitation(
  params: {
    bylawNumber: string;
    title: string;
    section: string;
    isConsolidated?: boolean;
    consolidatedDate?: string;
    effectiveDate?: string;
    excerpt?: string;
  },
  format: 'standard' | 'legal' | 'apa' = 'standard',
): string {
  const {
    bylawNumber,
    title,
    section,
    isConsolidated = false,
    consolidatedDate,
    effectiveDate,
    excerpt,
  } = params;

  // Get consolidation info string
  const consolidationInfo = getConsolidationInfo(
    isConsolidated,
    consolidatedDate,
  );

  // Format citation based on selected format
  switch (format) {
    case 'legal':
      return `Oak Bay Bylaw No. ${bylawNumber}${consolidationInfo}, § ${section} (${effectiveDate || 'n.d.'}).`;

    case 'apa':
      return `District of Oak Bay. (${effectiveDate?.split('-')[0] || 'n.d.'}). ${title} [Bylaw No. ${bylawNumber}${consolidationInfo}], ${getCitationSectionString(section, 'apa')}.`;

    case 'standard':
    default:
      return `${title}${consolidationInfo}, ${getCitationSectionString(section, 'standard')}${excerpt ? `: ${excerpt}` : ''}`;
  }
}
