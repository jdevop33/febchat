# Migration Plan for Clean Architecture

Based on the code audit and project analysis, here's a plan to refactor the codebase following a clean architecture pattern.

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

✅ Created architecture documentation
- Created `/ARCHITECTURE.md` explaining the new structure

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

## Implementation Strategy

1. Make iterative changes, starting with moving files to their new locations
2. Update imports for each batch of moved files
3. Run the application after each significant change to verify functionality
4. Address the identified duplicate functionality
5. Run the code audit script again to verify improvements

## Expected Benefits

- Clearer separation of concerns
- Better maintainability through organized code
- Reduced duplication through refactoring
- Easier onboarding for new developers
- More straightforward testing and debugging