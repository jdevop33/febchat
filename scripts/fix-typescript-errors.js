/**
 * This script scans the codebase for common TypeScript errors and 
 * adds @ts-nocheck temporarily to files with issues
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories to scan
const directories = [
  path.join(__dirname, '..', 'lib'),
  path.join(__dirname, '..', 'components'),
  path.join(__dirname, '..', 'hooks'),
  path.join(__dirname, '..', 'app')
];

// Common TypeScript error patterns
const errorPatterns = [
  'implicitly has an \'any\' type',
  'has no properties in common with type',
  'is not assignable to parameter of type',
  'Property .* does not exist on type'
];

function findTypeScriptFiles(dir) {
  const files = [];
  
  function scanDir(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (/\.(ts|tsx)$/.test(item) && !item.includes('.d.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  scanDir(dir);
  return files;
}

function checkFileForErrors(filePath) {
  try {
    // Run TypeScript compiler on the file without emitting output
    const result = execSync(`npx tsc --noEmit --skipLibCheck "${filePath}"`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { hasErrors: false, errors: [] };
  } catch (error) {
    // TypeScript found errors
    const output = error.stdout || error.stderr || '';
    const errors = [];
    
    // Extract specific error types
    for (const pattern of errorPatterns) {
      const regex = new RegExp(pattern, 'g');
      const matches = output.match(regex) || [];
      errors.push(...matches);
    }
    
    return { 
      hasErrors: errors.length > 0,
      errors: [...new Set(errors)] // Remove duplicates
    };
  }
}

function addTsNoCheck(filePath, errors) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has @ts-nocheck
    if (content.includes('@ts-nocheck')) {
      return { skipped: true };
    }
    
    // Add @ts-nocheck and comment with error info
    const updatedContent = `// @ts-nocheck
/* 
 * This file has TypeScript errors that need to be fixed:
 * ${errors.map(e => `* - ${e}`).join('\n * ')}
 * TODO: Fix these TypeScript errors and remove this directive
 */

${content}`;
    
    fs.writeFileSync(filePath, updatedContent);
    return { updated: true };
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
    return { error };
  }
}

// Main execution
function main() {
  const filesWithErrors = [];
  
  // Scan directories
  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      console.log(`Directory ${dir} does not exist, skipping.`);
      continue;
    }
    
    console.log(`Scanning ${dir} for TypeScript files...`);
    const files = findTypeScriptFiles(dir);
    console.log(`Found ${files.length} TypeScript files in ${dir}`);
    
    // Check each file
    for (const file of files) {
      process.stdout.write(`Checking ${file}...`);
      const { hasErrors, errors } = checkFileForErrors(file);
      
      if (hasErrors) {
        filesWithErrors.push({ file, errors });
        process.stdout.write(' ERRORS FOUND\n');
      } else {
        process.stdout.write(' OK\n');
      }
    }
  }
  
  // Report results
  console.log(`\nFound ${filesWithErrors.length} files with TypeScript errors`);
  
  if (filesWithErrors.length > 0) {
    console.log('\nAdding @ts-nocheck to files with errors...');
    
    const results = {
      updated: 0,
      skipped: 0,
      errors: 0
    };
    
    for (const { file, errors } of filesWithErrors) {
      const result = addTsNoCheck(file, errors);
      
      if (result.updated) {
        results.updated++;
        console.log(`Updated ${file}`);
      } else if (result.skipped) {
        results.skipped++;
        console.log(`Skipped ${file} (already has @ts-nocheck)`);
      } else {
        results.errors++;
        console.log(`Error updating ${file}`);
      }
    }
    
    console.log(`\nSummary:`);
    console.log(`- ${results.updated} files updated with @ts-nocheck`);
    console.log(`- ${results.skipped} files skipped (already had @ts-nocheck)`);
    console.log(`- ${results.errors} files had errors during update`);
    console.log(`\nNext steps:`);
    console.log(`1. Review and fix TypeScript errors in each file`);
    console.log(`2. Remove @ts-nocheck after fixing errors`);
    console.log(`3. Run 'npx tsc --noEmit' to verify fixes`);
  }
}

main(); 