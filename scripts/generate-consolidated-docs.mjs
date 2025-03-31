#!/usr/bin/env node

// This script consolidates all markdown files into a single document
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
  string: ["output"],
  boolean: ["verbose", "help"],
  alias: {
    o: "output",
    v: "verbose",
    h: "help",
  },
  default: {
    output: "DOCUMENTATION.md",
    verbose: false,
    help: false,
  },
});

// Show help message
if (argv.help) {
  console.log(`
${chalk.bold("Generate Consolidated Documentation")}

This tool consolidates all markdown files in the project into a single, organized document.

${chalk.bold("Usage:")}
  npx tsx scripts/generate-consolidated-docs.mjs [options]

${chalk.bold("Options:")}
  -o, --output <file>  Output file for consolidated documentation (default: DOCUMENTATION.md)
  -v, --verbose        Show detailed logs during generation
  -h, --help           Show this help message

${chalk.bold("Examples:")}
  npx tsx scripts/generate-consolidated-docs.mjs
  npx tsx scripts/generate-consolidated-docs.mjs --output docs/consolidated.md
  `);
  process.exit(0);
}

// Initialize OpenAI API client if API key is available
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Main function
async function consolidateDocs() {
  try {
    console.log(chalk.blue("🔍 Finding markdown files..."));

    // Find all markdown files
    const markdownFiles = await glob("**/*.md", {
      ignore: ["node_modules/**", ".next/**", "coverage/**"],
      nodir: true,
    });

    console.log(chalk.green(`Found ${markdownFiles.length} markdown files`));

    // Read and categorize markdown files
    const categorizedDocs = categorizeDocs(markdownFiles);

    // Generate consolidated document
    let consolidatedContent;

    if (openai) {
      // Use AI to create a better consolidated document
      console.log(
        chalk.blue("Using AI to generate organized documentation..."),
      );
      consolidatedContent = await generateAIConsolidatedDocs(categorizedDocs);
    } else {
      // Simple concatenation
      console.log(
        chalk.yellow("OpenAI API key not found. Using simple concatenation."),
      );
      consolidatedContent = generateSimpleConsolidatedDocs(categorizedDocs);
    }

    // Write to output file
    fs.writeFileSync(argv.output, consolidatedContent);

    console.log(
      chalk.green(`✅ Consolidated documentation saved to ${argv.output}`),
    );
  } catch (error) {
    console.error(chalk.red("Error consolidating documentation:"), error);
    process.exit(1);
  }
}

// Categorize markdown files by directory and content
function categorizeDocs(filePaths) {
  const categories = {
    projectOverview: [],
    architecture: [],
    guides: [],
    api: [],
    components: [],
    other: [],
  };

  for (const filePath of filePaths) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const fileName = path.basename(filePath);
      const fileDir = path.dirname(filePath);

      const docInfo = {
        path: filePath,
        name: fileName,
        dir: fileDir,
        content,
        title: extractTitle(content) || fileName.replace(".md", ""),
      };

      // Categorize based on path or content
      if (fileName.match(/^README/i) || fileName.match(/^OVERVIEW/i)) {
        categories.projectOverview.push(docInfo);
      } else if (
        filePath.match(/architecture/i) ||
        content.match(/architecture/i)
      ) {
        categories.architecture.push(docInfo);
      } else if (
        filePath.match(/guide/i) ||
        content.match(/guide/i) ||
        filePath.match(/SETUP/i)
      ) {
        categories.guides.push(docInfo);
      } else if (filePath.match(/api/i) || content.match(/api/i)) {
        categories.api.push(docInfo);
      } else if (filePath.match(/component/i) || content.match(/component/i)) {
        categories.components.push(docInfo);
      } else {
        categories.other.push(docInfo);
      }

      if (argv.verbose) {
        console.log(chalk.gray(`Processed: ${filePath}`));
      }
    } catch (error) {
      console.error(chalk.yellow(`Error reading file ${filePath}:`), error);
    }
  }

  return categories;
}

// Extract title from markdown content
function extractTitle(content) {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch ? titleMatch[1].trim() : null;
}

// Generate a simple consolidated document by concatenation
function generateSimpleConsolidatedDocs(categorizedDocs) {
  const sections = [];

  // Add project overview
  sections.push("# Project Documentation\n");

  if (categorizedDocs.projectOverview.length > 0) {
    sections.push("## Project Overview\n");
    categorizedDocs.projectOverview.forEach((doc) => {
      sections.push(`### ${doc.title}\n`);
      sections.push(`*Source: ${doc.path}*\n`);
      // Strip original title to avoid duplication
      const contentWithoutTitle = doc.content.replace(/^#\s+.+$/m, "");
      sections.push(`${contentWithoutTitle.trim()}\n\n`);
    });
  }

  // Add architecture docs
  if (categorizedDocs.architecture.length > 0) {
    sections.push("## Architecture\n");
    categorizedDocs.architecture.forEach((doc) => {
      sections.push(`### ${doc.title}\n`);
      sections.push(`*Source: ${doc.path}*\n`);
      const contentWithoutTitle = doc.content.replace(/^#\s+.+$/m, "");
      sections.push(`${contentWithoutTitle.trim()}\n\n`);
    });
  }

  // Add guides
  if (categorizedDocs.guides.length > 0) {
    sections.push("## Guides\n");
    categorizedDocs.guides.forEach((doc) => {
      sections.push(`### ${doc.title}\n`);
      sections.push(`*Source: ${doc.path}*\n`);
      const contentWithoutTitle = doc.content.replace(/^#\s+.+$/m, "");
      sections.push(`${contentWithoutTitle.trim()}\n\n`);
    });
  }

  // Add API docs
  if (categorizedDocs.api.length > 0) {
    sections.push("## API\n");
    categorizedDocs.api.forEach((doc) => {
      sections.push(`### ${doc.title}\n`);
      sections.push(`*Source: ${doc.path}*\n`);
      const contentWithoutTitle = doc.content.replace(/^#\s+.+$/m, "");
      sections.push(`${contentWithoutTitle.trim()}\n\n`);
    });
  }

  // Add component docs
  if (categorizedDocs.components.length > 0) {
    sections.push("## Components\n");
    categorizedDocs.components.forEach((doc) => {
      sections.push(`### ${doc.title}\n`);
      sections.push(`*Source: ${doc.path}*\n`);
      const contentWithoutTitle = doc.content.replace(/^#\s+.+$/m, "");
      sections.push(`${contentWithoutTitle.trim()}\n\n`);
    });
  }

  // Add other docs
  if (categorizedDocs.other.length > 0) {
    sections.push("## Other Documentation\n");
    categorizedDocs.other.forEach((doc) => {
      sections.push(`### ${doc.title}\n`);
      sections.push(`*Source: ${doc.path}*\n`);
      const contentWithoutTitle = doc.content.replace(/^#\s+.+$/m, "");
      sections.push(`${contentWithoutTitle.trim()}\n\n`);
    });
  }

  return sections.join("\n");
}

// Generate AI-consolidated documentation
async function generateAIConsolidatedDocs(categorizedDocs) {
  // Prepare a summary of all documents
  const docSummaries = [];

  for (const category in categorizedDocs) {
    categorizedDocs[category].forEach((doc) => {
      // Create a short summary of each doc (first ~300 chars)
      const summary =
        doc.content.substring(0, 300) + (doc.content.length > 300 ? "..." : "");

      docSummaries.push({
        title: doc.title,
        path: doc.path,
        category,
        summary,
      });
    });
  }

  // Create a prompt for the AI
  const prompt = `
You are a technical documentation expert tasked with organizing and consolidating documentation for a project.

I have a collection of ${docSummaries.length} markdown files from my project. I need you to:

1. Analyze the summaries and create a well-structured, consolidated document
2. Organize the content into logical sections based on content relationships
3. Remove redundancies and overlapping information
4. Create a clean, hierarchical structure with a table of contents
5. Ensure key information is highlighted and easy to find

Here are summaries of the documents:
${JSON.stringify(docSummaries, null, 2)}

Please create a consolidated markdown document that organizes this information effectively.
Include a table of contents at the beginning.
For each section, include a reference to the original file path.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4000,
    });

    const aiContent = response.choices[0].message.content.trim();

    // Return the AI-generated content
    return aiContent;
  } catch (error) {
    console.error(chalk.red("Error generating AI content:"), error);
    // Fall back to simple concatenation
    console.log(chalk.yellow("Falling back to simple concatenation..."));
    return generateSimpleConsolidatedDocs(categorizedDocs);
  }
}

// Run the consolidation
consolidateDocs();
