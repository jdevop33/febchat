/**
 * Verify Bylaw Upsert
 * 
 * This script verifies that a bylaw was properly upserted to Pinecone
 * by performing a test query.
 * 
 * Usage:
 * pnpm tsx scripts/verify-bylaw-upsert.ts <bylaw-number>
 */

import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import { getEmbeddingsModel, EmbeddingProvider } from '../lib/vector-search/embedding-models';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Get bylaw number from command line
const bylawNumber = process.argv[2] || '3210';

async function verifyUpsert() {
  try {
    console.log(`Verifying upsert for bylaw number: ${bylawNumber}`);
    
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
        : EmbeddingProvider.LLAMAINDEX
    );
    
    // Generate test query embedding
    const queryText = 'noise regulations';
    console.log(`Generating embedding for query: "${queryText}"`);
    const queryEmbedding = await embeddings.embedQuery(queryText);
    
    // Perform search
    console.log('Searching Pinecone...');
    const searchResults = await index.query({
      vector: queryEmbedding,
      topK: 5,
      filter: { bylawNumber: { $eq: bylawNumber } },
      includeMetadata: true,
    });
    
    // Display results
    console.log(`\nFound ${searchResults.matches?.length || 0} results for bylaw ${bylawNumber}`);
    
    if (searchResults.matches && searchResults.matches.length > 0) {
      console.log('\nTop results:');
      
      for (let i = 0; i < searchResults.matches.length; i++) {
        const match = searchResults.matches[i];
        console.log(`\nResult ${i + 1}:`);
        console.log(`  ID: ${match.id}`);
        console.log(`  Score: ${match.score}`);
        
        if (match.metadata) {
          console.log(`  Bylaw: ${match.metadata.bylawNumber || 'Unknown'}`);
          console.log(`  Title: ${match.metadata.title || 'Unknown'}`);
          console.log(`  Section: ${match.metadata.section || 'Unknown'}`);
          console.log(`  Section Title: ${match.metadata.sectionTitle || 'Unknown'}`);
          console.log(`  Category: ${match.metadata.category || 'Unknown'}`);
          console.log(`  Is Consolidated: ${match.metadata.isConsolidated ? 'Yes' : 'No'}`);
          
          if (match.metadata.isConsolidated) {
            console.log(`  Amended Bylaw: ${match.metadata.amendedBylaw || 'Unknown'}`);
            console.log(`  Consolidated Date: ${match.metadata.consolidatedDate || 'Unknown'}`);
          }
          
          // Show a snippet of the text
          const text = match.metadata.text as string;
          if (text) {
            console.log('\n  Text snippet:');
            console.log(`  "${text.substring(0, 150)}..."`);
          }
        }
      }
      
      console.log('\n✅ Verification successful. Bylaw data was properly upserted.');
    } else {
      console.log('\n❌ No results found. The bylaw may not have been properly upserted.');
    }
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run verification
verifyUpsert();