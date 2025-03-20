# FebChat Architecture

This document outlines the clean architecture used in the FebChat application and proposed improvements based on dependency analysis.

## Directory Structure

FebChat follows a clean architecture pattern with separation of concerns. We're proposing updates to this structure based on dependency analysis:

```
febchat/
├── app/                  # Next.js pages and API routes
│   ├── (auth)/           # Authentication-related pages
│   ├── (chat)/           # Chat-related pages and API routes
│   └── api/              # API routes
├── components/           # UI components
│   ├── artifacts/        # Artifact-related components (NEW)
│   ├── bylaw/            # Bylaw-specific components
│   ├── chat/             # Chat-specific components
│   ├── documents/        # Document-related components (NEW)
│   ├── shared/           # Shared/common components
│   └── ui/               # UI primitives based on shadcn/ui
├── hooks/                # React hooks
├── lib/                  # Core business logic
│   ├── api/              # API client code
│   ├── db/               # Database operations
│   ├── editor/           # Editor functionality with fixed structure
│   │   ├── config/       # Editor configuration (separate from functions)
│   │   ├── functions/    # Editor operations
│   │   └── types/        # Editor type definitions
│   ├── bylaw/            # Bylaw-related functionality
│   │   └── processing/   # PDF and content processing
│   ├── utils/            # Utility functions
│   └── vector/           # Vector search functionality
│       └── search/       # Modular search implementation
│           ├── types/    # Search type definitions
│           ├── utils/    # Search utilities
│           └── etc.      # Other search modules
├── public/               # Static assets
│   └── pdfs/             # PDF documents
├── scripts/              # Utility scripts
└── types/                # TypeScript type definitions
    ├── artifacts/        # Artifact type definitions (NEW)
    ├── documents/        # Document type definitions (NEW)
    └── messages/         # Message type definitions (NEW)
```

## Key Architectural Improvements

Based on dependency analysis, we've identified these structural improvements:

1. **Separate Type Definitions**: Extract shared types to dedicated files to break circular dependencies
2. **Component Reorganization**: Group related components into meaningful directories
3. **Modular Editor Structure**: Restructure editor code to prevent circular dependencies
4. **Clearer Boundaries**: Create clearer boundaries between modules

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

## Addressing Circular Dependencies

Based on our dependency analysis, we've identified critical circular dependencies that need to be resolved:

### Artifact Component Cycle

The most pressing circular dependency involves the artifact component system:
- `components/artifact.tsx` → `artifact-messages.tsx` → `message.tsx` → `document-preview.tsx` → `document.tsx` → `artifact.tsx`

Recommendations:
1. Extract all shared interfaces to separate type files in `/types/artifacts/` and `/types/documents/`
2. Break large components into smaller, focused components with clear responsibilities
3. Implement a unidirectional data flow pattern
4. Move artifact components to a dedicated `/components/artifacts/` directory

### Editor Configuration Cycle

Another circular dependency exists in the editor system:
- `lib/editor/config.ts` → `lib/editor/functions.tsx` → `lib/editor/config.ts`

Recommendations:
1. Extract shared types to `/lib/editor/types/`
2. Separate configuration constants into `/lib/editor/config/constants.ts`
3. Move common utility functions to a separate file

## Module Complexity Reduction

These modules have been identified as overly complex:

1. **components/message.tsx** (12 dependencies):
   - Split into smaller components with single responsibilities
   - Extract message rendering logic from formatting logic

2. **components/artifact.tsx** (7 dependencies, imported by 9 modules):
   - Create a facade pattern with smaller internal components
   - Extract type definitions to dedicated files

3. **components/document-preview.tsx** (8 dependencies):
   - Split document preview from document rendering
   - Create specialized preview components for each document type

4. **lib/vector/optimized-search-service.ts** (7 dependencies):
   - Extract search strategy implementations to separate files
   - Create cleaner interfaces between search service components

## Maintenance Guidelines

1. Monitor for circular dependencies with regular dependency analysis
2. Keep components small and focused on single responsibilities 
3. Follow the established directory structure
4. Use the code audit script to identify issues
5. Refactor duplicate functionality into shared utilities
6. Maintain type safety throughout the codebase
7. Extract shared types to dedicated type definition files
8. Use facade patterns for complex components
9. Implement unidirectional data flow where possible