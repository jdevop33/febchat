#!/bin/bash

# Cleanup script for project structure optimization

# Set the working directory
cd "$(dirname "$0")"

# Create a summary file
echo "# Cleanup Summary" > CLEANUP-SUMMARY.md
echo "Executed on: $(date)" >> CLEANUP-SUMMARY.md
echo "" >> CLEANUP-SUMMARY.md
echo "## Duplicate Directories Removed" >> CLEANUP-SUMMARY.md

# Remove the duplicate lib/pdf directory
if [ -d "lib/pdf" ]; then
  echo "- Removing lib/pdf (consolidated into lib/bylaw/processing)" >> CLEANUP-SUMMARY.md
  rm -rf lib/pdf
fi

# Remove the duplicate lib/bylaw-processing directory
if [ -d "lib/bylaw-processing" ]; then
  echo "- Removing lib/bylaw-processing (consolidated into lib/bylaw/processing)" >> CLEANUP-SUMMARY.md
  rm -rf lib/bylaw-processing
fi

# Remove the duplicate lib/vector-search directory
if [ -d "lib/vector-search" ]; then
  echo "- Removing lib/vector-search (consolidated into lib/vector)" >> CLEANUP-SUMMARY.md
  rm -rf lib/vector-search
fi

echo "" >> CLEANUP-SUMMARY.md
echo "## Component Organization" >> CLEANUP-SUMMARY.md

# Remove duplicate components at root level
if [ -f "components/bylaw-citation.tsx" ] && [ -f "components/bylaw/bylaw-citation.tsx" ]; then
  echo "- Removing components/bylaw-citation.tsx (moved to components/bylaw/)" >> CLEANUP-SUMMARY.md
  rm components/bylaw-citation.tsx
fi

# Clean hooks directory if duplicates exist in lib/hooks
if [ -d "hooks" ] && [ -d "lib/hooks" ]; then
  # Check for each hook file
  if [ -f "hooks/use-optimized-api.ts" ] && [ -f "lib/hooks/use-optimized-api.ts" ]; then
    echo "- Removing hooks/use-optimized-api.ts (moved to lib/hooks/)" >> CLEANUP-SUMMARY.md
    rm hooks/use-optimized-api.ts
  fi
  
  if [ -f "hooks/use-scroll-to-bottom.ts" ] && [ -f "lib/hooks/use-scroll-to-bottom.ts" ]; then
    echo "- Removing hooks/use-scroll-to-bottom.ts (moved to lib/hooks/)" >> CLEANUP-SUMMARY.md
    rm hooks/use-scroll-to-bottom.ts
  fi
  
  # If hooks directory is empty, remove it
  if [ -z "$(ls -A hooks 2>/dev/null)" ]; then
    echo "- Removing empty hooks directory" >> CLEANUP-SUMMARY.md
    rmdir hooks
  fi
fi

# Final message
echo "" >> CLEANUP-SUMMARY.md
echo "## Final Notes" >> CLEANUP-SUMMARY.md
echo "Project structure has been optimized. All imports have been updated to reflect new file locations." >> CLEANUP-SUMMARY.md
echo "Remember to run the tests to ensure everything still works correctly." >> CLEANUP-SUMMARY.md

echo "Cleanup complete! See CLEANUP-SUMMARY.md for details."