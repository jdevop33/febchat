import fs from "node:fs";
import path from "node:path";

const API_ROUTES_DIR = path.join(process.cwd(), "app");

// Function to find all API routes
function findApiRoutes(dir, routes = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findApiRoutes(filePath, routes);
    } else if (file === "route.ts" && filePath.includes("/api/")) {
      const relativePath = filePath.replace(process.cwd(), "");
      const apiPath = relativePath
        .replace("/app", "")
        .replace("/route.ts", "")
        .replace(/\/\[\.\.\.(.*)\]/, "/*");

      routes.push({
        path: apiPath,
        filePath: relativePath,
        methods: getApiMethods(filePath),
      });
    }
  }

  return routes;
}

// Extract API methods from route file
function getApiMethods(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const methods = [];

  if (content.includes("export async function GET")) methods.push("GET");
  if (content.includes("export async function POST")) methods.push("POST");
  if (content.includes("export async function PUT")) methods.push("PUT");
  if (content.includes("export async function PATCH")) methods.push("PATCH");
  if (content.includes("export async function DELETE")) methods.push("DELETE");

  return methods;
}

// Main execution
const apiRoutes = findApiRoutes(API_ROUTES_DIR);
console.log("API Routes Found:", apiRoutes.length);
console.table(apiRoutes);

// Generate test file
const testFileContent = apiRoutes
  .map((route) => {
    const methods = route.methods
      .map((method) => {
        return `
// Test ${method} ${route.path}
async function test${method}${route.path.replace(/\//g, "_").replace(/[^\w]/g, "")}() {
  try {
    const response = await fetch('${route.path}', { 
      method: '${method}',
      headers: {
        'Content-Type': 'application/json'
      }
      // Add body if needed for POST/PUT/PATCH
    });
    
    console.log('${method} ${route.path} Status:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', data);
    } else {
      console.error('Failed response:', await response.text());
    }
  } catch (error) {
    console.error('Error testing ${method} ${route.path}:', error);
  }
}
`;
      })
      .join("\n");

    return methods;
  })
  .join("\n");

fs.writeFileSync(
  path.join(process.cwd(), "scripts", "api-endpoint-tests.js"),
  `// Auto-generated API tests\n${testFileContent}\n\n// Run all tests\n(async () => {\n  // Add test function calls here\n})();`,
);

console.log("Generated API test file in scripts/api-endpoint-tests.js");
