#!/usr/bin/env bash

# API-First Boundary Enforcement
# Ensures apps/web CLIENT CODE does not import database clients directly
#
# ALLOWED: API routes (app/api/*), server actions, middleware, lib utilities, tests
# BLOCKED: Client components, pages that should use API calls

set -e

ERRORS=0

echo "🔍 Checking API-first boundary in apps/web..."

# Directories that ARE allowed to access DB (backend code)
# Note: Server actions (app/actions/) are NOT allowed - they should use ORPC procedures
# This enforces true API-first architecture where apps/web has ZERO direct DB imports
ALLOWED_PATTERNS=(
  "apps/web/app/api/"
  "apps/web/lib/"
  "apps/web/middleware/"
  "apps/web/services/"
  "apps/web/tests/"
  "apps/web/__tests__/"
)

# Function to check if a file is in an allowed directory
is_allowed() {
  local file="$1"
  for pattern in "${ALLOWED_PATTERNS[@]}"; do
    if [[ "$file" == *"$pattern"* ]]; then
      return 0  # File is allowed
    fi
  done
  return 1  # File is not allowed
}

# Check for direct drizzle-orm imports in CLIENT code
while IFS= read -r line; do
  file=$(echo "$line" | cut -d':' -f1)
  if ! is_allowed "$file"; then
    if [ $ERRORS -eq 0 ]; then
      echo "❌ Found direct drizzle-orm imports in CLIENT code:"
    fi
    echo "   $line"
    ERRORS=$((ERRORS + 1))
  fi
done < <(grep -r "from ['\"]drizzle-orm" apps/web/ --include="*.ts" --include="*.tsx" 2>/dev/null || true)

# Check for direct pg imports in CLIENT code
while IFS= read -r line; do
  file=$(echo "$line" | cut -d':' -f1)
  if ! is_allowed "$file"; then
    if [ $ERRORS -eq 0 ]; then
      echo "❌ Found direct pg imports in CLIENT code:"
    fi
    echo "   $line"
    ERRORS=$((ERRORS + 1))
  fi
done < <(grep -r "from ['\"]pg['\"]" apps/web/ --include="*.ts" --include="*.tsx" 2>/dev/null || true)

# Check for db imports from @snapback/platform in CLIENT code
while IFS= read -r line; do
  file=$(echo "$line" | cut -d':' -f1)
  if ! is_allowed "$file"; then
    if [ $ERRORS -eq 0 ]; then
      echo "❌ Found db imports from @snapback/platform in CLIENT code:"
    fi
    echo "   $line"
    ERRORS=$((ERRORS + 1))
  fi
done < <(grep -r "import.*{.*db.*}.*from.*['\"]@snapback/platform" apps/web/ --include="*.ts" --include="*.tsx" 2>/dev/null || true)

if [ $ERRORS -eq 0 ]; then
  echo "✅ API boundary check passed - backend code properly isolated"
  exit 0
else
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "API-FIRST VIOLATION DETECTED IN CLIENT CODE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Client-side code must not import database clients directly."
  echo ""
  echo "✅ ALLOWED (backend code):"
  echo "   • apps/web/app/api/**/* (API routes)"
  echo "   • apps/web/lib/**/* (server utilities)"
  echo "   • apps/web/middleware/**/* (server middleware)"
  echo "   • apps/web/services/**/* (server services)"
  echo "   • apps/web/**/*.test.ts (tests)"
  echo ""
  echo "❌ BLOCKED (client code):"
  echo "   • apps/web/app/**/page.tsx (use fetch or server actions)"
  echo "   • apps/web/components/**/* (use API calls)"
  echo "   • apps/web/modules/**/* client code (use API calls)"
  echo ""
  echo "See: runlist p1-api-and-schema > db-import-guard"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi
