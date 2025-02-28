/**
 * Chunking strategies for bylaw texts
 *
 * This module provides functions for chunking bylaw texts into
 * appropriate segments for embedding and retrieval.
 */

import type { BylawMetadata } from '../vector-search/types';

/**
 * A document chunk with text and metadata
 */
interface DocumentChunk {
  text: string;
  metadata: Partial<BylawMetadata>;
}

/**
 * Chunk bylaw text by sections
 */
export function chunkBySection(
  text: string,
  metadata: Partial<BylawMetadata>,
  options: {
    minLength?: number;
    maxLength?: number;
  } = {},
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const minLength = options.minLength || 50;
  const maxLength = options.maxLength || 1000;

  // Pattern to match section numbers like "1.", "1.1", "1.1.1"
  const sectionPattern =
    /(?:^|\n)(\d+(?:\.\d+)*)\s+(.*?)(?=(?:\n\d+(?:\.\d+)*\s+)|$)/gs;

  let match: RegExpExecArray | null = sectionPattern.exec(text);
  while (match !== null) {
    const sectionNumber = match[1];
    const sectionText = match[2].trim();
    
    // Get the next match at the end of the loop
    match = sectionPattern.exec(text);

    if (sectionText.length < minLength) {
      // Section is too small, may need to combine with next section
      continue;
    }

    if (sectionText.length > maxLength) {
      // Section is too large, may need to split further
      const sentences = sectionText.match(/[^.!?]+[.!?]+/g) || [];
      let currentChunk = '';

      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxLength) {
          // Add current chunk
          chunks.push({
            text: currentChunk.trim(),
            metadata: {
              ...metadata,
              section: sectionNumber,
            },
          });

          // Start new chunk
          currentChunk = sentence;
        } else {
          currentChunk += sentence;
        }
      }

      // Add remaining text
      if (currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          metadata: {
            ...metadata,
            section: sectionNumber,
          },
        });
      }
    } else {
      // Section is of appropriate size
      chunks.push({
        text: sectionText,
        metadata: {
          ...metadata,
          section: sectionNumber,
        },
      });
    }
  }

  return chunks;
}

/**
 * Chunk bylaw text by fixed size with overlap
 */
export function chunkBySize(
  text: string,
  metadata: Partial<BylawMetadata>,
  options: {
    chunkSize?: number;
    chunkOverlap?: number;
  } = {},
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const chunkSize = options.chunkSize || 500;
  const chunkOverlap = options.chunkOverlap || 100;

  if (text.length <= chunkSize) {
    // Text is small enough to be a single chunk
    return [
      {
        text,
        metadata,
      },
    ];
  }

  // Split text into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  let currentChunk = '';
  let currentPosition = 0;

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize) {
      // Add current chunk
      chunks.push({
        text: currentChunk.trim(),
        metadata: {
          ...metadata,
          section: metadata.section || `chunk-${currentPosition}`,
        },
      });

      // Start new chunk with overlap
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(
        words.length - Math.floor(chunkOverlap / 5),
      );
      currentChunk = overlapWords.join(' ') + sentence;
      currentPosition += 1;
    } else {
      currentChunk += sentence;
    }
  }

  // Add remaining text
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      metadata: {
        ...metadata,
        section: metadata.section || `chunk-${currentPosition}`,
      },
    });
  }

  return chunks;
}

/**
 * Chunk bylaw text using a hybrid approach (sections + size)
 */
export function chunkBylawText(
  text: string,
  metadata: Partial<BylawMetadata>,
): DocumentChunk[] {
  // First try to chunk by sections
  const sectionChunks = chunkBySection(text, metadata);

  // If we got enough chunks by section, use those
  if (sectionChunks.length > 0) {
    return sectionChunks;
  }

  // Otherwise fall back to size-based chunking
  return chunkBySize(text, metadata);
}
