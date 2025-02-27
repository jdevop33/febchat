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
  metadata: Partial<BylawMetadata>
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
      version: data.pdfVersion,
    };
    
    // Try to extract bylaw number and date from filename
    const filename = path.basename(filePath, '.pdf');
    const bylawNumberMatch = filename.match(/bylaw[-_]?(\d+)/i);
    const dateMatch = filename.match(/(\d{4}[-_]?\d{2}[-_]?\d{2})/);
    
    // Combine extracted metadata with provided metadata
    const combinedMetadata: Partial<BylawMetadata> = {
      ...metadata,
      ...(bylawNumberMatch && !metadata.bylawNumber ? { bylawNumber: bylawNumberMatch[1] } : {}),
      ...(dateMatch && !metadata.dateEnacted ? { dateEnacted: dateMatch[1] } : {}),
      lastUpdated: new Date().toISOString(),
    };
    
    return {
      text,
      metadata: combinedMetadata,
    };
  } catch (error) {
    console.error(`Error extracting from PDF ${filePath}:`, error);
    throw new Error(`Failed to extract from PDF: ${error.message}`);
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
export function detectSections(text: string): { sectionNumber: string; text: string }[] {
  const sections: { sectionNumber: string; text: string }[] = [];
  
  // Pattern to match section numbers like "1.", "1.1", "1.1.1"
  const sectionPattern = /(?:^|\n)(\d+(?:\.\d+)*)\s+(.*?)(?=(?:\n\d+(?:\.\d+)*\s+)|$)/gs;
  
  let match;
  while ((match = sectionPattern.exec(text)) !== null) {
    const sectionNumber = match[1];
    const sectionText = match[2].trim();
    
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
  
  // Extract bylaw number
  const bylawNumberMatch = text.match(/Bylaw No\.\s+(\d+)/i);
  if (bylawNumberMatch) {
    metadata.bylawNumber = bylawNumberMatch[1];
  }
  
  // Extract bylaw title
  const titleMatch = text.match(/(?:BYLAW|Bylaw)[^\n]*?(?:TO|to)[^\n]*?([^\n]+)/);
  if (titleMatch) {
    metadata.title = titleMatch[1].trim();
  }
  
  // Extract date enacted
  const dateMatch = text.match(/(?:ENACTED|Enacted|adopted|ADOPTED)[^\n]*?(\d{1,2}(?:st|nd|rd|th)?\s+day\s+of\s+\w+,\s+\d{4})/i);
  if (dateMatch) {
    const dateString = dateMatch[1].replace(/(st|nd|rd|th)/, '');
    try {
      const date = new Date(dateString);
      metadata.dateEnacted = date.toISOString().split('T')[0];
    } catch (error) {
      console.warn('Failed to parse date:', dateString);
    }
  }
  
  // Attempt to detect category
  if (text.match(/zoning|land use|density|floor area|setback|height|lot coverage/i)) {
    metadata.category = 'zoning';
  } else if (text.match(/tree|vegetation|canopy|pruning|cutting|removal of trees/i)) {
    metadata.category = 'trees';
  } else if (text.match(/animal|dog|cat|pet|wildlife|bird|fowl/i)) {
    metadata.category = 'animals';
  } else if (text.match(/noise|sound|quiet|decibel|amplified|disturbance/i)) {
    metadata.category = 'noise';
  } else if (text.match(/building|construction|permit|renovation|demolition/i)) {
    metadata.category = 'building';
  } else if (text.match(/traffic|parking|vehicle|street|road|sidewalk|boulevard/i)) {
    metadata.category = 'traffic';
  } else {
    metadata.category = 'general';
  }
  
  return metadata;
}