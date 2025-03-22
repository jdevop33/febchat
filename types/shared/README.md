# Shared Types for Circular Dependency Resolution

This directory contains shared type definitions that help resolve circular dependencies between components in the FebChat application.

## Problem

The code audit identified circular dependencies between several components:

- `components/artifact.tsx`
- `components/artifact-messages.tsx`
- `components/message.tsx`
- `components/document-preview.tsx`
- `components/document.tsx`

These components were directly importing types from each other, creating a circular reference chain.

## Solution

The solution is to extract common types into a shared location that all components can import from, breaking the circular dependency chain.

### Key files:

1. `shared-types.ts` - Contains core shared types used across components:
   - `ArtifactKind` and `artifactKinds`
   - `UIArtifact` interface
   - `SharedMessageProps` interface
   - `SharedDocumentProps` interface
   - `SharedEditorProps` interface

### Modified files:

1. `types/artifacts/artifact-types.ts`

   - Now imports from `shared-types.ts`
   - Re-exports shared types for backward compatibility
   - Defines component-specific types that extend shared types

2. `types/documents/document-types.ts`

   - Now imports from `shared-types.ts`
   - Uses shared types for properties
   - Re-exports `EditorCommonProps` as an alias for `SharedEditorProps`

3. `types/messages/message-types.ts`
   - Now imports from `shared-types.ts`
   - Defines component-specific types that extend shared types

## Benefits

1. **Removes circular dependencies** - Components now import from a central location instead of from each other
2. **Improves maintainability** - Common types are defined in one place
3. **Simplifies component interfaces** - Components can extend shared interfaces with only their specific needs
4. **Makes future refactoring easier** - Shared types can be modified in one place

## Usage

When defining component props that are shared across multiple components, use the shared types:

```typescript
import { SharedMessageProps } from '@/types/shared/shared-types';

// Extend the shared interface with component-specific props
interface MyComponentProps extends SharedMessageProps {
  additionalProp: string;
}
```
