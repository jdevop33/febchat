# Oak Bay Municipality Bylaws Chatbot

A specialized AI assistant for answering questions about Oak Bay municipal bylaws, built on the Next.js AI Chatbot template.

## Features

- **Specialized Bylaws AI Model**: Custom-trained Claude model focused on providing accurate bylaw information with proper citations
- **Vector Search**: Connects to a vector database of bylaw content for accurate information retrieval
- **Citation Display**: Shows relevant bylaw citations with section numbers and direct quotes
- **Document Generation**: Creates summary documents of bylaw information
- **Municipal Hall Integration**: Properly directs users to Oak Bay Municipal Hall when human assistance is needed

## Implementation Details

### Frontend Components
- Custom welcome page with bylaw-specific instructions
- Bylaw citation component for displaying references
- Specialized UI header for Oak Bay Municipal branding
- Direct link to official Oak Bay bylaw repository

### Backend Integration
- Custom AI prompt engineering for bylaw-specific responses
- Bylaw search tool integration for vector search
- Document generation for bylaw summaries
- Specialized error handling for unclear bylaw questions

### Model Configuration
- Default model set to the bylaw-specific Claude model
- Custom prompt templates for different bylaw categories
- Citation formatting for accurate bylaw references

## Getting Started

1. Run the development server:
   ```bash
   pnpm dev
   ```
2. Open [http://localhost:3000](http://localhost:3000) in your browser.
3. Ask questions about Oak Bay bylaws!

## Examples

Try asking:
- "What are the regulations for tree removal in Oak Bay?"
- "What permits do I need for home renovations?"
- "Can I keep chickens in my backyard in Oak Bay?"
- "What are the noise restrictions in Oak Bay?"
- "What are the parking regulations for RVs in residential areas?"

## Notes for Further Development

1. In production, connect to an actual vector database of Oak Bay bylaws
2. Set up periodic retraining as bylaw content is updated
3. Add authentication for Oak Bay municipal staff with additional capabilities
4. Implement feedback mechanism to improve responses over time
5. Add analytics to track common bylaw questions for Municipal Hall staff awareness