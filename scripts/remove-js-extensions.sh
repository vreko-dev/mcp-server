#!/bin/bash
# Remove .js extensions from TypeScript source imports

set -e

echo "Removing .js extensions from TypeScript imports..."

# Find all .ts and .tsx files (excluding node_modules and dist)
find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/dist-types/*" \
  -not -path "*/.next/*" \
  -not -path "*/build/*" \
  -exec sed -i '' \
    -e 's/from "\(\.\/[^"]*\)\.js"/from "\1"/g' \
    -e "s/from '\(\.\/[^']*\)\.js'/from '\1'/g" \
    -e 's/from "\(\.\.\/[^"]*\)\.js"/from "\1"/g' \
    -e "s/from '\(\.\.\/[^']*\)\.js'/from '\1'/g" \
    {} +

echo "✓ Done! All .js extensions removed from relative imports in TypeScript files."
