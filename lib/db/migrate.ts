import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const runMigrate = async () => {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.log(
      '⚠️ Database connection URL is not defined, skipping migrations',
    );
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
      process.exit(1);
    } finally {
      // Ensure we always close the connection even if migration fails
      await connection.end();
      console.log('✅ Database connection closed');
    }
  } catch (connectionError) {
    console.error('❌ Failed to connect to database:', connectionError);
    // Don't exit with error in build environments to allow builds without DB
    if (process.env.NODE_ENV === 'production') {
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
