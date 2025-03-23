const fs = require('node:fs');
const path = require('node:path');

// Files to analyze
const files = [
  'components/chat/chat.tsx',
  'components/chat/multimodal-input.tsx',
  'components/ui/suggested-actions.tsx'
];

// Common issues to look for
const issues = {
  importErrors: { regex: /Cannot find module|Unable to resolve path/, description: 'Import path issues' },
  propTypeErrors: { regex: /Type .* is not assignable to type|Property .* does not exist on type/, description: 'Prop type mismatches' },
  unusedImports: { regex: /is defined but never used/, description: 'Unused imports' },
  missingComponents: { regex: /JSX element .* has no corresponding closing tag/, description: 'Missing closing tags' },
  redundantCode: { regex: /Unreachable code detected/, description: 'Unreachable code' },
  componentErrors: { regex: /(No overload matches this call|has no properties in common with type)/, description: 'Component usage errors' }
};

const foundProblems = [];

files.forEach(filePath => {
  const fullPath = path.resolve(filePath);
  
  try {
    // Read the file
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    
    // Check for various issues
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for import related issues
      Object.entries(issues).forEach(([issueType, {regex, description}]) => {
        if (regex.test(line)) {
          // Add context by including surrounding lines
          const context = lines.slice(Math.max(0, i-2), Math.min(lines.length, i+3)).join('\n');
          foundProblems.push({
            file: filePath,
            lineNumber: i + 1,
            type: issueType,
            description,
            issue: line.trim(),
            context
          });
        }
      });
      
      // Special check for component usage without required props
      if (line.includes('<') && line.includes('>') && !line.includes('import') && !line.includes('export')) {
        const nextLines = lines.slice(i, Math.min(lines.length, i+10)).join('\n');
        const componentMatch = nextLines.match(/<([A-Z][a-zA-Z0-9]*)([^>]*)>/);
        
        if (componentMatch) {
          const componentName = componentMatch[1];
          const props = componentMatch[2];
          
          // Look for memo components with incorrect usage
          if ((componentName === 'MultimodalInput' || componentName === 'SuggestedActions' || 
               componentName === 'PureStopButton' || componentName === 'PureSendButton' || 
               componentName === 'PureAttachmentsButton') && 
              props && !props.includes('disabled') && content.includes('disabled')) {
            foundProblems.push({
              file: filePath,
              lineNumber: i + 1,
              type: 'componentPropMissing',
              description: 'Component missing disabled prop',
              issue: `${componentName} might be missing the disabled prop`,
              context: nextLines
            });
          }
        }
      }
    }
    
    // Check for inconsistencies between memo components and their usage
    if (content.includes('memo(')) {
      // Check if there are memo components with possible prop mismatches
      const memoComponents = content.match(/memo\(([A-Za-z0-9]+)(,|\))/g) || [];
      
      memoComponents.forEach(memoComponent => {
        const componentName = memoComponent.match(/memo\(([A-Za-z0-9]+)/)[1];
        
        // Check for inconsistencies in the memo equality function
        const equalityFnMatch = content.match(new RegExp(`memo\\(${componentName}.*?\\{([\\s\\S]*?)\\}\\)`, 's'));
        
        if (equalityFnMatch) {
          const equalityFn = equalityFnMatch[1];
          
          // If the component accepts 'disabled' but it's not in the equality check
          if (content.includes('disabled?:') && !equalityFn.includes('disabled')) {
            foundProblems.push({
              file: filePath, 
              lineNumber: content.split('\n').findIndex(line => line.includes(`memo(${componentName}`)) + 1,
              type: 'memoInconsistency',
              description: 'Memo component equality function missing prop check',
              issue: `${componentName} memo equality function might be missing disabled prop check`,
              context: equalityFnMatch[0]
            });
          }
        }
      });
    }
    
    // Check for inconsistencies between component implementations
    const exportedComponents = content.match(/export const ([A-Za-z0-9]+)/g) || [];
    exportedComponents.forEach(exportMatch => {
      const componentName = exportMatch.replace('export const ', '');
      
      // If we find references to components not correctly defined
      if (content.includes(`<${componentName}`) && !content.includes(`function ${componentName}(`)) {
        if (content.includes(`const ${componentName} = memo(Pure${componentName}`) && 
            !content.includes(`Pure${componentName}`)) {
          foundProblems.push({
            file: filePath,
            lineNumber: content.split('\n').findIndex(line => line.includes(`const ${componentName} = memo`)) + 1,
            type: 'componentImplementationMismatch',
            description: 'Referenced component not properly defined',
            issue: `${componentName} is referenced but Pure${componentName} implementation might be missing or incorrect`,
            context: `export const ${componentName} = memo(...)`
          });
        }
      }
    });
    
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
});

console.log('\n---- DETAILED PROBLEMS ANALYSIS ----\n');
if (foundProblems.length === 0) {
  console.log('No specific problems found using basic static analysis.');
} else {
  foundProblems.forEach((problem, index) => {
    console.log(`Problem #${index + 1}: ${problem.description} in ${problem.file}:${problem.lineNumber}`);
    console.log(`Issue: ${problem.issue}`);
    console.log('Context:');
    console.log(problem.context);
    console.log('---');
  });
}

console.log('\n---- COMPONENT CONSISTENCY CHECKS ----\n');

// Check for component declaration and usage consistency across files
const allComponents = {};

files.forEach(filePath => {
  try {
    const content = fs.readFileSync(path.resolve(filePath), 'utf8');
    
    // Find component declarations
    const componentDeclarations = content.match(/function ([A-Za-z0-9]+)\(/g) || [];
    componentDeclarations.forEach(decl => {
      const componentName = decl.replace('function ', '').replace('(', '');
      if (!allComponents[componentName]) {
        allComponents[componentName] = { declaration: filePath, usages: [] };
      } else {
        allComponents[componentName].declaration = filePath;
      }
    });
    
    // Find component usages
    const componentUsages = content.match(/<([A-Z][a-zA-Z0-9]*)[ >]/g) || [];
    componentUsages.forEach(usage => {
      const componentName = usage.replace('<', '').replace(/[ >]/g, '');
      if (!allComponents[componentName]) {
        allComponents[componentName] = { declaration: null, usages: [filePath] };
      } else {
        allComponents[componentName].usages.push(filePath);
      }
    });
    
  } catch (error) {
    console.error(`Error in component consistency check for ${filePath}:`, error);
  }
});

// Find components that are used but not declared
const undeclaredComponents = Object.entries(allComponents)
  .filter(([name, info]) => !info.declaration && info.usages.length > 0);

if (undeclaredComponents.length > 0) {
  console.log('Components used but not declared in analyzed files:');
  undeclaredComponents.forEach(([name, info]) => {
    console.log(`- ${name} used in: ${info.usages.join(', ')}`);
  });
} else {
  console.log('All components used in the files appear to be properly declared.');
}

// Check memo implementations
console.log('\n---- MEMO IMPLEMENTATION CHECKS ----\n');
files.forEach(filePath => {
  try {
    const content = fs.readFileSync(path.resolve(filePath), 'utf8');
    const memoImplementations = content.match(/const ([A-Za-z0-9]+) = memo\(([A-Za-z0-9]+)/g) || [];
    
    memoImplementations.forEach(impl => {
      const match = impl.match(/const ([A-Za-z0-9]+) = memo\(([A-Za-z0-9]+)/);
      const componentName = match[1];
      const pureComponentName = match[2];
      
      // Check if pure component is defined
      if (!content.includes(`function ${pureComponentName}`)) {
        console.log(`In ${filePath}: ${componentName} memo wraps ${pureComponentName}, but ${pureComponentName} might not be defined`);
      }
      
      // Check if both are used consistently
      const componentUsageCount = (content.match(new RegExp(`<${componentName}[ >]`, 'g')) || []).length;
      const pureComponentUsageCount = (content.match(new RegExp(`<${pureComponentName}[ >]`, 'g')) || []).length;
      
      if (pureComponentUsageCount > 0) {
        console.log(`Potential issue in ${filePath}: Both ${componentName} (${componentUsageCount} usages) and ${pureComponentName} (${pureComponentUsageCount} usages) are used in JSX. Usually only the memo-wrapped component should be used.`);
      }
    });
    
  } catch (error) {
    console.error(`Error in memo implementation check for ${filePath}:`, error);
  }
});

console.log('\n---- PROPS CONSISTENCY CHECK ----\n');
// Check if props are consistent between components
files.forEach(filePath => {
  try {
    const content = fs.readFileSync(path.resolve(filePath), 'utf8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Find component prop types
      const propTypeMatch = line.match(/interface ([A-Za-z0-9]+Props)|type ([A-Za-z0-9]+Props)/);
      if (propTypeMatch) {
        const propsName = propTypeMatch[1] || propTypeMatch[2];
        const componentName = propsName.replace('Props', '');
        
        // Find if disabled prop is defined in the prop type
        const propsContent = findBlockContent(lines, i);
        const hasDisabledProp = propsContent.includes('disabled?:') || propsContent.includes('disabled:');
        
        // Find component JSX usage
        const componentUsages = content.match(new RegExp(`<${componentName}[\\s\\S]*?>`, 'g')) || [];
        
        componentUsages.forEach(usage => {
          const usesDisabledProp = usage.includes('disabled=');
          
          if (usesDisabledProp && !hasDisabledProp) {
            console.log(`Potential issue in ${filePath}: ${componentName} uses disabled prop but it's not defined in ${propsName}`);
          }
        });
      }
    }
  } catch (error) {
    console.error(`Error in props consistency check for ${filePath}:`, error);
  }
});

// Utility function to find the content of a code block
function findBlockContent(lines, startLineIndex) {
  let blockContent = '';
  let braceCount = 0;
  let started = false;
  
  for (let i = startLineIndex; i < lines.length; i++) {
    const line = lines[i];
    
    if (!started && line.includes('{')) {
      started = true;
    }
    
    if (started) {
      blockContent += `${line}\n`;
      
      // Count braces to find the end of the block
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      braceCount += openBraces - closeBraces;
      
      if (braceCount === 0) {
        break;
      }
    }
  }
  
  return blockContent;
}

// Final summary of potential issues
console.log('\n---- RECOMMENDATION SUMMARY ----\n');
console.log('Based on the analysis, here are the potential issues to fix:');
console.log('1. Check memo component implementations - ensure Pure components are defined before being wrapped');
console.log('2. Ensure disabled prop is consistently handled in all components that need it');
console.log('3. Verify that memo equality functions check all necessary props, including disabled');
console.log('4. Update component props interfaces to include all used props');
console.log('5. Check for any usage of components without passing required props'); 