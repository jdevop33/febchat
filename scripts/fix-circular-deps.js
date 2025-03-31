import fs from "node:fs";
import path from "node:path";

// List of components with circular dependencies
const CIRCULAR_COMPONENTS = [
  "components/artifact.tsx",
  "components/artifact-messages.tsx",
  "components/message.tsx",
  "components/document-preview.tsx",
  "components/document.tsx",
];

// Path to shared types
const SHARED_TYPES_PATH = path.join(
  process.cwd(),
  "types/shared/shared-types.ts",
);

// Function to analyze imports in a file
function analyzeImports(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const importRegex =
    /import\s+(?:{([^}]+)}\s+from\s+['"]([^'"]+)['"]|([^\s]+)\s+from\s+['"]([^'"]+)['"])/g;
  const imports = [];

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    if (match[1]) {
      // Named imports like: import { X, Y } from 'path'
      const namedImports = match[1].split(",").map((name) => name.trim());
      imports.push({
        type: "named",
        names: namedImports,
        path: match[2],
      });
    } else {
      // Default import like: import X from 'path'
      imports.push({
        type: "default",
        name: match[3],
        path: match[4],
      });
    }
  }

  return imports;
}

// Function to extract types from a file
function extractTypes(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const typeRegex =
    /export\s+(type|interface)\s+([A-Za-z0-9_]+)(?:\s*=\s*[^{;]+|\s*{([^}]*)}\s*)/g;
  const types = [];

  let match;
  while ((match = typeRegex.exec(content)) !== null) {
    types.push({
      kind: match[1], // 'type' or 'interface'
      name: match[2],
      body: match[3] || "",
    });
  }

  return types;
}

// Function to fix imports in a file
function fixImports(filePath, circularImports) {
  const content = fs.readFileSync(filePath, "utf8");
  let modifiedContent = content;

  // Replace imports from circular dependencies with shared types
  circularImports.forEach((importInfo) => {
    if (importInfo.type === "named") {
      const importPattern = new RegExp(
        `import\\s+{[^}]*${importInfo.names.join("[^}]*,\\s*[^}]*")}[^}]*}\\s+from\\s+['"]${importInfo.path.replace(/\//g, "\\/")}['"]`,
        "g",
      );
      modifiedContent = modifiedContent.replace(
        importPattern,
        `import { ${importInfo.names.join(", ")} } from '@/types/shared/shared-types'`,
      );
    }
  });

  fs.writeFileSync(`${filePath}.fixed`, modifiedContent);
  console.log(`Fixed imports in: ${filePath} (saved as ${filePath}.fixed)`);
}

// Function to update shared types file
function updateSharedTypes(extractedTypes) {
  const sharedTypesContent = fs.readFileSync(SHARED_TYPES_PATH, "utf8");

  // Check if types already exist in shared types
  const existingTypesRegex = /export\s+(type|interface)\s+([A-Za-z0-9_]+)/g;
  const existingTypes = new Set();

  let match;
  while ((match = existingTypesRegex.exec(sharedTypesContent)) !== null) {
    existingTypes.add(match[2]);
  }

  // Add new types that don't already exist
  let newContent = sharedTypesContent;
  let typesAdded = 0;

  extractedTypes.forEach((typeInfo) => {
    if (!existingTypes.has(typeInfo.name)) {
      const typeDefinition =
        typeInfo.kind === "type"
          ? `export type ${typeInfo.name} = any; // TODO: Replace with proper type definition\n`
          : `export interface ${typeInfo.name} {\n  // TODO: Add properties\n}\n`;

      newContent += `\n${typeDefinition}`;
      typesAdded++;
    }
  });

  if (typesAdded > 0) {
    fs.writeFileSync(`${SHARED_TYPES_PATH}.updated`, newContent);
    console.log(
      `Added ${typesAdded} new types to shared-types.ts (saved as shared-types.ts.updated)`,
    );
  } else {
    console.log("No new types needed to be added to shared-types.ts");
  }
}

// Main execution
console.log("Analyzing circular dependencies...");

// Step 1: Extract types from circular dependency components
const allExtractedTypes = [];
CIRCULAR_COMPONENTS.forEach((componentPath) => {
  const fullPath = path.join(process.cwd(), componentPath);
  if (fs.existsSync(fullPath)) {
    const types = extractTypes(fullPath);
    console.log(`Found ${types.length} types in ${componentPath}`);
    allExtractedTypes.push(...types);
  } else {
    console.warn(`Component file not found: ${fullPath}`);
  }
});

// Step 2: Update shared types file with extracted types
updateSharedTypes(allExtractedTypes);

// Step 3: Analyze imports in circular components
CIRCULAR_COMPONENTS.forEach((componentPath) => {
  const fullPath = path.join(process.cwd(), componentPath);
  if (fs.existsSync(fullPath)) {
    const imports = analyzeImports(fullPath);

    // Find imports from other circular components
    const circularImports = imports.filter((imp) => {
      const importPath = imp.path.startsWith("@/")
        ? imp.path.substring(2)
        : imp.path;
      return CIRCULAR_COMPONENTS.some((cp) => {
        const componentPath = cp.startsWith("./") ? cp.substring(2) : cp;
        return (
          importPath.includes(componentPath) || importPath === componentPath
        );
      });
    });

    if (circularImports.length > 0) {
      console.log(
        `Found ${circularImports.length} circular imports in ${componentPath}`,
      );
      fixImports(fullPath, circularImports);
    } else {
      console.log(`No circular imports found in ${componentPath}`);
    }
  }
});

console.log("Circular dependency fixing complete!");
console.log(
  "Review the .fixed and .updated files, and if they look good, replace the originals.",
);
