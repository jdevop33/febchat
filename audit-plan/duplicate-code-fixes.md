# Duplicate Code Fixes

This document outlines the plan for addressing duplicate code and functionality found in the codebase.

## 1. Duplicate Hooks

### `useScrollToBottom` Hook

- **Issue**: Identical implementation in two locations:
  - `/home/user/febchat/lib/hooks/use-scroll-to-bottom.ts`
  - `/home/user/febchat/components/use-scroll-to-bottom.ts`
- **Solution**:
  - Keep the implementation in `/lib/hooks/use-scroll-to-bottom.ts`
  - Update all imports to use the central implementation
  - Delete the duplicate implementation in components directory

## 2. Vector Search Implementation

### API Batching

- **Issue**: Duplicate batching logic in:
  - `/home/user/febchat/lib/utils/api-batching.ts`
  - `/home/user/febchat/lib/vector/api-batching.ts`
- **Solution**:
  - Combine implementations into a single utility in `/lib/utils/api-batching.ts`
  - Make vector-specific implementation extend the base implementation
  - Update imports in all files

### Embedding Models

- **Issue**: Duplicate model logic in:
  - `/home/user/febchat/lib/vector/embedding-models.ts`
  - `/home/user/febchat/lib/vector/search/embeddings.ts`
- **Solution**:
  - Create a unified implementation in `/lib/vector/search/embeddings.ts`
  - Update the original file to re-export from the new implementation
  - Add deprecation notice to encourage use of the new location

### Search Services

- **Issue**: Multiple search service implementations:
  - `/home/user/febchat/lib/vector/search-service.ts`
  - `/home/user/febchat/lib/vector/search/search-service.ts`
- **Solution**:
  - Complete the migration to the modular structure in `/lib/vector/search/`
  - Update all imports to use the new implementation
  - Add compatibility layer for backward compatibility

## 3. Editor Functions

### Text and Sheet Editor Functions

- **Issue**: Duplicate `areEqual` function in:
  - `text-editor.tsx`
  - `sheet-editor.tsx`
- **Solution**:
  - Extract common functionality to `/lib/editor/functions/common.tsx`
  - Import the shared function in both components

### Input Handling Functions

- **Issue**: Duplicate `handleInput` function in:
  - `multimodal-input.tsx`
  - `message-editor.tsx`
- **Solution**:
  - Create a shared input handler in `/lib/editor/functions/input-handler.tsx`
  - Import the shared function in both components

### Form Submission Logic

- **Issue**: Duplicate `handleSubmit` in:
  - `register/page.tsx`
  - `login/page.tsx`
- **Solution**:
  - Extract common auth form submission logic to `/app/(auth)/form-handlers.ts`
  - Import the shared handlers in both pages

## 4. Document and Artifact Components

### Document Components

- **Issue**: Duplication between:
  - `/components/document.tsx`
  - `/components/documents/document.tsx`
- **Solution**:
  - Complete the migration to `/components/documents/document.tsx`
  - Use re-export pattern for backward compatibility
  - Update all imports to use the new location

### Artifact Components

- **Issue**: Duplication between:
  - `/components/artifact.tsx`
  - `/components/artifacts/artifact.tsx`
- **Solution**:
  - Complete the migration to `/components/artifacts/artifact.tsx`
  - Use re-export pattern for backward compatibility
  - Update all imports to use the new location

## 5. Component File Structure Cleanup

- Follow the structure outlined in the REFACTORING-CHECKLIST.md
- Complete the organization of components into dedicated directories
- Update all import paths in the codebase
- Add index files for component directories that export all components
- Create compatibility exports for backward compatibility
