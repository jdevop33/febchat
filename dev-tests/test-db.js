const postgres = require("postgres");
const dotenv = require("dotenv");

// Explicit loading of .env.local file
dotenv.config({ path: ".env.local" });

async function testConnection() {
  // Log all database-related environment variables
  console.log("DATABASE ENVIRONMENT VARIABLES:");
  console.log(
    "POSTGRES_URL:",
    process.env.POSTGRES_URL
      ? `${process.env.POSTGRES_URL.substring(0, 25)}...`
      : "NOT SET",
  );
  console.log(
    "POSTGRES_URL_NON_POOLING:",
    process.env.POSTGRES_URL_NON_POOLING
      ? `${process.env.POSTGRES_URL_NON_POOLING.substring(0, 25)}...`
      : "NOT SET",
  );
  console.log("POSTGRES_USER:", process.env.POSTGRES_USER || "NOT SET");
  console.log("POSTGRES_HOST:", process.env.POSTGRES_HOST || "NOT SET");
  console.log("POSTGRES_DATABASE:", process.env.POSTGRES_DATABASE || "NOT SET");
  console.log(
    "DATABASE_URL:",
    process.env.DATABASE_URL
      ? `${process.env.DATABASE_URL.substring(0, 25)}...`
      : "NOT SET",
  );

  // Try different database URLs in order
  const connectionOptions = [
    { name: "POSTGRES_URL", url: process.env.POSTGRES_URL },
    { name: "DATABASE_URL", url: process.env.DATABASE_URL },
    {
      name: "POSTGRES_URL_NON_POOLING",
      url: process.env.POSTGRES_URL_NON_POOLING,
    },
    {
      name: "Constructed URL",
      url:
        process.env.POSTGRES_USER &&
        process.env.POSTGRES_PASSWORD &&
        process.env.POSTGRES_HOST &&
        process.env.POSTGRES_DATABASE
          ? `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}/${process.env.POSTGRES_DATABASE}?sslmode=require`
          : null,
    },
  ];

  let success = false;

  // Try each connection option
  for (const option of connectionOptions) {
    if (!option.url) {
      console.log(`Skipping ${option.name} - URL not available`);
      continue;
    }

    console.log(`Attempting connection with ${option.name}...`);

    try {
      // Connect with SSL options explicitly configured
      const sql = postgres(option.url, {
        ssl: {
          rejectUnauthorized: false, // Accept self-signed certificates
        },
      });

      // Test the connection
      const result = await sql`SELECT NOW() as time`;
      console.log(`✅ Connection with ${option.name} SUCCESSFUL!`);
      console.log("Server time:", result[0].time);
      await sql.end();

      success = true;
      console.log(`Database connection using ${option.name} works properly.`);
      break; // Exit loop on success
    } catch (error) {
      console.error(`❌ Connection with ${option.name} FAILED:`, error.message);
      console.error("Error details:", error);

      // Print connection details safely
      try {
        const urlParts = new URL(option.url);
        console.log("Connection details:");
        console.log("- Protocol:", urlParts.protocol);
        console.log("- Host:", urlParts.hostname);
        console.log("- Port:", urlParts.port || "default");
        console.log("- Path:", urlParts.pathname);
        console.log("- Search:", urlParts.search);
      } catch (e) {
        console.log("Could not parse connection URL");
      }
    }
  }

  return success;
}

testConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });
