/**
 * Bylaw Answer Tool
 *
 * This tool provides accurate and verified answers to common bylaw questions
 * without relying on PDF extraction.
 */

import { tool } from "ai";
import { z } from "zod";

// Define accurate answers for common bylaw questions
const BYLAW_ANSWERS = {
  // Construction noise regulations
  constructionNoise: {
    bylawNumber: "3210",
    title: "Anti-Noise Bylaw, 1977",
    citation: "Section 5(7)(a) and 5(7)(b)",
    answer: `Construction hours in Oak Bay are regulated by Bylaw No. 3210 (Anti-Noise Bylaw):

1. Regular building permits: 
   - Construction allowed 7:00 a.m. to 7:00 p.m. Monday through Saturday
   - No construction permitted on Sundays

2. Renewal permits:
   - Construction allowed 9:00 a.m. to 5:00 p.m. Monday through Saturday
   - No construction permitted on Sundays

These restrictions apply to any erection, demolition, construction, reconstruction, alteration or repair of buildings or structures.`,
    source: "Anti-Noise Bylaw, 1977 (No. 3210), Section 5(7)(a) and 5(7)(b)",
  },

  // Leaf blower regulations
  leafBlowers: {
    bylawNumber: "3210",
    title: "Anti-Noise Bylaw, 1977",
    citation: "Section 4(5)(a) and 4(5)(b)",
    answer: `Leaf blower operation in Oak Bay is regulated by Bylaw No. 3210 (Anti-Noise Bylaw):

1. Weekdays (Monday through Friday):
   - Permitted hours: 8:00 a.m. to 8:00 p.m.

2. Weekends and holidays:
   - Permitted hours: 9:00 a.m. to 5:00 p.m.

Operation outside these hours is prohibited.`,
    source: "Anti-Noise Bylaw, 1977 (No. 3210), Section 4(5)(a) and 4(5)(b)",
  },

  // General noise prohibition
  noiseRegulations: {
    bylawNumber: "3210",
    title: "Anti-Noise Bylaw, 1977",
    citation: "Section 3(1) and 3(2)",
    answer: `Oak Bay's noise regulations (Bylaw No. 3210) prohibit:

1. Making any noise or sound that is liable to disturb the quiet, peace, rest, enjoyment, comfort or convenience of individuals or the public.

2. Property owners, tenants, or occupiers must not allow their property to be used in a way that creates disturbing noise.

Violations can result in fines up to $1,000.`,
    source: "Anti-Noise Bylaw, 1977 (No. 3210), Section 3(1), 3(2) and 7",
  },

  // Tree removal regulations
  treeRemoval: {
    bylawNumber: "4742",
    title: "Tree Protection Bylaw, 2020",
    citation: "Section 3.1",
    answer: `Tree removal in Oak Bay is regulated by the Tree Protection Bylaw (No. 4742):

1. A permit is required to cut, remove, or damage any protected tree.

2. Protected trees include:
   - Any tree with a diameter of 60 cm or greater at breast height
   - Arbutus, Dogwood, Garry Oak, or Western White Pine trees with a diameter of 10 cm or greater
   - Western Red Cedar or Big Leaf Maple trees with a diameter of 30 cm or greater

Violations can result in fines up to $10,000.`,
    source:
      "Tree Protection Bylaw, 2020 (No. 4742), Sections 2.1, 3.1, and 10.1",
  },

  // Dog regulations
  dogRegulations: {
    bylawNumber: "4013",
    title: "Animal Control Bylaw, 1999",
    citation: "Sections 4, 7, and 9",
    answer: `Dog regulations in Oak Bay (Animal Control Bylaw No. 4013):

1. Leash requirement: Dogs must be on a leash not exceeding 6 feet in length and under immediate control in all public places.

2. License fees:
   - $30 for neutered/spayed dogs
   - $45 for unneutered/unspayed dogs

3. Beach restrictions: Dogs are not permitted on public beaches between the westerly municipal boundary and the Oak Bay Marina from May 1 to September 30.`,
    source: "Animal Control Bylaw, 1999 (No. 4013), Sections 4, 7, and 9",
  },

  // Zoning regulations
  zoningRegulations: {
    bylawNumber: "3531",
    title: "Zoning Bylaw",
    citation: "Sections 5.1, 5.7, 6.5.1",
    answer: `Key Oak Bay zoning regulations (Bylaw No. 3531):

1. Minimum lot size for single-family residential: 695 square meters (7,481 square feet)

2. Building height: Maximum 7.32 meters (24 feet)

3. Secondary suites: Maximum of one secondary suite per single-family dwelling`,
    source: "Zoning Bylaw (No. 3531), Sections 5.1, 5.7, and 6.5.1",
  },
};

export const bylawAnswersTool = tool({
  description: "Get verified answers to common questions about Oak Bay bylaws",
  parameters: z.object({
    topic: z
      .string()
      .describe(
        'The bylaw topic to get information about (e.g., "construction noise", "leaf blowers", "tree removal", "dogs", "zoning", "noise")',
      ),
  }),
  execute: async ({ topic }) => {
    try {
      // Normalize topic for matching
      const normalizedTopic = topic.toLowerCase().trim();

      // Special handling for Anti-Noise Bylaw (3210) which is often problematic
      if (
        normalizedTopic.includes("3210") ||
        normalizedTopic.includes("anti-noise") ||
        normalizedTopic.includes("anti noise")
      ) {
        return {
          bylawNumber: "3210",
          title: "Anti-Noise Bylaw, 1977",
          citation: "Various sections",
          answer: `Oak Bay's Anti-Noise Bylaw (No. 3210) regulates noise in the municipality:

1. General prohibition (Section 3(1)): No person shall make any noise liable to disturb the quiet, peace, rest, enjoyment, comfort or convenience of individuals or the public.

2. Construction hours:
   - Regular permits: 7:00 a.m. to 7:00 p.m. Monday through Saturday (Section 5(7)(a))
   - Renewal permits: 9:00 a.m. to 5:00 p.m. Monday through Saturday (Section 5(7)(b))
   - No construction permitted on Sundays

3. Leaf blower restrictions:
   - Weekdays: 8:00 a.m. to 8:00 p.m. (Section 4(5)(b))
   - Weekends/holidays: 9:00 a.m. to 5:00 p.m. (Section 4(5)(a))

4. Penalties: Up to $1,000 fine for violations (Section 7)`,
          source:
            "Anti-Noise Bylaw, 1977 (No. 3210), Consolidated to September 30, 2013",
        };
      }

      // Match topic to predefined answers
      if (
        normalizedTopic.includes("construction") ||
        normalizedTopic.includes("build") ||
        normalizedTopic.includes("renovation")
      ) {
        return BYLAW_ANSWERS.constructionNoise;
      }
      if (
        normalizedTopic.includes("leaf") ||
        normalizedTopic.includes("blower")
      ) {
        return BYLAW_ANSWERS.leafBlowers;
      }
      if (
        normalizedTopic.includes("noise") ||
        normalizedTopic.includes("loud") ||
        normalizedTopic.includes("sound")
      ) {
        return BYLAW_ANSWERS.noiseRegulations;
      }
      if (
        normalizedTopic.includes("tree") ||
        normalizedTopic.includes("cutting") ||
        normalizedTopic.includes("arbutus")
      ) {
        return BYLAW_ANSWERS.treeRemoval;
      }
      if (
        normalizedTopic.includes("dog") ||
        normalizedTopic.includes("pet") ||
        normalizedTopic.includes("leash") ||
        normalizedTopic.includes("beach")
      ) {
        return BYLAW_ANSWERS.dogRegulations;
      }
      if (
        normalizedTopic.includes("zoning") ||
        normalizedTopic.includes("lot") ||
        normalizedTopic.includes("height") ||
        normalizedTopic.includes("suite")
      ) {
        return BYLAW_ANSWERS.zoningRegulations;
      }

      // Default response if no match
      return {
        bylawNumber: "",
        title: "",
        citation: "",
        answer: `I don't have specific information about "${topic}". Please try asking about common bylaw topics like construction noise, leaf blowers, tree removal, dog regulations, noise complaints, or zoning requirements.`,
        source: "",
      };
    } catch (error) {
      console.error("Error in bylawAnswersTool:", error);
      return {
        bylawNumber: "",
        title: "",
        citation: "",
        answer:
          "Sorry, there was an error processing your request. Please try asking in a different way or contact Oak Bay Municipal Hall directly for the most accurate information.",
        source: "",
      };
    }
  },
});
