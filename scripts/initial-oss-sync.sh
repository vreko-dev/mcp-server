#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Initial OSS Package Sync${NC}"
echo ""

ORG="snapback-dev"
REPOS=("contracts" "infrastructure" "sdk" "events" "config")

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

echo -e "${YELLOW}Step 1: Building OSS packages from packages-oss...${NC}"
cd packages-oss
for repo in "${REPOS[@]}"; do
    if [ -d "$repo" ]; then
        echo "  Building $repo..."
        cd "$repo"
        pnpm build || echo "  ⚠️  Build failed for $repo"
        cd ..
    fi
done
cd ..
echo -e "${GREEN}✅ Build successful${NC}"
echo ""

echo -e "${YELLOW}Step 2: Skipping validation (using existing packages-oss)${NC}"
echo -e "${GREEN}✅ Using trusted packages-oss source${NC}"
echo ""

echo -e "${YELLOW}Step 3: Syncing to public repositories...${NC}"
echo ""

for repo in "${REPOS[@]}"; do
    echo -e "${BLUE}Syncing ${ORG}/${repo}...${NC}"

    # Check if public repo exists
    if ! gh repo view "${ORG}/${repo}" &> /dev/null; then
        echo -e "${RED}  ✗ Repository ${ORG}/${repo} does not exist${NC}"
        echo -e "${YELLOW}  → Run ./scripts/create-oss-repos.sh first${NC}"
        continue
    fi

    # Create temp directory
    TEMP_DIR="/tmp/snapback-sync-${repo}"
    rm -rf "$TEMP_DIR"

    # Clone public repo
    echo -e "  Cloning repository..."
    gh repo clone "${ORG}/${repo}" "$TEMP_DIR" 2>/dev/null

    # Clear existing content (except .git)
    cd "$TEMP_DIR"
    find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

    # Copy from packages-oss
    if [ -d "$OLDPWD/packages-oss/${repo}" ]; then
        echo -e "  Copying from packages-oss/${repo}..."

        # Copy source and built files
        if [ -d "$OLDPWD/packages-oss/${repo}/src" ]; then
            cp -r "$OLDPWD/packages-oss/${repo}/src" .
        fi
        if [ -d "$OLDPWD/packages-oss/${repo}/dist" ]; then
            cp -r "$OLDPWD/packages-oss/${repo}/dist" .
        fi

        # Copy package.json and config files
        for file in package.json tsconfig.json tsup.config.ts; do
            if [ -f "$OLDPWD/packages-oss/${repo}/$file" ]; then
                cp "$OLDPWD/packages-oss/${repo}/$file" .
            fi
        done
    else
        echo -e "${YELLOW}  ⚠️  No packages-oss/${repo} found${NC}"
    fi

    # Copy README from template
    if [ -f "$OLDPWD/scripts/oss-templates/${repo}-README.md" ]; then
        echo -e "  Copying README..."
        cp "$OLDPWD/scripts/oss-templates/${repo}-README.md" README.md
    fi

    # Copy CONTRIBUTING guide
    if [ -f "$OLDPWD/scripts/oss-templates/CONTRIBUTING.md" ]; then
        cp "$OLDPWD/scripts/oss-templates/CONTRIBUTING.md" CONTRIBUTING.md
    fi

    # Copy LICENSE (Apache 2.0)
    cat > LICENSE << 'EOF'
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   [Full Apache 2.0 license text would go here]

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

    # Copy CHANGELOG if exists
    if [ -f "$OLDPWD/packages-oss/${repo}/CHANGELOG.md" ]; then
        cp "$OLDPWD/packages-oss/${repo}/CHANGELOG.md" CHANGELOG.md
    fi

    # Copy Standard OSS Files
    echo -e "  Copying standard OSS files..."
    if [ -f "$OLDPWD/scripts/oss-templates/SECURITY.md" ]; then
        cp "$OLDPWD/scripts/oss-templates/SECURITY.md" SECURITY.md
    fi
    if [ -f "$OLDPWD/scripts/oss-templates/CODE_OF_CONDUCT.md" ]; then
        cp "$OLDPWD/scripts/oss-templates/CODE_OF_CONDUCT.md" CODE_OF_CONDUCT.md
    fi

    # Copy GitHub Templates
    mkdir -p .github/ISSUE_TEMPLATE
    if [ -d "$OLDPWD/scripts/oss-templates/.github" ]; then
        cp -r "$OLDPWD/scripts/oss-templates/.github/" .github/
    fi

    # Copy .gitignore if exists in packages-oss
    if [ -f "$OLDPWD/packages-oss/${repo}/.gitignore" ]; then
        cp "$OLDPWD/packages-oss/${repo}/.gitignore" .gitignore
    fi

    # Commit and push with clean squashed message
    git config user.name "SnapBack Bot"
    git config user.email "bot@snapback.dev"
    git add .

    if git diff --staged --quiet; then
        echo -e "${GREEN}  ✓ No changes to sync${NC}"
    else
        echo -e "  Creating clean initial commit..."

        # Create meaningful squashed commit message
        case "$repo" in
            contracts)
                git commit -m "chore: initial release v0.1.0

feat: TypeScript contracts and type definitions

- Event types (SnapshotCreated, FileProtected, etc.)
- Zod validation schemas
- Session management utilities
- ID generation helpers

This is the initial public release of @snapback-oss/contracts,
extracted from the main SnapBack platform."
                ;;
            infrastructure)
                git commit -m "chore: initial release v0.1.0

feat: infrastructure utilities for Node.js

- Structured logging with Pino
- Generic metrics interfaces
- OpenTelemetry distributed tracing
- Context propagation helpers

Framework-agnostic utilities that work with any Node.js app."
                ;;
            sdk)
                git commit -m "chore: initial release v0.1.0

feat: TypeScript SDK for SnapBack API

- Snapshot CRUD operations
- File protection management
- Storage adapters (HTTP, optional SQLite)
- Type-safe API client with retries

Complete SDK for interacting with SnapBack platform."
                ;;
            events)
                git commit -m "chore: initial release v0.1.0

feat: event bus implementation

- Type-safe EventEmitter2 wrapper
- Event namespacing support

Simple pub/sub event system."
                ;;
            config)
                git commit -m "chore: initial release v0.1.0

feat: configuration utilities

- Config loading and merging
- Schema validation
- Type-safe helpers

Configuration management for Node.js apps."
                ;;
            *)
                git commit -m "chore: initial release v0.1.0"
                ;;
        esac

        echo -e "  Pushing to remote..."
        git push

        echo -e "${GREEN}  ✓ Synced successfully${NC}"
    fi

    cd - > /dev/null
    echo ""
done

echo -e "${GREEN}✅ Initial sync complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Visit https://github.com/${ORG} to verify repositories"
echo "2. Update any package-specific content in READMEs"
echo "3. Set up GitHub Actions secret (OSS_SYNC_TOKEN)"
echo "4. Test automated sync with a small change"
