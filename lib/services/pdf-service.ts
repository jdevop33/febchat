/**
 * PDF Service
 * 
 * Centralized service for PDF operations including:
 * - URL generation
 * - Path resolution
 * - Section mapping
 * - PDF validation
 */

import { getExternalPdfUrl, getLocalPdfPath, getBestPdfUrl, findSectionPage } from '../utils/bylaw-shared';

/**
 * PDF Locations object with both local and external paths
 */
export interface PdfLocations {
  localPath: string;
  externalUrl: string;
  bestUrl: string;
}

/**
 * PDF Section information
 */
export interface PdfSectionInfo {
  pageNumber: number;
  estimatedTotalPages: number;
}

/**
 * Get all possible PDF locations for a bylaw
 */
export function getPdfLocations(bylawNumber: string, title?: string): PdfLocations {
  return {
    localPath: getLocalPdfPath(bylawNumber),
    externalUrl: getExternalPdfUrl(bylawNumber, title),
    bestUrl: getBestPdfUrl(bylawNumber, title)
  };
}

/**
 * Get PDF section information
 */
export function getPdfSectionInfo(
  bylawNumber: string, 
  section: string
): PdfSectionInfo {
  // Find the page for this section
  const pageNumber = findSectionPage(bylawNumber, section);
  
  // Get estimated total pages from hardcoded data
  const estimatedTotalPages = 20; // Default value
  
  return {
    pageNumber,
    estimatedTotalPages
  };
}

/**
 * Handle PDF loading error
 */
export function handlePdfLoadError(
  bylawNumber: string, 
  title?: string,
  options?: { 
    autoRedirect?: boolean, 
    showToast?: boolean
  }
): { redirectUrl: string } {
  const redirectUrl = getExternalPdfUrl(bylawNumber, title);
  
  // Log the error
  console.error(`Error loading PDF for bylaw ${bylawNumber}: Redirecting to ${redirectUrl}`);
  
  // Return the redirect URL
  return { redirectUrl };
}