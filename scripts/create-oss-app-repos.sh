#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Creating SnapBack OSS Application Repositories${NC}"
echo ""

ORG="snapback-dev"
APPS=("mcp-server" "vscode")

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI (gh) is not installed${NC}"
    echo "Install with: brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️ Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${BLUE}Creating application repositories...${NC}"
echo ""

# Create MCP server repo
echo -e "${YELLOW}Creating ${ORG}/mcp-server...${NC}"
gh repo create "${ORG}/mcp-server" --public \
  --description "AI-powered code analysis via Model Context Protocol" \
  --homepage "https://snapback.dev" || echo "Repo may already exist"

# Add topics
gh repo edit "${ORG}/mcp-server" \
  --add-topic mcp \
  --add-topic ai \
  --add-topic code-analysis \
  --add-topic typescript || true

echo -e "${GREEN}✓ MCP server repository created${NC}"
echo ""

# Create VS Code extension repo
echo -e "${YELLOW}Creating ${ORG}/vscode...${NC}"
gh repo create "${ORG}/vscode" --public \
  --description "VS Code extension for file protection and snapshots" \
  --homepage "https://marketplace.visualstudio.com/items?itemName=snapback.snapback" || echo "Repo may already exist"

# Add topics
gh repo edit "${ORG}/vscode" \
  --add-topic vscode-extension \
  --add-topic snapshots \
  --add-topic file-protection \
  --add-topic typescript || true

echo -e "${GREEN}✓ VS Code extension repository created${NC}"
echo ""

echo -e "${GREEN}✅ All repositories created!${NC}"
echo ""
echo "Next steps:"
echo "1. Run ./scripts/sync-apps-to-oss.sh to populate repositories"
echo "2. Set up GitHub Actions secrets (optional)"
echo "3. Update marketplace listings"
