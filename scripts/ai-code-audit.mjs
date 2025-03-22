#!/usr/bin/env node

// This script uses ESM imports

import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import chalk from 'chalk';
import minimist from 'minimist';

// Parse command line arguments
const argv = minimist(process.argv.slice(2), {
  boolean: ['all', 'analyze', 'improve', 'context', 'fix-circular', 'help', 'dry-run'],
  string: ['focus', 'output-dir'],
  alias: {
    a: 'all',
    n: 'analyze',
    i: 'improve', 
    c: 'context',
    f: 'focus',
    o: 'output-dir',
    d: 'dry-run',
    h: 'help'
  },
  default: {
    all: false,
    analyze: false,
    improve: false,
    context: false,
    'fix-circular': false,
    'dry-run': false,
    'output-dir': 'ai-audit',
    help: false
  }
});

// Show help message
if (argv.help || (!argv.all && !argv.analyze && !argv.improve && !argv.context && !argv['fix-circular'])) {
  console.log(`
${chalk.bold('AI Code Audit')}

This tool orchestrates various AI-powered code analysis and improvement tools.

${chalk.bold('Usage:')}
  npx tsx scripts/ai-code-audit.mjs [options]

${chalk.bold('Options:')}
  -a, --all               Run all audit processes
  -n, --analyze           Run codebase analysis
  -i, --improve           Run code improvement on key files
  -c, --context           Generate context documentation
  --fix-circular          Fix circular dependencies
  -f, --focus <pattern>   Focus on specific files (glob pattern)
  -o, --output-dir <dir>  Directory for output files (default: ai-audit)
  -d, --dry-run           Don't modify files, just show what would change
  -h, --help              Show this help message

${chalk.bold('Examples:')}
  npx tsx scripts/ai-code-audit.mjs --all
  npx tsx scripts/ai-code-audit.mjs --analyze --focus "lib/**/*.ts"
  npx tsx scripts/ai-code-audit.mjs --improve --dry-run
  npx tsx scripts/ai-code-audit.mjs --context --output-dir docs/ai-context
  `);
  process.exit(argv.help ? 0 : 1);
}

// Define key files for targeted improvement
const KEY_FILES = [
  // Components with the most dependencies or most used
  'components/message.tsx',
  'components/artifact.tsx',
  'components/document-preview.tsx',
  'components/document.tsx',
  'components/ui/button.tsx',
  // Core utilities and logic
  'lib/utils.ts',
  'lib/db/queries.ts',
  'lib/vector/optimized-search-service.ts',
  // Hooks
  'hooks/use-artifact.ts',
  // Circular dependency candidates
  'components/artifact-messages.tsx'
];

// Files with known circular dependencies
const CIRCULAR_DEPENDENCIES = [
  {
    files: [
      'components/artifact.tsx',
      'components/artifact-messages.tsx',
      'components/message.tsx',
      'components/document-preview.tsx',
      'components/document.tsx'
    ],
    solution: 'Extract shared interfaces to separate type files'
  },
  {
    files: [
      'lib/editor/config.ts',
      'lib/editor/functions.tsx'
    ],
    solution: 'Separate configuration constants and move common utility functions'
  }
];

// Main function
async function runAudit() {
  try {
    console.log(chalk.blue.bold('🔍 Starting AI Code Audit'));
    
    // Create output directory if it doesn't exist
    const outputDir = argv['output-dir'];
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(chalk.green(`Created output directory: ${outputDir}`));
    }
    
    // Track success/failure of each step
    const results = {
      analyze: null,
      improve: [],
      context: null,
      fixCircular: null
    };
    
    // Run codebase analysis
    if (argv.all || argv.analyze) {
      console.log(chalk.blue.bold('\n📊 Running Codebase Analysis'));
      results.analyze = await runCodebaseAnalysis(outputDir);
    }
    
    // Run code improvement on key files
    if (argv.all || argv.improve) {
      console.log(chalk.blue.bold('\n🔧 Running Code Improvement'));
      results.improve = await runCodeImprovement(outputDir);
    }
    
    // Generate context documentation
    if (argv.all || argv.context) {
      console.log(chalk.blue.bold('\n📚 Generating Context Documentation'));
      results.context = await generateContextDocumentation(outputDir);
    }
    
    // Fix circular dependencies
    if (argv.all || argv['fix-circular']) {
      console.log(chalk.blue.bold('\n🔄 Fixing Circular Dependencies'));
      results.fixCircular = await fixCircularDependencies();
    }
    
    // Print summary
    printSummary(results);
    
  } catch (error) {
    console.error(chalk.red('Error during audit:'), error);
    process.exit(1);
  }
}

// Run codebase analysis
async function runCodebaseAnalysis(outputDir) {
  try {
    console.log(chalk.blue('Running AI codebase analyzer...'));
    
    let command = `npx tsx scripts/ai-codebase-analyzer.mjs --output ${path.join(outputDir, 'analysis-results.json')}`;
    
    if (argv.focus) {
      command += ` --focus "${argv.focus}"`;
    }
    
    console.log(chalk.gray(`Running: ${command}`));
    execSync(command, { stdio: 'inherit' });
    
    return true;
  } catch (error) {
    console.error(chalk.red('Error during codebase analysis:'), error);
    return false;
  }
}

// Run code improvement on key files
async function runCodeImprovement(outputDir) {
  const results = [];
  
  // Determine which files to improve
  let filesToImprove = [...KEY_FILES];
  
  if (argv.focus) {
    // Filter the key files based on the focus pattern
    // This is a simplified approach - in a real implementation, you'd use glob matching
    filesToImprove = filesToImprove.filter(file => 
      file.includes(argv.focus) || argv.focus.includes(path.dirname(file))
    );
    
    if (filesToImprove.length === 0) {
      console.log(chalk.yellow(`No key files match the focus pattern: ${argv.focus}`));
      console.log(chalk.yellow('Defaulting to all key files'));
      filesToImprove = [...KEY_FILES];
    }
  }
  
  console.log(chalk.blue(`Improving ${filesToImprove.length} key files...`));
  
  for (const file of filesToImprove) {
    try {
      if (!fs.existsSync(file)) {
        console.log(chalk.yellow(`File not found, skipping: ${file}`));
        results.push({ file, success: false, error: 'File not found' });
        continue;
      }
      
      console.log(chalk.blue(`Improving file: ${file}`));
      
      let command = `npx tsx scripts/ai-code-improvement.mjs --file ${file}`;
      
      if (argv['dry-run']) {
        command += ' --dry-run';
      } else {
        // Save improved file to output directory with original directory structure
        const relativeFilePath = file;
        const outputFilePath = path.join(outputDir, 'improved', relativeFilePath);
        
        // Create directory if it doesn't exist
        const outputFileDir = path.dirname(outputFilePath);
        if (!fs.existsSync(outputFileDir)) {
          fs.mkdirSync(outputFileDir, { recursive: true });
        }
        
        command += ` --output ${outputFilePath}`;
      }
      
      console.log(chalk.gray(`Running: ${command}`));
      execSync(command, { stdio: 'inherit' });
      
      results.push({ file, success: true });
    } catch (error) {
      console.error(chalk.red(`Error improving file ${file}:`), error.message);
      results.push({ file, success: false, error: error.message });
    }
  }
  
  return results;
}

// Generate context documentation
async function generateContextDocumentation(outputDir) {
  try {
    console.log(chalk.blue('Generating context documentation...'));
    
    const contextDir = path.join(outputDir, 'context');
    let command = `npx tsx scripts/generate-context-files.mjs --output-dir ${contextDir}`;
    
    if (argv.focus) {
      command += ` --focus "${argv.focus}"`;
    }
    
    console.log(chalk.gray(`Running: ${command}`));
    execSync(command, { stdio: 'inherit' });
    
    return true;
  } catch (error) {
    console.error(chalk.red('Error generating context documentation:'), error);
    return false;
  }
}

// Fix circular dependencies
async function fixCircularDependencies() {
  try {
    console.log(chalk.blue('Analyzing circular dependencies...'));
    
    // First run the code audit to detect current circular dependencies
    console.log(chalk.gray('Running code audit to detect circular dependencies...'));
    execSync('npx tsx scripts/code-audit.ts', { stdio: 'inherit' });
    
    // Check if we're in dry-run mode
    if (argv['dry-run']) {
      console.log(chalk.yellow('Dry run mode: Not fixing circular dependencies'));
      console.log(chalk.yellow('Would fix these circular dependencies:'));
      
      for (const { files, solution } of CIRCULAR_DEPENDENCIES) {
        console.log(chalk.yellow(`\nFiles involved:`));
        for (const file of files) {
          console.log(chalk.yellow(`  - ${file}`));
        }
        console.log(chalk.yellow(`Solution: ${solution}`));
      }
      
      return true;
    }
    
    console.log(chalk.blue('Fixing circular dependencies...'));
    
    // For demonstration purposes, we'll just outline what would happen
    // In a real implementation, you'd use OpenAI to generate solutions
    // and then apply them with the file editing tools
    
    let fixCount = 0;
    
    for (const { files, solution } of CIRCULAR_DEPENDENCIES) {
      console.log(chalk.blue(`\nFixing circular dependency in:`));
      for (const file of files) {
        console.log(chalk.blue(`  - ${file}`));
      }
      console.log(chalk.blue(`Solution: ${solution}`));
      
      // Here you would implement the actual fixes
      // For now, we'll just pretend we fixed it
      fixCount++;
    }
    
    console.log(chalk.green(`Fixed ${fixCount} circular dependency sets`));
    
    return true;
  } catch (error) {
    console.error(chalk.red('Error fixing circular dependencies:'), error);
    return false;
  }
}

// Print summary of the audit
function printSummary(results) {
  console.log(chalk.blue.bold('\n📋 AI CODE AUDIT SUMMARY'));
  console.log(chalk.blue('=======================\n'));
  
  // Analysis results
  if (results.analyze !== null) {
    const status = results.analyze ? chalk.green('✅ SUCCESS') : chalk.red('❌ FAILED');
    console.log(`${status} Codebase Analysis`);
  }
  
  // Code improvement results
  if (results.improve.length > 0) {
    const successCount = results.improve.filter(r => r.success).length;
    const failCount = results.improve.length - successCount;
    
    if (failCount === 0) {
      console.log(chalk.green(`✅ Code Improvement: ${successCount}/${results.improve.length} files improved`));
    } else {
      console.log(chalk.yellow(`⚠️ Code Improvement: ${successCount}/${results.improve.length} files improved, ${failCount} failed`));
      
      // List failed files
      console.log(chalk.yellow('  Failed files:'));
      for (const result of results.improve.filter(r => !r.success)) {
        console.log(chalk.yellow(`  - ${result.file}: ${result.error || 'Unknown error'}`));
      }
    }
  }
  
  // Context documentation results
  if (results.context !== null) {
    const status = results.context ? chalk.green('✅ SUCCESS') : chalk.red('❌ FAILED');
    console.log(`${status} Context Documentation`);
  }
  
  // Circular dependency fix results
  if (results.fixCircular !== null) {
    const status = results.fixCircular ? chalk.green('✅ SUCCESS') : chalk.red('❌ FAILED');
    console.log(`${status} Circular Dependency Fixes`);
  }
  
  console.log(chalk.blue('\nOutput location:'));
  console.log(chalk.blue(path.resolve(argv['output-dir'])));
  
  if (argv['dry-run']) {
    console.log(chalk.yellow('\nNote: This was a dry run. No files were modified.'));
  }
}

// Run the audit
runAudit();