import fs from "node:fs";
import path from "node:path";

// List of components to instrument
const COMPONENTS_TO_PROFILE = [
  "sheet-editor.tsx",
  "diffview.tsx",
  "chat.tsx",
  "messages.tsx",
  "artifact.tsx",
];

// Profiling code to inject
const PROFILING_CODE = `
// Performance profiling
const startTime = performance.now();
useEffect(() => {
  const renderTime = performance.now() - startTime;
  console.log(\`[PROFILER] \${Component.name || 'Component'} rendered in \${renderTime.toFixed(2)}ms\`);
  
  return () => {
    console.log(\`[PROFILER] \${Component.name || 'Component'} unmounted\`);
  };
}, []);
`;

// Function to inject profiling code into components
function injectProfilingCode(filePath) {
  const content = fs.readFileSync(filePath, "utf8");

  // Only inject if not already profiled
  if (content.includes("[PROFILER]")) {
    console.log(`Skipping already profiled component: ${filePath}`);
    return;
  }

  // Find insertion point after imports and before component definition
  const lines = content.split("\n");
  let insertionLine = 0;

  // Find the last import statement
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("import ")) {
      insertionLine = i + 1;
    }
    if (
      lines[i].includes("function ") &&
      lines[i].includes("(") &&
      lines[i].includes(")")
    ) {
      break;
    }
  }

  // Add performance.now import if needed
  if (!content.includes("performance")) {
    lines.splice(insertionLine, 0, `import { useEffect } from 'react';`);
    insertionLine++;
  }

  // Insert profiling code
  const componentName = path.basename(filePath, ".tsx");
  const modifiedProfilingCode = PROFILING_CODE.replace(
    /Component\.name/g,
    `'${componentName}'`,
  );

  // Find where to insert the profiling code (after component function declaration)
  for (let i = insertionLine; i < lines.length; i++) {
    if (
      lines[i].includes("return (") ||
      lines[i].includes("return (") ||
      lines[i].trim() === "return (" ||
      lines[i].trim() === "{"
    ) {
      lines.splice(i, 0, modifiedProfilingCode);
      break;
    }
  }

  // Write modified content
  fs.writeFileSync(`${filePath}.bak`, content); // Create backup
  fs.writeFileSync(filePath, lines.join("\n"));
  console.log(`Profiling added to: ${filePath}`);
}

// Find all components
function findComponents() {
  const componentsDir = path.join(process.cwd(), "components");
  const matches = [];

  function searchDir(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        searchDir(filePath);
      } else if (COMPONENTS_TO_PROFILE.includes(file)) {
        matches.push(filePath);
      }
    }
  }

  searchDir(componentsDir);
  return matches;
}

// Main execution
const componentFiles = findComponents();
console.log(`Found ${componentFiles.length} components to profile.`);

componentFiles.forEach((filePath) => {
  injectProfilingCode(filePath);
});

console.log("Profiling instrumentation complete!");
console.log("Run your app and check the console for [PROFILER] output.");
console.log(
  "You may want to remove the profiling code before production deployment.",
);
