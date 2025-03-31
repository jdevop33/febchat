/**
 * Chunking strategies for bylaw texts
 *
 * This module provides functions for chunking bylaw texts into
 * appropriate segments for embedding and retrieval.
 */

import type { BylawMetadata } from "../../vector/types";

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

  // Enhanced pattern to match various section number formats:
  // - Standard decimal notation: "1.", "1.1", "1.1.1"
  // - Section/part prefixed: "Section 1", "Part I", "Section 1.2"
  // - Roman numerals: "I.", "II.", "IV."
  // - Letter-based subsections: "1(a)", "2(b)(i)", "3.1(c)"
  // - Dash or parenthesis prefixed: "1-1", "1-(a)", "(1)", "(a)"
  const sectionPattern =
    /(?:^|\n)(?:(?:Section|Part|Article)\s+)?([IVXLCDM]+\.|\d+(?:[-.](?:\d+|[a-z])|(?:\(\w+\))+)?|\(\w+\))\s+(.*?)(?=(?:\n(?:(?:Section|Part|Article)\s+)?([IVXLCDM]+\.|\d+(?:[-.](?:\d+|[a-z])|(?:\(\w+\))+)?|\(\w+\))\s+)|$)/gis;

  let match: RegExpExecArray | null = sectionPattern.exec(text);
  while (match !== null) {
    const sectionNumber = match[1];
    let sectionText = match[2].trim();
    let sectionTitle: string | undefined;

    // Try to extract section title if applicable
    // Common patterns:
    // - "Title. Rest of the text..."
    // - "TITLE. Rest of the text..."
    // - "Title - Rest of the text..."
    const titleMatch = sectionText.match(
      /^([A-Z][^.:-]*(?:\s+[A-Z][^.:-]*)*)[.:-]\s+(.*)/,
    );
    if (titleMatch) {
      sectionTitle = titleMatch[1].trim();
      sectionText = titleMatch[2].trim();
    }

    // Get the next match at the end of the loop
    match = sectionPattern.exec(text);

    if (sectionText.length < minLength) {
      // Section is too small, may need to combine with next section
      continue;
    }

    if (sectionText.length > maxLength) {
      // Section is too large, may need to split further
      const sentences = sectionText.match(/[^.!?]+[.!?]+/g) || [];
      let currentChunk = "";

      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxLength) {
          // Add current chunk
          chunks.push({
            text: currentChunk.trim(),
            metadata: {
              ...metadata,
              section: sectionNumber,
              sectionTitle: sectionTitle,
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
            sectionTitle: sectionTitle,
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
          sectionTitle: sectionTitle,
        },
      });
    }
  }

  // If no sections were found with the enhanced pattern, try a fallback approach
  if (chunks.length === 0) {
    console.log(
      "No sections found with primary pattern, using fallback method...",
    );

    // Fallback pattern for less structured documents
    // Look for numbered paragraphs or other patterns that might indicate sections
    const fallbackPattern =
      /(?:^|\n)(?:\((\d+|[a-z])\)|(\d+)\.|([IVXLCDM]+)\.)\s+(.*?)(?=(?:\n(?:\(\d+|[a-z]\)|\d+\.|[IVXLCDM]+\.)\s+)|$)/gis;

    let fallbackMatch: RegExpExecArray | null = fallbackPattern.exec(text);
    while (fallbackMatch !== null) {
      const sectionNumber =
        fallbackMatch[1] || fallbackMatch[2] || fallbackMatch[3];
      const sectionText = fallbackMatch[4].trim();

      fallbackMatch = fallbackPattern.exec(text);

      if (sectionText.length > 0) {
        // Apply the same minLength and maxLength rules
        if (sectionText.length < minLength) {
          continue;
        }

        if (sectionText.length > maxLength) {
          // Split into chunks as with the primary pattern
          const sentences = sectionText.match(/[^.!?]+[.!?]+/g) || [];
          let currentChunk = "";

          for (const sentence of sentences) {
            if (currentChunk.length + sentence.length > maxLength) {
              chunks.push({
                text: currentChunk.trim(),
                metadata: {
                  ...metadata,
                  section: sectionNumber,
                },
              });

              currentChunk = sentence;
            } else {
              currentChunk += sentence;
            }
          }

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
          chunks.push({
            text: sectionText,
            metadata: {
              ...metadata,
              section: sectionNumber,
            },
          });
        }
      }
    }

    // If still no sections found, use basic chunking as a last resort
    if (chunks.length === 0) {
      console.log(
        "No sections found with fallback pattern either, using basic paragraph chunking...",
      );

      // Split by paragraphs
      const paragraphs = text.split(/\n\s*\n/);

      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i].trim();
        if (paragraph.length >= minLength) {
          chunks.push({
            text: paragraph,
            metadata: {
              ...metadata,
              section: `p${i + 1}`, // Use paragraph numbers as section identifiers
            },
          });
        }
      }
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
  let currentChunk = "";
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
      const words = currentChunk.split(" ");
      const overlapWords = words.slice(
        words.length - Math.floor(chunkOverlap / 5),
      );
      currentChunk = overlapWords.join(" ") + sentence;
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
