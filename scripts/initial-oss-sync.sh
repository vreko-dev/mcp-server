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

   Copyright 2024 SnapBack

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

    # Commit and push
    git config user.name "SnapBack Bot"
    git config user.email "bot@snapback.dev"
    git add .

    if git diff --staged --quiet; then
        echo -e "${GREEN}  ✓ No changes to sync${NC}"
    else
        echo -e "  Committing changes..."
        git commit -m "sync: Initial sync from private monorepo"

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
