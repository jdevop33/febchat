#!/usr/bin/env node

// This script uses ESM imports
import fs from 'node:fs';
import path from 'node:path';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import chalk from 'chalk';
import minimist from 'minimist';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Parse command line arguments
const argv = minimist(process.argv.slice(2), {
  string: ['file', 'output'],
  boolean: ['verbose', 'help', 'dry-run'],
  alias: {
    f: 'file',
    o: 'output',
    v: 'verbose',
    h: 'help',
    d: 'dry-run',
  },
  default: {
    output: '',
    verbose: false,
    help: false,
    'dry-run': false,
  },
});

// Show help message
if (argv.help || !argv.file) {
  console.log(`
${chalk.bold('AI Code Improvement')}

This tool uses OpenAI to analyze and improve a specific file.

${chalk.bold('Usage:')}
  npx tsx scripts/ai-code-improvement.mjs --file <filepath> [options]

${chalk.bold('Options:')}
  -f, --file <filepath>    Path to the file to analyze and improve (required)
  -o, --output <filepath>  Output path for improved code (defaults to modifying the input file)
  -d, --dry-run            Don't write changes, just show the improvements
  -v, --verbose            Show detailed logs during analysis
  -h, --help               Show this help message

${chalk.bold('Examples:')}
  npx tsx scripts/ai-code-improvement.mjs --file lib/utils.ts --dry-run
  npx tsx scripts/ai-code-improvement.mjs --file components/message.tsx --output components/message.improved.tsx
  `);
  process.exit(argv.help ? 0 : 1);
}

// Initialize OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configuration
const CONFIG = {
  model: 'gpt-4-turbo',
  maxTokens: 4000,
};

// Main function
async function improveCode() {
  const filePath = argv.file;

  try {
    console.log(chalk.blue(`🔍 Analyzing and improving: ${filePath}`));

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(chalk.red(`Error: File not found: ${filePath}`));
      process.exit(1);
    }

    // Read file content
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const fileExt = path.extname(filePath);
    const fileName = path.basename(filePath);

    // Determine file type
    const fileType = getFileType(fileExt);

    if (argv.verbose) {
      console.log(chalk.gray(`File type detected: ${fileType}`));
      console.log(
        chalk.gray(`File size: ${(fileContent.length / 1024).toFixed(2)} KB`),
      );
    }

    // Analyze and improve the code
    const improvedCode = await analyzeAndImprove(
      fileContent,
      fileType,
      fileName,
    );

    if (!improvedCode) {
      console.error(chalk.red('Error: Failed to improve code'));
      process.exit(1);
    }

    // Output path handling
    const outputPath = argv.output || filePath;

    // Save the improved code or show diff
    if (argv['dry-run']) {
      console.log(chalk.yellow('\n=== ORIGINAL CODE ===\n'));
      console.log(fileContent);
      console.log(chalk.green('\n=== IMPROVED CODE ===\n'));
      console.log(improvedCode);
    } else {
      fs.writeFileSync(outputPath, improvedCode);
      console.log(chalk.green(`✅ Code improved and saved to: ${outputPath}`));
    }
  } catch (error) {
    console.error(chalk.red('Error during code improvement:'), error);
    process.exit(1);
  }
}

// Helper function to determine file type
function getFileType(fileExt) {
  const typeMap = {
    '.js': 'JavaScript',
    '.jsx': 'React JavaScript',
    '.ts': 'TypeScript',
    '.tsx': 'React TypeScript',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.html': 'HTML',
    '.json': 'JSON',
    '.md': 'Markdown',
  };

  return typeMap[fileExt] || 'Unknown';
}

// Function to analyze and improve code
async function analyzeAndImprove(code, fileType, fileName) {
  try {
    if (argv.verbose) {
      console.log(chalk.gray('Sending code for analysis and improvement...'));
    }

    // Generate a prompt based on the file type
    const prompt = `
You are an expert ${fileType} developer tasked with improving the code in ${fileName}.

Here is the original code:

\`\`\`
${code}
\`\`\`

Analyze this code and provide an improved version with the following enhancements:
1. Fix any bugs or errors
2. Improve performance where possible
3. Enhance readability and maintainability
4. Follow best practices for ${fileType}
5. Add or improve type safety (if applicable)
6. Ensure consistent coding style
7. Remove any unused code

DO NOT:
- Change the overall functionality or behavior
- Add extensive comments unless necessary
- Completely restructure the code unless it's necessary
- Change import paths

IMPORTANT: Respond ONLY with the improved code, without explanations or commentary.
`;

    const response = await openai.chat.completions.create({
      model: CONFIG.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: CONFIG.maxTokens,
    });

    const improvedCode = response.choices[0].message.content.trim();

    // Extract code from markdown code blocks if present
    const extractedCode = extractCodeFromMarkdown(improvedCode);

    return extractedCode;
  } catch (error) {
    console.error(chalk.red('Error analyzing and improving code:'), error);
    return null;
  }
}

// Helper function to extract code from markdown code blocks
function extractCodeFromMarkdown(text) {
  // Check if the text is wrapped in code blocks
  const codeBlockRegex = /```(?:\w+)?\n([\s\S]+?)\n```/g;
  const matches = text.match(codeBlockRegex);

  if (matches && matches.length > 0) {
    // Extract the content from the first code block
    const match = codeBlockRegex.exec(text);
    if (match?.[1]) {
      return match[1];
    }
  }

  // If no code blocks found, return the original text
  return text;
}

// Run the code improvement
improveCode();
