/**
 * Search Bylaws
 *
 * This script searches the bylaws in Pinecone based on a query.
 *
 * Usage:
 * pnpm tsx scripts/search-bylaws.ts <query>
 */

import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import {
  getEmbeddingsModel,
  EmbeddingProvider,
} from '../lib/vector-search/embedding-models';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Get query from command line or use default
const query =
  process.argv.slice(2).join(' ') || 'noise restrictions in residential areas';

async function searchBylaws() {
  try {
    console.log(`Searching bylaws for: "${query}"`);

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

    // Perform search
    console.log('Searching Pinecone...');
    const searchResults = await index.query({
      vector: queryEmbedding,
      topK: 10,
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
          snippets: string[];
        }
      >();

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
          // Find the most relevant part of the text
          const lines = text.split('\n');
          const shortSnippet = `${lines.slice(0, 3).join(' ').substring(0, 150)}...`;
          entry.snippets.push(shortSnippet);
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

        // Show up to 2 snippets
        console.log(`\n   Relevant sections:`);
        result.snippets.slice(0, 2).forEach((snippet, i) => {
          console.log(`   ${i + 1}. ${snippet}`);
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

// Run search
searchBylaws();
