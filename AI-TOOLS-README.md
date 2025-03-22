# AI Code Optimization Tools

This directory contains a collection of AI-powered tools designed to help analyze, optimize, and understand the FebChat codebase. These tools use OpenAI's GPT models to provide insights and improvements.

## Prerequisites

1. Make sure you have an `.env.local` file with your OpenAI API key:

   ```
   OPENAI_API_KEY=your-api-key-here
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

## Available Tools

### 1. AI Code Audit (All-in-one)

This tool orchestrates all the other tools, running a complete code audit.

```bash
npx tsx scripts/ai-code-audit.mjs --all --output-dir ai-audit
```

Options:

- `--all`: Run all audit processes
- `--analyze`: Run codebase analysis only
- `--improve`: Run code improvement on key files only
- `--context`: Generate context documentation only
- `--fix-circular`: Fix circular dependencies only
- `--focus <pattern>`: Focus on specific files (glob pattern)
- `--output-dir <dir>`: Directory for output files (default: ai-audit)
- `--dry-run`: Don't modify files, just show what would change
- `--help`: Show help message

Examples:

```bash
# Run analysis only
npx tsx scripts/ai-code-audit.mjs --analyze

# Run code improvement with dry run
npx tsx scripts/ai-code-audit.mjs --improve --dry-run

# Focus on specific files
npx tsx scripts/ai-code-audit.mjs --all --focus "lib/**/*.ts"
```

### 2. AI Codebase Analyzer

This tool analyzes your entire codebase and provides insights on architecture, code quality, and potential improvements.

```bash
npx tsx scripts/ai-codebase-analyzer.mjs --output ai-analysis-results.json
```

Options:

- `--output <file>`: Output file for analysis results (default: ai-analysis-results.json)
- `--focus <pattern>`: Focus analysis on specific files (glob pattern)
- `--summary`: Only generate a high-level summary (faster)
- `--verbose`: Show detailed logs during analysis
- `--help`: Show help message

### 3. AI Code Improvement

This tool improves a specific file with AI suggestions.

```bash
npx tsx scripts/ai-code-improvement.mjs --file components/message.tsx
```

Options:

- `--file <filepath>`: Path to the file to analyze and improve (required)
- `--output <filepath>`: Output path for improved code (defaults to modifying the input file)
- `--dry-run`: Don't write changes, just show the improvements
- `--verbose`: Show detailed logs during analysis
- `--help`: Show help message

### 4. Generate Context Files

This tool generates documentation about different aspects of the codebase.

```bash
npx tsx scripts/generate-context-files.mjs --output-dir docs/context
```

Options:

- `--output-dir <dir>`: Directory to save generated files (default: docs/context)
- `--focus <pattern>`: Focus on specific files (glob pattern)
- `--verbose`: Show detailed logs during generation
- `--help`: Show help message

## Best Practices

1. **Always use `--dry-run` first** when making code improvements to review changes before applying them.
2. **Focus on specific areas** of the codebase using the `--focus` option for more targeted analysis.
3. **Review the generated context documentation** to understand the codebase better before making changes.
4. **Start with analysis** before making improvements to identify the most critical areas.
5. **Use version control** and commit changes between runs to track improvements.

## Output Structure

When running the full audit with `--output-dir ai-audit`, the output will have this structure:

```
ai-audit/
├── analysis-results.json     # Full codebase analysis results
├── improved/                 # Improved versions of key files
│   ├── components/           # Preserves original directory structure
│   ├── lib/
│   └── ...
└── context/                  # Generated context documentation
    ├── README.md             # Index of all context documents
    ├── architecture-overview.md
    ├── component-system.md
    └── ...
```

## Troubleshooting

- **Rate limiting errors**: If you encounter OpenAI API rate limiting, add delays between runs or reduce the scope with `--focus`.
- **Out of memory errors**: If Node.js runs out of memory, use the `--max-old-space-size` option:
  ```bash
  NODE_OPTIONS="--max-old-space-size=8192" npx tsx scripts/ai-code-audit.js --all
  ```
- **Invalid API key**: Make sure your `.env.local` file has the correct OpenAI API key.
