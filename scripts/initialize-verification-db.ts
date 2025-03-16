/**
 * Initialize Verification Database
 * 
 * This script initializes the verification database by scanning
 * the PDF directory and creating bylaw entries.
 * 
 * Usage:
 * pnpm tsx scripts/initialize-verification-db.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import pdfParse from 'pdf-parse';
import { initializeVerificationDatabase } from '../lib/vector-search/verification-database';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Prisma client
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Initializing verification database...');
    
    // First, run the automatic initialization
    await initializeVerificationDatabase();
    
    // Get PDF directory
    const pdfDir = path.join(process.cwd(), 'public', 'pdfs');
    
    // Process a specific bylaw in more detail for testing
    await processSpecificBylaw('3210', pdfDir);
    
    console.log('Verification database initialized successfully');
    
    // Optional: Print verification database stats
    const bylawCount = await prisma.bylaw.count();
    const sectionCount = await prisma.bylawSection.count();
    
    console.log(`Database stats:`);
    console.log(`- ${bylawCount} bylaws`);
    console.log(`- ${sectionCount} bylaw sections`);
    
  } catch (error) {
    console.error('Initialization failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Process a specific bylaw in detail, extracting sections
 */
async function processSpecificBylaw(bylawNumber: string, pdfDir: string) {
  try {
    console.log(`Processing bylaw ${bylawNumber} in detail...`);
    
    // Find the bylaw file
    const files = fs.readdirSync(pdfDir);
    const bylawFile = files.find(file => file.includes(bylawNumber));
    
    if (!bylawFile) {
      console.log(`Bylaw ${bylawNumber} not found in PDF directory`);
      return;
    }
    
    console.log(`Found bylaw file: ${bylawFile}`);
    
    // Extract consolidated status
    const isConsolidated = /consolidated|consolidation/i.test(bylawFile);
    
    // Extract title
    let title = bylawFile.replace(/\.pdf$/i, '');
    title = title.replace(/^(\d{4})[-,\s]+/, ''); // Remove bylaw number prefix
    
    // Load PDF content
    const filePath = path.join(pdfDir, bylawFile);
    const pdfBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(pdfBuffer);
    const pdfText = pdfData.text;
    
    // Create or update bylaw in database
    const bylaw = await prisma.bylaw.upsert({
      where: { bylawNumber },
      update: {
        title,
        isConsolidated,
        pdfPath: `/pdfs/${bylawFile}`,
        officialUrl: `https://oakbay.civicweb.net/document/bylaw/${bylawNumber}`,
        lastVerified: new Date()
      },
      create: {
        bylawNumber,
        title,
        isConsolidated,
        pdfPath: `/pdfs/${bylawFile}`,
        officialUrl: `https://oakbay.civicweb.net/document/bylaw/${bylawNumber}`,
        lastVerified: new Date()
      }
    });
    
    // Extract sections using regex patterns
    const sections: { sectionNumber: string; title?: string; content: string }[] = [];
    
    // Extract general noise prohibition (Section 3)
    const section3Match = pdfText.match(/3\s+\(1\)[^\n]*(?:\n[^\n]+)*?(?=\(2\)|\n\s*4\s+)/s);
    if (section3Match) {
      sections.push({
        sectionNumber: '3',
        title: 'General Noise Prohibition',
        content: section3Match[0].trim()
      });
    }
    
    // Extract specific prohibitions (Section 4)
    const section4Match = pdfText.match(/4\s+No person shall[^\n]*(?:\n[^\n]+)*?(?=\n\s*5\s+The provisions)/s);
    if (section4Match) {
      sections.push({
        sectionNumber: '4',
        title: 'Specific Prohibitions',
        content: section4Match[0].trim()
      });
    }
    
    // Extract exemptions (Section 5)
    const section5Match = pdfText.match(/5\s+The provisions of this Bylaw shall not apply[^6]+/s);
    if (section5Match) {
      sections.push({
        sectionNumber: '5',
        title: 'Exemptions',
        content: section5Match[0].trim()
      });
    }
    
    // Find construction noise provisions
    // Match section 4(7)
    const constructionMatch = pdfText.match(/\(7\)[^\(]*?(?:construction|demolition|erection)[^(]*/i);
    if (constructionMatch) {
      sections.push({
        sectionNumber: '4(7)',
        title: 'Construction Noise',
        content: constructionMatch[0].trim()
      });
    }
    
    // Find leaf blower provisions
    // Match leaf blower definition
    const leafBlowerDefMatch = pdfText.match(/"LEAF BLOWER"[^;]*;/i);
    if (leafBlowerDefMatch) {
      sections.push({
        sectionNumber: '2(b)',
        title: 'Leaf Blower Definition',
        content: leafBlowerDefMatch[0].trim()
      });
    }
    
    // Match leaf blower restrictions
    const leafBlowerRegMatch = pdfText.match(/\([0-9]\)[^\(]*?leaf blower[^(]*/i);
    if (leafBlowerRegMatch) {
      sections.push({
        sectionNumber: '4(5)',
        title: 'Leaf Blower Restrictions',
        content: leafBlowerRegMatch[0].trim()
      });
    }
    
    // First delete any existing sections
    await prisma.bylawSection.deleteMany({
      where: { bylawNumber }
    });
    
    // Create new sections
    for (const section of sections) {
      await prisma.bylawSection.create({
        data: {
          bylawNumber,
          sectionNumber: section.sectionNumber,
          title: section.title,
          content: section.content
        }
      });
    }
    
    console.log(`Processed ${sections.length} sections for bylaw ${bylawNumber}`);
    
  } catch (error) {
    console.error(`Error processing bylaw ${bylawNumber}:`, error);
  }
}

// Run initialization
main();