#!/bin/bash
set -e

# Fix ESM imports by adding .js extensions to relative imports
# Usage: ./scripts/fix-esm-imports.sh [--dry-run] [package-path]

DRY_RUN=false
TARGET_PATH=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      TARGET_PATH="$1"
      shift
      ;;
  esac
done

# If no path specified, find all ESM packages
if [ -z "$TARGET_PATH" ]; then
  echo "🔍 Finding all ESM packages (type: module)..."
  PACKAGES=$(find packages apps -maxdepth 2 -name 'package.json' -type f \
    -not -path '*/node_modules/*' \
    -not -path '*/.vscode-test/*' \
    -not -path '*/.next/*' \
    -not -path '*/dist/*' \
    -exec grep -l '"type": "module"' {} \; | xargs -I {} dirname {})
else
  PACKAGES="$TARGET_PATH"
fi

echo "📦 Packages to process:"
echo "$PACKAGES" | sed 's/^/  - /'
echo ""

if [ "$DRY_RUN" = true ]; then
  echo "🧪 DRY RUN MODE - No files will be modified"
  echo ""
fi

for PKG in $PACKAGES; do
  SRC_DIR="$PKG/src"

  if [ ! -d "$SRC_DIR" ]; then
    echo "⏭️  Skipping $PKG (no src directory)"
    continue
  fi

  echo "🔧 Processing: $PKG"

  # Find all .ts files (excluding .d.ts)
  TS_FILES=$(find "$SRC_DIR" -name '*.ts' -not -name '*.d.ts' -type f)

  for FILE in $TS_FILES; do
    # Check if file has relative imports without .js
    NEEDS_FIX=$(grep -E 'from ["\047](\.\./|\./)[^"\047]*["\047]' "$FILE" | grep -v '\.js["\047]' || true)

    if [ -n "$NEEDS_FIX" ]; then
      if [ "$DRY_RUN" = true ]; then
        echo "  📝 Would fix: $FILE"
        echo "$NEEDS_FIX" | sed 's/^/      /'
      else
        echo "  ✏️  Fixing: $FILE"
        # Create backup
        cp "$FILE" "$FILE.bak"

        # Fix imports (handles both single and double quotes, ./ and ../ patterns)
        sed -i '' \
          -e 's|from "\(\./[^"]*\)"|from "\1.js"|g' \
          -e "s|from '\(\./[^']*\)'|from '\1.js'|g" \
          -e 's|from "\(\.\./[^"]*\)"|from "\1.js"|g' \
          -e "s|from '\(\.\./[^']*\)'|from '\1.js'|g" \
          -e 's|\.js\.js|.js|g' \
          "$FILE"

        # Verify the fix didn't break anything
        if grep -q '\.js\.js' "$FILE"; then
          echo "  ⚠️  Warning: Found .js.js in $FILE, attempting to fix..."
          sed -i '' 's|\.js\.js|.js|g' "$FILE"
        fi

        # Remove backup if successful
        rm "$FILE.bak"
      fi
    fi
  done

  echo ""
done

if [ "$DRY_RUN" = true ]; then
  echo "✅ Dry run complete. Run without --dry-run to apply changes."
else
  echo "✅ All imports fixed! Remember to rebuild packages."
  echo ""
  echo "Next steps:"
  echo "  1. pnpm -r build"
  echo "  2. pnpm --filter @snapback/mcp-server selftest"
fi
