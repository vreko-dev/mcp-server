#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ORG="snapback-dev"
REPOS=("contracts" "infrastructure" "sdk" "events" "config" "mcp-server" "vscode")

echo -e "${BLUE}🧹 Resetting OSS Git History (Pristine Mode)${NC}"
echo -e "${YELLOW}⚠️  This will FORCE PUSH and wipe all history on remote repos!${NC}"
echo ""

# Check gh auth
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub CLI${NC}"
    exit 1
fi

for repo in "${REPOS[@]}"; do
    echo -e "${BLUE}Processing ${repo}...${NC}"

    TEMP_DIR="/tmp/snapback-reset-${repo}"
    rm -rf "$TEMP_DIR"

    # Clone current state (which is clean of files, but dirty history)
    echo -e "  Cloning..."
    gh repo clone "${ORG}/${repo}" "$TEMP_DIR" 2>/dev/null

    cd "$TEMP_DIR"

    # Nuke history
    echo -e "  Wiping .git history..."
    rm -rf .git

    # Re-init
    git init -b main
    git remote add origin "https://github.com/${ORG}/${repo}.git"

    # Add all files
    git add .

    # Determine commit message based on repo
    case "$repo" in
        contracts)
            MSG="chore: initial release v0.1.0

feat: TypeScript contracts and type definitions

- Event types (SnapshotCreated, FileProtected, etc.)
- Zod validation schemas
- Session management utilities
- ID generation helpers

Production-grade type definitions for the SnapBack platform."
            ;;
        infrastructure)
            MSG="chore: initial release v0.1.0

feat: infrastructure utilities for Node.js

- Structured logging with Pino
- Generic metrics interfaces
- OpenTelemetry distributed tracing
- Context propagation helpers

Framework-agnostic observability toolkit."
            ;;
        sdk)
            MSG="chore: initial release v0.1.0

feat: TypeScript SDK for SnapBack API

- Snapshot CRUD operations
- File protection management
- Storage adapters (HTTP, optional SQLite)
- Type-safe API client with retries

Complete SDK for building code safety systems."
            ;;
        events)
            MSG="chore: initial release v0.1.0

feat: event bus implementation

- Type-safe EventEmitter2 wrapper
- Event namespacing support
- Async/await support

Reactive event system for TypeScript apps."
            ;;
        config)
            MSG="chore: initial release v0.1.0

feat: configuration utilities

- Config loading and merging
- Schema validation
- Type-safe helpers
- Environment overrides

Configuration management with validation."
            ;;
        mcp-server)
            MSG="chore: initial release v1.0.0

feat: AI-powered code analysis via Model Context Protocol

- Risk analysis and secret detection
- Local-first with optional cloud features
- Works with Claude Desktop, Cursor, and any MCP client
- Free and open source"
            ;;
        vscode)
            MSG="chore: initial release v1.0.0

feat: VS Code extension for automated file protection

- Auto-protect critical files
- Create and restore snapshots
- Secret detection
- Local-first with optional cloud sync
- Free and open source"
            ;;
        *)
            MSG="chore: initial release v1.0.0"
            ;;
    esac

    # Commit
    echo -e "  Creating fresh initial commit..."
    git config user.name "SnapBack Bot"
    git config user.email "bot@snapback.dev"
    git commit -m "$MSG"

    # Force Push
    echo -e "  Force pushing to origin..."
    git push -f origin main

    echo -e "${GREEN}  ✓ History reset successfully${NC}"
    echo ""
done

echo -e "${GREEN}✨ All repositories are now pristine with single-commit history!${NC}"
