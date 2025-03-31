#!/usr/bin/env node

// This script uses ESM imports

import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import dotenv from "dotenv";
import { glob } from "glob";
import minimist from "minimist";
import { OpenAI } from "openai";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Parse command line arguments
const argv = minimist(process.argv.slice(2), {
  string: ["output", "focus"],
  boolean: ["summary", "verbose", "help"],
  alias: {
    o: "output",
    f: "focus",
    s: "summary",
    v: "verbose",
    h: "help",
  },
  default: {
    output: "ai-analysis-results.json",
    summary: false,
    verbose: false,
    help: false,
  },
});

// Show help message
if (argv.help) {
  console.log(`
${chalk.bold("AI Codebase Analyzer")}

This tool uses OpenAI to analyze your codebase and provide insights.

${chalk.bold("Usage:")}
  npx tsx scripts/ai-codebase-analyzer.mjs [options]

${chalk.bold("Options:")}
  -o, --output <file>    Output file for analysis results (default: ai-analysis-results.json)
  -f, --focus <pattern>  Focus analysis on specific files (glob pattern like "**/*.ts")
  -s, --summary          Only generate a high-level summary (faster)
  -v, --verbose          Show detailed logs during analysis
  -h, --help             Show this help message

${chalk.bold("Examples:")}
  npx tsx scripts/ai-codebase-analyzer.mjs --focus "lib/**/*.ts" --verbose
  npx tsx scripts/ai-codebase-analyzer.mjs --summary
  `);
  process.exit(0);
}

// Initialize OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configuration
const CONFIG = {
  // Directories to include in the analysis
  includeDirs: ["app", "components", "lib", "hooks", "types", "artifacts"],
  // Files or directories to exclude
  excludePatterns: [
    "node_modules",
    ".next",
    "**/*.test.ts",
    "**/*.test.tsx",
    "public",
    "**/node_modules/**",
  ],
  // File extensions to analyze
  extensions: [".ts", ".tsx", ".js", ".jsx"],
  // Max tokens for OpenAI
  maxTokens: 2000,
  // Max file size to analyze (in bytes)
  maxFileSize: 100000, // 100KB
  // Number of files to include in a batch analysis
  batchSize: 5,
  // Delay between API calls to avoid rate limiting (in ms)
  apiDelay: 1000,
  // Model to use for analysis
  model: "gpt-4-turbo",
};

// Get custom focus pattern if provided
if (argv.focus) {
  console.log(chalk.blue(`Focusing analysis on: ${argv.focus}`));
}

// Analysis result structure
const analysisResult = {
  summary: {
    title: "FebChat Codebase Analysis",
    highLevelOverview: "",
    architectureEvaluation: "",
    keyChallenges: [],
    recommendations: [],
  },
  fileAnalyses: {},
  moduleEvaluations: {},
  architecturalPatterns: [],
  performanceIssues: [],
  qualityMetrics: {
    maintainability: 0,
    modularity: 0,
    testability: 0,
    consistency: 0,
  },
};

// Main function
async function runAnalysis() {
  try {
    console.log(chalk.blue("🔍 Starting AI codebase analysis..."));

    // 1. Find all source files
    console.log(chalk.blue("📁 Scanning project files..."));
    let allFiles;

    if (argv.focus) {
      allFiles = await glob(argv.focus, {
        ignore: CONFIG.excludePatterns,
        nodir: true,
        absolute: true,
      });
    } else {
      const patterns = CONFIG.includeDirs.map(
        (dir) => `${dir}/**/*{${CONFIG.extensions.join(",")}}`,
      );
      allFiles = await glob(patterns, {
        ignore: CONFIG.excludePatterns,
        nodir: true,
        absolute: true,
      });
    }

    console.log(
      chalk.green(`Found ${allFiles.length} source files to analyze`),
    );

    // 2. If summary-only mode, analyze project structure only
    if (argv.summary) {
      console.log(chalk.blue("📊 Generating high-level summary only..."));
      await analyzeProjectStructure(allFiles);
    } else {
      // 3. Analyze files in batches
      console.log(chalk.blue("🔎 Analyzing files in batches..."));
      await analyzeFilesInBatches(allFiles);

      // 4. Analyze architectural patterns
      console.log(chalk.blue("🏗️ Identifying architectural patterns..."));
      await analyzeArchitecture(allFiles);

      // 5. Identify performance issues
      console.log(chalk.blue("⚡ Identifying potential performance issues..."));
      await analyzePerformance();

      // 6. Generate overall quality metrics
      console.log(chalk.blue("🔢 Calculating quality metrics..."));
      await calculateQualityMetrics();

      // 7. Create comprehensive summary
      console.log(chalk.blue("📝 Creating comprehensive summary..."));
      await createSummary(allFiles);
    }

    // 8. Save results to file
    fs.writeFileSync(argv.output, JSON.stringify(analysisResult, null, 2));
    console.log(
      chalk.green(`✅ Analysis complete! Results saved to ${argv.output}`),
    );

    // Print key findings to console
    printSummary();
  } catch (error) {
    console.error(chalk.red("❌ Error during analysis:"), error);
    process.exit(1);
  }
}

// Analyze project structure for a high-level summary
async function analyzeProjectStructure(allFiles) {
  try {
    // Get directory structure
    const directoryStructure = buildDirectoryStructure(allFiles);

    // Get package.json info
    const packageJsonPath = path.join(process.cwd(), "package.json");
    let packageInfo = {};

    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      packageInfo = {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description || "",
        dependencies: Object.keys(packageJson.dependencies || {}),
        devDependencies: Object.keys(packageJson.devDependencies || {}),
        scripts: packageJson.scripts || {},
      };
    }

    // Create a prompt for the AI
    const prompt = `
You are an expert software architect analyzing a Next.js application codebase.

Project name: ${packageInfo.name || "Unknown"}
Project version: ${packageInfo.version || "Unknown"}
Description: ${packageInfo.description || "A Next.js application"}

Key dependencies (truncated):
${packageInfo.dependencies?.slice(0, 20).join(", ")}

Directory structure (truncated):
${JSON.stringify(directoryStructure, null, 2)}

Please provide:
1. A high-level overview of what this application does based on the structure and dependencies
2. An assessment of the architectural approach
3. 3-5 key challenges the codebase might be facing
4. 3-5 recommendations for improvement

Be specific and actionable in your recommendations.
`;

    if (argv.verbose) {
      console.log(chalk.gray("Sending project structure for analysis..."));
    }

    const response = await openai.chat.completions.create({
      model: CONFIG.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
    });

    const analysis = response.choices[0].message.content.trim();

    // Extract sections from the analysis
    const sections = extractSectionsFromAnalysis(analysis);

    analysisResult.summary.highLevelOverview = sections.overview || "";
    analysisResult.summary.architectureEvaluation = sections.architecture || "";
    analysisResult.summary.keyChallenges = sections.challenges || [];
    analysisResult.summary.recommendations = sections.recommendations || [];

    return true;
  } catch (error) {
    console.error(chalk.red("Error analyzing project structure:"), error);
    return false;
  }
}

// Helper to build a simplified directory structure
function buildDirectoryStructure(files) {
  const structure = {};

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);
    const parts = relativePath.split(path.sep);

    let current = structure;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    const fileName = parts[parts.length - 1];
    current[fileName] = null;
  }

  return structure;
}

// Extract sections from the AI analysis
function extractSectionsFromAnalysis(analysis) {
  const result = {
    overview: "",
    architecture: "",
    challenges: [],
    recommendations: [],
  };

  // Simple regex-based extraction
  const overviewMatch = analysis.match(
    /high-level overview.*?:\s*([\s\S]*?)(?=assessment|architectural approach|#|$)/i,
  );
  if (overviewMatch?.[1]) {
    result.overview = overviewMatch[1].trim();
  }

  const architectureMatch = analysis.match(
    /(?:assessment|architectural approach).*?:\s*([\s\S]*?)(?=key challenges|challenges|#|$)/i,
  );
  if (architectureMatch?.[1]) {
    result.architecture = architectureMatch[1].trim();
  }

  const challengesMatch = analysis.match(
    /(?:key challenges|challenges).*?:\s*([\s\S]*?)(?=recommendations|#|$)/i,
  );
  if (challengesMatch?.[1]) {
    const challengesText = challengesMatch[1].trim();
    result.challenges = extractNumberedItems(challengesText);
  }

  const recommendationsMatch = analysis.match(
    /recommendations.*?:\s*([\s\S]*?)(?=#|$)/i,
  );
  if (recommendationsMatch?.[1]) {
    const recommendationsText = recommendationsMatch[1].trim();
    result.recommendations = extractNumberedItems(recommendationsText);
  }

  return result;
}

// Helper to extract numbered items from text
function extractNumberedItems(text) {
  const items = [];

  // Look for numbered items like "1. Item" or "1) Item"
  const itemRegex = /\d+[\.\)]\s+(.*?)(?=\d+[\.\)]|$)/gs;
  let match;

  while ((match = itemRegex.exec(`${text}\n999. `))) {
    if (match[1].trim()) {
      items.push(match[1].trim());
    }
  }

  // If no numbered items found, try bullet points
  if (items.length === 0) {
    const bulletRegex = /[•\-\*]\s+(.*?)(?=[•\-\*]|$)/gs;
    while ((match = bulletRegex.exec(`${text}\n• `))) {
      if (match[1].trim()) {
        items.push(match[1].trim());
      }
    }
  }

  // If still no items found, split by newlines
  if (items.length === 0) {
    return text.split("\n").filter((line) => line.trim().length > 10);
  }

  return items;
}

// Analyze files in batches
async function analyzeFilesInBatches(allFiles) {
  const totalFiles = allFiles.length;
  const batches = Math.ceil(totalFiles / CONFIG.batchSize);

  console.log(
    chalk.blue(`Processing ${totalFiles} files in ${batches} batches...`),
  );

  let processedCount = 0;

  for (let i = 0; i < batches; i++) {
    const start = i * CONFIG.batchSize;
    const end = Math.min(start + CONFIG.batchSize, totalFiles);
    const batchFiles = allFiles.slice(start, end);

    if (argv.verbose) {
      console.log(
        chalk.gray(
          `Processing batch ${i + 1}/${batches}: ${batchFiles.length} files`,
        ),
      );
    }

    await analyzeBatch(batchFiles);

    // Update progress
    processedCount += batchFiles.length;
    const progressPercent = Math.round((processedCount / totalFiles) * 100);
    console.log(
      chalk.green(
        `Progress: ${progressPercent}% (${processedCount}/${totalFiles} files)`,
      ),
    );

    // Add delay between batches to avoid rate limiting
    if (i < batches - 1) {
      if (argv.verbose) {
        console.log(
          chalk.gray(`Waiting ${CONFIG.apiDelay}ms before next batch...`),
        );
      }
      await new Promise((resolve) => setTimeout(resolve, CONFIG.apiDelay));
    }
  }
}

// Analyze a batch of files
async function analyzeBatch(files) {
  // Read file contents
  const fileContents = files.map((file) => {
    try {
      const stats = fs.statSync(file);

      // Skip files that are too large
      if (stats.size > CONFIG.maxFileSize) {
        if (argv.verbose) {
          console.log(
            chalk.yellow(
              `Skipping large file: ${file} (${Math.round(stats.size / 1024)} KB)`,
            ),
          );
        }
        return {
          file,
          content: "FILE_TOO_LARGE",
          relativePath: path.relative(process.cwd(), file),
        };
      }

      const content = fs.readFileSync(file, "utf-8");
      return {
        file,
        content,
        relativePath: path.relative(process.cwd(), file),
        size: stats.size,
      };
    } catch (error) {
      console.error(chalk.red(`Error reading file ${file}:`), error);
      return {
        file,
        content: "ERROR_READING_FILE",
        relativePath: path.relative(process.cwd(), file),
      };
    }
  });

  // Filter out files that are too large or had errors
  const validFiles = fileContents.filter(
    (f) => f.content !== "FILE_TOO_LARGE" && f.content !== "ERROR_READING_FILE",
  );

  if (validFiles.length === 0) {
    return;
  }

  // Create a prompt for the AI
  const fileDetailsForPrompt = validFiles
    .map((f) => {
      // Truncate file content if it's very large to avoid token limits
      const truncatedContent =
        f.content.length > 5000
          ? `${f.content.substring(0, 5000)}\n... (content truncated)`
          : f.content;

      return `File: ${f.relativePath}\n\`\`\`\n${truncatedContent}\n\`\`\``;
    })
    .join("\n\n");

  const prompt = `
You are an expert code reviewer analyzing a batch of files from a Next.js application.

Analyze the following files and provide a brief analysis of each file including:
1. Primary purpose of the file
2. Key functionality implemented
3. Potential issues or areas for improvement
4. Quality assessment (on a scale of 1-5, where 5 is excellent)

Format your response as a JSON object with file paths as keys and analysis objects as values.
Example:
{
  "components/Button.tsx": {
    "purpose": "Reusable button component",
    "keyFunctionality": "Implements a customizable button with variants",
    "issues": ["No aria attributes for accessibility", "Missing unit tests"],
    "qualityScore": 3
  }
}

Here are the files to analyze:

${fileDetailsForPrompt}
`;

  try {
    if (argv.verbose) {
      console.log(
        chalk.gray(`Sending ${validFiles.length} files for analysis...`),
      );
    }

    const response = await openai.chat.completions.create({
      model: CONFIG.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: CONFIG.maxTokens,
      response_format: { type: "json_object" },
    });

    const analysisText = response.choices[0].message.content.trim();

    try {
      // Parse the JSON response
      const analysis = JSON.parse(analysisText);

      // Add to the result
      Object.assign(analysisResult.fileAnalyses, analysis);

      return true;
    } catch (jsonError) {
      console.error(chalk.red("Error parsing JSON response:"), jsonError);
      console.log(chalk.yellow("Raw response:"), analysisText);
      return false;
    }
  } catch (error) {
    console.error(chalk.red("Error analyzing batch:"), error);
    return false;
  }
}

// Analyze architectural patterns
async function analyzeArchitecture(allFiles) {
  try {
    // Get file paths organized by directory
    const directoriesMap = {};

    for (const file of allFiles) {
      const relativePath = path.relative(process.cwd(), file);
      const directory = path.dirname(relativePath);

      if (!directoriesMap[directory]) {
        directoriesMap[directory] = [];
      }

      directoriesMap[directory].push(path.basename(relativePath));
    }

    // Get imports between files if available in analysis results
    const importData = extractImportRelationships();

    const prompt = `
You are an expert software architect analyzing a Next.js application.

Based on the directory structure and file organization:

${JSON.stringify(directoriesMap, null, 2)}

${
  importData
    ? `And the following import relationships between files:
${importData}`
    : ""
}

Identify:
1. The main architectural patterns used in this codebase
2. How modular and maintainable the architecture appears to be
3. Any architectural anti-patterns or issues
4. Suggestions for architectural improvements

Format your response as a JSON array of architectural patterns and insights, like:
[
  {
    "pattern": "Component-based architecture",
    "evidence": "Organization of UI elements in components/ directory",
    "strengths": ["Reusable UI elements", "Clear separation of concerns"],
    "weaknesses": ["Potential prop drilling between deeply nested components"]
  },
  ...
]
`;

    if (argv.verbose) {
      console.log(chalk.gray("Analyzing architectural patterns..."));
    }

    const response = await openai.chat.completions.create({
      model: CONFIG.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const analysisText = response.choices[0].message.content.trim();

    try {
      // Parse the JSON response
      const analysis = JSON.parse(analysisText);

      // Add to the result
      analysisResult.architecturalPatterns = analysis;

      return true;
    } catch (jsonError) {
      console.error(chalk.red("Error parsing JSON response:"), jsonError);
      console.log(chalk.yellow("Raw response:"), analysisText);
      return false;
    }
  } catch (error) {
    console.error(chalk.red("Error analyzing architecture:"), error);
    return false;
  }
}

// Helper function to extract import relationships from file analyses
function extractImportRelationships() {
  // This would need a more sophisticated analysis to be accurate
  // For now, return a placeholder or nothing
  return "";
}

// Analyze performance issues
async function analyzePerformance() {
  try {
    // Get performance-related issues from file analyses
    const performanceIssues = [];

    for (const [filePath, analysis] of Object.entries(
      analysisResult.fileAnalyses,
    )) {
      if (analysis.issues) {
        const perfIssues = analysis.issues.filter(
          (issue) =>
            issue.toLowerCase().includes("performance") ||
            issue.toLowerCase().includes("slow") ||
            issue.toLowerCase().includes("memory") ||
            issue.toLowerCase().includes("optimize"),
        );

        if (perfIssues.length > 0) {
          performanceIssues.push({
            file: filePath,
            issues: perfIssues,
          });
        }
      }
    }

    const prompt = `
You are an expert performance engineer analyzing a Next.js application.

Based on the following performance-related issues found in the codebase:

${JSON.stringify(performanceIssues, null, 2)}

Identify:
1. The most critical performance issues
2. Potential root causes
3. Recommendations for addressing each issue
4. General performance best practices for this type of application

Format your response as a JSON array of performance issues and insights.
`;

    if (argv.verbose) {
      console.log(chalk.gray("Analyzing performance issues..."));
    }

    const response = await openai.chat.completions.create({
      model: CONFIG.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const analysisText = response.choices[0].message.content.trim();

    try {
      // Parse the JSON response
      const analysis = JSON.parse(analysisText);

      // Add to the result
      analysisResult.performanceIssues = analysis;

      return true;
    } catch (jsonError) {
      console.error(chalk.red("Error parsing JSON response:"), jsonError);
      console.log(chalk.yellow("Raw response:"), analysisText);
      return false;
    }
  } catch (error) {
    console.error(chalk.red("Error analyzing performance issues:"), error);
    return false;
  }
}

// Calculate quality metrics
async function calculateQualityMetrics() {
  // Calculate average quality scores from file analyses
  let totalScore = 0;
  let fileCount = 0;

  for (const analysis of Object.values(analysisResult.fileAnalyses)) {
    if (analysis.qualityScore) {
      totalScore += analysis.qualityScore;
      fileCount++;
    }
  }

  const averageQuality = fileCount > 0 ? totalScore / fileCount : 0;

  // Set initial quality metrics based on file analyses
  analysisResult.qualityMetrics = {
    maintainability: Math.round(averageQuality * 20), // Convert 1-5 scale to percentage
    modularity: 0,
    testability: 0,
    consistency: 0,
  };

  try {
    const prompt = `
You are an expert code quality assessor analyzing a Next.js application.

Based on the files analyzed and an average quality score of ${averageQuality.toFixed(2)} out of 5:

Provide quality metrics for:
1. Modularity: How well is the code separated into cohesive, loosely coupled modules?
2. Testability: How easily can this code be tested?
3. Consistency: How consistent is the code style and organization?

Rate each on a scale of 0-100, where higher is better.

Format your response as a JSON object with these metrics.
`;

    if (argv.verbose) {
      console.log(chalk.gray("Calculating quality metrics..."));
    }

    const response = await openai.chat.completions.create({
      model: CONFIG.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const analysisText = response.choices[0].message.content.trim();

    try {
      // Parse the JSON response
      const metrics = JSON.parse(analysisText);

      // Update the metrics
      Object.assign(analysisResult.qualityMetrics, metrics);

      return true;
    } catch (jsonError) {
      console.error(chalk.red("Error parsing JSON response:"), jsonError);
      console.log(chalk.yellow("Raw response:"), analysisText);
      return false;
    }
  } catch (error) {
    console.error(chalk.red("Error calculating quality metrics:"), error);
    return false;
  }
}

// Create a comprehensive summary
async function createSummary(allFiles) {
  try {
    // Get basic code stats
    const stats = {
      totalFiles: allFiles.length,
      byExtension: {},
      byDirectory: {},
    };

    for (const file of allFiles) {
      const ext = path.extname(file);
      const dir = path
        .dirname(path.relative(process.cwd(), file))
        .split(path.sep)[0];

      if (!stats.byExtension[ext]) {
        stats.byExtension[ext] = 0;
      }
      stats.byExtension[ext]++;

      if (!stats.byDirectory[dir]) {
        stats.byDirectory[dir] = 0;
      }
      stats.byDirectory[dir]++;
    }

    // Extract key insights from analyses
    const architecturalInsights =
      analysisResult.architecturalPatterns?.slice(0, 3) || [];
    const performanceInsights =
      analysisResult.performanceIssues?.slice(0, 3) || [];
    const qualityMetrics = analysisResult.qualityMetrics;

    const prompt = `
You are an expert software architect creating a summary analysis of a Next.js application.

Code statistics:
${JSON.stringify(stats, null, 2)}

Architecture insights:
${JSON.stringify(architecturalInsights, null, 2)}

Performance insights:
${JSON.stringify(performanceInsights, null, 2)}

Quality metrics:
${JSON.stringify(qualityMetrics, null, 2)}

Please provide:
1. A high-level overview of the application
2. An assessment of the architecture
3. Key challenges the codebase appears to be facing
4. Specific, actionable recommendations for improvement

Be concise, specific, and actionable in your recommendations.
`;

    if (argv.verbose) {
      console.log(chalk.gray("Creating comprehensive summary..."));
    }

    const response = await openai.chat.completions.create({
      model: CONFIG.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
    });

    const summaryText = response.choices[0].message.content.trim();

    // Extract sections from the summary
    const sections = extractSectionsFromAnalysis(summaryText);

    analysisResult.summary.highLevelOverview = sections.overview || "";
    analysisResult.summary.architectureEvaluation = sections.architecture || "";
    analysisResult.summary.keyChallenges = sections.challenges || [];
    analysisResult.summary.recommendations = sections.recommendations || [];

    return true;
  } catch (error) {
    console.error(chalk.red("Error creating summary:"), error);
    return false;
  }
}

// Print summary to the console
function printSummary() {
  console.log(chalk.blue.bold("\n📋 AI CODEBASE ANALYSIS SUMMARY"));
  console.log(chalk.blue("============================\n"));

  // Print high-level overview
  if (analysisResult.summary.highLevelOverview) {
    console.log(chalk.yellow.bold("Overview:"));
    console.log(analysisResult.summary.highLevelOverview);
    console.log();
  }

  // Print key challenges
  if (
    analysisResult.summary.keyChallenges &&
    analysisResult.summary.keyChallenges.length > 0
  ) {
    console.log(chalk.yellow.bold("Key Challenges:"));
    analysisResult.summary.keyChallenges.forEach((challenge, index) => {
      console.log(`${index + 1}. ${challenge}`);
    });
    console.log();
  }

  // Print recommendations
  if (
    analysisResult.summary.recommendations &&
    analysisResult.summary.recommendations.length > 0
  ) {
    console.log(chalk.yellow.bold("Recommendations:"));
    analysisResult.summary.recommendations.forEach((recommendation, index) => {
      console.log(`${index + 1}. ${recommendation}`);
    });
    console.log();
  }

  // Print quality metrics if available
  if (analysisResult.qualityMetrics && !argv.summary) {
    console.log(chalk.yellow.bold("Quality Metrics:"));

    const metrics = analysisResult.qualityMetrics;
    const labels = {
      maintainability: "Maintainability",
      modularity: "Modularity",
      testability: "Testability",
      consistency: "Consistency",
    };

    for (const [key, value] of Object.entries(metrics)) {
      const label = labels[key] || key;
      const score = Math.round(value);
      const barLength = Math.round(score / 5);
      const bar = "█".repeat(barLength);

      console.log(
        `${label.padEnd(15)} ${score}% ${`▕${bar}${" ".repeat(20 - barLength)}▏`}`,
      );
    }
    console.log();
  }

  console.log(chalk.blue.bold("Full analysis details saved to:"));
  console.log(argv.output);
}

// Run the analysis
runAnalysis();
