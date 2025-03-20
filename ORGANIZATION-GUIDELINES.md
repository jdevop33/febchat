# Project Organization Guidelines

This document outlines the standardized organization structure for the FebChat project, aimed at maintaining consistent patterns, reducing duplication, and improving code maintainability.

## Directory Structure

### Components
Organize components by feature and functionality:

- **components/ui/**: Reusable UI components (buttons, inputs, cards, etc.)
- **components/shared/**: Common utility components used across multiple features
- **components/bylaw/**: Bylaw-specific components
- **components/chat/**: Chat interface components
- **components/artifact/**: Artifact-related components

### Libraries and Utilities

- **lib/hooks/**: Custom React hooks
- **lib/utils/**: General utility functions
- **lib/bylaw/**: Bylaw-specific utilities and processing
- **lib/vector/**: Vector search functionality
- **lib/api/**: API client utilities

### Server-Side
- **app/api/**: API route handlers
- **lib/db/**: Database models and queries

## Import Conventions

- Use the `@/` path alias for all internal imports (e.g., `@/components/ui/button`)
- Group imports in this order:
  1. External dependencies
  2. Internal components/utils
  3. Types
  4. Styles

Example:
```tsx
// External dependencies
import React from 'react';
import { motion } from 'framer-motion';

// Internal imports
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/lib/utils/debounce';

// Types
import type { SearchResult } from '@/types/search';

// Styles (if applicable)
import '@/styles/search.css';
```

## Naming Conventions

- **Components**: Use PascalCase (e.g., `BylawCitation.tsx`)
- **Utilities/Hooks**: Use camelCase with descriptive prefixes (e.g., `use-optimized-api.ts`, `bylaw-utils.ts`)
- **Types/Interfaces**: Use PascalCase (e.g., `BylawMetadata`, `SearchResult`)

## File Pattern Recommendations

- One component per file for maintainability
- Place related files in the same directory when they form a logical unit
- Keep index files minimal - use them only for re-exports, not for component definitions
- Co-locate tests with the files they test when possible

## Documentation Standards

- Add JSDoc comments for all public functions, hooks, and components
- Include purpose, parameters, and return values in documentation
- Provide usage examples for complex utilities

## Duplication Prevention Guidelines

- Before creating a new utility or component, check if a similar one already exists
- If you find multiple implementations of similar functionality, consolidate them
- Maintain a central registry of frequently used patterns in the codebase
- Do quarterly code audits to identify and eliminate duplications

Following these guidelines will help maintain a clean, organized, and efficient codebase as the project continues to grow.