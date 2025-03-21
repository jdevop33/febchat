const Anthropic = require('@anthropic-ai/sdk');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const apiKey = process.env.ANTHROPIC_API_KEY;
console.log(
  'API key first 10 chars:',
  apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET',
);

async function main() {
  try {
    // Initialize client
    const client = new Anthropic({ apiKey });

    // Test simple completion
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 50,
      system: 'You are a helpful assistant. Be very brief.',
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello!' }] }],
      stream: false,
    });

    console.log('Success! Response:', response.content[0].text);
    return true;
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Error type:', error.name);
    if (error instanceof Anthropic.APIError) {
      console.error('Status:', error.status);
      console.error('Type:', error.type);
    }
    return false;
  }
}

main()
  .then((success) => process.exit(success ? 0 : 1))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
