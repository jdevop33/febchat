# FEBCHAT Development Guide

## Build & Development Commands

- `pnpm dev`: Run development server with hot reloading
- `pnpm build`: Run DB migrations and build the application
- `pnpm start`: Run production server
- `pnpm lint`: Run ESLint and Biome linting
- `pnpm lint:fix`: Auto-fix linting issues
- `pnpm format`: Format with Prettier (includes Tailwind class sorting)
- `pnpm format:biome`: Format with Biome
- `pnpm db:generate`: Generate Drizzle migrations
- `pnpm db:migrate`: Run database migrations
- `pnpm db:studio`: Launch Drizzle studio interface
- `npx jest components/path/to/file.test.tsx`: Run single test file
- `ts-node scripts/<script-name>.ts`: Run TypeScript scripts

## Code Style Guidelines

- TypeScript with strict typing; avoid `any` except when necessary
- Single quotes for strings, double quotes for JSX attributes
- 2-space indent, 80 char line width, trailing commas for multi-line
- Imports: external libs first, then internal with `@/` path alias
- Component naming: PascalCase for components, camelCase for functions/variables
- React Server Components (RSCs) preferred over client components
- Error handling: try/catch blocks, Zod for validation, toast for notifications
- Styling: Tailwind CSS with `cn()` utility for conditional classes
- Custom hooks: prefix with `use`, like `useIsMobile`
- Testing: Jest with React Testing Library
- Use fragment syntax (`<>...</>`) instead of `<React.Fragment>`
- JSX brackets should be on new lines, not same line
- Avoid unnecessary template literals and else statements

## Architecture

- Next.js App Router with React Server Components
- Drizzle ORM with SQLite (development) / PostgreSQL (production)
- Authentication: NextAuth.js with credentials provider
- UI: Tailwind CSS + shadcn/ui components
- Vector search: Pinecone for bylaw search functionality
- AI integration: AI SDK with Anthropic and OpenAI