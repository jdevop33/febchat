// Test script for the bylaws search functionality
const dotenv = require('dotenv');
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');

// Import our application's embedding logic
const { getEmbeddingsModel, EmbeddingProvider } = require('../lib/vector/embedding-models');

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Log environment variables
console.log('====== ENVIRONMENT ======');
console.log(
  'PINECONE_API_KEY:',
  process.env.PINECONE_API_KEY
    ? `${process.env.PINECONE_API_KEY.slice(0, 10)}...`
    : 'NOT SET',
);
console.log('PINECONE_INDEX:', process.env.PINECONE_INDEX || 'NOT SET');
console.log(
  'OPENAI_API_KEY:',
  process.env.OPENAI_API_KEY
    ? `${process.env.OPENAI_API_KEY.slice(0, 10)}...`
    : 'NOT SET',
);

// Sample queries to test
const testQueries = [
  'What are the tree cutting regulations in Oak Bay?',
  'Parking requirements for residential zones',
  'Noise regulations for construction',
  'Dog leash requirements in parks',
];

async function testPineconeConnection() {
  try {
    // FIX: Removed extra backtick that caused SyntaxError
    console.log('1. Testing Pinecone connection...'); 

    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY is not set in environment variables');
    }

    // Initialize Pinecone client
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    console.log('✅ Pinecone client initialized successfully');

    // Get index name
    const indexName = process.env.PINECONE_INDEX || 'oak-bay-bylaws-v2'; // Default to v2

    // Connect to index
    console.log(`Connecting to index: ${indexName}`);
    const index = pinecone.index(indexName);

    // Get index stats
    const stats = await index.describeIndexStats();
    console.log('✅ Index statistics:');
    console.log(`   - Total vectors: ${stats.totalRecordCount}`);
    console.log(`   - Dimensions: ${stats.dimension}`);
    
    // Check dimension explicitly
    if (stats.dimension !== 1024) {
      console.warn(`⚠️ WARNING: Index dimension is ${stats.dimension}, expected 1024 for Llama model.`);
    }

    return { success: true, index };
  } catch (error) {
    console.error('❌ Pinecone connection failed:');
    console.error(`   Error: ${error.message}`);
    return { success: false, error };
  }
}

// Renamed function for clarity, now tests the configured embedding model
async function testConfiguredEmbeddings(provider = EmbeddingProvider.LLAMAINDEX) {
  try {
    console.log(`
2. Testing configured embeddings generation (${provider})...`);

    // Get the embedding model using our application's logic
    const embeddings = getEmbeddingsModel(provider);
    if (!embeddings) {
        throw new Error(`Failed to get embeddings model for provider: ${provider}`);
    }

    // Generate an embedding
    const testQuery = 'tree protection bylaw';
    console.log(`Generating embedding for: "${testQuery}"`);
    const embedding = await embeddings.embedQuery(testQuery);

    console.log('✅ Embedding generated successfully');
    console.log(`   - Embedding dimensions: ${embedding.length}`);
    console.log(
      `   - First few values: ${embedding
        .slice(0, 3)
        .map((v) => v.toFixed(6))
        .join(', ')}...`,
    );
    
    if (embedding.length !== 1024) {
         console.warn(`⚠️ WARNING: Embedding dimension is ${embedding.length}, expected 1024 for index compatibility.`);
    }

    return { success: true, embeddings };
  } catch (error) {
    console.error(`❌ Configured embeddings generation failed (${provider}):`);
    console.error(`   Error: ${error.message}`);
    return { success: false, error };
  }
}

async function testBylawSearch() {
  console.log('
====== TESTING BYLAW SEARCH ======');

  // Test Pinecone connection
  const pineconeResult = await testPineconeConnection();
  if (!pineconeResult.success) {
    console.error('Bylaw search test aborted: Pinecone connection failed');
    process.exit(1); // Exit if connection fails
  }
  const { index } = pineconeResult;

  // Test configured Llama embeddings (should be 1024-dim)
  const embeddingsResult = await testConfiguredEmbeddings(EmbeddingProvider.LLAMAINDEX);
  if (!embeddingsResult.success) {
    console.error(
      'Bylaw search test aborted: Llama embeddings generation failed'
    );
    process.exit(1); // Exit if embedding fails
  }
  const { embeddings } = embeddingsResult;

  // Test search functionality
  try {
    // FIX: Removed stray newline character from string literal
    console.log('3. Testing bylaw search with sample queries (using Llama embeddings)...'); 

    let allQueriesSuccessful = true;

    for (const query of testQueries) {
      console.log(`
Searching for: "${query}"`);

      try {
        // Generate embedding for query using the *correctly configured* 1024-dim model
        const queryEmbedding = await embeddings.embedQuery(query);
        
        // Check dimension just before querying
        if (queryEmbedding.length !== 1024) {
           console.error(`❌ ERROR: Query embedding dimension is ${queryEmbedding.length}, but index requires 1024.`);
           throw new Error('Query embedding dimension mismatch');
        }

        // Search Pinecone
        const results = await index.query({
          vector: queryEmbedding,
          topK: 3,
          includeMetadata: true,
        });

        // Check results
        if (results.matches && results.matches.length > 0) {
          console.log(`✅ Found ${results.matches.length} results`);

          // Display top result
          const topResult = results.matches[0];
          console.log(`   Top result (score: ${topResult.score.toFixed(4)}):`);
          console.log(`   - ID: ${topResult.id}`);

          if (topResult.metadata) {
            // Safely access metadata properties
            const metadata = topResult.metadata as any; // Cast to any for flexibility or define a proper type
            console.log(
              `   - Bylaw: ${metadata.bylawNumber || 'Unknown'}`,
            );
            console.log(
              `   - Section: ${metadata.section || 'Unknown section'}`,
            );
            console.log(
              `   - Text snippet: "${(metadata.text || '').substring(0, 100)}..."`,
            );
          }
        } else {
          console.log('⚠️ No results found for this query.');
          // Not necessarily an error, could be a valid outcome
        }
      } catch (queryError) {
        // Log the specific error encountered during the query
        console.error(
          `❌ Error searching for "${query}": ${queryError.message}`,
        );
        // Check if it's the dimension mismatch error specifically
        if (queryError.message?.includes('dimension')) {
            console.error('   This indicates a persistent dimension mismatch issue.');
        }
        allQueriesSuccessful = false;
      }
    }

    console.log('
====== BYLAW SEARCH TEST COMPLETE ======');
    console.log(
      `Overall result: ${allQueriesSuccessful ? '✅ SUCCESS' : '⚠️ TEST COMPLETED WITH ERRORS'}`,
    );

    return allQueriesSuccessful;
  } catch (error) {
    console.error('❌ Bylaw search test failed:');
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

// Run the tests
testBylawSearch()
  .then((success) => {
    console.log(`
Test completed ${success ? 'successfully' : 'with errors'}`);
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
