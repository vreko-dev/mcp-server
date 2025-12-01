#!/bin/bash
set -e

# Usage: ./scripts/merge-packages.sh <source1,source2> <target>
# Example: ./scripts/merge-packages.sh analytics,logs,telemetry infrastructure

SOURCE_PACKAGES=$1
TARGET_PACKAGE=$2

IFS=',' read -ra SOURCES <<< "$SOURCE_PACKAGES"

echo "🔄 Merging packages: ${SOURCES[@]} → $TARGET_PACKAGE"

# 1. Create target if it doesn't exist
if [ ! -d "packages/$TARGET_PACKAGE" ]; then
  mkdir -p "packages/$TARGET_PACKAGE/src"
  cat > "packages/$TARGET_PACKAGE/package.json" << EOF
{
  "name": "@snapback/$TARGET_PACKAGE",
  "version": "0.1.0",
  "private": true,
  "dependencies": {},
  "devDependencies": {}
}
EOF
fi

# 2. Merge dependencies using a temporary Node.js script
echo "📦 Merging dependencies..."
cat > /tmp/merge-deps.js << 'EOF'
const fs = require('fs');
const sources = process.argv[2].split(',');
const target = process.argv[3];

const merged = { dependencies: {}, devDependencies: {} };

sources.forEach(pkg => {
  try {
    const json = JSON.parse(fs.readFileSync(`packages/${pkg}/package.json`));
    Object.assign(merged.dependencies, json.dependencies || {});
    Object.assign(merged.devDependencies, json.devDependencies || {});
  } catch (e) {
    console.warn(`⚠️  Couldn't read packages/${pkg}/package.json`);
  }
});

const targetJson = JSON.parse(fs.readFileSync(`packages/${target}/package.json`));
targetJson.dependencies = { ...targetJson.dependencies, ...merged.dependencies };
targetJson.devDependencies = { ...targetJson.devDependencies, ...merged.devDependencies };

fs.writeFileSync(`packages/${target}/package.json`, JSON.stringify(targetJson, null, 2));
console.log('✅ Dependencies merged');
EOF

node /tmp/merge-deps.js "$SOURCE_PACKAGES" "$TARGET_PACKAGE"

# 3. Create backup (excluding node_modules)
echo "💾 Creating backup..."
mkdir -p .backups
for pkg in "${SOURCES[@]}"; do
  # Create backup excluding node_modules
  tar --exclude='node_modules' -cf ".backups/$pkg-$(date +%Y%m%d).tar" "packages/$pkg" 2>/dev/null || echo "Warning: Could not create backup for $pkg"
done

# 4. List files that need import updates
echo "📝 Files that need import updates:"
# Use grep to find files that need import updates
grep -r "from ['\"]@snapback/\(${SOURCE_PACKAGES//,/\\|}\)" --include="*.ts" --include="*.tsx" . 2>/dev/null || echo "No imports found or grep not available"

echo ""
echo "✅ Setup complete!"
echo ""
echo "⚠️  MANUAL STEPS REQUIRED:"
echo "1. Move source files to packages/$TARGET_PACKAGE/src/"
echo "2. Update imports in the listed files above"
echo "3. Update turbo.json to remove old package references"
echo "4. Run: pnpm install && pnpm build"
echo "5. If successful, delete old packages: rm -rf packages/{${SOURCE_PACKAGES}}"
echo ""
echo "Backups saved in .backups/"