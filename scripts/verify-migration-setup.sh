#!/bin/bash

# ============================================================================
# Migration Setup Verification Script
# ============================================================================
# Verifies that all database migration fixes are correctly in place
# Run this before deploying to ensure production is ready
#
# Usage: ./scripts/verify-migration-setup.sh
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# Helper functions
check_pass() {
  echo -e "${GREEN}✅ PASS${NC}: $1"
  ((CHECKS_PASSED++))
}

check_fail() {
  echo -e "${RED}❌ FAIL${NC}: $1"
  ((CHECKS_FAILED++))
}

check_warn() {
  echo -e "${YELLOW}⚠️  WARN${NC}: $1"
  ((CHECKS_WARNING++))
}

# Banner
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   SnapBack Migration Setup Verification                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# 1. Docker Compose Files
# ============================================================================
echo -e "${BLUE}📋 Checking Docker Compose Files${NC}"

if [ -f "docker-compose.yml" ]; then
  check_pass "Production docker-compose.yml exists"
else
  check_fail "Production docker-compose.yml not found"
fi

if [ -f "docker-compose.dev.yml" ]; then
  check_pass "Development docker-compose.dev.yml exists"
else
  check_fail "Development docker-compose.dev.yml not found"
fi

# Validate YAML syntax
if docker-compose config > /dev/null 2>&1; then
  check_pass "Production docker-compose.yml is valid YAML"
else
  check_fail "Production docker-compose.yml has syntax errors"
fi

if docker-compose -f docker-compose.dev.yml config > /dev/null 2>&1; then
  check_pass "Development docker-compose.dev.yml is valid YAML"
else
  check_fail "Development docker-compose.dev.yml has syntax errors"
fi

echo ""

# ============================================================================
# 2. Migrations Service Configuration
# ============================================================================
echo -e "${BLUE}🔄 Checking Migrations Service Configuration${NC}"

# Check production migrations service
if grep -q "migrations:" docker-compose.yml; then
  check_pass "Production migrations service defined"
else
  check_fail "Production migrations service NOT found"
fi

if grep -q "migrations:" docker-compose.dev.yml; then
  check_pass "Development migrations service defined"
else
  check_fail "Development migrations service NOT found"
fi

# Check API dependencies
if grep -A 10 "^    api:" docker-compose.yml | grep -q "migrations:"; then
  check_pass "API service depends on migrations in production"
else
  check_fail "API service does NOT depend on migrations in production"
fi

if grep -A 10 "^    api:" docker-compose.dev.yml | grep -q "migrations:"; then
  check_pass "API service depends on migrations in development"
else
  check_fail "API service does NOT depend on migrations in development"
fi

echo ""

# ============================================================================
# 3. Migration Files
# ============================================================================
echo -e "${BLUE}📁 Checking Migration Files${NC}"

MIGRATIONS_DIR="packages/platform/drizzle/migrations"

if [ -d "$MIGRATIONS_DIR" ]; then
  check_pass "Migrations directory exists: $MIGRATIONS_DIR"

  # Count SQL files
  SQL_COUNT=$(find "$MIGRATIONS_DIR" -name "*.sql" -type f | wc -l)
  if [ "$SQL_COUNT" -gt 0 ]; then
    check_pass "Found $SQL_COUNT migration SQL files"

    if [ "$SQL_COUNT" -ge 6 ]; then
      check_pass "Minimum required migrations present (expecting ≥6, found $SQL_COUNT)"
    else
      check_warn "Only $SQL_COUNT migrations found (expecting ≥6)"
    fi
  else
    check_fail "No SQL migration files found in $MIGRATIONS_DIR"
  fi

  # Check specific critical migrations
  CRITICAL_MIGRATIONS=(
    "0001_wild_psynapse.sql"
    "0002_better_auth.sql"
    "0003_supabase_extensions.sql"
  )

  for migration in "${CRITICAL_MIGRATIONS[@]}"; do
    if find "$MIGRATIONS_DIR" -name "$migration" -type f | grep -q "$migration"; then
      check_pass "Critical migration found: $migration"
    else
      check_warn "Critical migration NOT found: $migration"
    fi
  done
else
  check_fail "Migrations directory NOT found: $MIGRATIONS_DIR"
fi

# Check legacy migrations directory
LEGACY_DIR="packages/platform/src/db/migrations"
if [ -d "$LEGACY_DIR" ]; then
  check_warn "Legacy migrations directory still exists (deprecated): $LEGACY_DIR"

  if [ -f "$LEGACY_DIR/README.md" ]; then
    check_pass "Legacy migrations have deprecation README"
  else
    check_warn "Legacy migrations missing deprecation README"
  fi
else
  check_pass "Legacy migrations directory cleaned up"
fi

echo ""

# ============================================================================
# 4. Configuration Files
# ============================================================================
echo -e "${BLUE}⚙️  Checking Configuration Files${NC}"

# Check Drizzle config (authoritative)
if [ -f "packages/platform/drizzle.config.ts" ]; then
  check_pass "Authoritative Drizzle config exists"

  if grep -q 'schema.*src/db/schema/snapback' "packages/platform/drizzle.config.ts"; then
    check_pass "Drizzle config has correct schema path"
  else
    check_warn "Drizzle config schema path may be incorrect"
  fi

  if grep -q 'out.*drizzle/migrations' "packages/platform/drizzle.config.ts"; then
    check_pass "Drizzle config has correct output path"
  else
    check_warn "Drizzle config output path may be incorrect"
  fi
else
  check_fail "Authoritative Drizzle config NOT found"
fi

# Check migration runner script
if [ -f "ops/scripts/run-migrations.sh" ]; then
  check_pass "Migration runner script exists"

  if grep -q "pg_isready" "ops/scripts/run-migrations.sh"; then
    check_pass "Migration runner waits for postgres"
  else
    check_warn "Migration runner may not wait for postgres"
  fi

  if grep -q "_snapback_migrations" "ops/scripts/run-migrations.sh"; then
    check_pass "Migration runner creates tracking table"
  else
    check_warn "Migration runner may not track migrations"
  fi
else
  check_fail "Migration runner script NOT found"
fi

# Check API entrypoint
if [ -f "apps/api/docker-entrypoint.sh" ]; then
  check_pass "API entrypoint script exists"

  if grep -q "pg_isready" "apps/api/docker-entrypoint.sh"; then
    check_pass "API entrypoint waits for postgres"
  else
    check_warn "API entrypoint may not wait for postgres"
  fi
else
  check_warn "API entrypoint script not found (may be OK if using base image)"
fi

echo ""

# ============================================================================
# 5. Documentation
# ============================================================================
echo -e "${BLUE}📚 Checking Documentation${NC}"

if [ -f "docs/MIGRATIONS_SETUP.md" ]; then
  check_pass "Comprehensive migrations documentation exists"
else
  check_fail "Comprehensive migrations documentation NOT found"
fi

if [ -f "MIGRATION_FIXES_SUMMARY.md" ]; then
  check_pass "Migration fixes summary document exists"
else
  check_warn "Migration fixes summary document NOT found"
fi

echo ""

# ============================================================================
# 6. Environment Configuration
# ============================================================================
echo -e "${BLUE}🔐 Checking Environment Configuration${NC}"

if [ -f ".env.docker.example" ]; then
  check_pass ".env.docker.example template exists"

  if grep -q "DATABASE_URL" ".env.docker.example"; then
    check_pass ".env.docker.example includes DATABASE_URL"
  else
    check_warn ".env.docker.example missing DATABASE_URL"
  fi

  if grep -q "POSTGRES" ".env.docker.example"; then
    check_pass ".env.docker.example includes POSTGRES variables"
  else
    check_warn ".env.docker.example missing POSTGRES variables"
  fi
else
  check_warn ".env.docker.example template NOT found"
fi

echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Verification Summary                                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

TOTAL_CHECKS=$((CHECKS_PASSED + CHECKS_FAILED + CHECKS_WARNING))

echo -e "${GREEN}Passed:${NC}  $CHECKS_PASSED/$TOTAL_CHECKS"
echo -e "${RED}Failed:${NC}  $CHECKS_FAILED/$TOTAL_CHECKS"
echo -e "${YELLOW}Warnings:${NC} $CHECKS_WARNING/$TOTAL_CHECKS"
echo ""

# Determine overall status
if [ $CHECKS_FAILED -eq 0 ]; then
  if [ $CHECKS_WARNING -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED - System is ready for production${NC}"
    exit 0
  else
    echo -e "${YELLOW}⚠️  CHECKS PASSED WITH WARNINGS - Review warnings above${NC}"
    exit 0
  fi
else
  echo -e "${RED}❌ SOME CHECKS FAILED - Fix errors before deployment${NC}"
  exit 1
fi
