# Refactoring Checklist

This document outlines the remaining tasks to complete the restructuring of the FebChat application according to the clean architecture pattern.

## Critical Priority: Breaking Circular Dependencies

The dependency analysis has identified several circular dependencies that have been addressed:

- [x] **Artifact Component Cycle**:
  - ✅ Created separate type definitions in `/types/artifacts/artifact-types.ts`
  - ✅ Created separate type definitions in `/types/documents/document-types.ts`
  - ✅ Created separate type definitions in `/types/messages/message-types.ts`
  - ✅ Moved artifact components to `/components/artifacts/`
  - ✅ Moved document components to `/components/documents/`
  - ✅ Moved message components to `/components/messages/`
  - ✅ Added compatibility exports for backward compatibility

- [x] **Editor Configuration Cycle**:
  - ✅ Created separate type definitions in `/lib/editor/types/`
  - ✅ Moved constants to `/lib/editor/config/constants.ts`
  - ✅ Moved functions to `/lib/editor/functions/editor-functions.tsx`
  - ✅ Moved suggestions to `/lib/editor/functions/suggestions.tsx`
  - ✅ Added compatibility exports for backward compatibility

## High Complexity Modules to Refactor

Progress:
- [x] `components/message.tsx` moved to `components/messages/message.tsx` with proper type imports
- [x] `components/document-preview.tsx` moved to `components/documents/document-preview.tsx` with proper type imports
- [x] `components/artifact.tsx` moved to `components/artifacts/artifact.tsx` with proper type imports
- [x] `lib/vector/optimized-search-service.ts` refactored into modular structure in `lib/vector/search/`:
  - ✅ Created `lib/vector/search/types.ts` for shared types
  - ✅ Created `lib/vector/search/embeddings.ts` for embedding functionality 
  - ✅ Created `lib/vector/search/utils.ts` for search utilities
  - ✅ Created `lib/vector/search/batch-processor.ts` for batch processing
  - ✅ Created `lib/vector/search/search-service.ts` for main search functionality
  - ✅ Created `lib/vector/search/index.ts` for unified exports
  - ✅ Updated original file to re-export from new modules

## High Priority Tasks

- [ ] Update import paths in all files to use the new structure
- [ ] Complete reorganization of the remaining components into categories
- [ ] Refactor remaining duplicated functionality identified in the code audit
- [ ] Create type definitions for all major data structures
- [ ] Update all direct fetch calls to use the API client modules

## Component Reorganization

Progress:
- [x] Move artifact-related components to `/components/artifacts`
- [x] Move document-related components to `/components/documents`
- [x] Move message-related components to `/components/messages`
- [ ] Move UI component primitives to `/components/ui`
- [ ] Move remaining bylaw-related components to `/components/bylaw`
- [ ] Move remaining chat-related components to `/components/chat`
- [ ] Move general utility components to `/components/shared`
- [ ] Create index files for each component directory for easier imports

## Code Cleanup

- [ ] Review unused files identified by the code audit:
  - [ ] `/components/visibility-selector.tsx`
  - [ ] `/components/sign-out-form.tsx`
  - [ ] `/components/model-selector.tsx`
  - [ ] `/components/bylaw-search-filters.tsx`
  - [ ] `/types/minimist.d.ts`
  - [ ] ...and others
- [ ] Fix duplicate functionality:
  - [ ] `areEqual` in text-editor.tsx and sheet-editor.tsx
  - [ ] `handleInput` in multimodal-input.tsx and message-editor.tsx
  - [ ] `handleSubmit` in register/page.tsx and login/page.tsx

## API Layer

- [ ] Complete the API client implementation
- [ ] Update server-side implementation to match client interfaces
- [ ] Add error handling and retry logic to API clients
- [ ] Add TypeScript types for all API responses

## Testing

- [ ] Create a testing strategy for the restructured codebase
- [ ] Add unit tests for critical utilities and hooks
- [ ] Add component tests for UI components
- [ ] Add integration tests for API endpoints

## Documentation

- [ ] Update README.md with new architecture information
- [ ] Create examples of how to add new components following the architecture
- [ ] Document API client usage patterns
- [ ] Create a development guide for the new structure

## Performance Optimization

- [ ] Run the code audit script again after reorganization
- [ ] Profile the application for performance bottlenecks
- [ ] Identify components that can be code-split or lazy-loaded
- [ ] Optimize API calls with batching and caching

## Process for Each File

When moving a file to its new location, follow these steps:

1. Copy the file to the new location
2. Update import paths within the file
3. Update import paths in files that import this file
4. Test that the functionality still works
5. Remove the original file once all references are updated

## Next Steps Workflow

1. Start with core utilities and hooks
2. Move to API clients and services
3. Then handle UI components
4. Finally address specialized functionality

## Completion Criteria

The refactoring will be considered complete when:

1. All files are in their appropriate locations according to the new structure
2. All duplicate functionality has been consolidated
3. All import paths have been updated
4. The application runs without errors
5. The code audit script shows improved metrics