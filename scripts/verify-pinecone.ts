/**
 * Verify Pinecone Connection
 *
 * This script tests the connection to Pinecone and verifies
 * that the Oak Bay bylaws index is accessible.
 *
 * Usage:
 * pnpm tsx scripts/verify-pinecone.ts
 */

import dotenv from 'dotenv';
import {
  getPineconeClient,
  getPineconeIndex,
} from '../lib/vector-search/pinecone-client';
import { OpenAIEmbeddings } from '@langchain/openai';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function verifyPineconeConnection() {
  console.log('Verifying Pinecone connection...');
  console.log('-----------------------------------');

  try {
    // 1. Verify environment variables
    console.log('Checking environment variables:');
    const apiKey = process.env.PINECONE_API_KEY;
    const indexName = process.env.PINECONE_INDEX || 'oak-bay-bylaws';

    if (!apiKey) {
      throw new Error('PINECONE_API_KEY is not set in environment variables');
    }

    console.log('✅ Environment variables present');
    console.log(`   - Index: ${indexName}`);
    console.log(`   - API Key: ${apiKey.substring(0, 10)}...`);

    // 2. Test Pinecone client creation
    console.log('\nInitializing Pinecone client...');
    const client = getPineconeClient();
    console.log('✅ Pinecone client created successfully');

    // 3. Test connection to the index
    console.log('\nConnecting to the index...');
    const index = getPineconeIndex();
    console.log('✅ Index connection established');

    // 4. Fetch index statistics
    console.log('\nFetching index statistics...');
    const stats = await index.describeIndexStats();
    console.log('✅ Index statistics retrieved:');
    console.log(`   - Total vectors: ${stats.totalRecordCount}`);
    console.log(`   - Dimensions: ${stats.dimension}`);

    // 5. Test search functionality with a simple query
    console.log('\nTesting search functionality...');

    // Get the appropriate embeddings model based on configuration
    let embeddings: any;
    try {
      // Import the embedding models module
      const {
        getEmbeddingsModel,
        EmbeddingProvider,
      } = require('../lib/vector-search/embedding-models');

      // Use the configured default embeddings model (Llama by default)
      embeddings = getEmbeddingsModel();
      console.log(
        `Using embeddings model: ${(embeddings as any).modelName || 'llama-text-embed-v2'}`,
      );
    } catch (error) {
      console.error(
        'Error loading embedding model, falling back to OpenAI:',
        error,
      );

      // Fallback to OpenAI if there's an error with the custom embeddings
      embeddings = new OpenAIEmbeddings({
        modelName: 'text-embedding-3-small',
        openAIApiKey: process.env.OPENAI_API_KEY,
      });
      console.log(
        'Using fallback OpenAI embeddings model: text-embedding-3-small',
      );
    }

    // Generate a test embedding
    const testQuery = 'parking regulations';
    console.log(`Generating embedding for test query: "${testQuery}"...`);
    const queryEmbedding = await embeddings.embedQuery(testQuery);
    console.log(`✅ Embedding generated (${queryEmbedding.length} dimensions)`);

    // Perform a test search
    console.log('Performing test search...');
    const searchResults = await index.query({
      vector: queryEmbedding,
      topK: 3,
      includeMetadata: true,
    });

    console.log('✅ Search completed successfully');
    console.log(`   - Results returned: ${searchResults.matches?.length || 0}`);

    if (searchResults.matches && searchResults.matches.length > 0) {
      console.log('\nSample search result:');
      const firstResult = searchResults.matches[0];
      console.log(`   - ID: ${firstResult.id}`);
      console.log(`   - Score: ${firstResult.score}`);

      if (firstResult.metadata) {
        console.log(
          `   - Bylaw: ${firstResult.metadata.bylawNumber || 'Unknown'}`,
        );
        console.log(`   - Title: ${firstResult.metadata.title || 'Unknown'}`);

        // Show a snippet of the text
        const text = firstResult.metadata.text as string;
        if (text) {
          console.log(`   - Text snippet: "${text.substring(0, 100)}..."`);
        }
      }
    }

    console.log('\n✅ ALL TESTS PASSED!');
    console.log('Pinecone connection verified successfully.');
    console.log('The Oak Bay bylaws chatbot is ready for production use.');
  } catch (error) {
    console.error('\n❌ ERROR:');
    console.error(error);

    if (error instanceof Error) {
      console.error(`\nError details: ${error.message}`);

      // Provide more helpful troubleshooting tips based on the error
      if (error.message.includes('API key')) {
        console.error('\nTroubleshooting tips:');
        console.error(
          '- Check that your PINECONE_API_KEY is correct in .env.local',
        );
        console.error('- Verify that your Pinecone account is active');
      } else if (error.message.includes('index')) {
        console.error('\nTroubleshooting tips:');
        console.error(
          '- Check that the index name "oak-bay-bylaws" exists in your Pinecone account',
        );
        console.error(
          '- Verify that the index is properly initialized with vectors',
        );
        console.error(
          '- Make sure your Pinecone account has access to the index',
        );
      } else if (
        error.message.includes('timeout') ||
        error.message.includes('ECONNREFUSED')
      ) {
        console.error('\nTroubleshooting tips:');
        console.error('- Check your network connection');
        console.error(
          '- Verify the Pinecone service is running and accessible',
        );
        console.error(
          '- Make sure your firewall allows connections to Pinecone',
        );
      }
    }

    console.error(
      '\nPlease fix the issues and run this verification script again before deploying.',
    );
    process.exit(1);
  }
}

// Execute the verification
verifyPineconeConnection();
