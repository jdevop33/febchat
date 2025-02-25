import { z } from 'zod';

// Define our mock bylaw data for demo purposes
// In production, this would connect to your vector database
const mockBylawData = [
  {
    bylawNumber: '4360',
    title: 'Zoning Bylaw',
    sections: [
      {
        section: '4.1',
        content: 'No person shall use land or buildings for any purpose except as specifically permitted in this Bylaw.',
      },
      {
        section: '5.2',
        content: 'The minimum lot size for single family residential development shall be 695 square meters.',
      },
      {
        section: '6.3.4',
        content: 'Secondary suites are permitted within single family dwellings, subject to the regulations in this section.',
      }
    ]
  },
  {
    bylawNumber: '4620',
    title: 'Tree Protection Bylaw',
    sections: [
      {
        section: '3.1',
        content: 'No person shall cut, remove or damage any protected tree without first obtaining a tree cutting permit.',
      },
      {
        section: '4.2',
        content: 'A protected tree means any tree with a diameter of 30 centimeters or more, measured at 1.4 meters above ground level.',
      },
      {
        section: '7.3',
        content: 'Any person who contravenes this bylaw commits an offense and shall be liable to a fine not exceeding $10,000.',
      }
    ]
  },
  {
    bylawNumber: '4733',
    title: 'Animal Control Bylaw',
    sections: [
      {
        section: '2.1',
        content: 'Every owner of a dog must ensure that the dog is not running at large within the Municipality.',
      },
      {
        section: '3.5',
        content: 'Dogs are not permitted on any beach between May 1 and September 30, except in designated areas.',
      },
      {
        section: '6.2',
        content: 'The annual license fee for each neutered male dog or spayed female dog shall be $30.00.',
      }
    ]
  }
];

// This simulates a vector search against our mock data
// In production, this would connect to your actual vector database
async function searchBylaws(query: string) {
  // Here we're just doing a basic keyword search for demo purposes
  const results: Array<{
    bylawNumber: string;
    title: string;
    section: string;
    content: string;
    relevance: number;
  }> = [];
  
  const keywords = query.toLowerCase().split(' ');
  
  mockBylawData.forEach(bylaw => {
    bylaw.sections.forEach(section => {
      const content = section.content.toLowerCase();
      
      // Calculate a simple relevance score based on keyword matches
      let relevance = 0;
      keywords.forEach(keyword => {
        if (content.includes(keyword)) {
          relevance += 1;
        }
        if (bylaw.title.toLowerCase().includes(keyword)) {
          relevance += 0.5;
        }
      });
      
      if (relevance > 0) {
        results.push({
          bylawNumber: bylaw.bylawNumber,
          title: bylaw.title,
          section: section.section,
          content: section.content,
          relevance: relevance
        });
      }
    });
  });
  
  // Sort by relevance score
  results.sort((a, b) => b.relevance - a.relevance);
  
  // Return top 3 results
  return results.slice(0, 3);
}

export const searchBylawsSchema = z.object({
  query: z.string().describe('The search query for bylaws information'),
});

export async function searchBylawsTool(query: string) {
  // In production, this would query your vector database
  const results = await searchBylaws(query);
  
  if (results.length === 0) {
    return {
      found: false,
      message: "No relevant bylaws found. Please try a different search or contact Oak Bay Municipal Hall for assistance."
    };
  }
  
  return {
    found: true,
    results: results.map(result => ({
      bylawNumber: result.bylawNumber,
      title: result.title,
      section: result.section,
      content: result.content
    }))
  };
}