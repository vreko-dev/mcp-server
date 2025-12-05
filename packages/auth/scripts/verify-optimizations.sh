#!/bin/bash

# Better Auth Optimizations Verification Script
# Verifies all optimizations are properly configured and functional

set -e

echo "🔍 Better Auth Optimizations Verification"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_passed=0
check_failed=0

# Function to check configuration
check_config() {
    local name=$1
    local check_cmd=$2

    echo -n "Checking $name... "

    if eval "$check_cmd" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((check_passed++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((check_failed++))
        return 1
    fi
}

# Check 1: Cookie Cache Configuration
echo "📦 Phase 1: Cookie Cache"
check_config "Cookie cache enabled" \
    "grep -q 'cookieCache.*enabled.*true' src/auth.ts"

check_config "JWE strategy configured" \
    "grep -q 'strategy.*jwe' src/auth.ts"

check_config "Auto-refresh configured" \
    "grep -q 'refreshCache.*updateAge' src/auth.ts"

echo ""

# Check 2: Redis Secondary Storage
echo "🔴 Phase 2: Redis Secondary Storage"
check_config "Secondary storage configured" \
    "grep -q 'secondaryStorage.*get.*set.*delete' src/auth.ts"

check_config "Rate limit storage configured" \
    "grep -q 'storage.*secondary-storage' src/auth.ts"

check_config "Redis error handling" \
    "grep -q 'catch.*error.*Redis' src/auth.ts"

echo ""

# Check 3: Organization RBAC
echo "🔐 Phase 3: Organization RBAC"
check_config "Organization permissions file exists" \
    "test -f src/lib/organization-permissions.ts"

check_config "Access control configured" \
    "grep -q 'createAccessControl' src/lib/organization-permissions.ts"

check_config "Three roles defined" \
    "grep -q -E 'owner.*admin.*member' src/lib/organization-permissions.ts"

check_config "Organization plugin configured" \
    "grep -q 'organization.*ac.*roles' src/auth.ts"

echo ""

# Check 4: ID Generation
echo "🆔 Phase 4: ID Generation"
check_config "cuid2 imported" \
    "grep -q 'createId as cuid' src/auth.ts"

check_config "generateId configured" \
    "grep -q 'generateId.*cuid' src/auth.ts"

check_config "Query limits configured" \
    "grep -q 'defaultFindManyLimit.*100' src/auth.ts"

echo ""

# Check 5: IP Tracking
echo "🌐 Phase 5: IP Tracking"
check_config "IP headers configured" \
    "grep -q 'ipAddressHeaders' src/auth.ts"

check_config "Cloudflare header priority" \
    "grep -q 'cf-connecting-ip' src/auth.ts"

check_config "IP tracking enabled" \
    "grep -q 'disableIpTracking.*false' src/auth.ts"

echo ""

# Check 6: Cookie Security
echo "🍪 Phase 6: Cookie Security"
check_config "Cookie prefix configured" \
    "grep -q 'cookiePrefix.*snapback' src/auth.ts"

check_config "Secure cookies configured" \
    "grep -q 'useSecureCookies' src/auth.ts"

check_config "CSRF protection enabled" \
    "grep -q 'crossSiteRequestForgery.*enabled.*true' src/auth.ts"

echo ""

# Check 7: Test Coverage
echo "🧪 Phase 7: Test Coverage"
check_config "Cookie cache tests exist" \
    "test -f __tests__/cookie-cache.test.ts"

check_config "Redis tests exist" \
    "test -f __tests__/redis-secondary-storage.test.ts"

check_config "RBAC tests exist" \
    "test -f __tests__/organization-rbac.test.ts"

check_config "ID/IP tests exist" \
    "test -f __tests__/id-generation-ip-tracking.test.ts"

check_config "Integration tests exist" \
    "test -f __tests__/integration/auth-optimizations.integration.test.ts"

echo ""

# Summary
echo "========================================"
echo "📊 Verification Summary"
echo "========================================"
echo -e "Passed: ${GREEN}$check_passed${NC}"
echo -e "Failed: ${RED}$check_failed${NC}"
echo ""

if [ $check_failed -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo -e "${GREEN}Better Auth optimizations are properly configured.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run tests: pnpm --filter @snapback/auth test"
    echo "2. Deploy: docker-compose up -d"
    echo "3. Monitor: Check Redis and PostgreSQL metrics"
    exit 0
else
    echo -e "${RED}❌ Some checks failed!${NC}"
    echo -e "${YELLOW}Please review the failed checks above.${NC}"
    exit 1
fi
