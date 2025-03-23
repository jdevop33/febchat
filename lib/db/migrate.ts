import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const runMigrate = async () => {
  // Always run database operations - no skipping
  console.log('Starting database migrations...');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Build phase: ${process.env.NEXT_PHASE === 'build' ? 'Yes' : 'No'}`);
  console.log(`Vercel: ${process.env.VERCEL ? 'Yes' : 'No'}`);
  
  // For Vercel builds, we need to ensure database is always available
  // If we're in Vercel, we'll try to use the connection from the integration
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.warn('⚠️ Database connection URL is not defined');
    
    // If we're in Vercel's build environment, continue anyway to avoid deployment failures
    if (process.env.VERCEL === '1' && process.env.NEXT_PHASE === 'build') {
      console.log('✅ Skipping migrations in Vercel build environment with no database URL');
      return;
    }
    
    console.error('❌ Cannot proceed without database connection URL');
    return;
  }

  try {
    const connection = postgres(connectionString, {
      max: 1,
      ssl: process.env.DB_USE_SSL !== 'false',
    });
    const db = drizzle(connection);

    console.log('⏳ Running migrations...');

    const start = Date.now();

    try {
      await migrate(db, { migrationsFolder: './lib/db/migrations' });
      const end = Date.now();
      console.log('✅ Migrations completed in', end - start, 'ms');
    } catch (err) {
      console.error('❌ Migration failed');
      console.error(err);
      // Don't exit with error in build or CI environments
      if (process.env.NODE_ENV === 'production' || process.env.CI) {
        console.log('⚠️ Continuing build despite migration failure');
        return;
      }
      process.exit(1);
    } finally {
      // Ensure we always close the connection even if migration fails
      await connection.end();
      console.log('✅ Database connection closed');
    }
  } catch (connectionError) {
    console.error('❌ Failed to connect to database:', connectionError);
    // Don't exit with error in build or CI environments
    if (process.env.NODE_ENV === 'production' || process.env.CI) {
      console.log('⚠️ Continuing build despite database connection failure');
      return;
    }
    process.exit(1);
  }
};

runMigrate()
  .then(() => {
    console.log('✅ Migration process completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Migration failed');
    console.error(err);
    process.exit(1);
  });