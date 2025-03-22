# FEBChat Debugging Tools

This directory contains scripts to help you debug and optimize the FEBChat application.

## Setup

First, install the necessary dependencies:

```
cd scripts
npm install
```

## Available Tools

### 1. API Endpoint Mapping and Validation

This tool scans the codebase to find all API endpoints and generates a test file for them.

```
npm run debug-api
```

This will:

- Find all API routes in the application
- Log them to the console
- Generate a test file in `scripts/api-endpoint-tests.js`

### 2. Component Dependency Analyzer

This tool analyzes component dependencies in the codebase and helps visualize circular dependencies.

```
npm run analyze-deps
```

This will:

- Find all component dependencies
- Detect circular dependencies
- Generate a visualization in `component-visualization.html`
- Save the dependency data in `component-dependency-graph.json`

### 3. End-to-End Testing

This script tests the full application flow from login to chat completion.

```
npm run e2e-test
```

Make sure your application is running at `http://localhost:3000` before running this test.

The script will:

- Register/login a test user
- Create a new chat
- Wait for AI response
- Check chat history
- Create an artifact
- Test bylaw search

### 4. Performance Profiling

This tool instruments selected React components with performance monitoring code.

```
npm run profile
```

This will:

- Add performance monitoring code to key components
- Create backups of the original files (`.bak` extension)
- Log render times to the console when you run the application

### 5. Circular Dependency Fixer

This script attempts to fix circular dependencies by moving shared types to the `shared-types.ts` file.

```
npm run fix-circular
```

This will:

- Extract types from components with circular dependencies
- Update the shared types file (as `.updated` file)
- Fix imports in the components (as `.fixed` files)

After running the script, review the generated files and rename them if they look good.

## Usage Strategy

1. Start with the Dependency Analysis to identify issues
2. Fix circular dependencies
3. Test API endpoints
4. Profile component performance
5. Run end-to-end tests to verify the full user flow

## Notes

- These scripts modify your codebase, so it's recommended to run them on a development branch
- Always review the changes made by the scripts before committing them
- Back up your codebase before running these tools
