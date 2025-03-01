# FEBCHAT Development Guide

## Build & Development Commands

- `pnpm dev`: Run the development server with Turbo
- `pnpm build`: Run DB migrations and build the application
- `pnpm lint`: Run ESLint and Biome linting
- `pnpm lint:fix`: Run ESLint and Biome with auto-fix
- `pnpm format`: Format code using Prettier (includes Tailwind class sorting)
- `pnpm format:check`: Check formatting without making changes
- `node test-anthropic.js`: Test Anthropic API integration
- `node test-db.js`: Test database connection
- `node test-openai.js`: Test OpenAI API integration

## Database Management

- `pnpm db:generate`: Generate Drizzle migrations
- `pnpm db:studio`: Open Drizzle Studio to manage DB
- `pnpm db:push`: Push schema changes to database
- `pnpm db:migrate`: Run database migrations

## Code Style Guidelines

- Use TypeScript with strict typing
- Use single quotes for strings (not double quotes) - specified in .prettierrc.js
- Tab width is 2 spaces with no tabs - specified in .prettierrc.js and biome.jsonc
- Max line width is 80 characters
- Trailing commas are required for multi-line expressions
- Imports are organized by external, then internal with `@/` path alias
- Use React Server Components (RSCs) where possible
- Use Server Actions for server-side mutations
- Handle errors using try/catch with specific error types
- Use Zod for data validation
- Use tailwind utility classes for styling with `cn()` helper
- Tailwind classes should be automatically sorted with prettier-plugin-tailwindcss
- Memo React components when rendering performance is critical
- Use toast from sonner for user notifications
- Component names are PascalCase, functions/variables are camelCase

## Development Environment

- For GCP IDX, use the dev.nix file for consistent development environment
- The project uses both Biome and Prettier - Prettier is preferred for formatting
- Prettier handles Tailwind class sorting via prettier-plugin-tailwindcss
- ESLint with eslint-plugin-tailwindcss is used for additional Tailwind linting
