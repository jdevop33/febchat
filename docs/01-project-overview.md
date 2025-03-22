# FebChat: Oak Bay Municipal Bylaws Assistant

**Last Updated:** March 22, 2025

## Introduction

FebChat is a specialized AI assistant designed for Oak Bay municipal bylaws, providing accurate search, citation, and interpretation for citizens and municipal staff. The application helps users navigate and understand municipal bylaws through an intuitive chat interface with AI-powered responses.

![CI](https://github.com/jdevop33/febchat/actions/workflows/ci.yml/badge.svg)

## Features

- **Specialized Bylaws AI Model**: Custom-trained model focused on providing accurate bylaw information with proper citations
- **Vector Search**: Connects to a vector database of bylaw content for accurate information retrieval
- **Citation Display**: Shows relevant bylaw citations with section numbers and direct quotes
- **Document Generation**: Creates summary documents of bylaw information
- **Municipal Hall Integration**: Properly directs users to Oak Bay Municipal Hall when human assistance is needed
- **PDF Management**: Complete system for handling and displaying PDF documents
- **Automatic Citation Detection**: Identifies bylaw references in text with interactive components

## Implementation Details

### Frontend Components

- **Custom Welcome Page**: Bylaw-specific instructions and examples
- **Bylaw Citation Component**: Display references with expandable details
- **Export Functionality**: Save bylaw information as reports
- **Oak Bay Municipal Branding**: Consistent municipal branding throughout the interface
- **Interactive UI**: Real-time response with expandable bylaw citations

### Backend Integration

- **Bylaw Search Tool**: Custom AI prompt engineering for bylaw-specific responses
- **Vector Search Integration**: Efficient search across all municipal bylaws
- **Document Generation**: Create professionally formatted bylaw reports
- **Context-Aware Responses**: AI maintains context through conversations about bylaws
- **Fallback Mechanisms**: Static data backup when vector search is unavailable

### Model Configuration

- **Bylaw Search**: Specialized for finding relevant bylaws and sections
- **Bylaw Expert**: Advanced interpretation for complex regulatory questions
- **Bylaw Interpreter**: Detailed reasoning for bylaw application scenarios
- **Citation Formatting**: Consistent bylaw reference formatting

## Technology Stack

- **Frontend**: Next.js with App Router and React Server Components
- **UI**: TailwindCSS with shadcn/ui components
- **Authentication**: NextAuth.js for secure authentication
- **Database**: Vercel Postgres for chat history and user data
- **Storage**: Vercel Blob for document storage
- **AI**: Integration with OpenAI and Anthropic models
- **Vector Search**: Pinecone for efficient bylaw retrieval

## Examples

Try asking:

- "What are the regulations for tree removal in Oak Bay?"
- "What permits do I need for home renovations?"
- "Can I keep chickens in my backyard in Oak Bay?"
- "What are the noise restrictions in Oak Bay?"
- "What are the parking regulations for RVs in residential areas?"

## Project Status

### Recent Improvements

We've made significant improvements to the chat functionality:

1. Fixed 500 Internal Server errors with API integration
2. Replaced streaming with more reliable non-streaming approach
3. Added improved error handling and diagnostic logging
4. Enhanced bylaw search with fallback to static data when vector search is unavailable
5. Added automatic detection of bylaw references in text with interactive components
6. Implemented complete PDF management system for bylaw documents

### Future Development

Areas for future enhancement include:

1. Periodic retraining as bylaw content is updated
2. Enhanced authentication for Oak Bay municipal staff with additional capabilities
3. Feedback mechanism to improve responses over time
4. Analytics to track common bylaw questions for Municipal Hall staff awareness

## Getting Started

1. Run the development server:
   ```bash
   pnpm dev
   ```
2. Open [http://localhost:3000](http://localhost:3000) in your browser.
3. Ask questions about Oak Bay bylaws!

For detailed setup instructions, refer to the [Architecture & Development Guide](./02-architecture-development.md)
