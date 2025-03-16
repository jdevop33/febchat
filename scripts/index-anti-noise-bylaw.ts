/**
 * This script specifically extracts and indexes the Anti-Noise Bylaw (No. 3210)
 * to ensure accurate content is available for bylaw citations
 */

import fs from 'node:fs';
import path from 'node:path';
import pdfParse from 'pdf-parse';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting Anti-Noise Bylaw indexing...');
    
    // Define the specific bylaw details
    const bylawNumber = '3210';
    const bylawTitle = 'Anti-Noise Bylaw, 1977';
    const pdfPath = path.join(process.cwd(), 'public', 'pdfs', '3210 -  Anti-Noise Bylaw - Consolidated to 4594.pdf');
    
    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      console.error(`PDF file not found at ${pdfPath}`);
      return;
    }
    
    // Extract PDF content
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(pdfBuffer);
    const pdfText = pdfData.text;
    
    // Create or update the bylaw record
    await prisma.bylaw.upsert({
      where: { bylawNumber },
      update: {
        title: bylawTitle,
        isConsolidated: true,
        consolidatedDate: 'September 30, 2013',
        pdfPath: `/pdfs/3210 -  Anti-Noise Bylaw - Consolidated to 4594.pdf`,
        officialUrl: `https://oakbay.civicweb.net/document/bylaw/3210`,
        lastVerified: new Date(),
        amendments: '3332,3937,4198,4594'
      },
      create: {
        bylawNumber,
        title: bylawTitle,
        isConsolidated: true,
        consolidatedDate: 'September 30, 2013',
        pdfPath: `/pdfs/3210 -  Anti-Noise Bylaw - Consolidated to 4594.pdf`,
        officialUrl: `https://oakbay.civicweb.net/document/bylaw/3210`,
        lastVerified: new Date(),
        amendments: '3332,3937,4198,4594'
      }
    });
    
    // Delete existing sections for this bylaw
    await prisma.bylawSection.deleteMany({
      where: { bylawNumber }
    });
    
    // Create accurate sections with exact text from the bylaw
    const sections = [
      {
        sectionNumber: '3(1)',
        title: 'General Noise Prohibition',
        content: 'No person shall make or cause to be made any noise or sound within the geographical limits of The Corporation of the District of Oak Bay which is liable to disturb the quiet, peace, rest, enjoyment, comfort or convenience of individuals or the public.'
      },
      {
        sectionNumber: '3(2)',
        title: 'Property Owner Responsibility',
        content: 'No owner, tenant or occupier of real property within the geographical limits of The Corporation of the District of Oak Bay shall allow that property to be used so that a noise or sound which originates from that property disturbs or tends to disturb the quiet, peace, rest, enjoyment, comfort or convenience of individuals or the public.'
      },
      {
        sectionNumber: '4(5)(a)',
        title: 'Leaf Blower Restrictions - Weekends and Holidays',
        content: 'On Saturday, Sunday or a holiday, the operation of a leaf blower at a time outside the hours of 9:00 a.m. to 5:00 p.m. is prohibited.'
      },
      {
        sectionNumber: '4(5)(b)',
        title: 'Leaf Blower Restrictions - Weekdays',
        content: 'From Monday through Friday, excluding holidays, the operation of a leaf blower at a time outside the hours of 8:00 a.m. to 8:00 p.m. is prohibited.'
      },
      {
        sectionNumber: '5(7)(a)',
        title: 'Construction Hours - Regular Permits',
        content: 'The erection, demolition, construction, reconstruction, alteration or repair of any building or other structure is permitted between the hours of 7:00 a.m. and 7:00 p.m. on each day except Sunday if such work is authorized by a permit which is not a renewal permit, as defined in the Building and Plumbing Bylaw, 2005.'
      },
      {
        sectionNumber: '5(7)(b)',
        title: 'Construction Hours - Renewal Permits',
        content: 'The erection, demolition, construction, reconstruction, alteration or repair of any building or other structure is permitted between the hours of 9:00 a.m. and 5:00 p.m. on each day except Sunday if such work is authorized pursuant to a renewal permit, as defined in the Building and Plumbing Bylaw, 2005.'
      },
      {
        sectionNumber: '7',
        title: 'Penalties',
        content: 'Any person who violates any provision of this Bylaw is guilty of an offence and liable upon summary conviction to a fine of not more than One Thousand Dollars ($1,000.00). For the purpose of this clause an offence shall be deemed committed upon each day during or on which a violation occurs or continues.'
      }
    ];
    
    // Create the sections in the database
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
    
    console.log(`Successfully indexed Anti-Noise Bylaw with ${sections.length} sections`);
    
  } catch (error) {
    console.error('Error indexing Anti-Noise Bylaw:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();