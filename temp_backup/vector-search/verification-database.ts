/**
 * Bylaw Verification Database
 *
 * This module provides a verification layer for bylaw citations
 * to ensure accuracy against official sources.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

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

// Initialize Prisma client - use global instance to prevent too many connections
// For Next.js hot reloading in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // Log queries in development
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Verify a bylaw against the database
 */
export async function verifyBylaw(
  bylawNumber: string,
): Promise<VerifiedBylawData | null> {
  try {
    // Check if bylaw exists in database
    const bylaw = await prisma.bylaw.findUnique({
      where: { bylawNumber },
      include: { sections: true },
    });

    if (!bylaw) {
      return null;
    }

    // Return verified bylaw data
    return {
      bylawNumber: bylaw.bylawNumber,
      title: bylaw.title,
      isConsolidated: bylaw.isConsolidated,
      pdfPath: bylaw.pdfPath,
      officialUrl: bylaw.officialUrl,
      lastVerified: bylaw.lastVerified,
      consolidatedDate: bylaw.consolidatedDate,
      enactmentDate: bylaw.enactmentDate,
      amendments: bylaw.amendments,
      sections: bylaw.sections.map((section) => ({
        sectionNumber: section.sectionNumber,
        title: section.title || undefined,
        content: section.content,
      })),
      amendedBylaw: bylaw.amendments ? bylaw.amendments.split(',') : undefined,
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
    const section = await prisma.bylawSection.findUnique({
      where: {
        bylawNumber_sectionNumber: {
          bylawNumber,
          sectionNumber,
        },
      },
    });

    if (!section) {
      return null;
    }

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
    await prisma.citationFeedback
      .create({
        data: {
          bylawNumber,
          section,
          feedback,
          userComment,
          timestamp: new Date(),
        },
      })
      .catch((err) => {
        console.warn(
          `Citation feedback recording failed (non-critical) for bylaw ${bylawNumber}:`,
          err,
        );
        // Store feedback in application logs at minimum
        console.info(
          `CITATION_FEEDBACK: ${bylawNumber}, ${section}, ${feedback}, ${userComment || 'no comment'}`,
        );
        return null;
      });
    return true;
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
    const similarBylaws = await prisma.bylaw.findMany({
      where: {
        OR: [
          { title: { contains: term } }, // Removed mode parameter
          { bylawNumber: { contains: term } },
        ],
      },
      include: { sections: true },
      take: limit,
    });

    return similarBylaws.map((bylaw) => {
      // Create the verified bylaw data object with optional sections
      const result: VerifiedBylawData = {
        bylawNumber: bylaw.bylawNumber,
        title: bylaw.title,
        isConsolidated: bylaw.isConsolidated,
        pdfPath: bylaw.pdfPath,
        officialUrl: bylaw.officialUrl,
        lastVerified: bylaw.lastVerified,
        consolidatedDate: bylaw.consolidatedDate,
        enactmentDate: bylaw.enactmentDate,
        amendments: bylaw.amendments,
        amendedBylaw: bylaw.amendments
          ? bylaw.amendments.split(',')
          : undefined,
      };

      // Add sections if they exist
      if (bylaw.sections && bylaw.sections.length > 0) {
        result.sections = bylaw.sections.map((section) => ({
          sectionNumber: section.sectionNumber,
          title: section.title || undefined,
          content: section.content,
        }));
      }

      return result;
    });
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
    '4842': 'Tree-Protection-Bylaw.pdf',
    '4567': 'Zoning-Bylaw-Oak-Bay.pdf',
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
    const bylaw = await prisma.bylaw.findFirst({
      orderBy: { lastVerified: 'desc' },
      include: { sections: true },
    });

    if (!bylaw) {
      return null;
    }

    return {
      bylawNumber: bylaw.bylawNumber,
      title: bylaw.title,
      isConsolidated: bylaw.isConsolidated,
      pdfPath: bylaw.pdfPath,
      officialUrl: bylaw.officialUrl,
      lastVerified: bylaw.lastVerified,
      consolidatedDate: bylaw.consolidatedDate,
      enactmentDate: bylaw.enactmentDate,
      amendments: bylaw.amendments,
      sections: bylaw.sections.map((section) => ({
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
    // Upsert the bylaw record
    const bylaw = await prisma.bylaw.upsert({
      where: { bylawNumber: bylawData.bylawNumber },
      update: {
        title: bylawData.title,
        isConsolidated: bylawData.isConsolidated,
        pdfPath: bylawData.pdfPath,
        officialUrl: bylawData.officialUrl,
        lastVerified: new Date(),
        consolidatedDate: bylawData.consolidatedDate,
        enactmentDate: bylawData.enactmentDate,
        amendments: bylawData.amendments,
      },
      create: {
        bylawNumber: bylawData.bylawNumber,
        title: bylawData.title,
        isConsolidated: bylawData.isConsolidated,
        pdfPath: bylawData.pdfPath,
        officialUrl: bylawData.officialUrl,
        lastVerified: new Date(),
        consolidatedDate: bylawData.consolidatedDate,
        enactmentDate: bylawData.enactmentDate,
        amendments: bylawData.amendments,
      },
      include: { sections: true },
    });

    // If sections were provided, upsert them
    if (bylawData.sections && bylawData.sections.length > 0) {
      for (const section of bylawData.sections) {
        await prisma.bylawSection.upsert({
          where: {
            bylawNumber_sectionNumber: {
              bylawNumber: bylawData.bylawNumber,
              sectionNumber: section.sectionNumber,
            },
          },
          update: {
            title: section.title,
            content: section.content,
          },
          create: {
            bylawNumber: bylawData.bylawNumber,
            sectionNumber: section.sectionNumber,
            title: section.title,
            content: section.content,
          },
        });
      }
    }

    // Re-fetch the complete bylaw with sections
    return await verifyBylaw(bylawData.bylawNumber);
  } catch (error) {
    console.error(`Error upserting bylaw ${bylawData.bylawNumber}:`, error);
    return null;
  }
}
