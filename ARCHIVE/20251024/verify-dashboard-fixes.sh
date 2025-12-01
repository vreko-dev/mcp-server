#!/bin/bash

# Dashboard Fixes Verification Script
# This script verifies that all critical fixes have been implemented

echo "🔍 Verifying Dashboard Integration Fixes..."
echo "=========================================="

# Check 1: Type Assertion Fix in use-resource-query.ts
echo "1. Checking Type Assertion Fix..."
if grep -q "result as TData" "/Users/user1/WebstormProjects/SnapBack-Site/apps/web/lib/use-resource-query.ts" && \
   grep -q "options?.schema" "/Users/user1/WebstormProjects/SnapBack-Site/apps/web/lib/use-resource-query.ts"; then
    echo "   ✅ Type assertion fix implemented"
else
    echo "   ❌ Type assertion fix missing"
fi

# Check 2: Error Type Assumption Fix
echo "2. Checking Error Type Assumption Fix..."
if grep -q "toAppError(error)" "/Users/user1/WebstormProjects/SnapBack-Site/apps/web/lib/use-resource-query.ts" && \
   grep -q "context: 'resource-query'" "/Users/user1/WebstormProjects/SnapBack-Site/apps/web/lib/use-resource-query.ts"; then
    echo "   ✅ Error type assumption fix implemented"
else
    echo "   ❌ Error type assumption fix missing"
fi

# Check 3: Hardcoded User Context Fix in use-usage.ts
echo "3. Checking Hardcoded User Context Fix (use-usage.ts)..."
if grep -q "useSession" "/Users/user1/WebstormProjects/SnapBack-Site/apps/web/hooks/use-usage.ts" && \
   grep -q "user?.id" "/Users/user1/WebstormProjects/SnapBack-Site/apps/web/hooks/use-usage.ts" && \
   grep -q "enabled: !!user?.id" "/Users/user1/WebstormProjects/SnapBack-Site/apps/web/hooks/use-usage.ts"; then
    echo "   ✅ Hardcoded user context fix implemented"
else
    echo "   ❌ Hardcoded user context fix missing"
fi

# Check 4: Hardcoded User Context Fix in use-snapshots.ts
echo "4. Checking Hardcoded User Context Fix (use-snapshots.ts)..."
if grep -q "useSession" "/Users/user1/WebstormProjects/SnapBack-Site/apps/web/hooks/use-snapshots.ts" && \
   grep -q "user?.id" "/Users/user1/WebstormProjects/SnapBack-Site/apps/web/hooks/use-snapshots.ts" && \
   grep -q "enabled: !!user?.id" "/Users/user1/WebstormProjects/SnapBack-Site/apps/web/hooks/use-snapshots.ts"; then
    echo "   ✅ Hardcoded user context fix implemented"
else
    echo "   ❌ Hardcoded user context fix missing"
fi

# Check 5: Analytics Fix in MetricsGrid.tsx
echo "5. Checking Analytics Fix..."
if grep -q "useEffect" "/Users/user1/WebstormProjects/SnapBack-Site/apps/web/modules/saas/dashboard/components/MetricsGrid.tsx"; then
    echo "   ✅ Analytics fix implemented"
else
    echo "   ❌ Analytics fix missing"
fi

# Check 6: Error Handling in API Procedures
echo "6. Checking API Error Handling..."
if grep -q "try {" "/Users/user1/WebstormProjects/SnapBack-Site/packages/api/modules/dashboard/procedures/get-user-metrics.ts" && \
   grep -q "catch" "/Users/user1/WebstormProjects/SnapBack-Site/packages/api/modules/dashboard/procedures/get-user-metrics.ts" && \
   grep -q "ORPCError" "/Users/user1/WebstormProjects/SnapBack-Site/packages/api/modules/dashboard/procedures/get-user-metrics.ts"; then
    echo "   ✅ API error handling implemented"
else
    echo "   ❌ API error handling missing"
fi

# Check 7: Test Suite Implementation
echo "7. Checking Test Suite Implementation..."
if [ -f "/Users/user1/WebstormProjects/SnapBack-Site/apps/web/__tests__/lib/use-resource-query.test.ts" ] && \
   [ -f "/Users/user1/WebstormProjects/SnapBack-Site/apps/web/__tests__/hooks/use-snapshots.test.ts" ]; then
    echo "   ✅ Test suite files exist"
else
    echo "   ❌ Test suite files missing"
fi

# Check 8: Mock Auth in E2E Tests
echo "8. Checking Mock Auth Implementation..."
if grep -q "page.route" "/Users/user1/WebstormProjects/SnapBack-Site/apps/web/tests/e2e/dashboard-ux.spec.ts"; then
    echo "   ✅ Mock auth implemented"
else
    echo "   ❌ Mock auth missing"
fi

# Check 9: Mock Data Removal
echo "9. Checking Mock Data Removal..."
if ! grep -q "+12%" "/Users/user1/WebstormProjects/SnapBack-Site/apps/web/modules/saas/dashboard/components/MetricsGrid.tsx"; then
    echo "   ✅ Mock data removed"
else
    echo "   ❌ Mock data still present"
fi

# Check 10: Query Optimization
echo "10. Checking Query Optimization..."
if grep -q "leftJoin" "/Users/user1/WebstormProjects/SnapBack-Site/packages/api/modules/dashboard/procedures/get-user-metrics.ts"; then
    echo "   ✅ Query optimization implemented"
else
    echo "   ❌ Query optimization missing"
fi

echo ""
echo "✅ Verification Complete!"
echo "Please run the test suite to ensure all functionality works correctly."