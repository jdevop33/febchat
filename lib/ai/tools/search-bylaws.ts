import { tool } from 'ai';
import { z } from 'zod';
import { searchBylaws } from '@/lib/vector/search';

// Import utility function from centralized location
import { getExternalPdfUrl } from '@/lib/utils/bylaw-utils';

export const searchBylawsTool = tool({
  description:
    'Search for relevant Oak Bay bylaws and regulations based on a query. Note that for common bylaw questions, the bylawAnswersTool may provide more accurate information.',
  parameters: z.object({
    query: z.string().describe('The search query for bylaws information'),
    category: z
      .string()
      .optional()
      .describe(
        'Optional bylaw category to filter by (e.g., "zoning", "trees", "noise")',
      ),
    bylawNumber: z
      .string()
      .optional()
      .describe('Optional specific bylaw number to search within'),
  }),
  execute: async ({ query, category, bylawNumber }) => {
    const filter: Record<string, string> = {};

    // Apply optional filters
    if (category) filter.category = category;
    if (bylawNumber) filter.bylawNumber = bylawNumber;

    try {
      console.log(
        `Searching bylaws with query: "${query}"${category ? `, category: "${category}"` : ''}${bylawNumber ? `, bylawNumber: "${bylawNumber}"` : ''}`,
      );

      // Search for relevant bylaws
      const results = await searchBylaws(query, filter);

      console.log(`Bylaw search found ${results.length} results`);

      if (results.length === 0) {
        console.log('No relevant bylaws found');
        return {
          found: false,
          message:
            'No relevant bylaws found. Please try a different search or contact Oak Bay Municipal Hall for assistance.',
        };
      }

      // Format results for Claude
      const formattedResults = results.map((result) => {
        // Special handling for Anti-Noise Bylaw to ensure accuracy
        if (result.metadata.bylawNumber === '3210') {
          const antinoiseBylawInfo = {
            bylawNumber: '3210',
            title: 'Anti-Noise Bylaw, 1977',
            section: result.metadata.section || 'Unknown Section',
            sectionTitle: result.metadata.sectionTitle,
            // Use the exact text from the bylaw for the extracted section
            content: result.text,
            url: 'https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/3210.pdf',
            isConsolidated: true,
            consolidatedDate: 'September 30, 2013',
          };

          // For specific sections related to construction, ensure accuracy
          if (
            result.metadata.section === '5(7)(a)' ||
            result.metadata.section?.includes('construction')
          ) {
            antinoiseBylawInfo.sectionTitle =
              'Construction Hours - Regular Permits';
            antinoiseBylawInfo.content =
              'The erection, demolition, construction, reconstruction, alteration or repair of any building or other structure is permitted between the hours of 7:00 a.m. and 7:00 p.m. on each day except Sunday if such work is authorized by a permit which is not a renewal permit, as defined in the Building and Plumbing Bylaw, 2005.';
          } else if (result.metadata.section === '5(7)(b)') {
            antinoiseBylawInfo.sectionTitle =
              'Construction Hours - Renewal Permits';
            antinoiseBylawInfo.content =
              'The erection, demolition, construction, reconstruction, alteration or repair of any building or other structure is permitted between the hours of 9:00 a.m. and 5:00 p.m. on each day except Sunday if such work is authorized pursuant to a renewal permit, as defined in the Building and Plumbing Bylaw, 2005.';
          } else if (
            result.metadata.section === '4(5)(a)' ||
            (result.metadata.section?.includes('leaf blower') &&
              result.metadata.section?.includes('weekend'))
          ) {
            antinoiseBylawInfo.sectionTitle =
              'Leaf Blower Restrictions - Weekends and Holidays';
            antinoiseBylawInfo.content =
              'On Saturday, Sunday or a holiday, the operation of a leaf blower at a time outside the hours of 9:00 a.m. to 5:00 p.m. is prohibited.';
          } else if (
            result.metadata.section === '4(5)(b)' ||
            (result.metadata.section?.includes('leaf blower') &&
              result.metadata.section?.includes('weekday'))
          ) {
            antinoiseBylawInfo.sectionTitle =
              'Leaf Blower Restrictions - Weekdays';
            antinoiseBylawInfo.content =
              'From Monday through Friday, excluding holidays, the operation of a leaf blower at a time outside the hours of 8:00 a.m. to 8:00 p.m. is prohibited.';
          } else if (
            result.metadata.section === '7' ||
            result.metadata.section?.includes('penalty') ||
            result.metadata.section?.includes('fine')
          ) {
            antinoiseBylawInfo.sectionTitle = 'Penalties';
            antinoiseBylawInfo.content =
              'Any person who violates any provision of this Bylaw is guilty of an offence and liable upon summary conviction to a fine of not more than One Thousand Dollars ($1,000.00). For the purpose of this clause an offence shall be deemed committed upon each day during or on which a violation occurs or continues.';
          }

          return antinoiseBylawInfo;
        }

        // Default handling for other bylaws
        return {
          bylawNumber: result.metadata.bylawNumber || 'Unknown',
          title: result.metadata.title || 'Untitled Bylaw',
          section: result.metadata.section || 'Unknown Section',
          sectionTitle: result.metadata.sectionTitle,
          content: result.text,
          url: getExternalPdfUrl(
            result.metadata.bylawNumber || 'Unknown',
            result.metadata.title,
          ),
          isConsolidated: !!result.metadata.consolidatedTo,
          consolidatedDate: result.metadata.consolidatedTo
            ? `Bylaw No. ${result.metadata.consolidatedTo}`
            : undefined,
        };
      });

      console.log('Bylaw search results formatted successfully');

      return {
        found: true,
        results: formattedResults,
      };
    } catch (error) {
      console.error('Error in searchBylawsTool:', error);

      // Return a meaningful error response
      return {
        found: false,
        message:
          'Error searching for bylaws. Please try again or contact Oak Bay Municipal Hall for assistance.',
      };
    }
  },
});
