#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📦 Syncing Apps to OSS Repositories${NC}"
echo ""

ORG="snapback-dev"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub CLI${NC}"
    exit 1
fi

sync_app() {
    local app=$1
    local description=$2

    echo -e "${BLUE}Syncing ${app}...${NC}"

    # Check if repo exists
    if ! gh repo view "${ORG}/${app}" &> /dev/null; then
        echo -e "${RED}  ✗ Repository ${ORG}/${app} does not exist${NC}"
        echo -e "${YELLOW}  → Run ./scripts/create-oss-app-repos.sh first${NC}"
        return 1
    fi

    # Create temp directory
    TEMP_DIR="/tmp/snapback-sync-${app}"
    rm -rf "$TEMP_DIR"

    echo -e "  Cloning repository..."
    gh repo clone "${ORG}/${app}" "$TEMP_DIR" 2>/dev/null

    # Clear existing content (except .git)
    cd "$TEMP_DIR"
    find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

    # Copy app files
    echo -e "  Copying source code..."
    rsync -av --exclude='node_modules' \
              --exclude='out' \
              --exclude='dist' \
              --exclude='.turbo' \
              --exclude='*.log' \
              --exclude='.DS_Store' \
              --exclude='CLAUDE.md' \
              --exclude='PRD.md' \
              --exclude='CODE_REVIEW.md' \
              --exclude='TESTING_PLAN.md' \
              --exclude='SECURITY_AND_PERFORMANCE_FIXES.md' \
              --exclude='DEVELOPER_EXPERIENCE_IMPROVEMENTS.md' \
              --exclude='*_PLAN.md' \
              --exclude='*_REVIEW.md' \
              --exclude='*_FIXES.md' \
              --exclude='*_IMPROVEMENTS.md' \
              --exclude='test' \
              --exclude='tests' \
              --exclude='__tests__' \
              --exclude='*.spec.*' \
              --exclude='*.test.*' \
              --exclude='coverage' \
              --exclude='generated' \
              --exclude='*.corrupted' \
              "$OLDPWD/apps/${app}/" .

    # Copy Standard OSS Files
    echo -e "  Copying standard OSS files..."
    if [ -f "$OLDPWD/scripts/oss-templates/SECURITY.md" ]; then
        cp "$OLDPWD/scripts/oss-templates/SECURITY.md" SECURITY.md
    fi
    if [ -f "$OLDPWD/scripts/oss-templates/CODE_OF_CONDUCT.md" ]; then
        cp "$OLDPWD/scripts/oss-templates/CODE_OF_CONDUCT.md" CODE_OF_CONDUCT.md
    fi
    if [ -f "$OLDPWD/scripts/oss-templates/CONTRIBUTING.md" ]; then
        cp "$OLDPWD/scripts/oss-templates/CONTRIBUTING.md" CONTRIBUTING.md
    fi

    # Copy GitHub Templates
    mkdir -p .github/ISSUE_TEMPLATE
    if [ -d "$OLDPWD/scripts/oss-templates/.github" ]; then
        cp -r "$OLDPWD/scripts/oss-templates/.github/" .github/
    fi

    # Copy LICENSE
    if [ ! -f "LICENSE" ]; then
        cat > LICENSE << 'EOF'
Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

Copyright 2025 SnapBack

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
EOF
    fi

    # Commit and push
    git config user.name "SnapBack Bot"
    git config user.email "bot@snapback.dev"
    git add .

    if git diff --staged --quiet; then
        echo -e "${GREEN}  ✓ No changes to sync${NC}"
    else
        echo -e "  Committing changes..."
        git commit -m "chore: initial public release v1.0.0

${description}

- Complete source code
- Documentation and guides
- Apache 2.0 license
- Ready for community contributions"

        echo -e "  Pushing to remote..."
        git push

        echo -e "${GREEN}  ✓ Synced successfully${NC}"
    fi

    cd - > /dev/null
    echo ""
}

# Sync MCP server
sync_app "mcp-server" "AI-powered code analysis via Model Context Protocol

Features:
- Risk analysis and secret detection
- Local-first with optional cloud features
- Works with Claude Desktop, Cursor, and any MCP client
- Free and open source"

# Sync VS Code extension
sync_app "vscode" "VS Code extension for automated file protection

Features:
- Auto-protect critical files
- Create and restore snapshots
- Secret detection
- Local-first with optional cloud sync
- Free and open source"

echo -e "${GREEN}✅ All apps synced!${NC}"
echo ""
echo "Next steps:"
echo "1. Visit https://github.com/${ORG} to verify repositories"
echo "2. Update package versions if needed"
echo "3. Set up CI/CD workflows"
echo "4. Publish to registries (npm, VS Code Marketplace)"
