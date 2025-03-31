#!/usr/bin/env node

/**
 * FitForGov Deployment Health Checker
 *
 * This script verifies that a deployment is working correctly by:
 * 1. Checking that critical endpoints are accessible
 * 2. Verifying that authentication endpoints return expected responses
 * 3. Ensuring the proper domain is being used
 *
 * Run with:
 *   node verify-deployment-health.js https://app.fitforgov.com
 */

const https = require("https");
const url = require("url");

// Configuration
const DEFAULT_URL = "https://app.fitforgov.com";
const TARGET_URL = process.argv[2] || DEFAULT_URL;
const TIMEOUT_MS = 10000;

// Endpoints to check
const endpoints = [
  { path: "/", expectedStatus: 200, description: "Homepage" },
  { path: "/login", expectedStatus: 200, description: "Login page" },
  {
    path: "/api/chat",
    expectedStatus: 401,
    description: "Chat API (should require auth)",
  },
  {
    path: "/api/auth/csrf",
    expectedStatus: 200,
    description: "CSRF protection endpoint",
  },
];

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

/**
 * Make an HTTP request and return the response
 */
function makeRequest(endpoint) {
  return new Promise((resolve) => {
    const options = {
      ...url.parse(`${TARGET_URL}${endpoint.path}`),
      method: "GET",
      timeout: TIMEOUT_MS,
      headers: {
        "User-Agent": "FitForGov-Deployment-Validator/1.0",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          success: res.statusCode === endpoint.expectedStatus,
        });
      });
    });

    req.on("error", (error) => {
      resolve({
        status: 0,
        error: error.message,
        success: false,
      });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({
        status: 0,
        error: "Request timed out",
        success: false,
      });
    });

    req.end();
  });
}

/**
 * Check if the domain is correct
 */
function checkDomain(target) {
  const domain = url.parse(target).hostname;

  if (domain === "app.fitforgov.com") {
    console.log(
      `${colors.green}✓ Using production domain: ${domain}${colors.reset}`,
    );
    return true;
  } else if (domain.includes("vercel.app")) {
    console.log(
      `${colors.yellow}⚠ Using Vercel preview domain: ${domain}${colors.reset}`,
    );
    console.log(`  This is OK for testing but not for production use.`);
    return true;
  } else {
    console.log(`${colors.red}✗ Unexpected domain: ${domain}${colors.reset}`);
    console.log(`  Expected: app.fitforgov.com or *.vercel.app`);
    return false;
  }
}

/**
 * Check for auth redirect issues
 */
async function checkAuthRedirects() {
  console.log(`\n${colors.cyan}Checking auth redirects...${colors.reset}`);

  const response = await makeRequest({
    path: "/login?callbackUrl=https://app.fitforgov.com",
    expectedStatus: 200,
  });

  if (!response.success) {
    console.log(
      `${colors.red}✗ Login page returned unexpected status: ${response.status}${colors.reset}`,
    );
    return false;
  }

  // Check if the HTML contains references to app.fitforgov.com
  if (response.body.includes("app.fitforgov.com")) {
    console.log(
      `${colors.red}✗ Found "app.fitforgov.com" in the login page response${colors.reset}`,
    );
    console.log(
      `  This indicates that the middleware is not properly sanitizing callbackUrl parameters`,
    );
    return false;
  } else {
    console.log(
      `${colors.green}✓ No invalid domain redirects detected${colors.reset}`,
    );
    return true;
  }
}

/**
 * Check security headers
 */
function checkSecurityHeaders(headers) {
  const expectedHeaders = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-xss-protection": "1; mode=block",
    "referrer-policy": "strict-origin-when-cross-origin",
  };

  const result = {
    pass: true,
    missing: [],
    incorrect: [],
  };

  for (const [key, expectedValue] of Object.entries(expectedHeaders)) {
    const actualValue = headers[key];

    if (!actualValue) {
      result.missing.push(key);
      result.pass = false;
    } else if (actualValue.toLowerCase() !== expectedValue.toLowerCase()) {
      result.incorrect.push(
        `${key}: expected "${expectedValue}", got "${actualValue}"`,
      );
      result.pass = false;
    }
  }

  return result;
}

/**
 * Main function
 */
async function main() {
  console.log(
    `\n${colors.cyan}FitForGov Deployment Health Check${colors.reset}`,
  );
  console.log(`${colors.cyan}==============================${colors.reset}`);
  console.log(`Target URL: ${TARGET_URL}\n`);

  // Check domain first
  const domainOk = checkDomain(TARGET_URL);

  if (!domainOk) {
    console.log(
      `${colors.yellow}⚠ Domain check failed, but continuing with other checks...${colors.reset}`,
    );
  }

  // Check each endpoint
  let allEndpointsOk = true;
  let securityHeaders = null;

  console.log(`${colors.cyan}Checking endpoints...${colors.reset}`);

  for (const endpoint of endpoints) {
    process.stdout.write(`- ${endpoint.description} (${endpoint.path})... `);

    const response = await makeRequest(endpoint);

    if (response.success) {
      console.log(`${colors.green}✓ ${response.status}${colors.reset}`);

      // Store headers from the homepage for later checks
      if (endpoint.path === "/") {
        securityHeaders = response.headers;
      }
    } else {
      console.log(
        `${colors.red}✗ ${response.status || response.error}${colors.reset}`,
      );
      allEndpointsOk = false;
    }
  }

  // Check for auth redirect issues
  const authRedirectsOk = await checkAuthRedirects();

  // Check security headers
  if (securityHeaders) {
    console.log(`\n${colors.cyan}Checking security headers...${colors.reset}`);
    const headerCheck = checkSecurityHeaders(securityHeaders);

    if (headerCheck.pass) {
      console.log(
        `${colors.green}✓ All required security headers are present${colors.reset}`,
      );
    } else {
      if (headerCheck.missing.length > 0) {
        console.log(
          `${colors.red}✗ Missing headers: ${headerCheck.missing.join(", ")}${colors.reset}`,
        );
      }

      if (headerCheck.incorrect.length > 0) {
        console.log(`${colors.red}✗ Incorrect headers:${colors.reset}`);
        headerCheck.incorrect.forEach((err) => console.log(`  - ${err}`));
      }
    }
  }

  // Overall result
  console.log(`\n${colors.cyan}Overall Health Check Result:${colors.reset}`);

  if (allEndpointsOk && authRedirectsOk && domainOk) {
    console.log(
      `${colors.green}✅ PASSED: Deployment appears to be healthy!${colors.reset}`,
    );
  } else {
    console.log(
      `${colors.yellow}⚠️ CAUTION: Some checks failed, deployment may have issues.${colors.reset}`,
    );

    // Suggest fixes
    console.log(`\n${colors.cyan}Suggested fixes:${colors.reset}`);

    if (!domainOk) {
      console.log(`- Configure the correct domain in Vercel project settings`);
      console.log(
        `- Update NEXTAUTH_URL in environment variables to match the domain`,
      );
    }

    if (!allEndpointsOk) {
      console.log(`- Check application logs in Vercel dashboard for errors`);
      console.log(`- Verify all required environment variables are set`);
      console.log(`- Consider redeploying the application`);
    }

    if (!authRedirectsOk) {
      console.log(
        `- Verify that middleware.ts is correctly filtering callback URLs`,
      );
      console.log(`- Check auth.ts redirect callback implementation`);
    }
  }
}

main().catch((error) => {
  console.error(
    `${colors.red}Error running health check:${colors.reset}`,
    error,
  );
  process.exit(1);
});
