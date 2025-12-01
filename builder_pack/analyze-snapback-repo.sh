#!/bin/bash
# SnapBack Repository Analysis Script
# Saves all output to snapback-analysis/ directory

echo "🔍 Starting SnapBack repository analysis..."

# Create output directory
mkdir -p snapback-analysis
cd snapback-analysis

echo "📁 Analyzing repository structure..."

# 1. Repository structure
echo "=== REPOSITORY STRUCTURE ===" > 01-structure.txt
tree -L 3 -I 'node_modules|dist|build|.next|.turbo' ../ >> 01-structure.txt 2>&1

# 2. Package listing
echo "=== PACKAGES ===" > 02-packages.txt
ls -la ../packages/ >> 02-packages.txt 2>&1
echo "" >> 02-packages.txt
echo "=== APPS ===" >> 02-packages.txt
ls -la ../apps/ >> 02-packages.txt 2>&1

# 3. All package.json files
echo "=== PACKAGE.JSON FILES ===" > 03-package-jsons.txt
find .. -name "package.json" -not -path "*/node_modules/*" -exec echo "=== {} ===" \; -exec cat {} \; >> 03-package-jsons.txt 2>&1

# 4. All tsconfig files
echo "=== TSCONFIG FILES ===" > 04-tsconfig.txt
find .. -name "tsconfig*.json" -not -path "*/node_modules/*" -exec echo "=== {} ===" \; -exec cat {} \; >> 04-tsconfig.txt 2>&1

# 5. List all TypeScript source files
echo "=== TYPESCRIPT FILE LIST ===" > 05-typescript-files-list.txt
find ../packages ../apps -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/build/*" >> 05-typescript-files-list.txt 2>&1

# 6. All TypeScript source code (split into chunks to avoid huge files)
echo "📝 Extracting TypeScript source code..."
COUNTER=1
FILECOUNTER=1
OUTPUTFILE="06-source-code-part-${FILECOUNTER}.txt"
echo "=== SOURCE CODE PART ${FILECOUNTER} ===" > "$OUTPUTFILE"
LINECOUNT=0

while IFS= read -r file; do
  # Skip if file doesn't exist or is too large (>1MB)
  if [ ! -f "$file" ]; then
    continue
  fi
  
  FILESIZE=$(wc -c < "$file")
  if [ "$FILESIZE" -gt 1048576 ]; then
    echo "⚠️  Skipping large file: $file ($(($FILESIZE / 1024))KB)" >> "$OUTPUTFILE"
    continue
  fi
  
  # Start new file every 5000 lines to keep files manageable
  if [ "$LINECOUNT" -gt 5000 ]; then
    FILECOUNTER=$((FILECOUNTER + 1))
    OUTPUTFILE="06-source-code-part-${FILECOUNTER}.txt"
    echo "=== SOURCE CODE PART ${FILECOUNTER} ===" > "$OUTPUTFILE"
    LINECOUNT=0
  fi
  
  echo "" >> "$OUTPUTFILE"
  echo "=== FILE: $file ===" >> "$OUTPUTFILE"
  cat "$file" >> "$OUTPUTFILE" 2>&1
  NEWLINES=$(wc -l < "$file")
  LINECOUNT=$((LINECOUNT + NEWLINES))
  COUNTER=$((COUNTER + 1))
  
  # Progress indicator
  if [ $((COUNTER % 10)) -eq 0 ]; then
    echo "  Processed $COUNTER files..."
  fi
done < 05-typescript-files-list.txt

echo "  ✓ Processed $COUNTER TypeScript files into $FILECOUNTER parts"

# 7. Find all "checkpoint" references
echo "🔍 Finding all 'checkpoint' references..."
echo "=== CHECKPOINT REFERENCES ===" > 07-checkpoint-references.txt
grep -r "checkpoint" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" .. 2>/dev/null | grep -v node_modules | grep -v dist | grep -v build >> 07-checkpoint-references.txt

# 8. Find all "Checkpoint" class/interface/type definitions
echo "=== CHECKPOINT TYPES/CLASSES ===" > 08-checkpoint-definitions.txt
grep -r "checkpoint" --include="*.ts" --include="*.tsx" .. 2>/dev/null | grep -v node_modules | grep -E "(interface|type|class|const|function|export)" >> 08-checkpoint-definitions.txt

# 9. API routes (if they exist)
echo "📡 Checking for API routes..."
echo "=== API ROUTES ===" > 09-api-routes.txt
if [ -d "../apps" ]; then
  find ../apps -type f -path "*/api/*" \( -name "*.ts" -o -name "*.tsx" -o -name "route.ts" \) ! -path "*/node_modules/*" -exec echo "=== {} ===" \; -exec cat {} \; >> 09-api-routes.txt 2>&1
fi
if [ -d "../packages" ]; then
  find ../packages -type f -path "*/api/*" \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" -exec echo "=== {} ===" \; -exec cat {} \; >> 09-api-routes.txt 2>&1
fi

# 10. Database/Schema files
echo "🗄️  Checking for database schemas..."
echo "=== DATABASE SCHEMAS ===" > 10-database-schemas.txt
find .. -name "schema.prisma" -o -name "schema.sql" -o -name "*migration*" -o -name "supabase.ts" | grep -v node_modules | while read file; do
  echo "=== $file ===" >> 10-database-schemas.txt
  cat "$file" >> 10-database-schemas.txt 2>&1
  echo "" >> 10-database-schemas.txt
done

# 11. Configuration files
echo "⚙️  Collecting configuration files..."
echo "=== CONFIGURATION FILES ===" > 11-config-files.txt
for config in .prettierrc .eslintrc .eslintrc.js .eslintrc.json prettier.config.js eslint.config.js turbo.json; do
  if [ -f "../$config" ]; then
    echo "=== $config ===" >> 11-config-files.txt
    cat "../$config" >> 11-config-files.txt 2>&1
    echo "" >> 11-config-files.txt
  fi
done

# 12. README and documentation
echo "📖 Collecting documentation..."
echo "=== DOCUMENTATION ===" > 12-documentation.txt
find .. -maxdepth 2 -name "README*" -o -name "CHANGELOG*" -o -name "TODO*" | while read file; do
  echo "=== $file ===" >> 12-documentation.txt
  cat "$file" >> 12-documentation.txt 2>&1
  echo "" >> 12-documentation.txt
done

# 13. TODO/FIXME comments
echo "🔧 Finding TODOs and FIXMEs..."
echo "=== TODO/FIXME COMMENTS ===" > 13-todos-fixmes.txt
grep -r "TODO\|FIXME\|XXX\|HACK\|NOTE:" --include="*.ts" --include="*.tsx" .. 2>/dev/null | grep -v node_modules | grep -v dist >> 13-todos-fixmes.txt

# 14. Detailed file tree
echo "🌳 Creating detailed file tree..."
echo "=== DETAILED FILE TREE ===" > 14-detailed-tree.txt
tree -L 5 -I 'node_modules|dist|build|.next|.turbo' -a ../ >> 14-detailed-tree.txt 2>&1

# 15. Dependencies summary
echo "📦 Analyzing dependencies..."
echo "=== DEPENDENCIES SUMMARY ===" > 15-dependencies.txt
echo "--- Direct Dependencies ---" >> 15-dependencies.txt
find .. -name "package.json" -not -path "*/node_modules/*" -exec echo "=== {} ===" \; -exec jq '.dependencies' {} \; >> 15-dependencies.txt 2>&1
echo "" >> 15-dependencies.txt
echo "--- Dev Dependencies ---" >> 15-dependencies.txt
find .. -name "package.json" -not -path "*/node_modules/*" -exec echo "=== {} ===" \; -exec jq '.devDependencies' {} \; >> 15-dependencies.txt 2>&1

# 16. Git information (if available)
echo "🔀 Collecting git information..."
echo "=== GIT INFORMATION ===" > 16-git-info.txt
cd ..
git log --oneline -20 >> snapback-analysis/16-git-info.txt 2>&1 || echo "No git repository found" >> snapback-analysis/16-git-info.txt
git status >> snapback-analysis/16-git-info.txt 2>&1 || echo "No git repository found" >> snapback-analysis/16-git-info.txt
cd snapback-analysis

# Create summary
echo "📊 Creating summary..."
cat > 00-SUMMARY.txt << EOF
=== SNAPBACK REPOSITORY ANALYSIS SUMMARY ===
Generated: $(date)

FILES CREATED:
├── 00-SUMMARY.txt (this file)
├── 01-structure.txt (repository structure)
├── 02-packages.txt (packages and apps listing)
├── 03-package-jsons.txt (all package.json files)
├── 04-tsconfig.txt (all tsconfig files)
├── 05-typescript-files-list.txt (list of all TS files)
├── 06-source-code-part-*.txt (source code in manageable chunks)
├── 07-checkpoint-references.txt (all "checkpoint" mentions)
├── 08-checkpoint-definitions.txt (checkpoint types/classes)
├── 09-api-routes.txt (API route files)
├── 10-database-schemas.txt (database schemas)
├── 11-config-files.txt (prettier, eslint, etc.)
├── 12-documentation.txt (README, CHANGELOG)
├── 13-todos-fixmes.txt (TODO/FIXME comments)
├── 14-detailed-tree.txt (detailed file tree)
├── 15-dependencies.txt (all dependencies)
└── 16-git-info.txt (git status and recent commits)

STATISTICS:
- TypeScript files processed: $COUNTER
- Source code split into: $FILECOUNTER files
- Checkpoint references: $(wc -l < 07-checkpoint-references.txt) lines

NEXT STEPS:
1. Review 00-SUMMARY.txt (this file)
2. Start with 07-checkpoint-references.txt (most important for renaming)
3. Check 06-source-code-part-*.txt files for main logic
4. Share these files with Claude for surgical analysis

KEY FILES FOR CLAUDE:
- 07-checkpoint-references.txt (MUST REVIEW)
- 08-checkpoint-definitions.txt (MUST REVIEW)
- 06-source-code-part-*.txt (selective review)
- 01-structure.txt (architecture overview)
- 03-package-jsons.txt (dependencies and scripts)

IMPORTANT NOTES:
- Source code files were split to keep them manageable
- Files over 1MB were skipped (listed in source code files)
- All paths are relative to repository root
- grep results exclude node_modules, dist, build directories
EOF

# Create a compressed archive for easy sharing
echo "📦 Creating compressed archive..."
cd ..
tar -czf snapback-analysis.tar.gz snapback-analysis/
echo ""
echo "✅ Analysis complete!"
echo ""
echo "📁 Results saved to: snapback-analysis/"
echo "📦 Compressed archive: snapback-analysis.tar.gz"
echo ""
echo "📊 Summary:"
wc -l snapback-analysis/*.txt | tail -1
echo ""
echo "🎯 Next steps:"
echo "   1. Review snapback-analysis/00-SUMMARY.txt"
echo "   2. Share the most important files with Claude:"
echo "      - 07-checkpoint-references.txt (PRIORITY #1)"
echo "      - 08-checkpoint-definitions.txt"
echo "      - 01-structure.txt"
echo "      - 03-package-jsons.txt"
echo "   3. If needed, share specific source code parts"
echo ""
echo "💡 Tip: Start with checkpoint references - that's the surgical rename target!"
