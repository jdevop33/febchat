#!/usr/bin/env node

/**
 * Import Path Fixer for FebChat Components
 * 
 * This script updates import paths in component files after reorganization:
 * 1. './ui/' -> '@/components/ui/'
 * 2. './icons' -> '@/components/shared/icons'
 * 3. '@/components/xxx' -> '@/components/subdirectory/xxx' for moved components
 */

const fs = require('node:fs');
const path = require('node:path');
const glob = require('glob');

// Root directory
const ROOT_DIR = process.cwd();

// Stats for reporting
const stats = {
  filesProcessed: 0,
  filesModified: 0,
  rule1Matches: 0,
  rule2Matches: 0,
  rule3Matches: 0
};

// Component subdirectories to check
const SUBDIRECTORIES = [
  'artifacts',
  'shared',
  'ui',
  'messages',
  'chat',
  'bylaw',
  'app',
  'pdf',
  'editor',
  'auth',
  'documents'
];

// Find all component files
console.log('Finding component files...');
const componentFiles = glob.sync('components/**/*.{tsx,ts}', {
  cwd: ROOT_DIR,
  ignore: ['**/node_modules/**', '**/dist/**']
});

console.log(`Found ${componentFiles.length} component files to process`);

// Build a map of component names to their subdirectories
const componentMap = new Map();
componentFiles.forEach(filePath => {
  const parsedPath = path.parse(filePath);
  const componentName = parsedPath.name;
  const subdir = parsedPath.dir.split('/')[1]; // components/subdir/...
  
  if (subdir && SUBDIRECTORIES.includes(subdir)) {
    componentMap.set(componentName, subdir);
  }
});

// Rules for import path updates
const rules = [
  // Rule 1: './ui/' to '@/components/ui/'
  {
    name: 'UI Path',
    pattern: /from\s+['"]\.\/ui\/([^'"]+)['"]/g,
    replacement: (match, p1) => {
      stats.rule1Matches++;
      return `from '@/components/ui/${p1}'`;
    }
  },
  
  // Rule 2: './icons' to '@/components/shared/icons'
  {
    name: 'Icons Path',
    pattern: /from\s+['"]\.\/icons['"]/g,
    replacement: () => {
      stats.rule2Matches++;
      return `from '@/components/shared/icons'`;
    }
  },
  
  // Rule 3: '@/components/xxx' to '@/components/subdirectory/xxx'
  {
    name: 'Component Subdirectory',
    pattern: /from\s+['"]@\/components\/([^\/'"]+)['"]/g,
    replacement: (match, componentName) => {
      // Skip if it's already referring to a subdirectory
      if (componentName.includes('/')) {
        return match;
      }
      
      // Check if the component exists in a subdirectory
      const subdir = componentMap.get(componentName);
      if (subdir) {
        stats.rule3Matches++;
        return `from '@/components/${subdir}/${componentName}'`;
      }
      
      // If not found in subdirectories, return the original
      return match;
    }
  }
];

// Process each file
componentFiles.forEach(relativeFilePath => {
  const filePath = path.join(ROOT_DIR, relativeFilePath);
  stats.filesProcessed++;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modifiedContent = content;
    
    // Apply each rule
    rules.forEach(rule => {
      modifiedContent = modifiedContent.replace(rule.pattern, rule.replacement);
    });
    
    // Save file if modified
    if (modifiedContent !== content) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      stats.filesModified++;
      console.log(`Updated: ${relativeFilePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${relativeFilePath}:`, error.message);
  }
});

// Report results
console.log('\nImport path update complete:');
console.log(`- Files processed: ${stats.filesProcessed}`);
console.log(`- Files modified: ${stats.filesModified}`);
console.log(`- Rule 1 (UI paths) matches: ${stats.rule1Matches}`);
console.log(`- Rule 2 (Icons paths) matches: ${stats.rule2Matches}`);
console.log(`- Rule 3 (Subdirectory paths) matches: ${stats.rule3Matches}`);
console.log('\nDone!');