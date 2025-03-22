# FebChat Database Migration Plan

## Current State

FebChat currently has a mixed database approach:

- **Drizzle ORM**: Main database access via `/lib/db/index.ts`
- **Prisma**: Legacy database schema in `/prisma/schema.prisma`
- **Database Config**: Vercel PostgreSQL in production, with PostgreSQL in development

## Migration Plan

This document outlines a plan to fully migrate to a consistent database setup using Drizzle ORM with PostgreSQL across all environments.

### Phase 1: Stabilize Current Setup (Completed)

- ✅ Fix TypeScript errors in database client
- ✅ Update build script to support Vercel's database branching
- ✅ Create comprehensive documentation for database configuration
- ✅ Update import statements to correctly use the new database client

### Phase 2: Complete Drizzle Migration (Next Steps)

1. **Schema Migration**

   - [ ] Convert remaining Prisma models to Drizzle schema
   - [ ] Update type definitions to use Drizzle's types
   - [ ] Create Drizzle migrations for all schema changes

2. **Database Access Refactoring**

   - [ ] Update all database queries to use Drizzle's query builders
   - [ ] Replace any direct Prisma client usage with Drizzle
   - [ ] Ensure consistent error handling across all database operations

3. **Testing & Validation**
   - [ ] Create test cases for all database operations
   - [ ] Validate schema migrations work correctly
   - [ ] Test database performance with realistic workloads

### Phase 3: Prisma Removal

1. **Dependency Cleanup**

   - [ ] Remove Prisma dependencies from package.json
   - [ ] Remove Prisma configuration files
   - [ ] Update build and development scripts to remove Prisma references

2. **Documentation Updates**
   - [ ] Update database documentation to focus solely on Drizzle
   - [ ] Create migration guide for any team members or contributors

## Migration Checklist

### Schema Migration

| Prisma Model        | Drizzle Migration Status | Notes                          |
| ------------------- | ------------------------ | ------------------------------ |
| User                | ✅ Completed             | Already in Drizzle schema      |
| Chat                | ✅ Completed             | Already in Drizzle schema      |
| Message             | ✅ Completed             | Already in Drizzle schema      |
| Vote                | ✅ Completed             | Already in Drizzle schema      |
| Document            | ✅ Completed             | Already in Drizzle schema      |
| Suggestion          | ✅ Completed             | Already in Drizzle schema      |
| Bylaw               | ❌ Pending               | Convert from Prisma to Drizzle |
| BylawSection        | ❌ Pending               | Convert from Prisma to Drizzle |
| CitationFeedback    | ❌ Pending               | Convert from Prisma to Drizzle |
| VectorDatabaseEntry | ❌ Pending               | Convert from Prisma to Drizzle |
| BylawUpdate         | ❌ Pending               | Convert from Prisma to Drizzle |
| WebScrapeLog        | ❌ Pending               | Convert from Prisma to Drizzle |
| SearchQueryLog      | ❌ Pending               | Convert from Prisma to Drizzle |

## Migration Steps for Each Prisma Model

For each remaining Prisma model, follow these steps:

1. **Add to Drizzle Schema**:

   ```typescript
   // Example for Bylaw model
   export const bylaw = pgTable('Bylaw', {
     bylawNumber: varchar('bylawNumber', { length: 64 }).primaryKey(),
     title: text('title').notNull(),
     isConsolidated: boolean('isConsolidated').default(false).notNull(),
     pdfPath: text('pdfPath').notNull(),
     officialUrl: text('officialUrl').notNull(),
     lastVerified: timestamp('lastVerified').notNull(),
     consolidatedDate: varchar('consolidatedDate', { length: 64 }),
     enactmentDate: varchar('enactmentDate', { length: 64 }),
     amendments: text('amendments'),
   });

   export type Bylaw = InferSelectModel<typeof bylaw>;
   ```

2. **Create Migration**:

   ```bash
   pnpm db:generate
   ```

3. **Update Queries**:
   ```typescript
   // Update any functions that use this model
   export async function getBylawByNumber(bylawNumber: string) {
     try {
       const [selectedBylaw] = await db
         .select()
         .from(bylaw)
         .where(eq(bylaw.bylawNumber, bylawNumber));
       return selectedBylaw;
     } catch (error) {
       console.error(
         `Failed to get bylaw ${bylawNumber} from database:`,
         error,
       );
       throw new DbOperationError('getBylawByNumber', error);
     }
   }
   ```

## Running Migrations

After completing the schema migration, make sure to:

1. Test migrations locally:

   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

2. Deploy with proper migration support:
   ```bash
   # Ensure your build script runs migrations
   pnpm build
   ```

## Database Access in Code

Moving forward, all database access should be done through the centralized client:

```typescript
import db from '@/lib/db';
import { bylaw } from '@/lib/db';

// Example query
const bylaws = await db
  .select()
  .from(bylaw)
  .where(eq(bylaw.isConsolidated, true));
```

## Conclusion

By following this migration plan, we will achieve a consistent database setup using Drizzle ORM with PostgreSQL across all environments. This will simplify our codebase, improve maintainability, and ensure reliable deployments on Vercel.
