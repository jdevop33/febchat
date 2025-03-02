# FEBCHAT Development Guide

## Build & Development Commands

- `pnpm dev`: Run development server with hot reloading
- `pnpm build`: Run DB migrations and build the application
- `pnpm start`: Run production server
- `pnpm lint`: Run ESLint and Biome linting
- `pnpm lint:fix`: Auto-fix linting issues
- `pnpm format`: Format with Prettier (includes Tailwind class sorting)
- `pnpm test`: Run test suite
- `pnpm test <test-file-path>`: Run specific test file
- `ts-node scripts/<script-name>.ts`: Run TypeScript scripts
- `node scripts/index-bylaws.ts`: Index bylaws for search
- `node scripts/verify-pinecone.ts`: Verify Pinecone connection

## Code Style Guidelines

- TypeScript with strict typing; avoid `any` except when necessary
- Single quotes for strings, double quotes for JSX attributes
- 2-space indent, 80 char line width, trailing commas for multi-line
- Imports: external libs first, then internal with `@/` path alias
- React Server Components (RSCs) preferred over client components
- Server Actions for mutations; client actions for UI-only operations
- Handle errors with try/catch, use Zod for validation, toast for notifications
- Style with Tailwind classes; use `cn()` helper for conditionals
- Naming: PascalCase for components, camelCase for functions/variables
- Folder structure: group by feature rather than by type

## Architecture

- Next.js App Router with React Server Components
- Drizzle ORM with SQLite (development) / PostgreSQL (production)
- Authentication: NextAuth.js with credentials provider
- UI: Tailwind CSS + shadcn/ui components
- Vector search: Pinecone for bylaw search functionality
- State management: React Context + React Query where needed
