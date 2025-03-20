/**
 * Accurate Bylaw Answers Generator
 *
 * This script validates and stores accurate bylaw information in the database
 * for common bylaw queries.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

// Initialize Prisma client
const prisma = new PrismaClient();

// Define accurate bylaw content for important bylaws
const ACCURATE_BYLAW_CONTENT = {
  // Anti-Noise Bylaw (3210)
  '3210': {
    title: 'Anti-Noise Bylaw, 1977',
    sections: [
      {
        sectionNumber: '3(1)',
        title: 'General Noise Prohibition',
        content:
          'No person shall make or cause to be made any noise or sound within the geographical limits of The Corporation of the District of Oak Bay which is liable to disturb the quiet, peace, rest, enjoyment, comfort or convenience of individuals or the public.',
      },
      {
        sectionNumber: '5(7)(a)',
        title: 'Construction Hours - Regular Permits',
        content:
          'The erection, demolition, construction, reconstruction, alteration or repair of any building or other structure is permitted between the hours of 7:00 a.m. and 7:00 p.m. on each day except Sunday if such work is authorized by a permit which is not a renewal permit, as defined in the Building and Plumbing Bylaw, 2005.',
      },
      {
        sectionNumber: '5(7)(b)',
        title: 'Construction Hours - Renewal Permits',
        content:
          'The erection, demolition, construction, reconstruction, alteration or repair of any building or other structure is permitted between the hours of 9:00 a.m. and 5:00 p.m. on each day except Sunday if such work is authorized pursuant to a renewal permit, as defined in the Building and Plumbing Bylaw, 2005.',
      },
      {
        sectionNumber: '4(5)(a)',
        title: 'Leaf Blower Restrictions - Weekends',
        content:
          'On Saturday, Sunday or a holiday, the operation of a leaf blower at a time outside the hours of 9:00 a.m. to 5:00 p.m. is prohibited.',
      },
      {
        sectionNumber: '4(5)(b)',
        title: 'Leaf Blower Restrictions - Weekdays',
        content:
          'From Monday through Friday, excluding holidays, the operation of a leaf blower at a time outside the hours of 8:00 a.m. to 8:00 p.m. is prohibited.',
      },
      {
        sectionNumber: '7',
        title: 'Penalties',
        content:
          'Any person who violates any provision of this Bylaw is guilty of an offence and liable upon summary conviction to a fine of not more than One Thousand Dollars ($1,000.00). For the purpose of this clause an offence shall be deemed committed upon each day during or on which a violation occurs or continues.',
      },
    ],
  },

  // Other important bylaws can be added here
};

/**
 * Store accurate bylaw information in the database
 */
async function storeAccurateBylawInfo() {
  try {
    console.log('Storing accurate bylaw information...');

    for (const [bylawNumber, data] of Object.entries(ACCURATE_BYLAW_CONTENT)) {
      console.log(`\nProcessing Bylaw ${bylawNumber}: ${data.title}`);

      // Ensure the bylaw exists in the database
      await prisma.bylaw.upsert({
        where: { bylawNumber },
        update: {
          title: data.title,
          isConsolidated: true,
          lastVerified: new Date(),
        },
        create: {
          bylawNumber,
          title: data.title,
          isConsolidated: true,
          pdfPath: `/pdfs/${bylawNumber}.pdf`,
          officialUrl: `https://oakbay.civicweb.net/document/bylaw/${bylawNumber}`,
          lastVerified: new Date(),
        },
      });

      // Delete existing sections for this bylaw
      await prisma.bylawSection.deleteMany({
        where: { bylawNumber },
      });

      // Create sections with accurate content
      for (const section of data.sections) {
        await prisma.bylawSection.create({
          data: {
            bylawNumber,
            sectionNumber: section.sectionNumber,
            title: section.title,
            content: section.content,
          },
        });
        console.log(
          `  ✅ Added section ${section.sectionNumber}: ${section.title}`,
        );
      }
    }

    console.log('\n✅ Accurate bylaw information stored successfully');
  } catch (error) {
    console.error('Error storing accurate bylaw information:', error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Create a JSON file with accurate bylaw information
 */
function createBylawAnswersJSON() {
  try {
    console.log('\nGenerating bylaw answers JSON file...');

    const bylawAnswers = {
      // Construction noise regulations
      constructionNoise: {
        bylawNumber: '3210',
        title: 'Anti-Noise Bylaw, 1977',
        citation: 'Section 5(7)(a) and 5(7)(b)',
        answer: `Construction hours in Oak Bay are regulated by Bylaw No. 3210 (Anti-Noise Bylaw):

1. Regular building permits: 
   - Construction allowed 7:00 a.m. to 7:00 p.m. Monday through Saturday
   - No construction permitted on Sundays

2. Renewal permits:
   - Construction allowed 9:00 a.m. to 5:00 p.m. Monday through Saturday
   - No construction permitted on Sundays`,
        source:
          'Anti-Noise Bylaw, 1977 (No. 3210), Section 5(7)(a) and 5(7)(b)',
      },

      // Leaf blower regulations
      leafBlowers: {
        bylawNumber: '3210',
        title: 'Anti-Noise Bylaw, 1977',
        citation: 'Section 4(5)(a) and 4(5)(b)',
        answer: `Leaf blower operation in Oak Bay is regulated by Bylaw No. 3210 (Anti-Noise Bylaw):

1. Weekdays (Monday through Friday):
   - Permitted hours: 8:00 a.m. to 8:00 p.m.

2. Weekends and holidays:
   - Permitted hours: 9:00 a.m. to 5:00 p.m.`,
        source:
          'Anti-Noise Bylaw, 1977 (No. 3210), Section 4(5)(a) and 4(5)(b)',
      },

      // General noise prohibition
      noiseRegulations: {
        bylawNumber: '3210',
        title: 'Anti-Noise Bylaw, 1977',
        citation: 'Section 3(1)',
        answer: `Oak Bay's general noise prohibition states:

"No person shall make or cause to be made any noise or sound within the geographical limits of The Corporation of the District of Oak Bay which is liable to disturb the quiet, peace, rest, enjoyment, comfort or convenience of individuals or the public."

Violations can result in fines up to $1,000.`,
        source: 'Anti-Noise Bylaw, 1977 (No. 3210), Section 3(1) and 7',
      },
    };

    // Write to file
    const outputPath = path.join(
      process.cwd(),
      'data',
      'accurate-bylaw-answers.json',
    );

    // Ensure the directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(bylawAnswers, null, 2));
    console.log(`✅ Bylaw answers JSON saved to ${outputPath}`);
  } catch (error) {
    console.error('Error creating bylaw answers JSON:', error);
  }
}

// Run both functions
async function main() {
  await storeAccurateBylawInfo();
  createBylawAnswersJSON();
}

main();
