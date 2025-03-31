/**
 * This script helps diagnose import resolution issues
 * It scans files with import errors and checks if the actual files exist
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

// Files with import issues
const problematicFiles = [
  {
    file: "components/chat/chat.tsx",
    importPaths: [
      "@/components/chat/chat-header",
      "@/lib/db/schema",
      "@/lib/utils",
      "@/components/ui/visibility-selector",
      "@/hooks/use-artifact",
      "@/hooks/use-chat-visibility",
    ],
  },
  {
    file: "app/(chat)/api/chat/route.ts",
    importPaths: [
      "@/app/(auth)/auth",
      "@/lib/ai/models",
      "@/lib/ai/prompts",
      "@/lib/db/queries",
      "@/lib/utils",
    ],
  },
];

// Check if path aliases are resolving correctly
function checkPathResolver() {
  problematicFiles.forEach(({ file, importPaths }) => {
    console.log(`\nChecking imports for ${file}:`);

    importPaths.forEach((importPath) => {
      // Convert @/ path to actual file system path
      const resolvedPath = importPath.replace("@/", "");

      // Check if path exists with various extensions
      const extensions = [".ts", ".tsx", ".js", ".jsx"];
      let found = false;

      for (const ext of extensions) {
        const fullPath = path.join(rootDir, `${resolvedPath}${ext}`);
        if (fs.existsSync(fullPath)) {
          console.log(
            `✅ Import ${importPath} -> Found at ${resolvedPath}${ext}`,
          );
          found = true;
          break;
        }
      }

      // Check if it might be a directory with an index file
      if (!found) {
        for (const ext of extensions) {
          const indexPath = path.join(rootDir, resolvedPath, `index${ext}`);
          if (fs.existsSync(indexPath)) {
            console.log(
              `✅ Import ${importPath} -> Found at ${resolvedPath}/index${ext}`,
            );
            found = true;
            break;
          }
        }
      }

      if (!found) {
        console.log(
          `❌ Import ${importPath} -> Not found at ${resolvedPath}.*`,
        );

        // Try to suggest alternatives
        const pathParts = resolvedPath.split("/");
        const fileName = pathParts.pop();
        const dirPath = pathParts.join("/");

        try {
          if (fs.existsSync(path.join(rootDir, dirPath))) {
            const dirContents = fs.readdirSync(path.join(rootDir, dirPath));
            const similarFiles = dirContents.filter((file) =>
              file.startsWith(fileName || ""),
            );

            if (similarFiles.length > 0) {
              console.log(`   Possible alternatives in ${dirPath}/:`);
              similarFiles.forEach((file) => console.log(`   - ${file}`));
            }
          }
        } catch (error) {
          // Ignore directory reading errors
        }
      }
    });
  });
}

// Check tsconfig paths
function checkTsConfigPaths() {
  console.log("\nChecking tsconfig.json paths configuration:");
  try {
    const tsConfigPath = path.join(rootDir, "tsconfig.json");
    const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, "utf8"));

    if (tsConfig.compilerOptions && tsConfig.compilerOptions.paths) {
      console.log("Path aliases defined in tsconfig.json:");
      Object.entries(tsConfig.compilerOptions.paths).forEach(
        ([alias, targets]) => {
          console.log(`  ${alias} -> ${targets.join(", ")}`);
        },
      );
    } else {
      console.log("❌ No paths defined in tsconfig.json compilerOptions");
    }
  } catch (error) {
    console.error("Error reading tsconfig.json:", error.message);
  }
}

// Create jsconfig.json file if it doesn't exist
function ensureJsConfig() {
  const jsConfigPath = path.join(rootDir, "jsconfig.json");

  if (!fs.existsSync(jsConfigPath)) {
    console.log("\nCreating jsconfig.json for better path resolution:");

    const jsConfig = {
      compilerOptions: {
        baseUrl: ".",
        paths: {
          "@/*": ["./*"],
        },
      },
    };

    fs.writeFileSync(jsConfigPath, JSON.stringify(jsConfig, null, 2));
    console.log("✅ jsconfig.json created");
  } else {
    console.log("\n✅ jsconfig.json already exists");
  }
}

// Main execution
console.log("🔍 Diagnosing import resolution issues...");
checkPathResolver();
checkTsConfigPaths();
ensureJsConfig();
console.log("\n💡 Fix Recommendations:");
console.log(
  "1. Update .eslintrc.json to ignore import issues or configure resolver correctly",
);
console.log(
  "2. Ensure all imported files actually exist at the expected locations",
);
console.log(
  "3. Try using relative imports instead of path aliases for problematic imports",
);
