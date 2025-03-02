import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// Load environment variables from .env.local
config({
  path: '.env.local',
});

const runMigrate = async () => {
  if (!process.env.POSTGRES_URL) {
    console.log('⚠️ POSTGRES_URL is not defined, skipping migrations');
    return;
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
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
  }

  await connection.end();
  console.log('✅ Database connection closed');
};

runMigrate().then(() => {
  console.log('✅ Migration process completed');
  process.exit(0);
}).catch((err) => {
  console.error('❌ Migration failed');
  console.error(err);
  process.exit(1);
});
