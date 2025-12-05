#!/bin/bash

# Storybook Installation Script for SnapBack
# This script installs all required dependencies for Storybook

set -e

echo "📦 Installing Storybook dependencies..."

cd apps/web

# Core Storybook packages
pnpm add -D \
  storybook@^8.0.0 \
  @storybook/react-vite@^8.0.0 \
  @storybook/react@^8.0.0 \
  @storybook/addon-essentials@^8.0.0 \
  @storybook/addon-interactions@^8.0.0 \
  @storybook/addon-links@^8.0.0 \
  @storybook/addon-a11y@^8.0.0 \
  @storybook/addon-themes@^8.0.0 \
  @storybook/addon-coverage@^8.0.0 \
  @storybook/test@^8.0.0

# Testing
pnpm add -D \
  @storybook/test-runner@^0.19.0

# Visual regression testing
pnpm add -D chromatic@^11.0.0

# Vite (if not already installed)
pnpm add -D vite@^5.0.0

echo "✅ Dependencies installed successfully"

echo ""
echo "Next steps:"
echo "1. Copy configuration files from claudedocs/storybook-configs/ to apps/web/.storybook/"
echo "2. Add scripts to apps/web/package.json:"
echo "   \"storybook\": \"storybook dev -p 6006\""
echo "   \"storybook:build\": \"storybook build\""
echo "   \"test-storybook\": \"test-storybook\""
echo "3. Run: pnpm --filter @snapback/web storybook"
