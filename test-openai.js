// Simple test for OpenAI API key
const OpenAI = require('openai');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Get the API key from environment variables
const apiKey = process.env.OPENAI_API_KEY;
console.log('API key first 10 chars:', apiKey.substring(0, 10) + '...');

async function main() {
  try {
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey
    });
    
    // Try a simple completion
    console.log('Testing API key with a simple completion...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello' }],
    });
    
    console.log('Success! Response:', completion.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    return false;
  }
}

main().catch(console.error);