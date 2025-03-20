# FebChat Architecture

This document outlines the clean architecture used in the FebChat application.

## Directory Structure

FebChat follows a clean architecture pattern with separation of concerns:

```
febchat/
├── app/            # Next.js pages and API routes
│   ├── (auth)/     # Authentication-related pages
│   ├── (chat)/     # Chat-related pages and API routes
│   └── api/        # API routes
├── components/     # UI components
│   ├── bylaw/      # Bylaw-specific components
│   ├── chat/       # Chat-specific components  
│   ├── shared/     # Shared/common components
│   └── ui/         # UI primitives based on shadcn/ui
├── hooks/          # React hooks
├── lib/            # Core business logic
│   ├── api/        # API client code
│   ├── db/         # Database operations
│   ├── pdf/        # PDF processing functionality
│   ├── utils/      # Utility functions
│   └── vector/     # Vector search functionality
├── public/         # Static assets
│   └── pdfs/       # PDF documents
├── scripts/        # Utility scripts
└── types/          # TypeScript type definitions
```

## Architectural Principles

### 1. Separation of Concerns

- **UI Layer**: Components and pages
- **Data Access Layer**: API client code, database operations
- **Business Logic Layer**: Core functionality in lib directories
- **Infrastructure Layer**: External services, database, vector search

### 2. Dependency Direction

Dependencies flow inward:

- UI depends on business logic
- Business logic depends on data access layer
- Data access layer depends on infrastructure
- Nothing depends on UI

### 3. Clean Module Boundaries

Each module has well-defined boundaries with clear interfaces:

- **API Clients**: In `/lib/api` provide interfaces to external services
- **Database Operations**: In `/lib/db` manage data persistence
- **Vector Search**: In `/lib/vector` handle semantic search functionality
- **PDF Processing**: In `/lib/pdf` handle document processing

### 4. Composable Components

UI components are organized for maximum reusability:

- **UI primitives**: Base components in `/components/ui`
- **Feature-specific components**: In dedicated subdirectories
- **Shared components**: Common components in `/components/shared`

## Key Technologies

- **Next.js App Router**: For routing and API routes
- **React Server Components**: For performant UI rendering
- **Drizzle ORM**: For database operations
- **Pinecone**: For vector search functionality
- **Tailwind CSS**: For styling
- **shadcn/ui**: For UI components
- **TypeScript**: For type safety

## Data Flow

1. **User Interaction**: Via UI components
2. **API Request**: Client-side API calls using API clients
3. **Server Processing**: API routes handle requests
4. **Data Access**: Database or vector search queries
5. **Response**: Data returned to client

## Component Design Philosophy

- **Atomic Design**: Components are built from small, composable pieces
- **Single Responsibility**: Each component has a clear purpose
- **Decoupled State**: State management is handled at appropriate levels
- **Consistent Styling**: Tailwind utility classes with `cn()` helper

## Testing Strategy

- Unit tests for utility functions
- Component tests for UI components
- Integration tests for API routes
- E2E tests for critical user flows

## Maintenance Guidelines

1. Keep components small and focused
2. Follow the established directory structure
3. Use the code audit script to identify issues
4. Refactor duplicate functionality into shared utilities
5. Maintain type safety throughout the codebase