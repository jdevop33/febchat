import fs from "node:fs";
import path from "node:path";

const COMPONENTS_DIR = path.join(process.cwd(), "components");
const DEPENDENCY_GRAPH = {};

// Function to analyze component imports
function analyzeComponent(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const componentName = path.basename(filePath, path.extname(filePath));

  // Extract imports
  const importRegex = /import\s+[\{\s\w,\s\}]+\s+from\s+['"]([^'"]+)['"]/g;
  const imports = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    let importPath = match[1];

    // Handle aliased paths
    if (importPath.startsWith("@/")) {
      importPath = importPath.substring(2);
    }

    // Only track component dependencies
    if (importPath.includes("components/")) {
      imports.push(importPath);
    }
  }

  DEPENDENCY_GRAPH[componentName] = imports;
  return { componentName, imports };
}

// Function to find all components
function findComponents(dir, components = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findComponents(filePath, components);
    } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      components.push(filePath);
    }
  }

  return components;
}

// Function to detect circular dependencies
function findCircularDependencies() {
  const circularDeps = [];

  for (const component in DEPENDENCY_GRAPH) {
    const visited = new Set();
    const pathStack = [];

    function dfs(current) {
      if (pathStack.includes(current)) {
        const cycle = [...pathStack.slice(pathStack.indexOf(current)), current];
        circularDeps.push(cycle);
        return true;
      }

      if (visited.has(current)) return false;

      visited.add(current);
      pathStack.push(current);

      const dependencies = DEPENDENCY_GRAPH[current] || [];
      for (const dep of dependencies) {
        const depComponent = path.basename(dep, path.extname(dep));
        if (dfs(depComponent)) return true;
      }

      pathStack.pop();
      return false;
    }

    dfs(component);
  }

  return circularDeps;
}

// Main execution
const componentFiles = findComponents(COMPONENTS_DIR);
console.log(`Found ${componentFiles.length} component files.`);

componentFiles.forEach((file) => {
  analyzeComponent(file);
});

console.log(`Analyzed ${Object.keys(DEPENDENCY_GRAPH).length} components.`);

// Find circular dependencies
const circularDeps = findCircularDependencies();
console.log(`Found ${circularDeps.length} circular dependencies:`);
circularDeps.forEach((cycle) => {
  console.log(`Circular dependency: ${cycle.join(" → ")}`);
});

// Generate visualization
const visualizationData = {
  nodes: Object.keys(DEPENDENCY_GRAPH).map((name) => ({ id: name, group: 1 })),
  links: [],
};

Object.entries(DEPENDENCY_GRAPH).forEach(([component, deps]) => {
  deps.forEach((dep) => {
    const targetName = path.basename(dep, path.extname(dep));
    visualizationData.links.push({
      source: component,
      target: targetName,
      value: 1,
    });
  });
});

fs.writeFileSync(
  path.join(process.cwd(), "component-dependency-graph.json"),
  JSON.stringify(visualizationData, null, 2),
);

// Create HTML visualization
const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Component Dependency Graph</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; }
    .links line { stroke: #999; stroke-opacity: 0.6; }
    .nodes circle { stroke: #fff; stroke-width: 1.5px; }
    .circular { fill: red !important; }
    .normal { fill: #67b7dc; }
    #info { 
      position: fixed; 
      bottom: 10px; 
      left: 10px; 
      background: white; 
      padding: 10px; 
      border: 1px solid #ccc;
    }
  </style>
</head>
<body>
  <svg width="100%" height="100vh"></svg>
  <div id="info">
    <h3>Component Dependencies</h3>
    <p>Circular dependencies are shown in red</p>
    <p>Drag nodes to reposition them</p>
    <p>Hover over nodes to see component names</p>
    <div id="selected"></div>
  </div>
  <script>
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const svg = d3.select("svg");
    const g = svg.append("g");
    
    // Add zoom behavior
    svg.call(d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      }));
    
    // Load data
    const data = ${JSON.stringify(visualizationData)};
    
    // Create a set of components involved in circular dependencies
    const circularComponents = new Set(${JSON.stringify(circularDeps.flat())});
    
    // Create the simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));
    
    // Create the links
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(data.links)
      .enter().append("line")
      .attr("stroke-width", d => Math.sqrt(d.value));
    
    // Create the nodes
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(data.nodes)
      .enter().append("circle")
      .attr("r", 8)
      .attr("class", d => circularComponents.has(d.id) ? "circular" : "normal")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
    
    // Add tooltips
    node.append("title")
      .text(d => d.id);
    
    // Add node labels
    const labels = g.append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(data.nodes)
      .enter().append("text")
      .text(d => d.id)
      .attr("font-size", 10)
      .attr("dx", 12)
      .attr("dy", 4);
    
    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
        
      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
        
      labels
        .attr("x", d => d.x)
        .attr("y", d => d.y);
    });
    
    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
      d3.select("#selected").text(\`Selected: \${d.id}\`);
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

fs.writeFileSync(
  path.join(process.cwd(), "component-visualization.html"),
  htmlTemplate,
);

console.log("Generated visualization files:");
console.log("- component-dependency-graph.json");
console.log("- component-visualization.html");
