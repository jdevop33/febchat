/**
 * PDF Extractor for Bylaw Documents
 *
 * This module extracts text and metadata from PDF bylaw documents.
 */

import fs from 'node:fs';
import path from 'node:path';
import pdf from 'pdf-parse';
import type { BylawMetadata } from '../vector-search/types';

/**
 * Extract text and metadata from a PDF file
 */
export async function extractFromPDF(
  filePath: string,
  metadata: Partial<BylawMetadata>,
): Promise<{ text: string; metadata: Partial<BylawMetadata> }> {
  try {
    // Read the PDF file
    const dataBuffer = fs.readFileSync(filePath);

    // Parse the PDF
    const data = await pdf(dataBuffer);

    // Extract text
    const text = data.text;

    // Extract PDF metadata
    const pdfMetadata = {
      numPages: data.numpages,
      info: data.info,
      metadata: data.metadata,
      version: data.version,
    };

    // Try to extract bylaw number and date from filename
    const filename = path.basename(filePath, '.pdf');
    
    // More comprehensive bylaw number extraction - try multiple patterns
    let bylawNumber;
    
    // Pattern 1: Explicit bylaw number pattern like "bylaw-4620"
    const explicitBylawMatch = filename.match(/bylaw[-_\s]?(\d+)/i);
    if (explicitBylawMatch) {
      bylawNumber = explicitBylawMatch[1];
    }
    
    // Pattern 2: Starting with number pattern like "4620 - Something"
    if (!bylawNumber) {
      const startingNumberMatch = filename.match(/^(\d+)(?:[,\s_-]|$)/i);
      if (startingNumberMatch) {
        bylawNumber = startingNumberMatch[1];
      }
    }
    
    // Pattern 3: Number followed by comma or parentheses like "No. 4620," or "No. 4620 ("
    if (!bylawNumber) {
      const commaNumberMatch = filename.match(/No\.?\s+(\d+)[,\(\s]/i);
      if (commaNumberMatch) {
        bylawNumber = commaNumberMatch[1];
      }
    }
    
    // Look for date patterns
    const dateMatch = filename.match(/(\d{4}[-_]?\d{2}[-_]?\d{2})/);

    // Track where metadata comes from for debugging
    const metadataSourceInfo: Record<string, string> = {
      bylawNumber: bylawNumber ? 'filename' : (metadata.bylawNumber ? 'provided' : 'none'),
      dateEnacted: dateMatch ? 'filename' : (metadata.dateEnacted ? 'provided' : 'none'),
    };
    
    console.log(`Extracted metadata from filename: ${filename}`);
    console.log(`- Bylaw number: ${bylawNumber || 'Not found'} (source: ${metadataSourceInfo.bylawNumber})`);
    
    // Combine extracted metadata with provided metadata
    const combinedMetadata: Partial<BylawMetadata> = {
      ...metadata,
      ...(bylawNumber && !metadata.bylawNumber
        ? { bylawNumber }
        : {}),
      ...(dateMatch && !metadata.dateEnacted
        ? { dateEnacted: dateMatch[1] }
        : {}),
      originalFilename: filename,
      lastUpdated: new Date().toISOString(),
      metadataSource: metadataSourceInfo, // For debugging
    };

    return {
      text,
      metadata: combinedMetadata,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error extracting from PDF ${filePath}:`, errorMessage);
    throw new Error(`Failed to extract from PDF: ${errorMessage}`);
  }
}

/**
 * Clean and normalize extracted text
 */
export function cleanText(text: string): string {
  // Remove multiple spaces
  let cleaned = text.replace(/\s+/g, ' ');

  // Remove page numbers
  cleaned = cleaned.replace(/\b\d+\s+of\s+\d+\b/g, '');
  cleaned = cleaned.replace(/Page\s+\d+/g, '');

  // Remove headers and footers (common patterns in bylaw documents)
  cleaned = cleaned.replace(/Oak Bay Municipal.+\n/g, '');
  cleaned = cleaned.replace(/Bylaw No\.\s+\d+/g, '');

  // Fix common OCR errors
  cleaned = cleaned.replace(/l\b/g, '1'); // Replace lowercase l with 1 at word boundaries
  cleaned = cleaned.replace(/O/g, '0'); // Replace capital O with 0

  return cleaned.trim();
}

/**
 * Detect sections in bylaw text
 */
export function detectSections(
  text: string,
): { sectionNumber: string; text: string }[] {
  const sections: { sectionNumber: string; text: string }[] = [];

  // Pattern to match section numbers like "1.", "1.1", "1.1.1"
  const sectionPattern =
    /(?:^|\n)(\d+(?:\.\d+)*)\s+(.*?)(?=(?:\n\d+(?:\.\d+)*\s+)|$)/gs;

  let match: RegExpExecArray | null = sectionPattern.exec(text);
  while (match !== null) {
    const sectionNumber = match[1];
    const sectionText = match[2].trim();
    
    // Get the next match at the end of the loop
    match = sectionPattern.exec(text);

    if (sectionText.length > 0) {
      sections.push({
        sectionNumber,
        text: sectionText,
      });
    }
  }

  return sections;
}

/**
 * Extract bylaw metadata from text
 */
export function extractBylawMetadata(text: string): Partial<BylawMetadata> {
  const metadata: Partial<BylawMetadata> = {};
  const metadataSource: Record<string, string> = {};

  // Extract bylaw number - try multiple patterns
  // Pattern 1: "Bylaw No. 1234"
  const bylawNumberMatch1 = text.match(/Bylaw\s+No\.?\s+(\d+)/i);
  if (bylawNumberMatch1) {
    metadata.bylawNumber = bylawNumberMatch1[1];
    metadataSource.bylawNumber = 'pattern1';
  }
  
  // Pattern 2: "Corporation of Oak Bay Bylaw 1234"
  if (!metadata.bylawNumber) {
    const bylawNumberMatch2 = text.match(/(?:Corporation|District|Municipality|Oak Bay)[\s\w]+Bylaw\s+(?:No\.?\s+)?(\d+)/i);
    if (bylawNumberMatch2) {
      metadata.bylawNumber = bylawNumberMatch2[1];
      metadataSource.bylawNumber = 'pattern2';
    }
  }
  
  // Pattern 3: "Bylaw 1234" at beginning of line
  if (!metadata.bylawNumber) {
    const bylawNumberMatch3 = text.match(/(?:^|\n)Bylaw\s+(?:No\.?\s+)?(\d+)/i);
    if (bylawNumberMatch3) {
      metadata.bylawNumber = bylawNumberMatch3[1];
      metadataSource.bylawNumber = 'pattern3';
    }
  }
  
  // Extract consolidated bylaw number if present (sometimes appears in the title)
  const consolidatedMatch = text.match(/consolidated\s+to\s+(?:bylaw\s+)?(?:no\.?\s+)?(\d+)/i);
  if (consolidatedMatch) {
    metadata.consolidatedTo = consolidatedMatch[1];
    metadataSource.consolidatedTo = 'text';
  }

  // Extract bylaw title - try multiple patterns
  // Pattern 1: "Bylaw ... TO ..."
  const titleMatch1 = text.match(
    /(?:BYLAW|Bylaw)[^\n]*?(?:TO|to)[^\n]*?([^\n\.]+)/i,
  );
  if (titleMatch1) {
    metadata.title = titleMatch1[1].trim();
    metadataSource.title = 'pattern1';
  }
  
  // Pattern 2: After "CITED AS" or similar
  if (!metadata.title) {
    const titleMatch2 = text.match(
      /(?:cited as|known as|entitled)[^\n]*?["'](.+?)["']/i,
    );
    if (titleMatch2) {
      metadata.title = titleMatch2[1].trim();
      metadataSource.title = 'pattern2';
    }
  }
  
  // Fall back to using first capitalized phrase after "Bylaw"
  if (!metadata.title) {
    const titleMatch3 = text.match(
      /Bylaw\s+(?:No\.?\s+)?\d+\s+[-–—]\s+(.+?)(?:\n|\.)/i
    );
    if (titleMatch3) {
      metadata.title = titleMatch3[1].trim();
      metadataSource.title = 'pattern3';
    }
  }

  // Extract date enacted - try multiple date formats
  // Pattern 1: "X day of Month, Year"
  const dateMatch1 = text.match(
    /(?:ENACTED|Enacted|adopted|ADOPTED)[^\n]*?(\d{1,2}(?:st|nd|rd|th)?\s+day\s+of\s+\w+,?\s+\d{4})/i,
  );
  if (dateMatch1) {
    const dateString = dateMatch1[1].replace(/(st|nd|rd|th)/, '');
    try {
      const date = new Date(dateString);
      metadata.dateEnacted = date.toISOString().split('T')[0];
      metadataSource.dateEnacted = 'pattern1';
    } catch (error) {
      console.warn('Failed to parse date:', dateString);
    }
  }
  
  // Pattern 2: "Month Day, Year"
  if (!metadata.dateEnacted) {
    const dateMatch2 = text.match(
      /(?:ENACTED|Enacted|adopted|ADOPTED)[^\n]*?(\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i,
    );
    if (dateMatch2) {
      const dateString = dateMatch2[1].replace(/(st|nd|rd|th)/, '');
      try {
        const date = new Date(dateString);
        metadata.dateEnacted = date.toISOString().split('T')[0];
        metadataSource.dateEnacted = 'pattern2';
      } catch (error) {
        console.warn('Failed to parse date:', dateString);
      }
    }
  }
  
  // Pattern 3: ISO format or numeric dates
  if (!metadata.dateEnacted) {
    const dateMatch3 = text.match(
      /(?:ENACTED|Enacted|adopted|ADOPTED|dated)[^\n]*?(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/i,
    );
    if (dateMatch3) {
      try {
        const date = new Date(dateMatch3[1].replace(/\//g, '-'));
        metadata.dateEnacted = date.toISOString().split('T')[0];
        metadataSource.dateEnacted = 'pattern3';
      } catch (error) {
        console.warn('Failed to parse date:', dateMatch3[1]);
      }
    }
  }
  
  // Store the metadata source information for debugging
  metadata.metadataSource = metadataSource as Record<string, string>;

  // Attempt to detect category
  if (
    text.match(
      /zoning|land use|density|floor area|setback|height|lot coverage/i,
    )
  ) {
    metadata.category = 'zoning';
  } else if (
    text.match(/tree|vegetation|canopy|pruning|cutting|removal of trees/i)
  ) {
    metadata.category = 'trees';
  } else if (text.match(/animal|dog|cat|pet|wildlife|bird|fowl/i)) {
    metadata.category = 'animals';
  } else if (text.match(/noise|sound|quiet|decibel|amplified|disturbance/i)) {
    metadata.category = 'noise';
  } else if (
    text.match(/building|construction|permit|renovation|demolition/i)
  ) {
    metadata.category = 'building';
  } else if (
    text.match(/traffic|parking|vehicle|street|road|sidewalk|boulevard/i)
  ) {
    metadata.category = 'traffic';
  } else {
    metadata.category = 'general';
  }

  return metadata;
}
