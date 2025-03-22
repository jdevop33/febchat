# Circular Dependency Resolution Guide

This document outlines the process for identifying and fixing circular dependencies in the FebChat codebase.

## Identifying Circular Dependencies

The AI code audit tool identified circular dependencies between several components:

- `components/artifact.tsx`
- `components/artifact-messages.tsx`
- `components/message.tsx` 
- `components/document-preview.tsx`
- `components/document.tsx`

### How to Detect Circular Dependencies Manually

You can use the following approaches to detect circular dependencies in your codebase:

1. **Using TypeScript Compiler**:
   ```bash
   tsc --traceResolution | grep "========"
   ```

2. **Using specialized tools**:
   - [madge](https://github.com/pahen/madge): `npx madge --circular src/`
   - [dependency-cruiser](https://github.com/sverweij/dependency-cruiser): `npx depcruise --validate .dependency-cruiser.js src/`

## Understanding the Problem

Circular dependencies occur when two or more modules depend on each other, either directly or indirectly. This creates a loop in the dependency graph, which can cause:

1. Runtime errors, especially in some bundlers or environments
2. Initialization order problems
3. Maintenance challenges
4. Code that's harder to test
5. Harder to understand module boundaries

In our case, the circular dependencies were caused by type definitions imported across component files:

- `artifact.tsx` imports types from `document.tsx`
- `document.tsx` imports types from `message.tsx`
- `message.tsx` imports types from `artifact.tsx`

## Solution Strategy: Shared Types

The most effective solution for circular dependencies involving types is to extract the shared types into a separate module that all the others can import from, breaking the circular chain.

### Implementation Steps

1. **Create a shared types directory**:
   ```bash
   mkdir -p types/shared
   ```

2. **Extract common types into shared file**:
   Create a `shared-types.ts` file with common interfaces:
   ```typescript
   // Common interfaces used across components
   export interface SharedMessageProps {
     // Common properties shared between components
   }
   ```

3. **Modify type imports**:
   Update import statements in component type files to import from the shared types instead of from each other.

4. **Re-export for backward compatibility**:
   In some cases, you might want to re-export types from the shared module to maintain backward compatibility:
   ```typescript
   // Re-export for backward compatibility
   export type { UIArtifact } from '@/types/shared/shared-types';
   ```

5. **Extend shared interfaces**:
   Specific component types can extend the shared interfaces:
   ```typescript
   import { SharedMessageProps } from '@/types/shared/shared-types';

   export interface MessageProps extends SharedMessageProps {
     // Component-specific properties
   }
   ```

## Testing the Solution

After implementing the shared types approach, validate that circular dependencies have been resolved:

1. Create test code that imports from all the modified modules
2. Verify that compilation succeeds without circular dependency warnings
3. Run the application to ensure runtime behavior is preserved

## Best Practices for Avoiding Circular Dependencies

1. **Design With Dependency Direction in Mind**: Consider the natural direction of dependencies in your architecture.
2. **Use Interface Segregation**: Define smaller, focused interfaces rather than large ones.
3. **Employ Dependency Injection**: Use DI patterns to invert dependencies when appropriate.
4. **Create Abstraction Layers**: Introduce abstraction layers that both modules can depend on.
5. **Use Event Systems**: For complex interactions, consider event systems instead of direct dependencies.

## Additional Resources

- [TypeScript Handbook: Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- [React Documentation: Code-Splitting](https://reactjs.org/docs/code-splitting.html)
- [Clean Architecture Principles](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)