# SnapBack Development Environment
# Custom bash configuration for GitHub Codespaces

# Aliases
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias gs='git status'
alias gp='git pull'
alias gc='git commit'
alias gd='git diff'

# pnpm aliases
alias p='pnpm'
alias pd='pnpm dev'
alias pb='pnpm build'
alias pt='pnpm test'
alias pw='pnpm test:watch'

# Project-specific aliases
alias dev-web='pnpm -F @snapback/web dev'
alias dev-vscode='code apps/vscode'
alias dev-mcp='pnpm -F @snapback/mcp-server dev'

# Environment
export PNPM_HOME="/usr/local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

# Git configuration
git config --global pull.rebase false
git config --global init.defaultBranch main

# Welcome message
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📦 SnapBack Development Environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Quick commands:"
echo "    p        → pnpm"
echo "    pd       → pnpm dev"
echo "    pb       → pnpm build"
echo "    pt       → pnpm test"
echo "    dev-web  → Start web app"
echo "    dev-mcp  → Start MCP server"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
