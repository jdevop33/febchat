// @ts-nocheck
/*
 * This file primarily re-exports vector search functionality.
 * The previous implementation contained conflicting search logic.
 * TODO: Clean up remaining mock data/types if not used elsewhere.
 */

/**
 * Oak Bay Bylaws Knowledge Base
 *
 * This module provides functionality for processing, embedding, and searching
 * Oak Bay municipal bylaws. It enables retrieval-augmented generation (RAG)
 * to provide accurate responses about bylaw information.
 */

// Re-export core types and the main search function from the dedicated search module
export type {
  ChunkMetadata,
  BylawChunk,
  BylawSearchResult,
  BylawSearchOptions,
  BylawSearchFilters,
} from "./types";
export { searchBylaws, getBylawById, getRealBylawData } from "./search";

// Keep mock data export for potential testing usage, but remove mock store/processing logic

// Example mock data
export const mockBylawData: BylawChunk[] = [
  {
    text: "No person shall make or cause to be made any noise or sound within the geographical limits of The Corporation of the District of Oak Bay which is liable to disturb the quiet, peace, rest, enjoyment, comfort or convenience of individuals or the public.",
    metadata: {
      bylawNumber: "3210",
      title: "Anti-Noise Bylaw, 1977",
      section: "3(1)",
      sectionTitle: "General Noise Prohibition",
      dateEnacted: "1977-06-06",
      category: "noise",
      lastUpdated: "2013-09-30T00:00:00Z",
      isConsolidated: true,
      consolidatedDate: "September 30, 2013",
    },
  },
  {
    text: "No owner, tenant or occupier of real property within the geographical limits of The Corporation of the District of Oak Bay shall allow that property to be used so that a noise or sound which originates from that property disturbs or tends to disturb the quiet, peace, rest, enjoyment, comfort or convenience of individuals or the public.",
    metadata: {
      bylawNumber: "3210",
      title: "Anti-Noise Bylaw, 1977",
      section: "3(2)",
      sectionTitle: "Property Owner Responsibility",
      dateEnacted: "1977-06-06",
      category: "noise",
      lastUpdated: "2013-09-30T00:00:00Z",
      isConsolidated: true,
      consolidatedDate: "September 30, 2013",
    },
  },
  {
    text: "On Saturday, Sunday or a holiday, the operation of a leaf blower at a time outside the hours of 9:00 a.m. to 5:00 p.m. is prohibited.",
    metadata: {
      bylawNumber: "3210",
      title: "Anti-Noise Bylaw, 1977",
      section: "4(5)(a)",
      sectionTitle: "Leaf Blower Restrictions - Weekends and Holidays",
      dateEnacted: "1977-06-06",
      category: "noise",
      lastUpdated: "2013-09-30T00:00:00Z",
      isConsolidated: true,
      consolidatedDate: "September 30, 2013",
    },
  },
  {
    text: "From Monday through Friday, excluding holidays, the operation of a leaf blower at a time outside the hours of 8:00 a.m. to 8:00 p.m. is prohibited.",
    metadata: {
      bylawNumber: "3210",
      title: "Anti-Noise Bylaw, 1977",
      section: "4(5)(b)",
      sectionTitle: "Leaf Blower Restrictions - Weekdays",
      dateEnacted: "1977-06-06",
      category: "noise",
      lastUpdated: "2013-09-30T00:00:00Z",
      isConsolidated: true,
      consolidatedDate: "September 30, 2013",
    },
  },
  {
    text: "The erection, demolition, construction, reconstruction, alteration or repair of any building or other structure is permitted between the hours of 7:00 a.m. and 7:00 p.m. on each day except Sunday if such work is authorized by a permit which is not a renewal permit, as defined in the Building and Plumbing Bylaw, 2005.",
    metadata: {
      bylawNumber: "3210",
      title: "Anti-Noise Bylaw, 1977",
      section: "5(7)(a)",
      sectionTitle: "Construction Hours - Regular Permits",
      dateEnacted: "1977-06-06",
      category: "noise",
      lastUpdated: "2013-09-30T00:00:00Z",
      isConsolidated: true,
      consolidatedDate: "September 30, 2013",
    },
  },
  {
    text: "The erection, demolition, construction, reconstruction, alteration or repair of any building or other structure is permitted between the hours of 9:00 a.m. and 5:00 p.m. on each day except Sunday if such work is authorized pursuant to a renewal permit, as defined in the Building and Plumbing Bylaw, 2005.",
    metadata: {
      bylawNumber: "3210",
      title: "Anti-Noise Bylaw, 1977",
      section: "5(7)(b)",
      sectionTitle: "Construction Hours - Renewal Permits",
      dateEnacted: "1977-06-06",
      category: "noise",
      lastUpdated: "2013-09-30T00:00:00Z",
      isConsolidated: true,
      consolidatedDate: "September 30, 2013",
    },
  },
  {
    text: "Any person who violates any provision of this Bylaw is guilty of an offence and liable upon summary conviction to a fine of not more than One Thousand Dollars ($1,000.00). For the purpose of this clause an offence shall be deemed committed upon each day during or on which a violation occurs or continues.",
    metadata: {
      bylawNumber: "3210",
      title: "Anti-Noise Bylaw, 1977",
      section: "7",
      sectionTitle: "Penalties",
      dateEnacted: "1977-06-06",
      category: "noise",
      lastUpdated: "2013-09-30T00:00:00Z",
      isConsolidated: true,
      consolidatedDate: "September 30, 2013",
    },
  },
  // ... (rest of mock data can remain if needed for tests) ...
  {
    text: "Except as authorized by a Permit issued under this Bylaw, no person shall cut, remove or damage any Protected Tree.",
    metadata: {
      bylawNumber: "4742",
      title: "Tree Protection Bylaw, 2020",
      section: "3.1",
      sectionTitle: "Protected Tree Removal Prohibition",
      dateEnacted: "2020-03-15",
      category: "trees",
      lastUpdated: "2020-12-30T00:00:00Z",
      isConsolidated: true,
      consolidatedDate: "December 2020",
    },
  },
];
