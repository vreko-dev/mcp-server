#!/usr/bin/env bash
#
# Session Layer Audit Script
#
# This script validates privacy guarantees, recovery wiring, and test coverage
# for the SnapBack Alpha session layer.
#
# USAGE:
#   bash scripts/audit-session-layer.sh
#
# CI INTEGRATION:
#   Add to .github/workflows/*.yml:
#   - name: Audit Session Layer
#     run: bash scripts/audit-session-layer.sh
#
# EXIT CODES:
#   0 = All checks passed
#   1 = One or more checks failed
#

set -e

WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAILED=0

echo "🔍 Session Layer Audit"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# CHECK 1: Privacy - No forbidden analytics fields
# ============================================================================
echo "📋 CHECK 1: Privacy - Forbidden Analytics Fields"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FORBIDDEN_PATTERNS=(
  "workspaceId[^a-zA-Z]"
  "workspacePath[^a-zA-Z]"
  "workspaceUri.*analytics"
  "workspaceHash"
  "filePath.*analytics"
  "fileName.*analytics"
  "token_counts"
  "sessionLabel.*analytics"
)

PRIVACY_VIOLATIONS=0

# Scan session and analytics code
for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  echo "  Checking for: $pattern"
  
  # Search in session and analytics code (exclude tests, node_modules, and comments)
  matches=$(grep -rn -E "$pattern" \
    packages/sdk/src/session \
    packages/contracts/src/analytics.ts \
    packages/contracts/src/session.ts \
    2>/dev/null | grep -v "node_modules" | grep -v ".spec.ts" | grep -v ".test.ts" | grep -v "^[^:]*:[^:]*: *[/*]" | grep -v "^[^:]*:[^:]*: *\*" || true)
  
  if [ -n "$matches" ]; then
    echo "  ❌ VIOLATION: Found '$pattern'"
    echo "$matches" | sed 's/^/     /'
    PRIVACY_VIOLATIONS=$((PRIVACY_VIOLATIONS + 1))
  fi
done

if [ $PRIVACY_VIOLATIONS -eq 0 ]; then
  echo "  ✅ No forbidden analytics fields found"
else
  echo "  ❌ FAILED: $PRIVACY_VIOLATIONS privacy violations detected"
  FAILED=1
fi

echo ""

# ============================================================================
# CHECK 2: Recovery - SessionRecovery.recoverAll() is called
# ============================================================================
echo "📋 CHECK 2: Recovery - Crash Recovery Wiring"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

recovery_calls=$(grep -rn "recovery\.recoverAll\|SessionRecovery.*recover" \
  packages/sdk/src \
  2>/dev/null | grep -v "node_modules" | grep -v ".spec.ts" | grep -v ".test.ts" || true)

if [ -z "$recovery_calls" ]; then
  echo "  ❌ FAILED: No calls to SessionRecovery.recoverAll() found"
  echo "  Recovery must be called on SessionManager initialization"
  FAILED=1
else
  echo "  ✅ Recovery is wired:"
  echo "$recovery_calls" | sed 's/^/     /'
fi

echo ""

# ============================================================================
# CHECK 3: Tests - SessionRollback and SessionRecovery test coverage
# ============================================================================
echo "📋 CHECK 3: Test Coverage - SessionRollback & SessionRecovery"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Look for test files
rollback_tests=$(find packages/sdk -name "*.spec.ts" -o -name "*.test.ts" | \
  xargs grep -l "SessionRollback" 2>/dev/null || true)

recovery_tests=$(find packages/sdk -name "*.spec.ts" -o -name "*.test.ts" | \
  xargs grep -l "SessionRecovery" 2>/dev/null || true)

TEST_FAILURES=0

if [ -z "$rollback_tests" ]; then
  echo "  ❌ FAILED: No SessionRollback tests found"
  TEST_FAILURES=$((TEST_FAILURES + 1))
else
  echo "  ✅ SessionRollback tests found:"
  echo "$rollback_tests" | sed 's/^/     /'
fi

if [ -z "$recovery_tests" ]; then
  echo "  ❌ FAILED: No SessionRecovery tests found"
  TEST_FAILURES=$((TEST_FAILURES + 1))
else
  echo "  ✅ SessionRecovery tests found:"
  echo "$recovery_tests" | sed 's/^/     /'
fi

if [ $TEST_FAILURES -gt 0 ]; then
  FAILED=1
fi

echo ""

# ============================================================================
# CHECK 4: Analytics Factory - Only safe factories used
# ============================================================================
echo "📋 CHECK 4: Analytics - Safe Factory Usage"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check that sessionAnalytics.ts exists
if [ ! -f "packages/sdk/src/session/sessionAnalytics.ts" ]; then
  echo "  ❌ FAILED: sessionAnalytics.ts not found"
  FAILED=1
else
  echo "  ✅ sessionAnalytics.ts exists"
  
  # Check for direct analytics construction (anti-pattern)
  direct_analytics=$(grep -rn "SESSION_STARTED\|SESSION_FINALIZED" \
    packages/sdk/src/session/SessionManager.ts \
    2>/dev/null | grep -v "makeSafe" | grep -v "import" | grep -v "^[^:]*:[^:]*: *[/*]" | grep -v "^[^:]*:[^:]*: *\*" || true)
  
  if [ -n "$direct_analytics" ]; then
    echo "  ⚠️  WARNING: Possible direct analytics construction (should use factories):"
    echo "$direct_analytics" | sed 's/^/     /'
  else
    echo "  ✅ All analytics events use safe factories"
  fi
fi

echo ""

# ============================================================================
# Summary
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FAILED -eq 0 ]; then
  echo "✅ ALL CHECKS PASSED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
else
  echo "❌ AUDIT FAILED - Fix issues above before merging"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi
