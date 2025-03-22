# Code Audit Guide

This guide explains how to use the code audit tool to analyze your codebase and identify potential areas for improvement.

## Overview

The code audit script provides insights into your codebase by:

1. **Identifying unused files and components**

   - Detects files that aren't imported anywhere in the project
   - Highlights potential dead code that can be removed

2. **Measuring code coverage**

   - Estimates which files lack test coverage
   - Provides a percentage of code coverage across the codebase

3. **Detecting duplicate functionality**

   - Finds similar function implementations across different files
   - Suggests opportunities for code consolidation

4. **Mapping component dependencies**
   - Creates a visual dependency graph of your components
   - Helps understand architectural relationships

## Getting Started

### Installation

Required dependencies are already included in the package.json. If you've just added the script, install dependencies with:

```bash
pnpm install
```

### Running the Audit

To run a code audit:

```bash
pnpm audit:code
```

For more detailed output:

```bash
pnpm audit:code:verbose
```

The script will analyze your codebase and generate:

- A console summary of findings
- A detailed JSON report (`code-audit-results.json`)
- An interactive HTML visualization of component dependencies (`dependency-graph.html`)

### Command-line Options

```
--output <filename>   Specify a custom output filename (default: code-audit-results.json)
--verbose             Show more detailed analysis during execution
```

## Understanding the Results

### Unused Files

Files listed as "unused" are not imported anywhere in your project. These are candidates for:

- Removal from the codebase
- Documentation if they serve a special purpose
- Actual use if they're meant to be included

### Test Coverage

The script uses two approaches to determine test coverage:

1. If Jest is configured, it runs a proper coverage report
2. Otherwise, it estimates coverage by looking for corresponding test files

Low coverage areas should be prioritized for writing new tests.

### Duplicate Functionality

The script identifies functions with similar structure and names across files. These are candidates for:

- Refactoring into shared utilities
- Standardizing on a single implementation
- Documentation to explain why multiple implementations are necessary

### Component Dependencies

The dependency visualization helps you understand:

- Which components are most heavily used
- Which components have too many dependencies
- Potential architectural issues like circular dependencies

## Best Practices

After running an audit:

1. **Prioritize cleanup**: Start with removing unused files to simplify the codebase
2. **Consolidate duplicates**: Refactor similar functionality into shared utilities
3. **Add tests**: Focus on high-value, low-coverage areas
4. **Review architecture**: Use the dependency graph to identify problematic component relationships

## Continuous Integration

Consider adding the code audit to your CI pipeline to monitor:

```yaml
# Example GitHub Actions workflow step
- name: Run Code Audit
  run: pnpm audit:code
```

This can help prevent code quality issues from accumulating over time.

## Troubleshooting

If you encounter issues with the audit:

- Ensure the directory structure in the script's CONFIG matches your project
- Try running with `--verbose` for more detailed output
- Check if any large generated files are slowing down the analysis
