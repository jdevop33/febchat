# Fix Circular Dependencies in Component Types

## Summary
This PR resolves circular dependencies between components by extracting shared types into a centralized location.

## Problem
The code audit identified circular dependencies between several components:
- `components/artifact.tsx`
- `components/artifact-messages.tsx`
- `components/message.tsx` 
- `components/document-preview.tsx`
- `components/document.tsx`

These components were importing types from each other, creating a circular dependency chain that can lead to runtime errors and make the code harder to maintain.

## Solution
Created a new `types/shared/shared-types.ts` file that contains common interfaces and types used across components:
- `ArtifactKind` and artifact constants
- `UIArtifact` interface
- `SharedMessageProps` interface
- `SharedDocumentProps` interface
- `SharedEditorProps` interface

Modified type definition files to import from the shared location instead of from each other:
- `types/artifacts/artifact-types.ts`
- `types/documents/document-types.ts`
- `types/messages/message-types.ts`

## Benefits
- Eliminates circular dependencies between components
- Improves maintainability by centralizing shared types
- Makes future refactoring easier
- Reduces the risk of runtime errors

## Testing
- Created test files to verify the solution
- Checked for proper type resolution and import paths
- Ensured backward compatibility with existing component references

## Implementation Steps
1. Created `types/shared` directory for shared type definitions
2. Created `shared-types.ts` with common types
3. Modified existing type files to use the shared types
4. Added documentation to explain the approach
5. Fixed import paths and ensured type safety