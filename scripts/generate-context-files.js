#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const chalk = require('chalk');
const minimist = require('minimist');

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
    h: 'help'
  },
  default: {
    'output-dir': 'docs/context',
    verbose: false,
    help: false
  }
});

// Show help message
if (argv.help) {
  console.log(`
${chalk.bold('Generate Context Files')}

This tool uses OpenAI to generate context files that explain the codebase structure and organization.

${chalk.bold('Usage:')}
  npx tsx scripts/generate-context-files.js [options]

${chalk.bold('Options:')}
  -o, --output-dir <dir>   Directory to save generated files (default: docs/context)
  -f, --focus <pattern>    Focus on specific files (glob pattern like "**/*.ts")
  -v, --verbose            Show detailed logs during generation
  -h, --help               Show this help message

${chalk.bold('Examples:')}
  npx tsx scripts/generate-context-files.js --output-dir docs/architecture
  npx tsx scripts/generate-context-files.js --focus "lib/**/*.ts"
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
  ],
  // File extensions to analyze
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  // Model to use for analysis
  model: 'gpt-4-turbo',
  // Files to generate
  contextFiles: [
    {
      name: 'architecture-overview.md',
      prompt: 'Create a comprehensive architecture overview document explaining how the application is structured. Include sections on the application layers, key components, data flow, and the reasoning behind the architectural decisions.',
      includeDirectoryStructure: true,
      includeDependencies: true,
    },
    {
      name: 'component-system.md',
      prompt: 'Create a document explaining the component system used in this Next.js application. Focus on the UI components, their organization, patterns, and best practices for using them.',
      matchPatterns: ['components/**/*.tsx'],
      excludePatterns: ['components/ui/**'],
    },
    {
      name: 'ui-primitives.md',
      prompt: 'Create a document explaining the UI primitives system in this application. Focus on the base UI components, their design principles, customization options, and how they should be composed.',
      matchPatterns: ['components/ui/**/*.tsx'],
    },
    {
      name: 'data-layer.md',
      prompt: 'Create a document explaining the data layer and database interactions in this application. Focus on the database schema, queries, and data flow.',
      matchPatterns: ['lib/db/**/*.ts'],
    },
    {
      name: 'authentication.md',
      prompt: 'Create a document explaining the authentication system in this application. Include details on the authentication flow, user management, and security considerations.',
      matchPatterns: ['app/(auth)/**/*.ts', 'app/(auth)/**/*.tsx'],
    },
    {
      name: 'api-routes.md',
      prompt: 'Create a document explaining the API routes in this application. Include details on the endpoints, their functionality, request/response formats, and error handling.',
      matchPatterns: ['app/api/**/*.ts', 'app/(chat)/api/**/*.ts'],
    },
    {
      name: 'state-management.md',
      prompt: 'Create a document explaining the state management approach in this application. Focus on how state is managed across components and pages.',
      matchPatterns: ['hooks/**/*.ts', 'hooks/**/*.tsx'],
    },
    {
      name: 'development-workflow.md',
      prompt: 'Create a document explaining the development workflow for this application. Include information on building, testing, linting, and deployment processes based on the package.json scripts and project structure.',
      includePackageInfo: true,
    },
  ]
};

// Main function
async function generateContextFiles() {
  try {
    console.log(chalk.blue('🔍 Starting context file generation...'));
    
    // Create output directory if it doesn't exist
    const outputDir = argv['output-dir'];
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(chalk.green(`Created output directory: ${outputDir}`));
    }
    
    // Get all source files
    let allFiles;
    if (argv.focus) {
      console.log(chalk.blue(`Focusing on files matching: ${argv.focus}`));
      allFiles = await glob(argv.focus, {
        ignore: CONFIG.excludePatterns,
        nodir: true,
        absolute: true,
      });
    } else {
      console.log(chalk.blue('Scanning project files...'));
      const patterns = CONFIG.includeDirs.map(
        (dir) => `${dir}/**/*{${CONFIG.extensions.join(',')}}`,
      );
      allFiles = await glob(patterns, {
        ignore: CONFIG.excludePatterns,
        nodir: true,
        absolute: true,
      });
    }
    
    console.log(chalk.green(`Found ${allFiles.length} source files`));
    
    // Get package.json info
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    let packageInfo = null;
    
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
    
    // Generate the directory structure
    const directoryStructure = buildDirectoryStructure(allFiles);
    
    // Process each context file
    for (const contextFile of CONFIG.contextFiles) {
      await generateContextFile(
        contextFile, 
        allFiles, 
        directoryStructure, 
        packageInfo, 
        outputDir
      );
    }
    
    // Generate main index file
    await generateIndexFile(outputDir);
    
    console.log(chalk.green(`✅ Context files generated in: ${outputDir}`));
    
  } catch (error) {
    console.error(chalk.red('Error generating context files:'), error);
    process.exit(1);
  }
}

// Helper function to build a simplified directory structure
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

// Function to generate a single context file
async function generateContextFile(
  contextFile,
  allFiles,
  directoryStructure,
  packageInfo,
  outputDir
) {
  try {
    const { name, prompt, matchPatterns, excludePatterns, includeDirectoryStructure, includeDependencies, includePackageInfo } = contextFile;
    
    console.log(chalk.blue(`Generating context file: ${name}`));
    
    // Filter files based on patterns if specified
    let relevantFiles = allFiles;
    
    if (matchPatterns) {
      relevantFiles = allFiles.filter(file => {
        const relativePath = path.relative(process.cwd(), file);
        return matchPatterns.some(pattern => {
          // Convert glob pattern to regex
          const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*');
          return new RegExp(`^${regexPattern}$`).test(relativePath);
        });
      });
    }
    
    if (excludePatterns) {
      relevantFiles = relevantFiles.filter(file => {
        const relativePath = path.relative(process.cwd(), file);
        return !excludePatterns.some(pattern => {
          // Convert glob pattern to regex
          const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*');
          return new RegExp(`^${regexPattern}$`).test(relativePath);
        });
      });
    }
    
    // Read a sample of files for context
    const sampleSize = Math.min(relevantFiles.length, 10);
    const sampleFiles = relevantFiles
      .sort(() => 0.5 - Math.random()) // Shuffle
      .slice(0, sampleSize);
    
    const fileContents = sampleFiles.map(file => {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(process.cwd(), file);
        return { path: relativePath, content };
      } catch (error) {
        console.error(chalk.red(`Error reading file ${file}:`), error);
        return { path: path.relative(process.cwd(), file), content: '/* Error reading file */' };
      }
    });
    
    // Prepare prompt with additional context
    let fullPrompt = prompt;
    
    // Add file paths
    fullPrompt += `\n\nRelevant files (${relevantFiles.length} total):
${relevantFiles.map(f => `- ${path.relative(process.cwd(), f)}`).join('\n')}`;
    
    // Add file contents if we have a sample
    if (fileContents.length > 0) {
      fullPrompt += `\n\nHere are sample files for reference:`;
      
      for (const { path: filePath, content } of fileContents) {
        fullPrompt += `\n\nFile: ${filePath}\n\`\`\`\n${content}\n\`\`\``;
      }
    }
    
    // Add directory structure if requested
    if (includeDirectoryStructure) {
      fullPrompt += `\n\nDirectory structure:\n\`\`\`json\n${JSON.stringify(directoryStructure, null, 2)}\n\`\`\``;
    }
    
    // Add package info if requested
    if (includePackageInfo && packageInfo) {
      fullPrompt += `\n\nPackage info:
- Name: ${packageInfo.name}
- Version: ${packageInfo.version}
- Description: ${packageInfo.description}

Dependencies:
${Object.keys(packageInfo.dependencies).map(dep => `- ${dep}: ${packageInfo.dependencies[dep]}`).join('\n')}

Scripts:
${Object.entries(packageInfo.scripts).map(([name, script]) => `- ${name}: ${script}`).join('\n')}`;
    }
    
    fullPrompt += `\n\nFormat the document with proper Markdown headings, code blocks, and sections. Include:
1. Introduction and purpose
2. Key concepts and patterns
3. Important files and their roles
4. Usage examples where relevant
5. Best practices and guidelines`;
    
    if (argv.verbose) {
      console.log(chalk.gray('Sending prompt for context generation...'));
    }
    
    const response = await openai.chat.completions.create({
      model: CONFIG.model,
      messages: [{ role: 'user', content: fullPrompt }],
      max_tokens: 4000,
    });
    
    const contextContent = response.choices[0].message.content.trim();
    
    // Write to file
    const outputPath = path.join(outputDir, name);
    fs.writeFileSync(outputPath, contextContent);
    
    console.log(chalk.green(`  ✅ Generated: ${outputPath}`));
    
    return true;
  } catch (error) {
    console.error(chalk.red(`Error generating context file ${contextFile.name}:`), error);
    return false;
  }
}

// Function to generate index file
async function generateIndexFile(outputDir) {
  try {
    console.log(chalk.blue('Generating index file...'));
    
    // Get list of generated files
    const files = fs.readdirSync(outputDir)
      .filter(file => file.endsWith('.md'))
      .sort();
    
    // Create index content
    const indexContent = `# Codebase Context Documentation

This directory contains auto-generated documentation to help understand the codebase structure and organization.

## Available Documents

${files.map(file => {
  const name = file.replace('.md', '');
  const title = name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return `- [${title}](./${file})`;
}).join('\n')}

> These documents were automatically generated to provide context about different aspects of the codebase.
`;
    
    // Write index file
    const indexPath = path.join(outputDir, 'README.md');
    fs.writeFileSync(indexPath, indexContent);
    
    console.log(chalk.green(`  ✅ Generated index: ${indexPath}`));
    
    return true;
  } catch (error) {
    console.error(chalk.red('Error generating index file:'), error);
    return false;
  }
}

// Run the generation
generateContextFiles();