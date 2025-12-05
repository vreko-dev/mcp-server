#!/bin/bash
set -e

# Update READMEs for events and config repos

ORG="snapback-dev"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📝 Updating READMEs for events and config${NC}"
echo ""

# Update events README
echo -e "${BLUE}Updating events README...${NC}"
TEMP_DIR="/tmp/snapback-update-events"
rm -rf "$TEMP_DIR"
gh repo clone "${ORG}/events" "$TEMP_DIR" 2>/dev/null

cd "$TEMP_DIR"
cp "$(dirname $0)/oss-templates/events-README.md" README.md

git add README.md
if ! git diff --staged --quiet; then
    git config user.name "SnapBack Bot"
    git config user.email "bot@snapback.dev"
    git commit -m "docs: add comprehensive README"
    git push
    echo -e "${GREEN}✓ Updated events README${NC}"
else
    echo "No changes needed"
fi

# Update config README
echo -e "${BLUE}Updating config README...${NC}"
TEMP_DIR="/tmp/snapback-update-config"
rm -rf "$TEMP_DIR"
gh repo clone "${ORG}/config" "$TEMP_DIR" 2>/dev/null

cd "$TEMP_DIR"
cp "$(dirname $0)/oss-templates/config-README.md" README.md

git add README.md
if ! git diff --staged --quiet; then
    git config user.name "SnapBack Bot"
    git config user.email "bot@snapback.dev"
    git commit -m "docs: add comprehensive README"
    git push
    echo -e "${GREEN}✓ Updated config README${NC}"
else
    echo "No changes needed"
fi

echo ""
echo -e "${GREEN}✅ READMEs updated!${NC}"
