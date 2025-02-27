// Simple test for Anthropic client
const Anthropic = require('@anthropic-ai/sdk');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY is required');
  process.exit(1);
}

async function main() {
  // Initialize Anthropic client
  const client = new Anthropic({ apiKey });
  
  // Print available methods
  console.log('Client methods:');
  console.log(Object.keys(client));
  console.log('\nClient prototype methods:');
  console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client)));
  
  try {
    // Test a simple embedding
    console.log('\nTrying to create embedding...');
    
    // Explore beta methods
    console.log('Beta methods:');
    console.log(Object.keys(client.beta));
    
    if (client.beta?.embeddings) {
      console.log('Using client.beta.embeddings');
      const response = await client.beta.embeddings.create({
        model: 'claude-3-haiku-20240307',
        input: 'Hello world',
      });
      console.log('Success! First 5 embedding values:', response.embedding.slice(0, 5));
    } else if (typeof client.embeddings === 'function') {
      console.log('Using client.embeddings()');
      const response = await client.embeddings({
        model: 'claude-3-haiku-20240307',
        input: 'Hello world',
      });
      console.log('Success! First 5 embedding values:', response.embedding.slice(0, 5));
    } else if (client.embeddings) {
      console.log('Using client.embeddings.create()');
      const response = await client.embeddings.create({
        model: 'claude-3-haiku-20240307',
        input: 'Hello world',
      });
      console.log('Success! First 5 embedding values:', response.embedding.slice(0, 5));
    } else {
      console.log('Looking for other embedding methods...');
      for (const key of Object.keys(client)) {
        if (key.toLowerCase().includes('embed')) {
          console.log(`Found potential method: ${key}`);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
  }
}

main().catch(console.error);