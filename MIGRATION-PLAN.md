# Migration Plan for Clean Architecture

Based on the code audit, dependency analysis, and project evaluation, here's a comprehensive plan to refactor the codebase following a clean architecture pattern.

## Implementation Progress

### Completed

✅ Created directory structure for new architecture
- Created `/lib/api`, `/lib/pdf`, `/lib/vector` directories
- Created `/components/bylaw`, `/components/chat`, `/components/shared` directories

✅ Started moving files to appropriate locations
- Moved bylaw processing code to `/lib/pdf`
- Moved vector search functionality to `/lib/vector` 
- Moved hooks to `/hooks` directory
- Started organizing components into categories

✅ Refactored duplicate functionality
- Created centralized `useDebounce` utility in `/lib/utils/debounce.ts`
- Updated component-optimization.ts and use-optimized-api.ts to use the shared utility

✅ Created API client structure
- Created `/lib/api/index.ts` as the main entry point
- Created `/lib/api/chat-api.ts` with chat API functionality
- Created `/lib/api/bylaw-api.ts` with bylaw API functionality
- Created `/lib/api/auth-api.ts` with authentication functionality

✅ Completed dependency analysis
- Identified circular dependencies between components
- Located high complexity modules
- Found potentially unused modules
- Created detailed refactoring checklist

✅ Created architecture documentation
- Created `/ARCHITECTURE.md` explaining the new structure
- Added recommendations for resolving circular dependencies

## Current Structure Analysis

- The `/app` directory already follows Next.js App Router conventions, so it mostly stays as is
- The `/components` directory contains UI components but needs organization
- The `/lib` directory has many subdirectories that need reorganization
- We have `/hooks` but some hooks are scattered in other directories
- The `/types` directory exists but needs more type definitions
- The `/scripts` directory is already organized correctly
- Vector search, PDF functionality, and API clients are currently mixed in various directories

## Migration Steps

### 1. Create New Directory Structure

Create the following structure if not already present:
- `/lib/api` - For API client code
- `/lib/db` - For database operations (already exists)
- `/lib/vector` - For vector search functionality
- `/lib/pdf` - For PDF processing

### 2. File Movements

#### App Directory (Keep as is)
- Keep all `/app` files in their current location for Next.js App Router compliance

#### Components Directory
- Keep all UI components in `/components`
- Organize into subdirectories if needed:
  - `/components/ui` (already exists)
  - `/components/bylaw` (for bylaw-specific components)
  - `/components/chat` (for chat-specific components)
  - `/components/shared` (for shared components)

#### Lib Directory
- Move vector search functionality to `/lib/vector`:
  - `/lib/bylaw-search` → `/lib/vector`
  - `/lib/vector-search` → `/lib/vector`
- Move PDF processing to `/lib/pdf`:
  - `/lib/bylaw-processing` → `/lib/pdf`
- Move API client code to `/lib/api`:
  - Create API client wrappers for external services
- Keep database code in `/lib/db`
- Keep utility functions in `/lib/utils`

#### Hooks Directory
- Move all hooks to `/hooks`:
  - `/lib/hooks/*` → `/hooks`
  - `/components/use-*.ts` → `/hooks`

#### Types Directory
- Create comprehensive type definitions in `/types`:
  - Move `/types/langchain.d.ts`, `/types/minimist.d.ts` to `/types`
  - Extract type definitions from other files when appropriate

#### Scripts Directory
- Keep utility scripts in `/scripts`

### 3. Remove Unused Files

Based on the code audit, consider removing or documenting these unused files:
- `/components/visibility-selector.tsx`
- `/components/sign-out-form.tsx`
- `/components/model-selector.tsx`
- `/components/bylaw-search-filters.tsx`
- `/types/minimist.d.ts`
- (And other files identified in the audit)

### 4. Refactor Duplicate Functionality

Refactor these duplicated functions identified in the audit:
- `areEqual` in `/components/text-editor.tsx` and `/components/sheet-editor.tsx`
- `handleInput` in `/components/multimodal-input.tsx` and `/components/message-editor.tsx` 
- `debouncedFn` in `/lib/utils/component-optimization.ts` and `/lib/hooks/use-optimized-api.ts`
- `handleSubmit` in `/app/(auth)/register/page.tsx` and `/app/(auth)/login/page.tsx`

### 5. Update Import Paths

After reorganizing, update all import paths throughout the codebase.

## Breaking Circular Dependencies

The dependency analysis revealed critical circular dependencies that must be addressed:

### 1. Artifact Component Cycle (Critical)

```
components/artifact.tsx → components/artifact-messages.tsx → components/message.tsx → components/document-preview.tsx → components/document.tsx → components/artifact.tsx
```

Implementation steps:

1. Create type files in `/types/artifacts` and `/types/documents`:
   - `types/artifacts/artifact-types.ts` (shared interfaces for artifacts)
   - `types/messages/message-types.ts` (shared interfaces for messages)
   - `types/documents/document-types.ts` (shared interfaces for documents)

2. Directory restructuring:
   - Create `/components/artifacts/` directory
   - Create `/components/documents/` directory 
   - Create `/components/messages/` directory

3. Component refactoring (in order):
   - Move and refactor `components/document.tsx` → `components/documents/document.tsx`
   - Move and refactor `components/document-preview.tsx` → `components/documents/document-preview.tsx`
   - Move and refactor `components/message.tsx` → `components/messages/message.tsx`
   - Move and refactor `components/artifact-messages.tsx` → `components/artifacts/artifact-messages.tsx`
   - Move and refactor `components/artifact.tsx` → `components/artifacts/artifact.tsx`

### 2. Editor Configuration Cycle

```
lib/editor/config.ts → lib/editor/functions.tsx → lib/editor/config.ts
```

Implementation steps:

1. Create the directory structure:
   - Create `/lib/editor/types/` directory
   - Create `/lib/editor/config/` directory
   - Create `/lib/editor/functions/` directory

2. Extract common types to `/lib/editor/types/editor-types.ts`

3. Split configuration file:
   - Move constants to `/lib/editor/config/constants.ts`
   - Move types to `/lib/editor/types/config-types.ts` 

4. Refactor functions file:
   - Move editor functions to `/lib/editor/functions/editor-functions.tsx`
   - Import types from type files, not from config

## Implementation Strategy

1. Address critical circular dependencies first (highest priority)
2. Then focus on high complexity modules that need refactoring
3. Continue with moving files to their final locations
4. Update imports for each batch of moved files
5. Run the application after each significant change to verify functionality
6. Address the identified duplicate functionality
7. Run the dependency analysis and code audit scripts again to verify improvements

## Implementation Sequence

1. **Phase 1: Breaking Circular Dependencies** (2-3 days)
   - Extract shared types to dedicated files 
   - Refactor artifact and document components
   - Restructure editor configuration and functions

2. **Phase 2: Component Reorganization** (2-3 days)
   - Move components to appropriate directories
   - Update import paths throughout the codebase
   - Create index files for component directories

3. **Phase 3: High Complexity Module Refactoring** (3-4 days)
   - Split large components into smaller, focused ones
   - Reduce dependencies in identified complex modules
   - Create proper abstractions and interfaces

4. **Phase 4: Final Clean-up** (1-2 days)
   - Remove unused files and dead code
   - Finalize documentation
   - Run comprehensive tests

## Expected Benefits

- Elimination of circular dependencies
- Clearer separation of concerns
- Better maintainability through organized code
- Reduced complexity through component decomposition
- Reduced duplication through refactoring
- Easier onboarding for new developers
- More straightforward testing and debugging
- Improved performance through better architecture