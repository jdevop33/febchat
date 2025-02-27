# FEBCHAT Development Guide

## Build & Development Commands

- `pnpm dev`: Run the development server with Turbo
- `pnpm build`: Run DB migrations and build the application
- `pnpm lint`: Run ESLint and Biome linting
- `pnpm lint:fix`: Run ESLint and Biome with auto-fix
- `pnpm format`: Format code using Prettier (includes Tailwind class sorting)
- `pnpm format:check`: Check formatting without making changes
- `pnpm format:biome`: Format code using Biome (legacy)
- `pnpm db:migrate`: Run database migrations

## Database Management

- `pnpm db:generate`: Generate Drizzle migrations
- `pnpm db:studio`: Open Drizzle Studio to manage DB
- `pnpm db:push`: Push schema changes to database

## Code Style Guidelines

- Use TypeScript with strict typing
- Use single quotes for strings (not double quotes)
- Imports are organized by external, then internal with `@/` path alias
- Use React Server Components (RSCs) where possible
- Use Server Actions for server-side mutations
- Handle errors using try/catch with specific error types
- Use Zod for data validation
- Use tailwind utility classes for styling with `cn()` helper
- Tailwind classes should be automatically sorted with prettier-plugin-tailwindcss
- Memo React components when rendering performance is critical
- Use toast for user notifications
- Component names are PascalCase, functions/variables are camelCase

## Development Environment

- For GCP IDX, use the dev.nix file for consistent development environment
- The project uses both Biome and Prettier - Prettier is preferred for formatting
- Prettier handles Tailwind class sorting via prettier-plugin-tailwindcss
- ESLint with eslint-plugin-tailwindcss is used for additional Tailwind linting
