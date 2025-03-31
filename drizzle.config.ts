import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load environment variables from .env.local
config({
  path: ".env.local",
});

// Get database URL from environment variables
const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl || "",
  },
  // Enable verbose output
  verbose: true,
  // Use strict mode for better error messages
  strict: true,
});
