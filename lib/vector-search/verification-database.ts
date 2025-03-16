/**
 * Bylaw Verification Database
 * 
 * This module provides a verification layer for bylaw citations
 * to ensure accuracy against official sources.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

// Initialize Prisma client
const prisma = new PrismaClient();

// Interface for verified bylaw data
export interface VerifiedBylawData {
  bylawNumber: string;
  title: string;
  isConsolidated: boolean;
  pdfPath: string;
  officialUrl: string;
  lastVerified: Date;
  consolidatedDate?: string;
  enactmentDate?: string;
  amendedBylaw?: string[];
  sections?: {
    sectionNumber: string;
    title?: string;
    content: string;
  }[];
}

/**
 * Verify a bylaw against the database
 */
export async function verifyBylaw(bylawNumber: string): Promise<VerifiedBylawData | null> {
  try {
    // Check if bylaw exists in database
    const bylaw = await prisma.bylaw.findUnique({
      where: { bylawNumber },
      include: { sections: true }
    });

    if (!bylaw) {
      console.warn(`Bylaw ${bylawNumber} not found in verification database`);
      return null;
    }

    // Verify PDF exists
    const pdfExists = fs.existsSync(path.join(process.cwd(), 'public', bylaw.pdfPath));
    if (!pdfExists) {
      console.warn(`PDF file for bylaw ${bylawNumber} not found at path ${bylaw.pdfPath}`);
      return null;
    }

    return {
      bylawNumber: bylaw.bylawNumber,
      title: bylaw.title,
      isConsolidated: bylaw.isConsolidated,
      pdfPath: bylaw.pdfPath,
      officialUrl: bylaw.officialUrl,
      lastVerified: bylaw.lastVerified,
      consolidatedDate: bylaw.consolidatedDate || undefined,
      enactmentDate: bylaw.enactmentDate || undefined,
      amendedBylaw: bylaw.amendments ? bylaw.amendments.split(',') : undefined,
      sections: bylaw.sections.map(section => ({
        sectionNumber: section.sectionNumber,
        title: section.title || undefined,
        content: section.content
      }))
    };
  } catch (error) {
    console.error(`Error verifying bylaw ${bylawNumber}:`, error);
    return null;
  }
}

/**
 * Add a new verified bylaw to the database
 */
export async function addVerifiedBylaw(data: VerifiedBylawData): Promise<boolean> {
  try {
    await prisma.bylaw.create({
      data: {
        bylawNumber: data.bylawNumber,
        title: data.title,
        isConsolidated: data.isConsolidated,
        pdfPath: data.pdfPath,
        officialUrl: data.officialUrl,
        lastVerified: data.lastVerified,
        consolidatedDate: data.consolidatedDate,
        enactmentDate: data.enactmentDate,
        amendments: data.amendedBylaw?.join(','),
        sections: {
          create: data.sections?.map(section => ({
            sectionNumber: section.sectionNumber,
            title: section.title || null,
            content: section.content
          })) || []
        }
      }
    });
    return true;
  } catch (error) {
    console.error(`Error adding verified bylaw ${data.bylawNumber}:`, error);
    return false;
  }
}

/**
 * Update an existing bylaw in the verification database
 */
export async function updateVerifiedBylaw(data: VerifiedBylawData): Promise<boolean> {
  try {
    // First delete existing sections
    await prisma.bylawSection.deleteMany({
      where: { bylawNumber: data.bylawNumber }
    });

    // Then update bylaw and create new sections
    await prisma.bylaw.update({
      where: { bylawNumber: data.bylawNumber },
      data: {
        title: data.title,
        isConsolidated: data.isConsolidated,
        pdfPath: data.pdfPath,
        officialUrl: data.officialUrl,
        lastVerified: data.lastVerified,
        consolidatedDate: data.consolidatedDate,
        enactmentDate: data.enactmentDate,
        amendments: data.amendedBylaw?.join(','),
        sections: {
          create: data.sections?.map(section => ({
            sectionNumber: section.sectionNumber,
            title: section.title || null,
            content: section.content
          })) || []
        }
      }
    });
    return true;
  } catch (error) {
    console.error(`Error updating verified bylaw ${data.bylawNumber}:`, error);
    return false;
  }
}

/**
 * Record user feedback about a citation
 */
export async function recordCitationFeedback(
  bylawNumber: string,
  section: string,
  feedback: 'accurate' | 'inaccurate' | 'incomplete' | 'outdated',
  userComment?: string
): Promise<boolean> {
  try {
    await prisma.citationFeedback.create({
      data: {
        bylawNumber,
        section,
        feedback,
        userComment,
        timestamp: new Date()
      }
    });
    return true;
  } catch (error) {
    console.error(`Error recording citation feedback for bylaw ${bylawNumber}:`, error);
    return false;
  }
}

/**
 * Find similar bylaws by title or content
 */
export async function findSimilarBylaws(
  term: string,
  limit: number = 5
): Promise<VerifiedBylawData[]> {
  try {
    // Search for bylaws with similar titles
    const similarBylaws = await prisma.bylaw.findMany({
      where: {
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { bylawNumber: { contains: term } }
        ]
      },
      include: { sections: true },
      take: limit
    });

    return similarBylaws.map(bylaw => ({
      bylawNumber: bylaw.bylawNumber,
      title: bylaw.title,
      isConsolidated: bylaw.isConsolidated,
      pdfPath: bylaw.pdfPath,
      officialUrl: bylaw.officialUrl,
      lastVerified: bylaw.lastVerified,
      consolidatedDate: bylaw.consolidatedDate || undefined,
      enactmentDate: bylaw.enactmentDate || undefined,
      amendedBylaw: bylaw.amendments ? bylaw.amendments.split(',') : undefined,
      sections: bylaw.sections.map(section => ({
        sectionNumber: section.sectionNumber,
        title: section.title || undefined,
        content: section.content
      }))
    }));
  } catch (error) {
    console.error(`Error finding similar bylaws for term "${term}":`, error);
    return [];
  }
}

/**
 * Get known bylaw PDF filename by bylaw number
 */
export function getFilenameForBylaw(bylawNumber: string): string | null {
  // Map of bylaw numbers to filenames
  const bylawMap: Record<string, string> = {
    '3152': '3152.pdf',
    '3210': '3210 -  Anti-Noise Bylaw - Consolidated to 4594.pdf',
    '3370': '3370, Water Rate Bylaw, 1981 (CONSOLIDATED)_2.pdf',
    '3416': '3416-Boulevard-Frontage-Tax-BL-1982-CONSOLIDATED-to-May-8-2023.pdf',
    '3531': '3531_ZoningBylawConsolidation_Aug302024.pdf',
    '3536': '3536.pdf',
    '3540': '3540, Parking Facilities BL 1986 (CONSOLIDATED)_1.pdf',
    '3545': '3545-Uplands-Bylaw-1987-(CONSOLIDATED-to-February-10-2020).pdf',
    '3550': '3550, Driveway Access BL (CONSOLIDATED).pdf',
    '3578': '3578_Subdivision-and-Development_CONSOLIDATED-to-September-2023.pdf',
    '3603': '3603, Business Licence Bylaw 1988 - CONSOLIDATED FIN.pdf',
    '3805': '3805.pdf',
    '3827': '3827, Records Administration BL 94 (CONSOLIDATED 2).pdf',
    '3829': '3829.pdf',
    '3832': '3832.pdf',
    '3891': '3891-Public-Sewer-Bylaw,-1996-CONSOLIDATED.pdf',
    '3938': '3938.pdf',
    '3946': '3946 Sign Bylaw 1997 (CONSOLIDATED) to Sept 11 2023_0.pdf',
    '3952': '3952, Ticket Information Utilization BL 97 (CONSOLIDATED)_2.pdf',
    '4008': '4008.pdf',
    '4013': '4013, Animal Control Bylaw, 1999 (CONSOLIDATED)_1.pdf',
    '4100': '4100-Streets-Traffic-Bylaw-2000.pdf',
    '4144': '4144, Oil Burning Equipment and Fuel Tank Regulation Bylaw, 2002.pdf',
    '4183': '4183_Board-of-Variance-Bylaw_CONSOLIDATED-to-Sept11-2023.pdf',
    '4222': '4222.pdf',
    '4239': '4239, Administrative Procedures Bylaw, 2004, (CONSOLIDATED).pdf',
    '4247': '4247 Building and Plumbing Bylaw 2005 Consolidated to September 11 2023_0.pdf',
    '4284': '4284, Elections and Voting (CONSOLIDATED).pdf',
    '4371': '4371-Refuse-Collection-and-Disposal-Bylaw-2007-(CONSOLIDATED).pdf',
    '4375': '4375.pdf',
    '4392': '4392, Sewer User Charge Bylaw 2008 (CONSOLIDATED).pdf',
    '4421': '4421.pdf',
    '4518': '4518.pdf',
    '4620': '4620, Oak Bay Official Community Plan Bylaw, 2014.pdf',
    '4671': '4671, Sign Bylaw Amendment Bylaw No. 4671, 2017.pdf',
    '4672': '4672-Parks-and-Beaches-Bylaw-2017-CONSOLIDATED.pdf',
    '4719': '4719, Fire Prevention and Life Safety Bylaw, 2018.pdf',
    '4720': '4720.pdf',
    '4740': '4740 Council Procedure Bylaw CONSOLIDATED 4740.003.pdf',
    '4742': '4742-Tree-Protection-Bylaw-2020-CONSOLIDATED.pdf',
    '4747': '4747, Reserve Funds Bylaw, 2020 CONSOLIDATED.pdf',
    '4770': '4770 Heritage Commission Bylaw CONSOLIDATED 4770.001.pdf',
    '4771': '4771 Advisory Planning Commission Bylaw CONSOLIDATED 4771.001.pdf',
    '4772': '4772 Advisory Planning Commission Bylaw CONSOLIDATED 4772.001.pdf',
    '4777': '4777 PRC Fees and Charges Bylaw CONSOLIDATED.pdf',
    '4822': '4822 Council Remuneration Bylaw - DRAFT.pdf',
    '4844': '4844-Consolidated-up to-4858.pdf',
    '4845': '4845-Planning-and-Development-Fees-and-Charges-CONSOLIDATED.pdf',
    '4849': '4849-Property-Tax-Exemption-Bylaw-No-4849-2023.pdf',
    '4861': 'Tax Rates Bylaw 2024, No. 4861.pdf',
    '4866': 'Boulevard Frontage Tax Amendment Bylaw No. 4866, 2024.pdf',
    '4879': '4879, Oak Bay Business Improvement Area Bylaw, 2024.pdf',
    '4891': 'Development Cost Charge Bylaw No. 4891, 2024.pdf',
    '4892': 'Amenity Cost Charge Bylaw No. 4892, 2024.pdf',
  };
  
  return bylawMap[bylawNumber] || null;
}

/**
 * Get the page number for a specific section in a bylaw
 * This would need to be populated from PDF analysis
 */
export function getSectionPage(bylawNumber: string, section: string): number {
  // This would come from a database in production
  // For now, return 1 as a default
  return 1;
}

/**
 * Initialize the verification database with known bylaws
 */
export async function initializeVerificationDatabase(): Promise<void> {
  try {
    // Get all PDF files in the public/pdfs directory
    const pdfDir = path.join(process.cwd(), 'public', 'pdfs');
    const files = fs.readdirSync(pdfDir);
    
    // Initialize count of processed bylaws
    let processed = 0;
    
    // Process each PDF file
    for (const file of files) {
      // Skip non-PDF files
      if (!file.toLowerCase().endsWith('.pdf')) continue;
      
      // Extract bylaw number from filename
      const bylawNumberMatch = file.match(/^(?:bylaw[-\s])?(\d{4})|^(\d{4})[-,\s]/i);
      if (!bylawNumberMatch) continue;
      
      const bylawNumber = bylawNumberMatch[1] || bylawNumberMatch[2];
      
      // Check if bylaw already exists in database
      const existing = await prisma.bylaw.findUnique({ where: { bylawNumber } });
      if (existing) continue;
      
      // Extract consolidated status
      const isConsolidated = /consolidated|consolidation/i.test(file);
      
      // Extract title
      let title = file.replace(/\.pdf$/i, '');
      title = title.replace(/^(\d{4})[-,\s]+/, ''); // Remove bylaw number prefix
      
      // Create a new bylaw entry
      await prisma.bylaw.create({
        data: {
          bylawNumber,
          title,
          isConsolidated,
          pdfPath: `/pdfs/${file}`,
          officialUrl: `https://oakbay.civicweb.net/document/bylaw/${bylawNumber}`,
          lastVerified: new Date()
        }
      });
      
      processed++;
    }
    
    console.log(`Initialized verification database with ${processed} bylaws`);
  } catch (error) {
    console.error('Error initializing verification database:', error);
  }
}