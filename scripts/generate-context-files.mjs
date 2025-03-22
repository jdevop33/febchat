#!/usr/bin/env node

// This script uses ESM imports
import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import chalk from 'chalk';
import minimist from 'minimist';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Parse command line arguments
const argv = minimist(process.argv.slice(2), {
  string: ['output-dir', 'focus'],
  boolean: ['verbose', 'help'],
  alias: {
    o: 'output-dir',
    f: 'focus',
    v: 'verbose',
    h: 'help',
  },
  default: {
    'output-dir': 'docs/context',
    verbose: false,
    help: false,
  },
});

// Show help message
if (argv.help) {
  console.log(`
${chalk.bold('Generate Context Files')}

This tool generates documentation about different aspects of the codebase.

${chalk.bold('Usage:')}
  npx tsx scripts/generate-context-files.mjs [options]

${chalk.bold('Options:')}
  -o, --output-dir <dir>  Directory to save generated files (default: docs/context)
  -f, --focus <pattern>   Focus on specific files (glob pattern)
  -v, --verbose           Show detailed logs during generation
  -h, --help              Show this help message

${chalk.bold('Examples:')}
  npx tsx scripts/generate-context-files.mjs --output-dir documentation/analysis
  npx tsx scripts/generate-context-files.mjs --focus "lib/**/*.ts"
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
  includeDirs: ['app', 'components', 'lib', 'hooks', 'types', 'artifacts'],
  // Files or directories to exclude
  excludePatterns: [
    'node_modules',
    '.next',
    '**/*.test.ts',
    '**/*.test.tsx',
    'public',
    '**/node_modules/**',
  ],
  // File extensions to analyze
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  // Max tokens for OpenAI
  maxTokens: 2000,
  // Model to use for analysis
  model: 'gpt-4-turbo',
  // Document types to generate
  documents: [
    {
      id: 'architecture-overview',
      title: 'Architecture Overview',
      description:
        'High-level overview of the project architecture and structure',
    },
    {
      id: 'component-system',
      title: 'Component System',
      description: 'Explanation of the component architecture and UI system',
    },
    {
      id: 'data-flow',
      title: 'Data Flow and State Management',
      description: 'How data and state are managed across the application',
    },
    {
      id: 'api-integration',
      title: 'API Integration',
      description: 'How external APIs are integrated and used',
    },
    {
      id: 'authentication',
      title: 'Authentication and Authorization',
      description: 'Implementation of auth and user permissions',
    },
  ],
};

// Main function
async function generateContextDocumentation() {
  try {
    console.log(chalk.blue('🔍 Starting context documentation generation...'));

    // Create output directory if it doesn't exist
    if (!fs.existsSync(argv['output-dir'])) {
      fs.mkdirSync(argv['output-dir'], { recursive: true });
      console.log(
        chalk.green(`Created output directory: ${argv['output-dir']}`),
      );
    }

    // 1. Gather data about the project
    const projectData = await gatherProjectData();

    // 2. Generate each document
    for (const document of CONFIG.documents) {
      console.log(chalk.blue(`Generating ${document.title}...`));
      await generateDocument(document, projectData);
    }

    // 3. Generate README index
    await generateReadme();

    console.log(
      chalk.green('✅ Context documentation generated successfully!'),
    );
  } catch (error) {
    console.error(chalk.red('Error generating context documentation:'), error);
    process.exit(1);
  }
}

// Gather data about the project
async function gatherProjectData() {
  console.log(chalk.blue('Gathering project data...'));

  // Find all source files
  let sourceFiles;

  if (argv.focus) {
    sourceFiles = await glob(argv.focus, {
      ignore: CONFIG.excludePatterns,
      nodir: true,
      absolute: true,
    });
  } else {
    const patterns = CONFIG.includeDirs.map(
      (dir) => `${dir}/**/*{${CONFIG.extensions.join(',')}}`,
    );
    sourceFiles = await glob(patterns, {
      ignore: CONFIG.excludePatterns,
      nodir: true,
      absolute: true,
    });
  }

  console.log(chalk.green(`Found ${sourceFiles.length} source files`));

  // Get package.json info
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  let packageInfo = {};

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    packageInfo = {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description || '',
      dependencies: packageJson.dependencies || {},
      devDependencies: packageJson.devDependencies || {},
      scripts: packageJson.scripts || {},
    };
  }

  // Build directory structure
  const dirStructure = buildDirectoryStructure(sourceFiles);

  // Sample representative files (to keep prompt size manageable)
  const sampleFiles = sampleRepresentativeFiles(sourceFiles, 10);

  return {
    sourceFiles,
    packageInfo,
    dirStructure,
    sampleFiles,
  };
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

// Helper to sample representative files
function sampleRepresentativeFiles(files, count) {
  // Group by directory
  const byDirectory = {};

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);
    const dir = path.dirname(relativePath);

    if (!byDirectory[dir]) {
      byDirectory[dir] = [];
    }

    byDirectory[dir].push(file);
  }

  // Take a few files from each main directory
  const sampledFiles = [];

  for (const [dir, dirFiles] of Object.entries(byDirectory)) {
    // Only sample from directories with multiple files
    if (dirFiles.length > 1) {
      // Take either 1-2 files or ~20% of files, whichever is more
      const sampleCount = Math.max(
        Math.min(2, dirFiles.length),
        Math.floor(dirFiles.length * 0.2),
      );

      // Simple random sampling
      const shuffled = [...dirFiles].sort(() => 0.5 - Math.random());
      sampledFiles.push(...shuffled.slice(0, sampleCount));
    } else if (dirFiles.length === 1) {
      // If only one file, include it
      sampledFiles.push(dirFiles[0]);
    }
  }

  // Limit to the requested count
  return sampledFiles.slice(0, count).map((file) => {
    // Read file content
    const content = fs.readFileSync(file, 'utf-8');

    return {
      path: path.relative(process.cwd(), file),
      content,
    };
  });
}

// Generate a specific document
async function generateDocument(document, projectData) {
  try {
    // Generate a prompt based on the document type
    const prompt = createPromptForDocument(document, projectData);

    if (argv.verbose) {
      console.log(chalk.gray(`Generating ${document.id} document...`));
    }

    const response = await openai.chat.completions.create({
      model: CONFIG.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: CONFIG.maxTokens,
    });

    const content = response.choices[0].message.content.trim();

    // Save the document
    const outputPath = path.join(argv['output-dir'], `${document.id}.md`);
    fs.writeFileSync(outputPath, content);

    console.log(chalk.green(`Generated ${outputPath}`));

    return true;
  } catch (error) {
    console.error(chalk.red(`Error generating ${document.id}:`), error);
    return false;
  }
}

// Create a prompt for a specific document type
function createPromptForDocument(document, projectData) {
  const { packageInfo, dirStructure, sampleFiles } = projectData;

  // Base prompt with project info
  const basePrompt = `
You are a technical documentation expert creating documentation for a Next.js project called "${packageInfo.name || 'FebChat'}".

Project information:
${packageInfo.description ? `Description: ${packageInfo.description}` : ''}
Version: ${packageInfo.version || 'Unknown'}

Key dependencies:
${Object.keys(packageInfo.dependencies || {})
  .slice(0, 15)
  .join(', ')}

Directory structure:
${JSON.stringify(dirStructure, null, 2)}

Sample files:
${sampleFiles.map((f) => `--- ${f.path} ---\n${f.content.length > 1000 ? `${f.content.substring(0, 1000)}...(truncated)` : f.content}`).join('\n\n')}

I need you to create the following document:
# ${document.title}
${document.description}

Please provide comprehensive, well-structured documentation in Markdown format.
Include:
- Clear explanations
- Code examples where relevant
- Diagrams described in text
- Best practices
- Common pitfalls
`;

  // Add specific questions based on document type
  switch (document.id) {
    case 'architecture-overview':
      return `${basePrompt}
Focus on:
- Overall project architecture pattern
- Directory structure and organization
- Key modules and their purposes
- Data flow between components
- How the application initializes and runs
`;

    case 'component-system':
      return `${basePrompt}
Focus on:
- Component hierarchy
- Reusable UI components
- Component composition patterns
- State management within components
- How components communicate
- Styling approach
`;

    case 'data-flow':
      return `${basePrompt}
Focus on:
- State management approaches used
- Data fetching strategies
- How data flows through the application
- State persistence
- Server state vs. client state
`;

    case 'api-integration':
      return `${basePrompt}
Focus on:
- API client setup
- Authentication with APIs
- Error handling
- Request/response patterns
- API abstraction layers
`;

    case 'authentication':
      return `${basePrompt}
Focus on:
- Authentication strategy
- User sessions and tokens
- Protected routes
- Role-based access
- Security considerations
`;

    default:
      return basePrompt;
  }
}

// Generate README index
async function generateReadme() {
  try {
    // Get list of generated documents
    const docs = CONFIG.documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
    }));

    // Create README content
    const readmeContent = `# ${argv['output-dir'].split('/').pop() || 'Context'} Documentation

This directory contains documentation about various aspects of the codebase.

## Available Documents

${docs.map((doc) => `- [${doc.title}](./${doc.id}.md) - ${doc.description}`).join('\n')}

## How This Documentation Was Generated

This documentation was generated using AI analysis of the codebase structure, patterns, and representative code samples. It provides insights into the architecture, patterns, and organization of the codebase.

## Usage

Use these documents to:
- Understand the high-level architecture
- Learn about component patterns and data flow
- Get context on specific parts of the application
- Onboard new team members

If you find any inaccuracies, please update the documentation accordingly.
`;

    // Save README
    const readmePath = path.join(argv['output-dir'], 'README.md');
    fs.writeFileSync(readmePath, readmeContent);

    console.log(chalk.green(`Generated ${readmePath}`));

    return true;
  } catch (error) {
    console.error(chalk.red('Error generating README:'), error);
    return false;
  }
}

// Run the documentation generation
generateContextDocumentation();
