#!/bin/bash

# Fix lefthook and related issues
# This script applies all the fixes recommended to get lefthook working properly

set -euo pipefail

echo "🔧 Applying fixes to get lefthook working properly..."

# Ensure the tools exist everywhere
echo "📦 Installing required tools..."
pnpm -w add -D @biomejs/biome lefthook syncpack ripgrep vitest

# Make all the easy fixes in-place (accept optional chaining, etc.)
echo "✨ Running biome fixes..."
pnpm -w biome check --write --unsafe .
pnpm -w biome format --write .

# Bring the lockfile & workspace into a sane state
echo "🔄 Installing dependencies..."
pnpm -w install

# Normalize catalog across the repo (fast way: upgrade to catalog)
echo "📚 Updating catalog dependencies..."
pnpm -w up -r \
  hono@catalog: zod@catalog: @hono/zod-validator@catalog: \
  @hono/auth-js@catalog: drizzle-orm@catalog: @types/node@catalog: \
  tsx@catalog: typescript@catalog: @orpc/server@catalog: \
  @orpc/openapi@catalog: @orpc/zod@catalog: @scalar/hono-api-reference@catalog: \
  @paralleldrive/cuid2@catalog: postgres@catalog: better-auth@catalog: cookie@catalog:

# Reinstall after catalog changes
echo "🔄 Reinstalling after catalog changes..."
pnpm -w install

# Install lefthook hooks
echo "🎣 Installing lefthook..."
pnpm lefthook install

echo "✅ All fixes applied! Your lefthook should now work properly."
echo "💡 Run 'pnpm -w lefthook run pre-commit -a' to test against all files."