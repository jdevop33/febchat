const fs = require('node:fs');

// Read the dependency JSON
const dependencyData = JSON.parse(
  fs.readFileSync('./dependency-analysis.json', 'utf8'),
);

// Initialize results object
const results = {
  circularDependencies: [],
  highDependencyModules: [],
  potentiallyUnusedModules: [],
  complexModules: [],
};

// Find circular dependencies
function findCircularDependencies(data) {
  const visited = new Set();
  const recursionStack = new Set();
  const circulars = [];

  function dfs(node, path = []) {
    if (recursionStack.has(node)) {
      const cycle = [...path.slice(path.indexOf(node)), node];
      circulars.push(cycle);
      return;
    }

    if (visited.has(node)) return;

    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const dependencies = data[node] || [];
    for (const dependency of dependencies) {
      dfs(dependency, [...path]);
    }

    recursionStack.delete(node);
  }

  for (const node in data) {
    dfs(node);
  }

  // Remove duplicates and sort by length
  const uniqueCirculars = [...new Set(circulars.map(JSON.stringify))].map(
    JSON.parse,
  );
  return uniqueCirculars.sort((a, b) => b.length - a.length);
}

// Find modules with many dependencies
function findHighDependencyModules(data) {
  const modulesByDependencyCount = Object.entries(data)
    .map(([module, dependencies]) => ({
      module,
      count: dependencies.length,
      dependencies,
    }))
    .sort((a, b) => b.count - a.count);

  return modulesByDependencyCount.slice(0, 15); // Top 15 modules with most dependencies
}

// Find potentially unused modules (those that aren't imported anywhere)
function findPotentiallyUnusedModules(data) {
  const allModules = new Set(Object.keys(data));
  const importedModules = new Set();

  for (const module in data) {
    data[module].forEach((dep) => importedModules.add(dep));
  }

  const unusedModules = [];

  for (const module of allModules) {
    if (!importedModules.has(module)) {
      unusedModules.push(module);
    }
  }

  return unusedModules;
}

// Find complex modules (high number of dependencies and imported by many)
function findComplexModules(data) {
  // Create a map of modules by how many times they are imported
  const importCount = {};
  for (const module in data) {
    for (const dependency of data[module]) {
      importCount[dependency] = (importCount[dependency] || 0) + 1;
    }
  }

  // Calculate complexity score (dependencies * imports)
  const complexityScores = Object.entries(data).map(
    ([module, dependencies]) => ({
      module,
      dependenciesCount: dependencies.length,
      importedByCount: importCount[module] || 0,
      complexityScore: dependencies.length * (importCount[module] || 0),
      dependencies,
    }),
  );

  return complexityScores
    .sort((a, b) => b.complexityScore - a.complexityScore)
    .slice(0, 15); // Top 15 complex modules
}

// Run the analysis
results.circularDependencies = findCircularDependencies(dependencyData);
results.highDependencyModules = findHighDependencyModules(dependencyData);
results.potentiallyUnusedModules = findPotentiallyUnusedModules(dependencyData);
results.complexModules = findComplexModules(dependencyData);

// Format and output the results
console.log('=== DEPENDENCY ANALYSIS REPORT ===\n');

console.log(`1. CIRCULAR DEPENDENCIES\n${'-'.repeat(30)}`);
if (results.circularDependencies.length === 0) {
  console.log('No circular dependencies found. Good job!');
} else {
  console.log(
    `Found ${results.circularDependencies.length} circular dependencies:\n`,
  );
  results.circularDependencies.forEach((cycle, i) => {
    console.log(`Cycle #${i + 1}: ${cycle.join(' → ')} → ${cycle[0]}`);
  });
}

console.log(`\n\n2. HIGH DEPENDENCY MODULES\n${'-'.repeat(30)}`);
console.log(
  'Modules that import many other modules (most dependencies first):\n',
);
results.highDependencyModules.forEach(({ module, count, dependencies }) => {
  console.log(`${module}: ${count} dependencies`);
  if (count > 10) {
    console.log(
      `  Key dependencies: ${dependencies.slice(0, 5).join(', ')}...`,
    );
  }
});

console.log(`\n\n3. POTENTIALLY UNUSED MODULES\n${'-'.repeat(30)}`);
console.log(
  'Modules that are not imported by any other module (may be entry points or unused):\n',
);
results.potentiallyUnusedModules.forEach((module) => {
  // Filter out some common entry points that are expected to be unused
  if (
    !module.includes('app/page') &&
    !module.includes('app/layout') &&
    !module.includes('scripts/')
  ) {
    console.log(module);
  }
});

console.log(`\n\n4. COMPLEX MODULES\n${'-'.repeat(30)}`);
console.log(
  'Modules with high complexity (many dependencies and imported by many other modules):\n',
);
results.complexModules.forEach(
  ({ module, dependenciesCount, importedByCount, complexityScore }) => {
    console.log(
      `${module}: ${dependenciesCount} dependencies, imported by ${importedByCount} modules, score: ${complexityScore}`,
    );
  },
);

// Save detailed results to file
fs.writeFileSync(
  './dependency-analysis-results.json',
  JSON.stringify(results, null, 2),
);
console.log('\n\nDetailed results saved to dependency-analysis-results.json');

console.log('\n=== END OF REPORT ===');
