/**
 * Bylaw Verification Database
 *
 * This module provides a verification layer for bylaw citations
 * to ensure accuracy against official sources.
 *
 * UPDATED: Migrated from Prisma to Drizzle ORM
 */

import fs from 'node:fs';
import path from 'node:path';
import { eq, and, desc, like, or } from 'drizzle-orm';

// Import the centralized database client from Drizzle
import db from '@/lib/db';
import { bylaw, bylawSection, citationFeedback } from '@/lib/db/schema';

/**
 * Interface for section information
 */
interface SectionInfo {
  sectionNumber: string;
  title?: string;
  content: string;
}

/**
 * Interface for verified bylaw data
 */
export interface VerifiedBylawData {
  bylawNumber: string;
  title: string;
  pdfPath: string;
  isConsolidated: boolean;
  consolidatedDate: string | null;
  officialUrl: string;
  lastVerified: Date;
  enactmentDate: string | null;
  amendments: string | null;
  // Optional fields
  sections?: SectionInfo[];
  amendedBylaw?: string[];
}

/**
 * Verify a bylaw against the database
 */
export async function verifyBylaw(
  bylawNumber: string,
): Promise<VerifiedBylawData | null> {
  try {
    // Check if bylaw exists in database
    const bylaws = await db
      .select()
      .from(bylaw)
      .where(eq(bylaw.bylawNumber, bylawNumber));

    if (!bylaws.length) {
      return null;
    }

    const foundBylaw = bylaws[0];

    // Get sections for this bylaw
    const sections = await db
      .select()
      .from(bylawSection)
      .where(eq(bylawSection.bylawNumber, bylawNumber));

    // Return verified bylaw data
    return {
      bylawNumber: foundBylaw.bylawNumber,
      title: foundBylaw.title,
      isConsolidated: foundBylaw.isConsolidated,
      pdfPath: foundBylaw.pdfPath,
      officialUrl: foundBylaw.officialUrl,
      lastVerified: foundBylaw.lastVerified,
      consolidatedDate: foundBylaw.consolidatedDate,
      enactmentDate: foundBylaw.enactmentDate,
      amendments: foundBylaw.amendments,
      sections: sections.map((section) => ({
        sectionNumber: section.sectionNumber,
        title: section.title || undefined,
        content: section.content,
      })),
      amendedBylaw: foundBylaw.amendments
        ? foundBylaw.amendments.split(',')
        : undefined,
    };
  } catch (error) {
    console.error(`Error verifying bylaw ${bylawNumber}:`, error);
    return null;
  }
}

/**
 * Verify a specific section in a bylaw
 */
export async function verifyBylawSection(
  bylawNumber: string,
  sectionNumber: string,
): Promise<{ text: string; title?: string } | null> {
  try {
    // Check if section exists in database
    const sections = await db
      .select()
      .from(bylawSection)
      .where(
        and(
          eq(bylawSection.bylawNumber, bylawNumber),
          eq(bylawSection.sectionNumber, sectionNumber),
        ),
      );

    if (!sections.length) {
      return null;
    }

    const section = sections[0];

    // Return verified section data
    return {
      text: section.content,
      title: section.title || undefined,
    };
  } catch (error) {
    console.error(
      `Error verifying bylaw section ${bylawNumber}, ${sectionNumber}:`,
      error,
    );
    return null;
  }
}

/**
 * Record citation feedback
 */
export async function recordCitationFeedback(
  bylawNumber: string,
  section: string,
  feedback: 'accurate' | 'inaccurate' | 'incomplete' | 'outdated',
  userComment?: string,
): Promise<boolean> {
  try {
    // Record feedback in database
    try {
      await db.insert(citationFeedback).values({
        id: crypto.randomUUID(), // Generate UUID
        bylawNumber,
        section,
        feedback,
        userComment,
        timestamp: new Date(),
      });
      return true;
    } catch (err) {
      console.warn(
        `Citation feedback recording failed (non-critical) for bylaw ${bylawNumber}:`,
        err,
      );
      // Store feedback in application logs at minimum
      console.info(
        `CITATION_FEEDBACK: ${bylawNumber}, ${section}, ${feedback}, ${userComment || 'no comment'}`,
      );
      return false;
    }
  } catch (error) {
    console.error(
      `Error recording citation feedback for bylaw ${bylawNumber}:`,
      error,
    );
    // Store feedback in application logs at minimum
    console.info(
      `CITATION_FEEDBACK: ${bylawNumber}, ${section}, ${feedback}, ${userComment || 'no comment'}`,
    );
    return false;
  }
}

/**
 * Find similar bylaws by title or content
 */
export async function findSimilarBylaws(
  term: string,
  limit = 5,
): Promise<VerifiedBylawData[]> {
  try {
    // Search for bylaws with similar titles
    const searchPattern = `%${term}%`;
    const similarBylaws = await db
      .select()
      .from(bylaw)
      .where(
        or(
          like(bylaw.title, searchPattern),
          like(bylaw.bylawNumber, searchPattern),
        ),
      )
      .limit(limit);

    // Get sections for these bylaws
    const result: VerifiedBylawData[] = [];

    for (const item of similarBylaws) {
      const sections = await db
        .select()
        .from(bylawSection)
        .where(eq(bylawSection.bylawNumber, item.bylawNumber));

      // Create the verified bylaw data object with optional sections
      const bylawData: VerifiedBylawData = {
        bylawNumber: item.bylawNumber,
        title: item.title,
        isConsolidated: item.isConsolidated,
        pdfPath: item.pdfPath,
        officialUrl: item.officialUrl,
        lastVerified: item.lastVerified,
        consolidatedDate: item.consolidatedDate,
        enactmentDate: item.enactmentDate,
        amendments: item.amendments,
        amendedBylaw: item.amendments ? item.amendments.split(',') : undefined,
      };

      // Add sections if they exist
      if (sections.length > 0) {
        bylawData.sections = sections.map((section) => ({
          sectionNumber: section.sectionNumber,
          title: section.title || undefined,
          content: section.content,
        }));
      }

      result.push(bylawData);
    }

    return result;
  } catch (error) {
    console.error(`Error finding similar bylaws for term "${term}":`, error);
    return [];
  }
}

/**
 * Get known bylaw PDF filename by bylaw number
 */
export function getFilenameForBylaw(bylawNumber: string): string | null {
  // Map of known bylaw numbers to PDF filenames
  const bylawMap: Record<string, string> = {
    '3210': '3210 -  Anti-Noise Bylaw - Consolidated to 4594.pdf',
    '4742': 'Tree-Protection-Bylaw.pdf',
    '3531': 'Zoning-Bylaw-Oak-Bay.pdf',
    '4700': 'Official-Community-Plan-2020.pdf',
  };

  // If we know about this bylaw, return its filename
  if (bylawMap[bylawNumber]) {
    return bylawMap[bylawNumber];
  }

  // Try to find a matching PDF by bylaw number in the public dir
  const publicDir = path.resolve(process.cwd(), 'public/pdfs');
  const dirExists = fs.existsSync(publicDir);

  if (!dirExists) {
    console.warn('Public PDFs directory not found');
    return null;
  }

  try {
    const files = fs.readdirSync(publicDir);

    // First look for an exact match
    const exactMatch = files.find(
      (file) =>
        file === `${bylawNumber}.pdf` ||
        file.startsWith(`${bylawNumber} `) ||
        file.startsWith(`${bylawNumber},`) ||
        file.startsWith(`${bylawNumber}-`),
    );

    if (exactMatch) return exactMatch;

    // If no exact match, look for any file containing the bylaw number
    const fuzzyMatch = files.find(
      (file) => file.includes(`${bylawNumber}`) && file.endsWith('.pdf'),
    );

    if (fuzzyMatch) return fuzzyMatch;

    // No match found
    return null;
  } catch (error) {
    console.error('Error searching for bylaw PDF:', error);
    return null;
  }
}

/**
 * Get the most recent verified bylaw
 */
export async function getMostRecentVerifiedBylaw(): Promise<VerifiedBylawData | null> {
  try {
    const bylaws = await db
      .select()
      .from(bylaw)
      .orderBy(desc(bylaw.lastVerified))
      .limit(1);

    if (!bylaws.length) {
      return null;
    }

    const foundBylaw = bylaws[0];

    // Get sections for this bylaw
    const sections = await db
      .select()
      .from(bylawSection)
      .where(eq(bylawSection.bylawNumber, foundBylaw.bylawNumber));

    return {
      bylawNumber: foundBylaw.bylawNumber,
      title: foundBylaw.title,
      isConsolidated: foundBylaw.isConsolidated,
      pdfPath: foundBylaw.pdfPath,
      officialUrl: foundBylaw.officialUrl,
      lastVerified: foundBylaw.lastVerified,
      consolidatedDate: foundBylaw.consolidatedDate,
      enactmentDate: foundBylaw.enactmentDate,
      amendments: foundBylaw.amendments,
      sections: sections.map((section) => ({
        sectionNumber: section.sectionNumber,
        title: section.title || undefined,
        content: section.content,
      })),
    };
  } catch (error) {
    console.error('Error getting most recent verified bylaw:', error);
    return null;
  }
}

/**
 * Add or update a bylaw in the verification database
 */
export async function upsertBylaw(
  bylawData: Omit<
    VerifiedBylawData,
    'lastVerified' | 'sections' | 'amendedBylaw'
  > & {
    sections?: { sectionNumber: string; title?: string; content: string }[];
  },
): Promise<VerifiedBylawData | null> {
  try {
    // Check if bylaw exists
    const existingBylaws = await db
      .select()
      .from(bylaw)
      .where(eq(bylaw.bylawNumber, bylawData.bylawNumber));

    if (existingBylaws.length) {
      // Update existing bylaw
      await db
        .update(bylaw)
        .set({
          title: bylawData.title,
          isConsolidated: bylawData.isConsolidated,
          pdfPath: bylawData.pdfPath,
          officialUrl: bylawData.officialUrl,
          lastVerified: new Date(),
          consolidatedDate: bylawData.consolidatedDate,
          enactmentDate: bylawData.enactmentDate,
          amendments: bylawData.amendments,
        })
        .where(eq(bylaw.bylawNumber, bylawData.bylawNumber));
    } else {
      // Create new bylaw
      await db.insert(bylaw).values({
        bylawNumber: bylawData.bylawNumber,
        title: bylawData.title,
        isConsolidated: bylawData.isConsolidated,
        pdfPath: bylawData.pdfPath,
        officialUrl: bylawData.officialUrl,
        lastVerified: new Date(),
        consolidatedDate: bylawData.consolidatedDate,
        enactmentDate: bylawData.enactmentDate,
        amendments: bylawData.amendments,
      });
    }

    // If sections were provided, upsert them
    if (bylawData.sections && bylawData.sections.length > 0) {
      for (const section of bylawData.sections) {
        // Check if this section exists
        const existingSections = await db
          .select()
          .from(bylawSection)
          .where(
            and(
              eq(bylawSection.bylawNumber, bylawData.bylawNumber),
              eq(bylawSection.sectionNumber, section.sectionNumber),
            ),
          );

        if (existingSections.length) {
          // Update existing section
          await db
            .update(bylawSection)
            .set({
              title: section.title,
              content: section.content,
            })
            .where(
              and(
                eq(bylawSection.bylawNumber, bylawData.bylawNumber),
                eq(bylawSection.sectionNumber, section.sectionNumber),
              ),
            );
        } else {
          // Create new section
          await db.insert(bylawSection).values({
            id: crypto.randomUUID(), // Generate UUID
            bylawNumber: bylawData.bylawNumber,
            sectionNumber: section.sectionNumber,
            title: section.title,
            content: section.content,
          });
        }
      }
    }

    // Re-fetch the complete bylaw with sections
    return await verifyBylaw(bylawData.bylawNumber);
  } catch (error) {
    console.error(`Error upserting bylaw ${bylawData.bylawNumber}:`, error);
    return null;
  }
}
