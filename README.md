# Oak Bay Municipal Bylaws Assistant (FebChat)

A specialized AI assistant for Oak Bay municipal bylaws, providing accurate search, citation, and interpretation for citizens and staff. Updated with improved error handling.

![CI](https://github.com/jdevop33/febchat/actions/workflows/ci.yml/badge.svg)

## 🚨 IMPORTANT SERVICE ANNOUNCEMENT 🚨

We've made significant improvements to the chat functionality:

1. Fixed 500 Internal Server errors with API integration
2. Replaced streaming with more reliable non-streaming approach
3. Added improved error handling and diagnostic logging
4. Enhanced bylaw search with fallback to static data when vector search is unavailable
5. Added automatic detection of bylaw references in text with interactive components
6. Implemented complete PDF management system for bylaw documents

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for solutions to common issues.

## Features

- **Specialized Bylaws AI Model**: Custom-trained model focused on providing accurate bylaw information with proper citations
- **Vector Search**: Connects to a vector database of bylaw content for accurate information retrieval
- **Citation Display**: Shows relevant bylaw citations with section numbers and direct quotes
- **Document Generation**: Creates summary documents of bylaw information
- **Municipal Hall Integration**: Properly directs users to Oak Bay Municipal Hall when human assistance is needed

## Implementation Details

### Frontend Components

- **Custom Welcome Page**: Bylaw-specific instructions and examples
- **Bylaw Citation Component**: Display references with expandable details
- **Export Functionality**: Save bylaw information as reports
- **Oak Bay Municipal Branding**: Consistent municipal branding throughout the interface

### Backend Integration

- **Bylaw Search Tool**: Custom AI prompt engineering for bylaw-specific responses
- **Vector Search Integration**: Efficient search across all municipal bylaws
- **Document Generation**: Create professionally formatted bylaw reports
- **Context-Aware Responses**: AI maintains context through conversations about bylaws

### Model Configuration

- **Bylaw Search**: Specialized for finding relevant bylaws and sections
- **Bylaw Expert**: Advanced interpretation for complex regulatory questions
- **Bylaw Interpreter**: Detailed reasoning for bylaw application scenarios
- **Citation Formatting**: Consistent bylaw reference formatting

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

## Technology Stack

- **Frontend**: Next.js with App Router and React Server Components
- **UI**: TailwindCSS with shadcn/ui components
- **Authentication**: NextAuth.js for secure authentication
- **Database**: Vercel Postgres for chat history and user data
- **Storage**: Vercel Blob for document storage
- **AI**: Integration with OpenAI and Anthropic models
- **Vector Search**: Pinecone for efficient bylaw retrieval

## Development Tools

We've added several debugging and optimization tools in the `scripts` directory:

- **API Endpoint Mapping**: Scans and tests all API endpoints
- **Component Dependency Analyzer**: Visualizes component dependencies and detects circular references
- **Performance Profiling**: Instruments components to measure render times
- **End-to-End Testing**: Tests the full application flow
- **Circular Dependency Fixer**: Automatically resolves circular dependencies

See [scripts/DEBUG-TOOLS-README.md](./scripts/DEBUG-TOOLS-README.md) for usage instructions.

## Deployment

The application is designed to be deployed on Vercel's platform, with environment variables for API keys and database connections.
