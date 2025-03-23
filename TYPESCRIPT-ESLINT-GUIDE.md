# TypeScript and ESLint Best Practices Guide

This guide provides solutions to common TypeScript and ESLint issues in the Oak Bay project.

## Common Import Resolution Issues

### Problem: "Unable to resolve path to module..."

There are several ways to fix import resolution issues:

1. **Use relative imports for closely related files:**
   ```typescript
   // Instead of
   import { ChatHeader } from '@/components/chat/chat-header';
   
   // Use relative imports for files in the same directory
   import { ChatHeader } from './chat-header';
   ```

2. **Keep path aliases consistent:**
   - The project uses `@/` as a path alias to the project root
   - Ensure all imports follow this pattern for non-relative paths

3. **Fix ESLint configuration:**
   - We've updated `.eslintrc.json` to properly resolve imports
   - Rule `import/no-unresolved` has been disabled since ESLint can't always correctly resolve Next.js path aliases

### Problem: "Parameter 'xxx' implicitly has an 'any' type"

This happens when TypeScript can't infer a type for a parameter:

```typescript
// Bad
const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

// Good
const isArtifactVisible = useArtifactSelector((state: {isVisible: boolean}) => state.isVisible);

// Even better - create a proper type
type ArtifactState = {
  isVisible: boolean;
  // other properties...
};
const isArtifactVisible = useArtifactSelector((state: ArtifactState) => state.isVisible);
```

## Tailwind CSS Best Practices

### Use shorthand notations

For width and height combinations:

```typescript
// Bad
<RefreshCw className="h-4 w-4 animate-spin" />

// Good
<RefreshCw className="size-4 animate-spin" />
```

For padding and margin:

```typescript
// Bad
<div className="pt-2 pr-4 pb-2 pl-4">...</div>

// Good
<div className="py-2 px-4">...</div>
```

### Use semantic color names with modifiers

```typescript
// Bad
<span className="text-[#ff0000]">Error</span>

// Good
<span className="text-red-500">Error</span>

// Even better - use semantic colors
<span className="text-error">Error</span>
```

### Responsive design best practices

```typescript
// Good approach for responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">...</div>
```

## Recommended Development Flow

1. Use TypeScript strictly - always define types for parameters
2. Write components with proper prop interfaces
3. Use ESLint and Prettier to maintain code quality
4. Run `pnpm lint` before committing code
5. For stubborn linting issues, use `// @ts-ignore` or `// eslint-disable-next-line` sparingly and with comments

## TypeScript Config Options

We've improved the TypeScript configuration:

1. Updated `tsconfig.json` to properly resolve path aliases
2. Added `jsconfig.json` for better editor integration
3. Configured ESLint to work better with TypeScript

When making changes to these configurations, ensure:
- Path aliases are consistent across all config files
- Module resolution is correctly set
- TypeScript strict mode is enabled where appropriate

## General Code Style Guidelines

1. Use named exports instead of default exports
2. Use function declarations for components
3. Utilize TypeScript's type system effectively
4. Use consistent naming conventions
5. Document complex functions with JSDoc comments

By following these guidelines, you'll maintain high code quality and prevent common TypeScript and ESLint issues from occurring. 