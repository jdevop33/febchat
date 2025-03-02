// Test script for the bylaws search functionality
const dotenv = require('dotenv');
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Log environment variables
console.log('====== ENVIRONMENT ======');
console.log('PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? `${process.env.PINECONE_API_KEY.slice(0, 10)}...` : 'NOT SET');
console.log('PINECONE_INDEX:', process.env.PINECONE_INDEX || 'NOT SET');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.slice(0, 10)}...` : 'NOT SET');

// Sample queries to test
const testQueries = [
  'What are the tree cutting regulations in Oak Bay?',
  'Parking requirements for residential zones',
  'Noise regulations for construction',
  'Dog leash requirements in parks'
];

async function testPineconeConnection() {
  try {
    console.log('\n1. Testing Pinecone connection...');
    
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY is not set in environment variables');
    }
    
    // Initialize Pinecone client
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    console.log('✅ Pinecone client initialized successfully');
    
    // Get index name
    const indexName = process.env.PINECONE_INDEX || 'oak-bay-bylaws';
    
    // Connect to index
    console.log(`Connecting to index: ${indexName}`);
    const index = pinecone.index(indexName);
    
    // Get index stats
    const stats = await index.describeIndexStats();
    console.log('✅ Index statistics:');
    console.log(`   - Total vectors: ${stats.totalRecordCount}`);
    console.log(`   - Dimensions: ${stats.dimension}`);
    
    return { success: true, index };
  } catch (error) {
    console.error('❌ Pinecone connection failed:');
    console.error(`   Error: ${error.message}`);
    return { success: false, error };
  }
}

async function testOpenAIEmbeddings() {
  try {
    console.log('\n2. Testing OpenAI embeddings generation...');
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    
    // Initialize OpenAI embeddings
    const embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small',
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    
    // Generate an embedding
    const testQuery = 'tree protection bylaw';
    console.log(`Generating embedding for: "${testQuery}"`);
    const embedding = await embeddings.embedQuery(testQuery);
    
    console.log('✅ Embedding generated successfully');
    console.log(`   - Embedding dimensions: ${embedding.length}`);
    console.log(`   - First few values: ${embedding.slice(0, 3).map(v => v.toFixed(6)).join(', ')}...`);
    
    return { success: true, embeddings };
  } catch (error) {
    console.error('❌ OpenAI embeddings generation failed:');
    console.error(`   Error: ${error.message}`);
    return { success: false, error };
  }
}

async function testBylawSearch() {
  console.log('\n====== TESTING BYLAW SEARCH ======');
  
  // Test Pinecone connection
  const pineconeResult = await testPineconeConnection();
  if (!pineconeResult.success) {
    console.error('Bylaw search test aborted: Pinecone connection failed');
    return false;
  }
  
  // Test OpenAI embeddings
  const embeddingsResult = await testOpenAIEmbeddings();
  if (!embeddingsResult.success) {
    console.error('Bylaw search test aborted: OpenAI embeddings generation failed');
    return false;
  }
  
  // Test search functionality
  try {
    console.log('\n3. Testing bylaw search with sample queries...');
    
    const { index } = pineconeResult;
    const { embeddings } = embeddingsResult;
    
    let allQueriesSuccessful = true;
    
    for (const query of testQueries) {
      console.log(`\nSearching for: "${query}"`);
      
      try {
        // Generate embedding for query
        const queryEmbedding = await embeddings.embedQuery(query);
        
        // Search Pinecone
        const results = await index.query({
          vector: queryEmbedding,
          topK: 3,
          includeMetadata: true
        });
        
        // Check results
        if (results.matches && results.matches.length > 0) {
          console.log(`✅ Found ${results.matches.length} results`);
          
          // Display top result
          const topResult = results.matches[0];
          console.log(`   Top result (score: ${topResult.score.toFixed(4)}):`);
          console.log(`   - ID: ${topResult.id}`);
          
          if (topResult.metadata) {
            console.log(`   - Bylaw: ${topResult.metadata.bylawNumber || 'Unknown'}`);
            console.log(`   - Section: ${topResult.metadata.section || 'Unknown section'}`);
            console.log(`   - Text snippet: "${(topResult.metadata.text || '').substring(0, 100)}..."`);
          }
        } else {
          console.log('❌ No results found');
          allQueriesSuccessful = false;
        }
      } catch (queryError) {
        console.error(`❌ Error searching for "${query}": ${queryError.message}`);
        allQueriesSuccessful = false;
      }
    }
    
    console.log('\n====== BYLAW SEARCH TEST COMPLETE ======');
    console.log(`Overall result: ${allQueriesSuccessful ? '✅ SUCCESS' : '⚠️ PARTIAL SUCCESS'}`);
    
    return allQueriesSuccessful;
  } catch (error) {
    console.error('❌ Bylaw search test failed:');
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

// Run the tests
testBylawSearch()
  .then(success => {
    console.log(`\nTest completed ${success ? 'successfully' : 'with errors'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });