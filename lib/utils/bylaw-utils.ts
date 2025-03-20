/**
 * Utility functions for bylaw-related functionality
 */

/**
 * Get external PDF URL for a bylaw from the municipal website
 *
 * @param bylawNumber - The bylaw number as string
 * @param title - Optional title to format the URL for newer bylaws
 * @returns URL string to the PDF on the municipal website
 */
export function getExternalPdfUrl(bylawNumber: string, title?: string): string {
  // Special case for known bylaws with specific URLs
  const knownBylawUrls: Record<string, string> = {
    '3210':
      'https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/3210.pdf',
    '4892':
      'https://www.oakbay.ca/wp-content/uploads/2025/02/4892-Amenity-Cost-Charge-Bylaw.pdf',
    '3416':
      'https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/3416-Boulevard-Frontage-Tax-BL-1982-CONSOLIDATED-to-May-8-2023.pdf',
    '3531':
      'https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/3531_ZoningBylawConsolidation_Aug302024.pdf',
    '3545':
      'https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/3545-Uplands-Bylaw-1987-CONSOLIDATED-to-February-10-2020.pdf',
    '3578':
      'https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/3578_Subdivision-and-Development_CONSOLIDATED-to-September-2023.pdf',
    '4100':
      'https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/4100-Streets-Traffic-Bylaw-2000.pdf',
    '4183':
      'https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/4183_Board-of-Variance-Bylaw_CONSOLIDATED-to-Sept11-2023.pdf',
    '4371':
      'https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/4371-Refuse-Collection-and-Disposal-Bylaw-2007-CONSOLIDATED.pdf',
    '4672':
      'https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/4672-Parks-and-Beaches-Bylaw-2017-CONSOLIDATED.pdf',
    '4742':
      'https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/4742-Tree-Protection-Bylaw-2020-CONSOLIDATED.pdf',
    '4844':
      'https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/4844-Consolidated-up-to-4858.pdf',
    '4845':
      'https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/4845-Planning-and-Development-Fees-and-Charges-CONSOLIDATED.pdf',
    '4849':
      'https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/4849-Property-Tax-Exemption-Bylaw-No-4849-2023.pdf',
  };

  if (knownBylawUrls[bylawNumber]) {
    return knownBylawUrls[bylawNumber];
  }

  // Determine URL pattern based on bylaw number
  const bylawNum = Number.parseInt(bylawNumber, 10);

  if (Number.isNaN(bylawNum)) {
    // Fallback to main bylaws page if not a valid number
    return 'https://www.oakbay.ca/council-administration/bylaws-policies/oak-bay-municipal-bylaws/';
  }

  if (bylawNum < 4000) {
    // Older bylaws pattern
    return `https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/${bylawNumber}.pdf`;
  } else {
    // Newer bylaws pattern - note URL might vary based on actual upload date
    const currentYear = new Date().getFullYear();
    const currentMonth = (new Date().getMonth() + 1)
      .toString()
      .padStart(2, '0');

    // Format title for URL if available
    const formattedTitle = title ? `-${title.replace(/\s+/g, '-')}` : '';

    return `https://www.oakbay.ca/wp-content/uploads/${currentYear}/${currentMonth}/${bylawNumber}${formattedTitle}.pdf`;
  }
}

/**
 * Map bylaw number to local PDF filename
 *
 * @param bylawNumber - The bylaw number as string
 * @returns The local filename for the bylaw PDF
 */
export function getFilenameForBylaw(bylawNumber: string): string {
  // Comprehensive map of bylaw numbers to filenames
  const bylawMap: Record<string, string> = {
    '3152': '3152.pdf',
    '3210': '3210 -  Anti-Noise Bylaw - Consolidated to 4594.pdf',
    '3370': '3370, Water Rate Bylaw, 1981 (CONSOLIDATED)_2.pdf',
    '3416':
      '3416-Boulevard-Frontage-Tax-BL-1982-CONSOLIDATED-to-May-8-2023.pdf',
    '3531': '3531_ZoningBylawConsolidation_Aug302024.pdf',
    '3536': '3536.pdf',
    '3540': '3540, Parking Facilities BL 1986 (CONSOLIDATED)_1.pdf',
    '3545': '3545-Uplands-Bylaw-1987-(CONSOLIDATED-to-February-10-2020).pdf',
    '3550': '3550, Driveway Access BL (CONSOLIDATED).pdf',
    '3578':
      '3578_Subdivision-and-Development_CONSOLIDATED-to-September-2023.pdf',
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
    '4144':
      '4144, Oil Burning Equipment and Fuel Tank Regulation Bylaw, 2002.pdf',
    '4183': '4183_Board-of-Variance-Bylaw_CONSOLIDATED-to-Sept11-2023.pdf',
    '4222': '4222.pdf',
    '4239': '4239, Administrative Procedures Bylaw, 2004, (CONSOLIDATED).pdf',
    '4247':
      '4247 Building and Plumbing Bylaw 2005 Consolidated to September 11 2023_0.pdf',
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
    '4879': '4879, Oak Bay Business Improvement Area Bylaw, 2024.pdf',
    '4891': 'Development Cost Charge Bylaw No. 4891, 2024.pdf',
    '4892': 'Amenity Cost Charge Bylaw No. 4892, 2024.pdf',
    '4866': 'Boulevard Frontage Tax Amendment Bylaw No. 4866, 2024.pdf',
    '4861': 'Tax Rates Bylaw 2024, No. 4861.pdf',
  };

  return bylawMap[bylawNumber] || `${bylawNumber}.pdf`;
}

/**
 * Get local PDF path for a bylaw
 *
 * @param bylawNumber - The bylaw number as string
 * @returns The path to the local PDF file
 */
export function getLocalPdfPath(bylawNumber: string): string {
  return `/pdfs/${getFilenameForBylaw(bylawNumber)}`;
}

/**
 * Get best PDF URL based on environment
 * In production, use external URLs directly
 * In development, use local PDF files
 *
 * @param bylawNumber - The bylaw number as string
 * @param title - Optional title for URL formatting
 * @returns The best PDF URL based on environment
 */
export function getBestPdfUrl(bylawNumber: string, title?: string): string {
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction
    ? getExternalPdfUrl(bylawNumber, title)
    : getLocalPdfPath(bylawNumber);
}

/**
 * Section mapping for known bylaws
 * Maps section identifiers to page numbers
 */
export const sectionPageMapping: Record<string, Record<string, number>> = {
  // Anti-Noise Bylaw mappings
  '3210': {
    '3': 2, // Section 3 is on page 2
    '4': 3, // Section 4 is on page 3
    '5': 4,
    '5(7)(a)': 5,
    '5(7)(b)': 5,
    '4(5)(a)': 3,
    '4(5)(b)': 3,
    '7': 6,
  },
  // Zoning Bylaw mappings
  '3531': {
    '1': 1,
    '2': 2,
    '3': 3,
    '4.1': 5,
    '4.2': 6,
    '5.1': 10,
    '6.1': 15,
  },
  // Tree Protection Bylaw mappings
  '4742': {
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
  },
  // Streets & Traffic Bylaw mappings
  '4100': {
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
  },
};

/**
 * Find page number for a specific section in a bylaw
 *
 * @param bylawNumber - The bylaw number
 * @param section - The section identifier
 * @returns The page number or null if not found
 */
export function findSectionPage(
  bylawNumber: string,
  section: string,
): number | null {
  // Normalize section format for lookup
  const normalizedSection = section.replace(/^(section|part|schedule)\s+/i, '');

  // If we have mappings for this bylaw and section, return the page number
  if (sectionPageMapping[bylawNumber]?.[normalizedSection]) {
    return sectionPageMapping[bylawNumber][normalizedSection];
  }

  // If no mapping is found, return null (will default to page 1)
  return null;
}

/**
 * Get a realistic page count estimate for a bylaw based on its number
 *
 * @param bylawNumber - The bylaw number
 * @returns Estimated page count
 */
export function getEstimatedPageCount(bylawNumber: string): number {
  // Default page count
  const pageCount = 20;

  // Set specific page counts for known bylaws
  const bylawPageCounts: Record<string, number> = {
    '3210': 12, // Anti-Noise Bylaw
    '3531': 150, // Zoning Bylaw (typically very long)
    '4742': 45, // Tree Protection Bylaw
    '4100': 30, // Streets & Traffic Bylaw
    '4620': 80, // Official Community Plan
    '4719': 25, // Fire Prevention Bylaw
    '4747': 15, // Reserve Funds Bylaw
  };

  if (bylawPageCounts[bylawNumber]) {
    return bylawPageCounts[bylawNumber];
  }

  // For unknown bylaws, estimate based on bylaw number (newer bylaws tend to be longer)
  const numericBylawNum = Number.parseInt(bylawNumber, 10);
  if (!Number.isNaN(numericBylawNum)) {
    if (numericBylawNum < 4000) return 10 + (numericBylawNum % 10);
    else if (numericBylawNum < 4500) return 20 + (numericBylawNum % 15);
    else return 25 + (numericBylawNum % 20);
  }

  return pageCount;
}

// List of validated bylaw numbers that we know exist in our PDF collection
export const VALIDATED_BYLAWS = [
  '3152',
  '3210',
  '3370',
  '3416',
  '3531',
  '3536',
  '3540',
  '3545',
  '3550',
  '3578',
  '3603',
  '3805',
  '3827',
  '3829',
  '3832',
  '3891',
  '3938',
  '3946',
  '3952',
  '4008',
  '4013',
  '4100',
  '4144',
  '4183',
  '4222',
  '4239',
  '4247',
  '4284',
  '4371',
  '4375',
  '4392',
  '4421',
  '4518',
  '4620',
  '4671',
  '4672',
  '4719',
  '4720',
  '4740',
  '4742',
  '4747',
  '4770',
  '4771',
  '4772',
  '4777',
  '4822',
  '4844',
  '4845',
  '4849',
  '4879',
  '4892',
  '4866',
  '4891',
  '4861',
];
