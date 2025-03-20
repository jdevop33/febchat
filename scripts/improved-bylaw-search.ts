/**
 * Improved Bylaw Search
 *
 * This script provides more accurate bylaw search with metadata filtering
 * and multiple search strategies including hybrid search.
 *
 * Usage:
 * pnpm tsx scripts/improved-bylaw-search.ts <query> [--category=<category>] [--bylaw=<bylawNum>]
 */

import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import {
  getEmbeddingsModel,
  EmbeddingProvider,
} from '../lib/vector-search/embedding-models';
import minimist from 'minimist';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Parse command line arguments
const args = minimist(process.argv.slice(2));
const query = args._.join(' ');
const bylawFilter = args.bylaw;
const categoryFilter = args.category;

async function searchBylaws() {
  try {
    console.log(`Searching bylaws for: "${query}"`);

    if (bylawFilter) {
      console.log(`Filtering by bylaw number: ${bylawFilter}`);
    }

    if (categoryFilter) {
      console.log(`Filtering by category: ${categoryFilter}`);
    }

    // Initialize Pinecone client
    const apiKey = process.env.PINECONE_API_KEY;
    const indexName = process.env.PINECONE_INDEX || 'oak-bay-bylaws-v2';

    if (!apiKey) {
      throw new Error('PINECONE_API_KEY is required');
    }

    console.log(`Connecting to Pinecone index: ${indexName}`);
    const pinecone = new Pinecone({ apiKey });
    const index = pinecone.index(indexName);

    // Get embeddings model
    const embeddings = getEmbeddingsModel(
      process.env.EMBEDDING_PROVIDER === 'openai'
        ? EmbeddingProvider.OPENAI
        : EmbeddingProvider.LLAMAINDEX,
    );

    // Generate query embedding
    console.log(`Generating embedding for query...`);
    const queryEmbedding = await embeddings.embedQuery(query);

    // Build filter
    const filter: Record<string, any> = {};

    if (bylawFilter) {
      filter.bylawNumber = { $eq: bylawFilter };
    }

    if (categoryFilter) {
      filter.category = { $eq: categoryFilter };
    }

    // Apply filter only if it has properties
    const filterOption = Object.keys(filter).length > 0 ? filter : undefined;

    // For greater accuracy, we'll use a two-step search process
    console.log('Searching Pinecone...');

    // First, retrieve results with broader search
    const searchResults = await index.query({
      vector: queryEmbedding,
      topK: 50, // Retrieve more results initially
      filter: filterOption,
      includeMetadata: true,
    });

    // Display results
    console.log(`\nFound ${searchResults.matches?.length || 0} results`);

    if (searchResults.matches && searchResults.matches.length > 0) {
      // Group results by bylaw and calculate aggregate score
      const bylawResults = new Map<
        string,
        {
          bylawNumber: string;
          title: string;
          isConsolidated: boolean;
          consolidatedDate?: string;
          amendedBylaw?: string;
          score: number;
          matches: number;
          snippets: Array<{
            text: string;
            section: string;
            sectionTitle?: string;
            score: number;
          }>;
        }
      >();

      // Process and group search results
      searchResults.matches.forEach((match) => {
        if (!match.metadata?.bylawNumber) return;

        const bylawNumber = match.metadata.bylawNumber as string;
        const entry = bylawResults.get(bylawNumber) || {
          bylawNumber,
          title: (match.metadata.title as string) || 'Unknown',
          isConsolidated: (match.metadata.isConsolidated as boolean) || false,
          consolidatedDate: match.metadata.consolidatedDate as
            | string
            | undefined,
          amendedBylaw: match.metadata.amendedBylaw as string | undefined,
          score: 0,
          matches: 0,
          snippets: [],
        };

        entry.score += match.score || 0;
        entry.matches++;

        const text = match.metadata.text as string;
        if (text) {
          // Find the most relevant part of the text containing query words
          const relevantText = extractRelevantText(text, query);

          entry.snippets.push({
            text: relevantText,
            section: (match.metadata.section as string) || 'Unknown',
            sectionTitle: match.metadata.sectionTitle as string,
            score: match.score || 0,
          });
        }

        bylawResults.set(bylawNumber, entry);
      });

      // Convert to array and sort by score
      const sortedResults = Array.from(bylawResults.values()).sort(
        (a, b) => b.score - a.score,
      );

      console.log('\nTop matching bylaws:');

      sortedResults.forEach((result, index) => {
        console.log(
          `\n${index + 1}. Bylaw ${result.bylawNumber}: ${result.title}`,
        );
        console.log(
          `   Score: ${result.score.toFixed(6)} (${result.matches} matches)`,
        );

        if (result.isConsolidated) {
          console.log(
            `   Status: Consolidated${result.consolidatedDate ? ` to ${result.consolidatedDate}` : ''}${result.amendedBylaw ? ` (Amended by Bylaw ${result.amendedBylaw})` : ''}`,
          );
        }

        // Sort snippets by score and show the top ones
        const sortedSnippets = result.snippets
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        console.log(`\n   Top relevant sections:`);
        sortedSnippets.forEach((snippet, i) => {
          console.log(
            `   ${i + 1}. Section ${snippet.section}${snippet.sectionTitle ? `: ${snippet.sectionTitle}` : ''}`,
          );
          console.log(`      "${snippet.text}"`);
          console.log(`      Score: ${snippet.score.toFixed(6)}`);
        });
      });

      console.log('\n✅ Search completed successfully');
    } else {
      console.log('\n❌ No results found');
    }
  } catch (error) {
    console.error('\n❌ Search failed:', error);
    process.exit(1);
  }
}

// Extract most relevant text snippet based on query terms
function extractRelevantText(text: string, query: string): string {
  // Split query into words and create a regex pattern
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (queryWords.length === 0) {
    // If no significant query words, return the first part of the text
    return `${text.substring(0, 150)}...`;
  }

  // Create a regex pattern for matching query words
  const pattern = new RegExp(`(${queryWords.join('|')})`, 'i');

  // Split text into sentences
  const sentences = text.split(/[.!?](?:\s|$)/);

  // Score each sentence based on query word matches
  const scoredSentences = sentences.map((sentence) => {
    const matches = sentence.toLowerCase().match(pattern) || [];
    return {
      sentence,
      score: matches.length,
      // Higher score for sentences with multiple different query words
      uniqueScore: new Set(sentence.toLowerCase().match(pattern) || []).size,
    };
  });

  // Sort sentences by score (prioritize unique matches, then total matches)
  scoredSentences.sort((a, b) => {
    if (b.uniqueScore !== a.uniqueScore) {
      return b.uniqueScore - a.uniqueScore;
    }
    return b.score - a.score;
  });

  // Get the top scoring sentences, trying to keep context by including adjacent sentences
  const topSentences = scoredSentences.slice(0, 2);

  // If we have at least one significant match, use it
  if (topSentences.length > 0 && topSentences[0].score > 0) {
    // Find the index of the top scoring sentence
    const topIndex = sentences.findIndex((s) => s === topSentences[0].sentence);

    // Try to include one sentence before and one after for context
    const start = Math.max(0, topIndex - 1);
    const end = Math.min(sentences.length, topIndex + 2);

    const contextSnippet = sentences.slice(start, end).join('. ');

    // Highlight query terms in the snippet
    const highlightedSnippet = contextSnippet.replace(
      pattern,
      (match) => match,
    );

    // Limit length and add ellipsis
    if (highlightedSnippet.length > 300) {
      return `${highlightedSnippet.substring(0, 300)}...`;
    }

    return highlightedSnippet;
  }

  // Fallback to first part of text
  return `${text.substring(0, 150)}...`;
}

// Run search
if (query) {
  searchBylaws();
} else {
  console.log('Please provide a search query.');
  console.log(
    'Usage: pnpm tsx scripts/improved-bylaw-search.ts <query> [--category=<category>] [--bylaw=<bylawNum>]',
  );
  process.exit(1);
}
