# FEBCHAT Development Guide

## Build & Development Commands

- `pnpm dev`: Run the development server with Turbo
- `pnpm build`: Run DB migrations and build the application
- `pnpm start`: Run the production server
- `pnpm lint`: Run ESLint and Biome linting
- `pnpm lint:fix`: Run ESLint and Biome with auto-fix
- `pnpm format`: Format code using Prettier (includes Tailwind class sorting)
- `pnpm format:check`: Check formatting without making changes
- `pnpm format:biome`: Format code using Biome
- `node test-anthropic.js`: Test Anthropic API integration
- `node test-db.js`: Test database connection
- `node test-openai.js`: Test OpenAI API integration

## Database Management

- `pnpm db:generate`: Generate Drizzle migrations
- `pnpm db:studio`: Open Drizzle Studio to manage DB
- `pnpm db:push`: Push schema changes to database
- `pnpm db:migrate`: Run database migrations
- `pnpm db:check`: Check migration status
- `pnpm db:up`: Apply pending migrations

## Code Style Guidelines

- Use TypeScript with strict typing; avoid using `any` unless necessary
- Single quotes for strings, double quotes for JSX attributes (prettier config)
- 2-space indentation, 80 characters line width, trailing commas for multi-line
- Organize imports: external libraries first, then internal with `@/` path alias
- Use React Server Components (RSCs) where possible
- Use Server Actions for server-side mutations
- Error handling: use try/catch with specific error types, validate with Zod
- Styling: use Tailwind utility classes with `cn()` helper for conditional classes
- Component names: PascalCase, functions/variables: camelCase
- Use toast from sonner for user notifications
- Memoize React components when rendering performance is critical

## Development Environment

- Use dev.nix for consistent development environment in GCP IDX
- Formatting: Prettier with prettier-plugin-tailwindcss for class sorting
- Linting: ESLint + Biome (Biome for quick fixes, Prettier for final formatting)
- Next.js 15 with React 19 RC, using TypeScript in strict mode
