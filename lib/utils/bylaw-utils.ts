/**
 * Utility functions for bylaw-related functionality (server-side)
 * 
 * This module re-exports everything from the shared bylaw utilities module
 * and adds any server-specific functions.
 */

// Import and re-export all shared functionality
export * from './bylaw-shared';

// Server-specific utility for extracting filename from URL
import { knownBylawUrls } from './bylaw-maps';

/**
 * Map bylaw number to local PDF filename
 * This is a server-specific utility not needed in the client
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
