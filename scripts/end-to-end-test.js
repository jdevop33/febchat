import fetch from 'node-fetch';
import { setTimeout } from 'timers/promises';

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

async function runE2ETest() {
  console.log('Starting end-to-end test...');
  let cookies = '';
  
  // Step 1: Register or login a test user
  try {
    console.log('Attempting login...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        callbackUrl: `${BASE_URL}/`
      })
    });
    
    if (loginResponse.ok) {
      console.log('✅ Login successful');
      // Get cookies for subsequent requests
      cookies = loginResponse.headers.get('set-cookie') || '';
    } else {
      console.log('❌ Login failed, attempting registration...');
      
      // Try registering
      const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: TEST_EMAIL,
          password: TEST_PASSWORD
        })
      });
      
      if (registerResponse.ok) {
        console.log('✅ Registration successful, trying login again...');
        // Try login again
        const retryLogin = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            callbackUrl: `${BASE_URL}/`
          })
        });
        
        if (retryLogin.ok) {
          console.log('✅ Login after registration successful');
          cookies = retryLogin.headers.get('set-cookie') || '';
        } else {
          throw new Error('Login after registration failed');
        }
      } else {
        throw new Error('Registration failed');
      }
    }
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    process.exit(1);
  }
  
  // Step 2: Create a new chat
  let chatId;
  try {
    console.log('Creating a new chat...');
    const createChatResponse = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: 'Hello, can you tell me about the noise regulations in Oak Bay?'
        }]
      })
    });
    
    if (createChatResponse.ok) {
      const chatData = await createChatResponse.json();
      chatId = chatData.id;
      console.log(`✅ Chat created with ID: ${chatId}`);
    } else {
      throw new Error('Failed to create chat');
    }
  } catch (error) {
    console.error('❌ Chat creation failed:', error);
    process.exit(1);
  }
  
  // Step 3: Wait for response and check chat history
  try {
    console.log('Waiting for AI response...');
    // Wait for AI to potentially respond
    await setTimeout(5000);
    
    console.log('Checking chat history...');
    const historyResponse = await fetch(`${BASE_URL}/api/history`, {
      headers: {
        'Cookie': cookies
      }
    });
    
    if (historyResponse.ok) {
      const history = await historyResponse.json();
      console.log(`✅ Chat history contains ${history.length} chats`);
      
      // Find our chat
      const ourChat = history.find(chat => chat.id === chatId);
      if (ourChat) {
        console.log('✅ Found our chat in history');
      } else {
        console.warn('⚠️ Could not find our chat in history');
      }
    } else {
      throw new Error('Failed to fetch chat history');
    }
  } catch (error) {
    console.error('❌ Chat history check failed:', error);
  }
  
  // Step 4: Create an artifact (if applicable to your app)
  try {
    console.log('Creating an artifact...');
    const createArtifactResponse = await fetch(`${BASE_URL}/api/document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        title: 'Test Artifact',
        kind: 'text',
        content: 'This is a test artifact created by the E2E test script.'
      })
    });
    
    if (createArtifactResponse.ok) {
      const artifactData = await createArtifactResponse.json();
      console.log(`✅ Artifact created with ID: ${artifactData.id}`);
    } else {
      console.warn('⚠️ Artifact creation failed');
    }
  } catch (error) {
    console.error('❌ Artifact creation check failed:', error);
  }
  
  // Step 5: Test bylaw search
  try {
    console.log('Testing bylaw search...');
    const searchResponse = await fetch(`${BASE_URL}/api/bylaws/search?q=noise`, {
      headers: {
        'Cookie': cookies
      }
    });
    
    if (searchResponse.ok) {
      const searchResults = await searchResponse.json();
      console.log(`✅ Bylaw search returned ${searchResults.length} results`);
    } else {
      console.warn('⚠️ Bylaw search failed');
    }
  } catch (error) {
    console.error('❌ Bylaw search check failed:', error);
  }
  
  console.log('End-to-end test completed!');
}

runE2ETest().catch(console.error);