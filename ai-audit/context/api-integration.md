# API Integration Guide

API integration is critical for the ai-chatbot project to harness data and functionalities from various external services. This document covers the essentials for integrating and managing external APIs efficiently and effectively.

## API Client Setup

Setting up an API client involves configuring the base settings like BASE URL, authentication tokens, and creating a client module that will be used to interact with the API.

### 1. **Creating a Base Client**
For the ai-chatbot project, `axios` has been used widely due to its promise-based nature and ease of handling requests. Below is an example setup in the `lib/api` directory.

```typescript
import axios from 'axios';
import { API_BASE_URL } from './constants';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepting for adding authorization token dynamically
apiClient.interceptors.request.use(function (config) {
  const token = localStorage.getItem('authToken');
  config.headers.Authorization = token ? `Bearer ${token}` : '';
  return config;
});
```

### 2. **Environment Configuration**
Store API keys and base URLs in `.env` files which must not be tracked in version control for security reasons.

```plaintext
API_BASE_URL=https://api.example.com
API_KEY=your_secret_key
```

## Authentication with APIs

Authentication is critical for interacting with an API securely. Most modern APIs use token-based authentication system.

### Implementing Authentication
For APIs that require OAuth2.0, using packages like `@nestjs/passport` can streamline the process. Here, an authentication flow is set up using the NextAuth API in `app/(auth)/api`.

```typescript
import { apiClient } from '@/lib/api';

export async function getAuthenticatedUser(token: string) {
  try {
    const response = await apiClient.get('/user/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user profile', error);
    throw error;
  }
}
```

## Error Handling

Proper error handling in API interactions ensures that the application behaves predictably and offers a good user experience even when things go wrong.

### Example: Robust Error Handling with Axios
```typescript
apiClient.interceptors.response.use(response => {
  return response;
}, error => {
  if (error.response) {
    // The request was made and the server responded with a status code
    console.error('Error status', error.response.status);
    console.error('Error data', error.response.data);
  } else if (error.request) {
    // The request was made but no response was received
    console.error('Error request', error.request);
  } else {
    // Something else happened in setting up the request
    console.error('Error message', error.message);
  }
  return Promise.reject(error);
});
```

## Request/Response Patterns

Understanding and implementing correct request and response patterns is crucial for system integrity.

### GET and POST Examples

```typescript
// GET request for fetching information
export const fetchDocument = async (documentId) => {
  return apiClient.get(`/documents/${documentId}`);
};

// POST request to create a new resource
export const createDocument = async (documentData) => {
  return apiClient.post('/documents', documentData);
};
```

## API Abstraction Layers

To manage complexity, abstract out API calls into a dedicated service layer. This layer handles all interactions with the API, providing a clear interface to the rest of your application.

### Example: DocumentService

```typescript
class DocumentService {
  async getDocument(documentId) {
    const response = await apiClient.get(`/documents/${documentId}`);
    return response.data;
  }

  async createDocument(data) {
    const response = await apiClient.post('/documents', data);
    return response.data;
  }
}

export default new DocumentService();
```

## Best Practices and Pitfalls

**Best Practices:**
- Use environment configurations for sensitive keys.
- Maintain modularity in API interactions.
- Handle errors gracefully and provide meaningful feedback to the user.

**Common Pitfalls:**
- Hard-coding API keys in the source code.
- Not handling different error statuses from API responses.
- Overcomplicating the API client with unnecessary logic.

By adhering to these guidelines and structuring API integration effectively, the ai-chatbot project can leverage external APIs smoothly and securely.