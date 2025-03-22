# FebChat Architecture & Development Guide

**Last Updated:** March 22, 2025

## Directory Structure

```
febchat/
├── app/                  # Next.js pages and API routes
│   ├── (auth)/           # Authentication-related pages
│   ├── (chat)/           # Chat-related pages
│   └── api/              # API routes
├── components/           # UI components
│   ├── artifacts/        # Artifact-related components
│   ├── bylaw/            # Bylaw-specific components
│   ├── chat/             # Chat-specific components
│   ├── documents/        # Document-related components
│   ├── shared/           # Shared components
│   └── ui/               # UI primitives based on shadcn/ui
├── hooks/                # React hooks
├── lib/                  # Core business logic
│   ├── api/              # API client code
│   ├── db/               # Database operations
│   ├── bylaw/            # Bylaw-related functionality
│   ├── utils/            # Utility functions
│   └── vector/           # Vector search functionality
├── public/               # Static assets
├── scripts/              # Utility scripts
└── types/                # TypeScript type definitions
```

## Architectural Principles

- **Separation of Concerns**: UI, data access, business logic, and infrastructure layers
- **Dependency Direction**: Dependencies flow inward (UI → logic → data → infrastructure)
- **Clean Module Boundaries**: Each module has well-defined interfaces
- **Composable Components**: UI components organized for maximum reusability

## Development Setup

### Prerequisites

- Node.js (v18+)
- pnpm
- Vercel CLI (optional)
- Git

### Environment Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/febchat.git
   cd febchat
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up environment variables in `.env.local`:
   ```
   PINECONE_API_KEY=your-pinecone-key
   PINECONE_INDEX=oak-bay-bylaws
   OPENAI_API_KEY=your-openai-key
   ANTHROPIC_API_KEY=your-anthropic-key
   AUTH_SECRET=generated-secret
   ```

## Development Commands

- `pnpm dev`: Run development server
- `pnpm build`: Build for production
- `pnpm start`: Run production server
- `pnpm lint`: Run linting tools
- `pnpm format`: Format code
- `pnpm db:migrate`: Run database migrations
- `pnpm db:studio`: Launch Drizzle studio

## Code Style Guidelines

- TypeScript with strict typing (avoid `any`)
- Single quotes for strings, double quotes for JSX
- 2-space indent, 80-char line width
- React Server Components preferred
- Use tailwind with `cn()` utility
- Prefix hooks with `use`
- Use `.test.tsx` suffix for tests

## Working with AI Models

Models are configured in `/lib/ai/models.ts`. To update:

1. Edit model configuration
2. Install provider packages if needed
3. Update environment variables

## Testing & Debugging

- Component tests: `npx jest components/path/to/file.test.tsx`
- API Endpoint Mapping: `npm run debug-api`
- Component Dependency Analysis: `npm run analyze-deps`
- End-to-End Testing: `npm run e2e-test`
- Performance Profiling: `npm run profile`
- Circular Dependency Fixer: `npm run fix-circular`

Refer to [Optimization & Troubleshooting](./05-optimization-troubleshooting.md) for detailed debugging approaches.
