#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { glob } from 'glob';
import chalk from 'chalk';
import minimist from 'minimist';

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  // Directories to include in the analysis
  includeDirs: ['app', 'components', 'lib', 'hooks', 'types', 'artifacts'],
  // Files or directories to exclude
  excludePatterns: [
    'node_modules',
    '.next',
    '**/*.test.ts',
    '**/*.test.tsx',
    'public',
  ],
  // File extensions to analyze
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
};

interface ImportData {
  source: string;
  importPath: string;
  importedFrom: string;
}

interface ComponentDependency {
  component: string;
  dependsOn: string[];
  dependedOnBy: string[];
}

interface AuditResult {
  unusedFiles: string[];
  unusedComponents: string[];
  duplicateFunctionality: { 
    description: string;
    files: string[];
    similarity: number;
  }[];
  componentDependencies: Record<string, ComponentDependency>;
  uncoveredFiles: string[];
  coverageStats: {
    total: number;
    covered: number;
    percentage: number;
  };
}

async function runCodeAudit() {
  console.log(chalk.blue('🔍 Starting code audit...'));
  
  // Parse command-line arguments
  const args = minimist(process.argv.slice(2));
  const outputFile = args.output || 'code-audit-results.json';
  const verbose = args.verbose || false;
  
  // Result object
  const result: AuditResult = {
    unusedFiles: [],
    unusedComponents: [],
    duplicateFunctionality: [],
    componentDependencies: {},
    uncoveredFiles: [],
    coverageStats: {
      total: 0,
      covered: 0,
      percentage: 0
    }
  };

  try {
    // 1. Find all source files
    console.log(chalk.blue('📁 Scanning project files...'));
    const allFiles = await findAllFiles();
    console.log(chalk.green(`Found ${allFiles.length} source files`));
    
    // 2. Parse imports and exports
    console.log(chalk.blue('📊 Analyzing imports and exports...'));
    const importMap = await buildImportMap(allFiles);
    
    // 3. Identify unused files
    console.log(chalk.blue('🗑️ Identifying unused files...'));
    result.unusedFiles = await findUnusedFiles(allFiles, importMap);
    console.log(chalk.yellow(`Found ${result.unusedFiles.length} potentially unused files`));
    
    // 4. Find uncovered components by running Jest coverage
    console.log(chalk.blue('🧪 Checking test coverage...'));
    try {
      const coverageResult = await checkTestCoverage();
      result.uncoveredFiles = coverageResult.uncoveredFiles;
      result.coverageStats = coverageResult.stats;
      
      console.log(chalk.yellow(`Test coverage: ${result.coverageStats.percentage.toFixed(2)}%`));
      console.log(chalk.yellow(`${result.uncoveredFiles.length} files have no test coverage`));
    } catch (error) {
      console.error(chalk.red('Failed to check test coverage. Is Jest installed?'));
      console.error(error);
    }
    
    // 5. Detect duplicate functionality
    console.log(chalk.blue('🔄 Detecting duplicate functionality...'));
    result.duplicateFunctionality = await detectDuplicates(allFiles);
    console.log(chalk.yellow(`Found ${result.duplicateFunctionality.length} potential code duplications`));
    
    // 6. Build component dependency graph
    console.log(chalk.blue('🔗 Building component dependency graph...'));
    result.componentDependencies = await buildDependencyGraph(allFiles, importMap);
    
    // 7. Save results to file
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(chalk.green(`✅ Audit complete! Results saved to ${outputFile}`));
    
    // 8. Generate visual dependency graph
    console.log(chalk.blue('📊 Generating dependency visualization...'));
    await generateDependencyVisualization(result.componentDependencies, 'dependency-graph.html');
    console.log(chalk.green('✅ Dependency graph generated as dependency-graph.html'));
    
    // Print summary to console
    printSummary(result);
  } catch (error) {
    console.error(chalk.red('❌ Error during code audit:'), error);
    process.exit(1);
  }
}

async function findAllFiles(): Promise<string[]> {
  const patterns = CONFIG.includeDirs.map(dir => `${dir}/**/*{${CONFIG.extensions.join(',')}}`);
  
  const files = await glob(patterns, {
    ignore: CONFIG.excludePatterns,
    nodir: true,
    absolute: true,
  });
  
  return files;
}

async function buildImportMap(files: string[]): Promise<Map<string, ImportData[]>> {
  const importMap = new Map<string, ImportData[]>();
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const imports = extractImports(content, file);
      
      imports.forEach(importData => {
        if (!importMap.has(importData.importPath)) {
          importMap.set(importData.importPath, []);
        }
        importMap.get(importData.importPath)?.push(importData);
      });
    } catch (error) {
      console.error(`Error parsing file ${file}:`, error);
    }
  }
  
  return importMap;
}

function extractImports(content: string, filePath: string): ImportData[] {
  const imports: ImportData[] = [];
  
  try {
    // Simple regex-based extraction (for demonstration)
    // In a production environment, use a proper AST parser
    const importRegex = /import\s+(?:(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
    
    // Rewritten to avoid assignment in expression
    let match: RegExpExecArray | null = importRegex.exec(content);
    while (match !== null) {
      const importPath = resolveImportPath(match[1], filePath);
      if (importPath) {
        imports.push({
          source: content.substring(match.index, match.index + match[0].length),
          importPath,
          importedFrom: filePath,
        });
      }
      
      // Get next match
      match = importRegex.exec(content);
    }
  } catch (error) {
    console.error(`Error extracting imports from ${filePath}:`, error);
  }
  
  return imports;
}

function resolveImportPath(importPath: string, importingFile: string): string {
  if (importPath.startsWith('.')) {
    // Relative import
    const dirName = path.dirname(importingFile);
    return path.resolve(dirName, importPath);
  } else if (importPath.startsWith('@/')) {
    // Alias import (@/ usually points to the src directory)
    return path.resolve(process.cwd(), importPath.replace('@/', ''));
  }
  
  // External package or cannot be resolved
  return importPath;
}

async function findUnusedFiles(allFiles: string[], importMap: Map<string, ImportData[]>): Promise<string[]> {
  const unusedFiles: string[] = [];
  
  for (const file of allFiles) {
    // Skip entry points like pages, layouts, etc.
    if (file.includes('page.') || file.includes('layout.') || file.includes('route.')) {
      continue;
    }
    
    // Skip index files which are usually entry points
    if (path.basename(file) === 'index.ts' || path.basename(file) === 'index.tsx') {
      continue;
    }
    
    // Check if file is imported anywhere
    const normalizedPath = path.normalize(file);
    const isImported = Array.from(importMap.keys()).some(importPath => {
      const resolvedPath = path.normalize(importPath);
      return resolvedPath === normalizedPath || 
             resolvedPath === normalizedPath.replace(/(\.ts|\.tsx)$/, '') ||
             normalizedPath.endsWith(resolvedPath);
    });
    
    if (!isImported) {
      unusedFiles.push(file);
    }
  }
  
  return unusedFiles;
}

async function checkTestCoverage() {
  try {
    // Try to run Jest with coverage
    await execAsync('npx jest --coverage --silent');
    
    // Read coverage report
    const coverageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'coverage/coverage-final.json'), 'utf-8')
    );
    
    const uncoveredFiles: string[] = [];
    let totalFiles = 0;
    let coveredFiles = 0;
    
    for (const filePath in coverageJson) {
      totalFiles++;
      const fileCoverage = coverageJson[filePath];
      const statementCoverage = fileCoverage.statementMap ? 
        Object.keys(fileCoverage.statementMap).length : 0;
      const coveredStatements = fileCoverage.s ? 
        Object.values(fileCoverage.s).filter(v => v > 0).length : 0;
      
      const coveragePercentage = statementCoverage ? 
        (coveredStatements / statementCoverage) * 100 : 0;
      
      if (coveragePercentage < 1) {
        uncoveredFiles.push(filePath);
      } else {
        coveredFiles++;
      }
    }
    
    return {
      uncoveredFiles,
      stats: {
        total: totalFiles,
        covered: coveredFiles,
        percentage: (coveredFiles / totalFiles) * 100
      }
    };
  } catch (error) {
    // If Jest fails or isn't installed, use a mock approach to estimate coverage
    console.warn('Jest not available, simulating coverage check...');
    
    const allFiles = await findAllFiles();
    const testFiles = await glob('**/*.{test,spec}.{ts,tsx,js,jsx}', { 
      ignore: CONFIG.excludePatterns,
      nodir: true,
      absolute: true,
    });
    
    // Crude estimation: check which files have corresponding test files
    const uncoveredFiles = allFiles.filter(file => {
      const baseName = path.basename(file).replace(/\.(ts|tsx|js|jsx)$/, '');
      return !testFiles.some(testFile => 
        testFile.includes(`${baseName}.test`) || testFile.includes(`${baseName}.spec`)
      );
    });
    
    return {
      uncoveredFiles,
      stats: {
        total: allFiles.length,
        covered: allFiles.length - uncoveredFiles.length,
        percentage: ((allFiles.length - uncoveredFiles.length) / allFiles.length) * 100
      }
    };
  }
}

async function detectDuplicates(files: string[]): Promise<AuditResult['duplicateFunctionality']> {
  const duplicates: AuditResult['duplicateFunctionality'] = [];
  
  // Extract functions from files
  const functionsMap = new Map<string, { 
    functionCode: string, 
    file: string 
  }[]>();
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const functionMatches = extractFunctions(content);
      
      functionMatches.forEach(functionMatch => {
        const functionName = functionMatch.name;
        const functionCode = functionMatch.code;
        
        if (!functionsMap.has(functionName)) {
          functionsMap.set(functionName, []);
        }
        
        functionsMap.get(functionName)?.push({ 
          functionCode, 
          file 
        });
      });
    } catch (error) {
      console.error(`Error analyzing file ${file} for duplicates:`, error);
    }
  }
  
  // Find potential duplicates by function name and code similarity
  for (const [functionName, occurrences] of functionsMap.entries()) {
    if (occurrences.length > 1) {
      // Check code similarity
      const similarGroups = findSimilarFunctions(occurrences);
      
      similarGroups.forEach(group => {
        if (group.length > 1) {
          duplicates.push({
            description: `Potential duplicate implementation of '${functionName}'`,
            files: group.map(g => g.file),
            similarity: calculateSimilarity(group[0].functionCode, group[1].functionCode)
          });
        }
      });
    }
  }
  
  return duplicates;
}

function extractFunctions(content: string): { name: string; code: string }[] {
  const functions: { name: string; code: string }[] = [];
  
  // Match function declarations: function name() {}, const name = () => {}, etc.
  const functionRegexes = [
    /function\s+(\w+)\s*\([^)]*\)\s*{([^{}]*(?:{[^{}]*}[^{}]*)*)}/g, // function name() {}
    /const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*{([^{}]*(?:{[^{}]*}[^{}]*)*)}/g, // const name = () => {}
    /const\s+(\w+)\s*=\s*function\s*(?:async\s*)?\([^)]*\)\s*{([^{}]*(?:{[^{}]*}[^{}]*)*)}/g, // const name = function() {}
  ];
  
  for (const regex of functionRegexes) {
    // Rewritten to avoid assignment in expression
    let match: RegExpExecArray | null = regex.exec(content);
    while (match !== null) {
      const name = match[1];
      const code = match[0];
      
      functions.push({ name, code });
      
      // Get next match
      match = regex.exec(content);
    }
  }
  
  return functions;
}

function findSimilarFunctions(
  functions: { functionCode: string; file: string }[]
): { functionCode: string; file: string }[][] {
  const groups: { functionCode: string; file: string }[][] = [];
  const processed = new Set<number>();
  
  for (let i = 0; i < functions.length; i++) {
    if (processed.has(i)) continue;
    
    const group = [functions[i]];
    processed.add(i);
    
    for (let j = i + 1; j < functions.length; j++) {
      if (processed.has(j)) continue;
      
      const similarity = calculateSimilarity(functions[i].functionCode, functions[j].functionCode);
      if (similarity > 0.7) { // 70% similarity threshold
        group.push(functions[j]);
        processed.add(j);
      }
    }
    
    if (group.length > 1) {
      groups.push(group);
    }
  }
  
  return groups;
}

function calculateSimilarity(str1: string, str2: string): number {
  // Levenshtein distance-based similarity
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  // Create a matrix of size (m+1) x (n+1)
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Fill the first row
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  
  // Fill the first column
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  
  // Fill the rest of the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],      // deletion
          dp[i][j - 1],      // insertion
          dp[i - 1][j - 1]   // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

async function buildDependencyGraph(
  files: string[], 
  importMap: Map<string, ImportData[]>
): Promise<Record<string, ComponentDependency>> {
  const componentDependencies: Record<string, ComponentDependency> = {};
  
  // Initialize component dependencies
  for (const file of files) {
    const componentName = getComponentName(file);
    if (componentName) {
      componentDependencies[componentName] = {
        component: componentName,
        dependsOn: [],
        dependedOnBy: []
      };
    }
  }
  
  // Populate dependencies
  for (const [importPath, importsData] of importMap.entries()) {
    const importedComponent = getComponentName(importPath);
    if (!importedComponent) continue;
    
    for (const importData of importsData) {
      const importingComponent = getComponentName(importData.importedFrom);
      if (!importingComponent || importingComponent === importedComponent) continue;
      
      // Add to dependsOn
      if (componentDependencies[importingComponent] && 
          !componentDependencies[importingComponent].dependsOn.includes(importedComponent)) {
        componentDependencies[importingComponent].dependsOn.push(importedComponent);
      }
      
      // Add to dependedOnBy
      if (componentDependencies[importedComponent] && 
          !componentDependencies[importedComponent].dependedOnBy.includes(importingComponent)) {
        componentDependencies[importedComponent].dependedOnBy.push(importingComponent);
      }
    }
  }
  
  return componentDependencies;
}

function getComponentName(filePath: string): string | null {
  if (!filePath) return null;
  
  // Component files typically end with .tsx and are PascalCased
  const basename = path.basename(filePath).replace(/\.(ts|tsx|js|jsx)$/, '');
  
  // Check if the filename follows PascalCase naming convention
  if (/^[A-Z][a-zA-Z0-9]*$/.test(basename)) {
    return basename;
  }
  
  // For non-component files, use relative path from project root
  if (filePath.startsWith(process.cwd())) {
    return filePath.substring(process.cwd().length + 1).replace(/\.(ts|tsx|js|jsx)$/, '');
  }
  
  return null;
}

async function generateDependencyVisualization(
  dependencies: Record<string, ComponentDependency>,
  outputFile: string
): Promise<void> {
  // Generate a D3.js visualization
  const nodes = Object.keys(dependencies).map(component => ({ id: component }));
  
  const links: { source: string; target: string }[] = [];
  for (const [component, dependency] of Object.entries(dependencies)) {
    for (const dep of dependency.dependsOn) {
      links.push({ source: component, target: dep });
    }
  }
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Component Dependency Graph</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; overflow: hidden; }
    .links line { stroke: #999; stroke-opacity: 0.6; }
    .nodes circle { stroke: #fff; stroke-width: 1.5px; }
    .node-label { font-size: 10px; pointer-events: none; }
    .node-details { 
      position: fixed; 
      top: 10px; 
      right: 10px; 
      background: #fff; 
      border: 1px solid #ccc; 
      padding: 10px; 
      max-width: 300px;
      display: none;
    }
  </style>
</head>
<body>
  <div id="dependency-graph"></div>
  <div class="node-details" id="details-panel">
    <h3 id="component-name"></h3>
    <div>
      <h4>Depends on:</h4>
      <ul id="depends-on"></ul>
    </div>
    <div>
      <h4>Depended on by:</h4>
      <ul id="depended-on-by"></ul>
    </div>
  </div>

  <script>
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const nodes = ${JSON.stringify(nodes)};
    const links = ${JSON.stringify(links)};
    const dependencies = ${JSON.stringify(dependencies)};
    
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));
    
    const svg = d3.select("#dependency-graph")
      .append("svg")
      .attr("width", width)
      .attr("height", height);
    
    // Add zoom behavior
    const g = svg.append("g");
    svg.call(d3.zoom()
      .extent([[0, 0], [width, height]])
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      }));
    
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke-width", 1);
    
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(nodes)
      .enter().append("circle")
      .attr("r", d => {
        const component = dependencies[d.id];
        if (!component) return 5;
        return 5 + Math.min(10, (component.dependedOnBy.length / 2));
      })
      .attr("fill", d => {
        const component = dependencies[d.id];
        if (!component) return "#1f77b4";
        
        // Color based on dependency count
        const dependencyCount = component.dependsOn.length;
        if (dependencyCount > 10) return "#d62728"; // red for high dependencies
        if (dependencyCount > 5) return "#ff7f0e"; // orange for medium
        return "#2ca02c"; // green for low dependencies
      })
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
    
    // Add labels
    const label = g.append("g")
      .attr("class", "node-labels")
      .selectAll("text")
      .data(nodes)
      .enter().append("text")
      .attr("class", "node-label")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .text(d => d.id.length > 20 ? d.id.substring(0, 20) + '...' : d.id);
    
    // Show component details on click
    node.on("click", showDetails);
    
    function showDetails(event, d) {
      const component = dependencies[d.id];
      if (!component) return;
      
      // Update details panel
      document.getElementById("component-name").textContent = d.id;
      
      const dependsOnList = document.getElementById("depends-on");
      dependsOnList.innerHTML = "";
      component.dependsOn.forEach(dep => {
        const li = document.createElement("li");
        li.textContent = dep;
        dependsOnList.appendChild(li);
      });
      
      const dependedOnByList = document.getElementById("depended-on-by");
      dependedOnByList.innerHTML = "";
      component.dependedOnBy.forEach(dep => {
        const li = document.createElement("li");
        li.textContent = dep;
        dependedOnByList.appendChild(li);
      });
      
      // Show the panel
      document.getElementById("details-panel").style.display = "block";
    }
    
    // Simulation tick function
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      
      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
      
      label
        .attr("x", d => d.x)
        .attr("y", d => d.y);
    });
    
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  </script>
</body>
</html>
  `;
  
  fs.writeFileSync(outputFile, html);
}

function printSummary(result: AuditResult) {
  console.log(`\n${chalk.blue.bold('📋 CODE AUDIT SUMMARY')}`);
  console.log(chalk.blue('====================\n'));
  
  // 1. Unused Files
  console.log(chalk.yellow.bold('🗑️ Unused Files:'));
  if (result.unusedFiles.length === 0) {
    console.log(chalk.green('  None found'));
  } else {
    console.log(chalk.red(`  ${result.unusedFiles.length} unused files found`));
    result.unusedFiles.slice(0, 5).forEach(file => {
      console.log(`  - ${file.replace(process.cwd(), '')}`);
    });
    if (result.unusedFiles.length > 5) {
      console.log(`  ... and ${result.unusedFiles.length - 5} more`);
    }
  }
  
  // 2. Test Coverage
  console.log(`\n${chalk.yellow.bold('🧪 Test Coverage:')}`);
  console.log(`  Overall: ${result.coverageStats.percentage.toFixed(2)}% (${result.coverageStats.covered}/${result.coverageStats.total} files)`);
  if (result.uncoveredFiles.length > 0) {
    console.log(chalk.red(`  ${result.uncoveredFiles.length} files with no tests`));
    result.uncoveredFiles.slice(0, 5).forEach(file => {
      console.log(`  - ${file.replace(process.cwd(), '')}`);
    });
    if (result.uncoveredFiles.length > 5) {
      console.log(`  ... and ${result.uncoveredFiles.length - 5} more`);
    }
  }
  
  // 3. Duplicate Functionality
  console.log(`\n${chalk.yellow.bold('🔄 Potential Code Duplication:')}`);
  if (result.duplicateFunctionality.length === 0) {
    console.log(chalk.green('  None found'));
  } else {
    console.log(chalk.red(`  ${result.duplicateFunctionality.length} potential duplications found`));
    result.duplicateFunctionality.slice(0, 5).forEach(dup => {
      console.log(`  - ${dup.description} (${dup.similarity.toFixed(2) * 100}% similar)`);
      dup.files.slice(0, 2).forEach(file => console.log(`    ${file.replace(process.cwd(), '')}`));
    });
    if (result.duplicateFunctionality.length > 5) {
      console.log(`  ... and ${result.duplicateFunctionality.length - 5} more`);
    }
  }
  
  // 4. Component Dependencies
  console.log(`\n${chalk.yellow.bold('🔗 Component Dependencies:')}`);
  const depCounts = Object.values(result.componentDependencies).map(dep => dep.dependsOn.length);
  const avgDependencies = depCounts.reduce((sum, count) => sum + count, 0) / depCounts.length || 0;
  console.log(`  Average dependencies per component: ${avgDependencies.toFixed(2)}`);
  
  // Most depended-on components
  const mostDepended = Object.values(result.componentDependencies)
    .sort((a, b) => b.dependedOnBy.length - a.dependedOnBy.length)
    .slice(0, 5);
  
  console.log('  Most used components:');
  mostDepended.forEach(dep => {
    console.log(`  - ${dep.component}: used by ${dep.dependedOnBy.length} components`);
  });
  
  // Components with most dependencies
  const mostDependencies = Object.values(result.componentDependencies)
    .sort((a, b) => b.dependsOn.length - a.dependsOn.length)
    .slice(0, 5);
  
  console.log('  Components with most dependencies:');
  mostDependencies.forEach(dep => {
    console.log(`  - ${dep.component}: depends on ${dep.dependsOn.length} components`);
  });
  
  console.log(`\n${chalk.blue.bold('View full results in code-audit-results.json')}`);
  console.log(chalk.blue.bold('View dependency graph in dependency-graph.html'));
}

// Run the audit
runCodeAudit();