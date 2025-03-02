// Enhanced test for Anthropic client
const Anthropic = require('@anthropic-ai/sdk');
const dotenv = require('dotenv');

// Load environment variables explicitly from .env.local
dotenv.config({ path: '.env.local' });

// Display environment info
console.log('====== ENVIRONMENT ======');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? `${process.env.ANTHROPIC_API_KEY.slice(0, 10)}...` : 'NOT SET');

// Available models to test
const models = {
  sonnet: 'claude-3-7-sonnet-20250219',
  fallback: 'claude-3-5-sonnet-20240620',
  haiku: 'claude-3-haiku-20240307'
};

// Validate API key presence and format
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('❌ ERROR: ANTHROPIC_API_KEY is required');
  process.exit(1);
}

if (!apiKey.startsWith('sk-ant-')) {
  console.error('⚠️ WARNING: ANTHROPIC_API_KEY format appears incorrect (should start with sk-ant-)');
  // Continue anyway to see what happens
}

async function main() {
  console.log('====== TESTING ANTHROPIC CONNECTION ======');
  
  try {
    // Initialize Anthropic client
    console.log('1. Initializing Anthropic client...');
    const client = new Anthropic({ 
      apiKey,
      timeout: 30000 // 30 second timeout for API requests
    });
    console.log('✅ Client initialized');

    // Test simple text completion
    console.log('\n2. Testing simple text completion API...');
    try {
      console.log(`   Using model: ${models.fallback}`);
      const response = await client.messages.create({
        model: models.fallback,
        max_tokens: 50,
        system: "You are a helpful assistant. Be very brief.",
        messages: [{ 
          role: 'user', 
          content: [{ type: 'text', text: 'Hello, can you tell me what Oak Bay is?' }]
        }],
        stream: false
      });
      
      console.log('✅ Text completion successful!');
      console.log('   Response:', `${JSON.stringify(response.content[0]?.text).slice(0, 80)}...`);
      console.log('   Model used:', response.model);
      console.log('   Usage:', response.usage);
      
      // Set global success flag
      completionSuccess = true;
    } catch (completionError) {
      console.error('❌ Text completion failed:', completionError.message);
      console.error('   Error type:', completionError.name);
      console.error('   Is Anthropic error?', completionError instanceof Anthropic.APIError);
      
      if (completionError instanceof Anthropic.APIError) {
        console.error('   Status:', completionError.status);
        console.error('   Type:', completionError.type);
      }
      
      // Try fallback model
      try {
        console.log('\n   Trying with alternate model...');
        const fallbackResponse = await client.messages.create({
          model: models.haiku, // Try a different model
          max_tokens: 30,
          system: "You are a helpful assistant.",
          messages: [{ 
            role: 'user', 
            content: [{ type: 'text', text: 'Hi' }]
          }],
          stream: false
        });
        
        console.log('✅ Fallback model worked!');
        console.log('   Response:', JSON.stringify(fallbackResponse.content[0]?.text).slice(0, 80));
      } catch (fallbackError) {
        console.error('❌ Fallback model also failed:', fallbackError.message);
      }
    }
    
    // Test messages API with simpler content format
    console.log('\n3. Testing messages API with simpler format...');
    try {
      const simpleResponse = await client.messages.create({
        model: models.fallback,
        max_tokens: 50,
        system: "You are a helpful assistant.",
        messages: [{ 
          role: 'user', 
          content: 'Hello' // Not using complex array format
        }],
        stream: false
      });
      
      console.log('✅ Simple format test successful!');
      if (simpleResponse.content?.[0]?.text) {
        console.log('   Response:', simpleResponse.content[0].text.slice(0, 80));
      }
    } catch (simpleError) {
      console.error('❌ Simple format test failed:', simpleError.message);
    }

    console.log('\n====== ANTHROPIC TESTS COMPLETE ======');
    const results = {
      clientInitialization: true,
      apiConnection: completionSuccess
    };
    console.log('Overall result:', completionSuccess ? '✅ SUCCESS' : '❌ FAILURE');
    
    return results;
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    console.error('Full error:', error);
    
    return {
      clientInitialization: false,
      apiConnection: false
    };
  }
}

let completionSuccess = false;

main()
  .then(results => {
    // The test is successful if we were able to communicate with the API
    process.exit(completionSuccess ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error in main:', error);
    process.exit(1);
  });
