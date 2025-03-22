import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const runMigrate = async () => {
  // Skip DB operations if explicitly set (for CI environments)
  if (process.env.SKIP_DB_OPERATIONS === 'true') {
    console.log('🛑 Database operations skipped due to SKIP_DB_OPERATIONS flag');
    return;
  }

  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.log(
      '⚠️ Database connection URL is not defined, skipping migrations',
    );
    return;
  }

  // Check if we're in a CI environment
  if (process.env.CI) {
    console.log('🧪 CI environment detected, skipping actual database operations');
    return;
  }

  try {
    const connection = postgres(connectionString, {
      max: 1,
      ssl: true,
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
