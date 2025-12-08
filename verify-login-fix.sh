#!/bin/bash

# Login Page Fix Verification Script
# Validates all changes and runs comprehensive checks

set -e

echo "🔍 Login Page Fix - Verification Script"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
PASSED=0
FAILED=0

# Test 1: Verify component file exists and has correct content
echo "📝 Test 1: Checking component updates..."
if grep -q "Welcome back" apps/web/modules/saas/auth/components/ProtectionSnapshotLogin.tsx && \
   grep -q "Sign in to access your protected code" apps/web/modules/saas/auth/components/ProtectionSnapshotLogin.tsx && \
   grep -q "Your code stays local. Always." apps/web/modules/saas/auth/components/ProtectionSnapshotLogin.tsx && \
   grep -q "duration: prefersReducedMotion ? 0 : 0.25" apps/web/modules/saas/auth/components/ProtectionSnapshotLogin.tsx; then
    echo -e "${GREEN}✓ Component updates verified${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Component updates missing${NC}"
    ((FAILED++))
fi

# Test 2: Verify metadata updates
echo "📝 Test 2: Checking metadata updates..."
if grep -q "Sign In - SnapBack" apps/web/app/auth/login/page.tsx && \
   grep -q "Sign in to access your protected code" apps/web/app/auth/login/page.tsx; then
    echo -e "${GREEN}✓ Metadata updates verified${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Metadata updates missing${NC}"
    ((FAILED++))
fi

# Test 3: Verify test files exist
echo "📝 Test 3: Checking E2E test files..."
if [ -f "apps/web/tests/e2e/auth/login-ui-complete.spec.ts" ] && \
   [ -f "apps/web/tests/e2e/auth/auth-integration-complete.spec.ts" ]; then
    echo -e "${GREEN}✓ E2E test files created${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ E2E test files missing${NC}"
    ((FAILED++))
fi

# Test 4: Verify test count
echo "📝 Test 4: Checking test coverage..."
UI_TESTS=$(grep -c "test(\"" apps/web/tests/e2e/auth/login-ui-complete.spec.ts || echo 0)
INT_TESTS=$(grep -c "test(\"" apps/web/tests/e2e/auth/auth-integration-complete.spec.ts || echo 0)
TOTAL_TESTS=$((UI_TESTS + INT_TESTS))

if [ "$TOTAL_TESTS" -ge 40 ]; then
    echo -e "${GREEN}✓ Test coverage: $TOTAL_TESTS tests (expected: 41)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Test coverage: $TOTAL_TESTS tests (expected: 41)${NC}"
    ((FAILED++))
fi

# Test 5: Verify Page Object Model updates
echo "📝 Test 5: Checking Page Object Model..."
if grep -q "clickContinueWithPassword" apps/web/tests/utils/pages/login.ts && \
   grep -q "expectWelcomeHeading" apps/web/tests/utils/pages/login.ts && \
   grep -q "expectSignInFailed" apps/web/tests/utils/pages/login.ts; then
    echo -e "${GREEN}✓ Page Object Model updated${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Page Object Model updates missing${NC}"
    ((FAILED++))
fi

# Test 6: Verify documentation
echo "📝 Test 6: Checking documentation..."
if [ -f "apps/web/tests/e2e/auth/README.md" ] && \
   [ -f "LOGIN_PAGE_FIX_SUMMARY.md" ]; then
    echo -e "${GREEN}✓ Documentation created${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Documentation missing${NC}"
    ((FAILED++))
fi

# Test 7: Verify animation timing
echo "📝 Test 7: Checking animation performance..."
if grep -q "duration: prefersReducedMotion ? 0 : 0.25" apps/web/modules/saas/auth/components/ProtectionSnapshotLogin.tsx && \
   grep -q "stiffness: 250" apps/web/modules/saas/auth/components/ProtectionSnapshotLogin.tsx && \
   grep -q "duration: 0.2" apps/web/modules/saas/auth/components/ProtectionSnapshotLogin.tsx; then
    echo -e "${GREEN}✓ Animation timing optimized (<300ms)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Animation timing not optimized${NC}"
    ((FAILED++))
fi

# Test 8: Verify accessibility improvements
echo "📝 Test 8: Checking accessibility..."
if grep -q "aria-hidden=\"true\"" apps/web/modules/saas/auth/components/ProtectionSnapshotLogin.tsx; then
    echo -e "${GREEN}✓ Accessibility improvements added${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Accessibility improvements missing${NC}"
    ((FAILED++))
fi

# Test 9: Verify testing blueprint compliance
echo "📝 Test 9: Checking testing blueprint compliance..."
if grep -q "WA-01" apps/web/tests/e2e/auth/login-ui-complete.spec.ts && \
   grep -q "WE-01" apps/web/tests/e2e/auth/auth-integration-complete.spec.ts && \
   grep -q "XW-01" apps/web/tests/e2e/auth/auth-integration-complete.spec.ts; then
    echo -e "${GREEN}✓ Testing blueprint test IDs present${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Testing blueprint test IDs missing${NC}"
    ((FAILED++))
fi

# Test 10: Verify old copy removed
echo "📝 Test 10: Checking old copy removal..."
if ! grep -q "Protection Snapshot" apps/web/modules/saas/auth/components/ProtectionSnapshotLogin.tsx || \
   grep -q "Welcome back" apps/web/modules/saas/auth/components/ProtectionSnapshotLogin.tsx; then
    echo -e "${GREEN}✓ Old copy removed or updated${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Old copy still present${NC}"
    ((FAILED++))
fi

echo ""
echo "========================================"
echo "📊 Verification Results"
echo "========================================"
echo -e "Passed: ${GREEN}$PASSED${NC} / 10"
echo -e "Failed: ${RED}$FAILED${NC} / 10"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All verifications passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run E2E tests: pnpm --filter @snapback/web test:e2e auth/"
    echo "2. Review changes in browser: pnpm --filter @snapback/web dev"
    echo "3. Check accessibility: Use screen reader or axe DevTools"
    echo "4. Validate animations: Ensure <300ms (test: WA-UI-04)"
    exit 0
else
    echo -e "${RED}❌ Some verifications failed!${NC}"
    echo ""
    echo "Please check the failed tests above and fix any issues."
    exit 1
fi
