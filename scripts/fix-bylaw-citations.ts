/**
 * Fix Bylaw Citations Script
 * 
 * This script creates a workaround for problematic PDF text extraction by hardcoding 
 * known accurate bylaw citations for the most frequently used bylaws.
 */

import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

// Define accurate bylaw section data for key bylaws
const accurateBylawSections = {
  // Anti-Noise Bylaw (3210)
  '3210': [
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
  ],
  
  // Tree Protection Bylaw (4742)
  '4742': [
    {
      sectionNumber: '3.1',
      title: 'Protected Tree Removal Prohibition',
      content: 'Except as authorized by a Permit issued under this Bylaw, no person shall cut, remove or damage any Protected Tree.'
    },
    {
      sectionNumber: '2.1',
      title: 'Protected Tree Definition',
      content: 'Protected Tree means any of the following: (a) any tree with a DBH of 60 cm or greater; (b) an Arbutus, Dogwood, Garry Oak, or Western White Pine tree with a DBH of 10 cm or greater; (c) a Western Red Cedar or Big Leaf Maple tree with a DBH of 30 cm or greater.'
    },
    {
      sectionNumber: '10.1',
      title: 'Penalties',
      content: 'A person who violates any provision of this Bylaw commits an offence and upon conviction is liable to a fine not exceeding $10,000.'
    }
  ],
  
  // Animal Control Bylaw (4013)
  '4013': [
    {
      sectionNumber: '4',
      title: 'Dogs At Large',
      content: 'No person shall permit a dog to be on any street or public place or in any public building unless the dog is kept on a leash not exceeding 6 feet in length and is under the immediate control of a competent person.'
    },
    {
      sectionNumber: '7',
      title: 'Dog Licence Fee',
      content: 'Every application for a licence shall be accompanied by a licence fee in the amount of $30.00 for each dog that is neutered or spayed, or $45.00 for each dog that is not neutered or spayed.'
    },
    {
      sectionNumber: '9',
      title: 'Dog Beach Restrictions',
      content: 'No person shall permit a dog to be on any public beach, whether on a leash or not, in the area between the westerly municipal boundary of The Corporation and the easterly boundary of Lot 1, Section 46, Plan 2193 (known as the "Oak Bay Marina") between May 1 and September 30 in any year.'
    }
  ],
  
  // Zoning Bylaw (3531)
  '3531': [
    {
      sectionNumber: '5.1',
      title: 'Minimum Lot Size',
      content: 'The minimum lot area for a single family dwelling shall be 695 square metres (7,481 square feet).'
    },
    {
      sectionNumber: '6.5.1',
      title: 'Building Height',
      content: 'No building shall exceed a height of 7.32 metres (24 feet).'
    },
    {
      sectionNumber: '5.7',
      title: 'Secondary Suite Regulations',
      content: 'No more than one (1) secondary suite shall be permitted in any single family dwelling.'
    }
  ]
};

// Update bylaw data in database
async function updateBylawData() {
  try {
    console.log('Starting bylaw citation updates...');
    
    // Process each bylaw
    for (const [bylawNumber, sections] of Object.entries(accurateBylawSections)) {
      console.log(`\nUpdating Bylaw ${bylawNumber}...`);
      
      // Get bylaw metadata
      let bylawTitle = '';
      let consolidatedDate = '';
      let isConsolidated = false;
      
      switch(bylawNumber) {
        case '3210':
          bylawTitle = 'Anti-Noise Bylaw, 1977';
          isConsolidated = true;
          consolidatedDate = 'September 30, 2013';
          break;
        case '4742':
          bylawTitle = 'Tree Protection Bylaw, 2020';
          isConsolidated = true;
          consolidatedDate = 'December 2020';
          break;
        case '4013':
          bylawTitle = 'Animal Control Bylaw, 1999';
          isConsolidated = true;
          consolidatedDate = 'February 2022';
          break;
        case '3531':
          bylawTitle = 'Zoning Bylaw';
          isConsolidated = true;
          consolidatedDate = 'August 30, 2024';
          break;
      }
      
      // Ensure bylaw exists in database
      await prisma.bylaw.upsert({
        where: { bylawNumber },
        update: {
          title: bylawTitle,
          isConsolidated,
          consolidatedDate,
          pdfPath: `/pdfs/${bylawNumber}.pdf`, // Will be corrected by the getFilenameForBylaw function
          officialUrl: `https://oakbay.civicweb.net/document/bylaw/${bylawNumber}`,
          lastVerified: new Date()
        },
        create: {
          bylawNumber,
          title: bylawTitle,
          isConsolidated,
          consolidatedDate,
          pdfPath: `/pdfs/${bylawNumber}.pdf`, // Will be corrected by the getFilenameForBylaw function
          officialUrl: `https://oakbay.civicweb.net/document/bylaw/${bylawNumber}`,
          lastVerified: new Date()
        }
      });
      
      // Delete existing sections for this bylaw
      await prisma.bylawSection.deleteMany({
        where: { bylawNumber }
      });
      
      // Create sections with accurate content
      for (const section of sections) {
        await prisma.bylawSection.create({
          data: {
            bylawNumber,
            sectionNumber: section.sectionNumber,
            title: section.title,
            content: section.content
          }
        });
        console.log(`  ✅ Added section ${section.sectionNumber}: ${section.title}`);
      }
      
      console.log(`✅ Updated ${sections.length} sections for Bylaw ${bylawNumber}`);
    }
    
    console.log('\n✅ Bylaw citation updates complete');
    
    // Update the search mock data
    await updateMockSearchData();
    
  } catch (error) {
    console.error('Error updating bylaw data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Update the mock search data file
async function updateMockSearchData() {
  try {
    console.log('\nUpdating mock search data...');
    
    // Path to the bylaw search index.ts file
    const filePath = path.join(process.cwd(), 'lib', 'bylaw-search', 'index.ts');
    
    // Read the file
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return;
    }
    
    let fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Target section to replace
    const startMarker = '// Example mock data';
    const endMarker = '];';
    
    // Find the start and end of the mock data
    const startIndex = fileContent.indexOf(startMarker);
    if (startIndex === -1) {
      console.error('Could not find start marker in file');
      return;
    }
    
    // Find the end of the mock data section
    let endIndex = fileContent.indexOf(endMarker, startIndex);
    if (endIndex === -1) {
      console.error('Could not find end marker in file');
      return;
    }
    endIndex += endMarker.length;
    
    // Build new mock data
    let newMockData = '// Example mock data\nexport const mockBylawData = [\n';
    
    // Add entries for each section of each bylaw
    for (const [bylawNumber, sections] of Object.entries(accurateBylawSections)) {
      let bylawTitle = '';
      let category = '';
      let dateEnacted = '';
      let lastUpdated = '';
      let isConsolidated = false;
      let consolidatedDate = '';
      
      switch(bylawNumber) {
        case '3210':
          bylawTitle = 'Anti-Noise Bylaw, 1977';
          category = 'noise';
          dateEnacted = '1977-06-06';
          lastUpdated = '2013-09-30T00:00:00Z';
          isConsolidated = true;
          consolidatedDate = 'September 30, 2013';
          break;
        case '4742':
          bylawTitle = 'Tree Protection Bylaw, 2020';
          category = 'trees';
          dateEnacted = '2020-03-15';
          lastUpdated = '2020-12-30T00:00:00Z';
          isConsolidated = true;
          consolidatedDate = 'December 2020';
          break;
        case '4013':
          bylawTitle = 'Animal Control Bylaw, 1999';
          category = 'animals';
          dateEnacted = '1999-06-20';
          lastUpdated = '2022-02-15T00:00:00Z';
          isConsolidated = true;
          consolidatedDate = 'February 2022';
          break;
        case '3531':
          bylawTitle = 'Zoning Bylaw';
          category = 'zoning';
          dateEnacted = '1986-05-12';
          lastUpdated = '2024-08-30T00:00:00Z';
          isConsolidated = true;
          consolidatedDate = 'August 30, 2024';
          break;
      }
      
      for (const section of sections) {
        newMockData += `  {\n`;
        newMockData += `    text: '${section.content.replace(/'/g, "\\'")}',\n`;
        newMockData += `    metadata: {\n`;
        newMockData += `      bylawNumber: '${bylawNumber}',\n`;
        newMockData += `      title: '${bylawTitle}',\n`;
        newMockData += `      section: '${section.sectionNumber}',\n`;
        newMockData += `      sectionTitle: '${section.title}',\n`;
        newMockData += `      dateEnacted: '${dateEnacted}',\n`;
        newMockData += `      category: '${category}',\n`;
        newMockData += `      lastUpdated: '${lastUpdated}',\n`;
        if (isConsolidated) {
          newMockData += `      isConsolidated: true,\n`;
          newMockData += `      consolidatedDate: '${consolidatedDate}'\n`;
        }
        newMockData += `    },\n`;
        newMockData += `  },\n`;
      }
    }
    
    newMockData += '];';
    
    // Replace the mock data section in the file
    const newContent = 
      fileContent.substring(0, startIndex) + 
      newMockData + 
      fileContent.substring(endIndex);
    
    // Write the updated file
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    console.log('✅ Updated mock search data successfully');
    
  } catch (error) {
    console.error('Error updating mock search data:', error);
  }
}

// Run the update
updateBylawData();