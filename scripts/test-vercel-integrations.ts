/**
 * Test Vercel Integrations
 *
 * This script tests connection to all integrated services required for deployment,
 * including database, blob storage, and vector search.
 *
 * Run with: npx tsx scripts/test-vercel-integrations.ts
 */

import { Pinecone } from "@pinecone-database/pinecone";
import { del, list, put } from "@vercel/blob";
import { sql } from "@vercel/postgres";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

// Define colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  bold: "\x1b[1m",
};

// Helper for colored logs
const log = {
  info: (message: string) =>
    console.log(`${colors.blue}${message}${colors.reset}`),
  success: (message: string) =>
    console.log(`${colors.green}✓ ${message}${colors.reset}`),
  error: (message: string) =>
    console.log(`${colors.red}✗ ${message}${colors.reset}`),
  warning: (message: string) =>
    console.log(`${colors.yellow}⚠ ${message}${colors.reset}`),
  header: (message: string) =>
    console.log(`\n${colors.bold}${colors.blue}${message}${colors.reset}\n`),
};

// Test results tracking
type TestResult = {
  name: string;
  passed: boolean;
  message: string;
};

const results: TestResult[] = [];

// Record a test result
function recordTest(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  if (passed) {
    log.success(`${name}: ${message}`);
  } else {
    log.error(`${name}: ${message}`);
  }
}

// Main test function
async function testVercelIntegrations() {
  log.header("Testing Vercel Integrations");
  log.info("Running tests for all required integrations...");

  // 1. Test Postgres database connection
  log.info("\nTesting PostgreSQL Connection...");
  try {
    const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      recordTest(
        "Database URL",
        false,
        "No database URL found in environment variables",
      );
    } else {
      const startTime = Date.now();
      const result =
        await sql`SELECT current_database() as db_name, version() as pg_version`;
      const endTime = Date.now();
      recordTest(
        "PostgreSQL",
        true,
        `Connected to database ${result.rows[0].db_name} in ${endTime - startTime}ms`,
      );
    }
  } catch (error) {
    recordTest(
      "PostgreSQL",
      false,
      `Failed to connect: ${(error as Error).message}`,
    );
  }

  // 2. Test Vercel Blob Storage
  log.info("\nTesting Vercel Blob Storage...");
  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      recordTest(
        "Blob Storage",
        false,
        "No BLOB_READ_WRITE_TOKEN found in environment variables",
      );
    } else {
      // Create a test file and clean it up immediately
      const testContent = Buffer.from("Test file for vercel blob storage");
      const uploadResult = await put("test-integration-file.txt", testContent, {
        access: "public",
      });

      // List files to confirm upload
      const files = await list();

      // Delete the test file
      if (uploadResult.url) {
        await del(uploadResult.url);
      }

      recordTest(
        "Blob Storage",
        true,
        `Successfully uploaded, listed (${files.blobs.length} files), and deleted test file`,
      );
    }
  } catch (error) {
    recordTest(
      "Blob Storage",
      false,
      `Failed to access blob storage: ${(error as Error).message}`,
    );
  }

  // 3. Test Pinecone Vector Search
  log.info("\nTesting Pinecone Vector Search...");
  try {
    const pineconeApiKey = process.env.PINECONE_API_KEY;
    const pineconeEnvironment = process.env.PINECONE_ENVIRONMENT;
    const pineconeIndex = process.env.PINECONE_INDEX;

    if (!pineconeApiKey || !pineconeEnvironment || !pineconeIndex) {
      recordTest("Pinecone", false, "Missing Pinecone environment variables");
    } else {
      const pinecone = new Pinecone({
        apiKey: pineconeApiKey,
      });

      const indexes = await pinecone.listIndexes();
      const indexNames = indexes.indexes?.map((idx) => idx.name) || [];

      if (indexNames.includes(pineconeIndex)) {
        recordTest(
          "Pinecone",
          true,
          `Successfully connected to Pinecone, index "${pineconeIndex}" exists`,
        );
      } else {
        recordTest(
          "Pinecone",
          false,
          `Index "${pineconeIndex}" not found in your account`,
        );
      }
    }
  } catch (error) {
    recordTest(
      "Pinecone",
      false,
      `Failed to connect to Pinecone: ${(error as Error).message}`,
    );
  }

  // 4. Test AI Model API Keys
  log.info("\nTesting AI Model API Keys...");
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!anthropicKey) {
    recordTest(
      "Anthropic API",
      false,
      "No ANTHROPIC_API_KEY found in environment variables",
    );
  } else if (anthropic_key_valid(anthropicKey)) {
    recordTest(
      "Anthropic API",
      true,
      "ANTHROPIC_API_KEY found and has valid format",
    );
  } else {
    recordTest("Anthropic API", false, "ANTHROPIC_API_KEY has invalid format");
  }

  if (!openaiKey) {
    recordTest(
      "OpenAI API",
      false,
      "No OPENAI_API_KEY found in environment variables",
    );
  } else if (openai_key_valid(openaiKey)) {
    recordTest("OpenAI API", true, "OPENAI_API_KEY found and has valid format");
  } else {
    recordTest("OpenAI API", false, "OPENAI_API_KEY has invalid format");
  }

  // 5. Test Authentication Variables
  log.info("\nTesting Authentication Variables...");
  const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  const authUrl = process.env.NEXTAUTH_URL;

  if (!authSecret) {
    recordTest(
      "Auth Secret",
      false,
      "No AUTH_SECRET or NEXTAUTH_SECRET found in environment variables",
    );
  } else if (authSecret.length < 16) {
    recordTest(
      "Auth Secret",
      false,
      "Auth secret is too short (should be at least 16 characters)",
    );
  } else {
    recordTest("Auth Secret", true, "Auth secret is properly configured");
  }

  if (!authUrl) {
    recordTest(
      "Auth URL",
      false,
      "No NEXTAUTH_URL found in environment variables",
    );
  } else if (isValidUrl(authUrl)) {
    recordTest("Auth URL", true, `Auth URL is set to ${authUrl}`);
  } else {
    recordTest("Auth URL", false, `Invalid Auth URL: ${authUrl}`);
  }

  // Print summary
  printSummary();
}

// Helper functions for validation
function anthropic_key_valid(key: string): boolean {
  return key.startsWith("sk-ant-") && key.length > 20;
}

function openai_key_valid(key: string): boolean {
  return (
    (key.startsWith("sk-") && key.length > 20) || key.startsWith("sk-org-")
  );
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
}

// Print test summary
function printSummary() {
  log.header("Test Summary");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(
    `${colors.bold}Results: ${passed}/${total} tests passed (${failed} failed)${colors.reset}\n`,
  );

  if (failed > 0) {
    log.warning("Failed Tests:");
    results
      .filter((r) => !r.passed)
      .forEach((result) => {
        console.log(
          `${colors.red}✗ ${result.name}: ${result.message}${colors.reset}`,
        );
      });

    console.log("\nRecommendations:");
    console.log("1. Check your environment variables in .env.local and Vercel");
    console.log("2. Verify access credentials for each service");
    console.log("3. Make sure all services are properly provisioned");
    console.log("4. Run this test script again after making changes");
  } else {
    log.success("All tests passed! Your deployment environment is ready.");
  }
}

// Run the tests
testVercelIntegrations().catch((error) => {
  console.error("Error running tests:", error);
  process.exit(1);
});
