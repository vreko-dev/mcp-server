#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Creating SnapBack OSS Repositories${NC}"
echo ""

ORG="snapback-dev"
REPOS=("contracts" "infrastructure" "sdk" "events" "config")

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo "Install it from: https://cli.github.com"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI authenticated${NC}"
echo ""

# Create each repository
for repo in "${REPOS[@]}"; do
    echo -e "${BLUE}Creating ${ORG}/${repo}...${NC}"

    # Check if repo already exists
    if gh repo view "${ORG}/${repo}" &> /dev/null; then
        echo -e "${GREEN}  ✓ Repository already exists${NC}"
        continue
    fi

    # Create public repository
    gh repo create "${ORG}/${repo}" \
        --public \
        --description "Open source ${repo} package for SnapBack" \
        --license apache-2.0 \
        --disable-wiki \
        --gitignore Node

    echo -e "${GREEN}  ✓ Created ${ORG}/${repo}${NC}"

    # Clone to temp directory
    TEMP_DIR="/tmp/snapback-oss-${repo}"
    rm -rf "$TEMP_DIR"
    gh repo clone "${ORG}/${repo}" "$TEMP_DIR"

    # Add initial README
    cat > "$TEMP_DIR/README.md" << 'EOF'
# @snapback-oss/{REPO_NAME}

> Part of the [SnapBack](https://snapback.dev) open-core platform

## Status

🚧 **Initial Setup** - This repository is being configured

This package is automatically synced from the main SnapBack repository.

## Links

- [Main Repository](https://github.com/Marcelle-Labs/snapback.dev) (private)
- [Documentation](https://docs.snapback.dev)
- [Website](https://snapback.dev)

## License

Apache-2.0 © SnapBack
EOF

    # Replace placeholder
    sed -i '' "s/{REPO_NAME}/${repo}/g" "$TEMP_DIR/README.md"

    # Commit and push
    cd "$TEMP_DIR"
    git add README.md
    git commit -m "docs: add initial README"
    git push

    echo -e "${GREEN}  ✓ Initialized with README${NC}"
    echo ""
done

echo -e "${GREEN}✅ All repositories created successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Run: ./scripts/initial-oss-sync.sh"
echo "2. Update repository READMEs with proper content"
echo "3. Set up GitHub Actions for automated sync"
