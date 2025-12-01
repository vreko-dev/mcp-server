#!/usr/bin/env bash
# Quick Demo Readiness Check
# Run this RIGHT NOW to see if you're demo-ready

set -e

echo "=========================================="
echo "  SnapBack Demo Readiness Check"
echo "=========================================="
echo ""

BLOCKERS=0
WARNINGS=0

# Check 1: TypeScript errors
echo "1. Checking TypeScript..."
TS_ERRORS=$(pnpm type-check 2>&1 | grep "error TS" | wc -l || echo 0)
if [ "$TS_ERRORS" -eq 0 ]; then
    echo "   ✅ TypeScript: CLEAN"
else
    echo "   ❌ TypeScript: $TS_ERRORS errors"
    echo "      Fix: See demo-ready-priority-plan.md Issue 2"
    BLOCKERS=$((BLOCKERS + 1))
fi

# Check 2: Can extension compile?
echo ""
echo "2. Compiling extension..."
cd apps/vscode
if pnpm compile:skip-check > /tmp/build.log 2>&1; then
    echo "   ✅ Extension compiles successfully"
else
    echo "   ❌ Extension compilation failed"
    echo "      Check: /tmp/build.log"
    BLOCKERS=$((BLOCKERS + 1))
fi
cd ../..

# Check 3: Does SDK block extension?
echo ""
echo "3. Checking SDK dependency..."
SDK_USAGE=$(grep -r "StorageBroker\|LocalStorage" apps/vscode/src --include="*.ts" | wc -l || echo 0)
if [ "$SDK_USAGE" -eq 0 ]; then
    echo "   ✅ Extension doesn't use failing SDK modules"
    echo "      → Skip SDK test fixes!"
else
    echo "   ⚠️  Extension uses SDK modules ($SDK_USAGE references)"
    echo "      → Must fix SDK tests (4 hours)"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 4: Do E2E tests exist?
echo ""
echo "4. Checking E2E tests..."
E2E_TESTS=$(find apps/vscode/test/e2e -name "*demo*.test.ts" -o -name "*activation*.test.ts" | wc -l)
if [ "$E2E_TESTS" -ge 3 ]; then
    echo "   ✅ Found $E2E_TESTS demo-critical E2E tests"
else
    echo "   ⚠️  Only found $E2E_TESTS E2E tests"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 5: Critical scripts exist?
echo ""
echo "5. Checking critical scripts..."
MISSING_SCRIPTS=0
for script in test-vsix.sh launch-demo-vscode.sh pre-demo.sh; do
    if [ ! -f "scripts/$script" ]; then
        echo "   ❌ Missing: scripts/$script"
        MISSING_SCRIPTS=$((MISSING_SCRIPTS + 1))
    fi
done

if [ $MISSING_SCRIPTS -eq 0 ]; then
    echo "   ✅ All critical scripts exist"
else
    echo "   ⚠️  Missing $MISSING_SCRIPTS critical scripts"
    echo "      → Create minimal versions (2 hours)"
    WARNINGS=$((WARNINGS + 1))
fi

# Summary
echo ""
echo "=========================================="
echo "  RESULTS"
echo "=========================================="
echo ""
echo "Critical Blockers: $BLOCKERS"
echo "Warnings: $WARNINGS"
echo ""

if [ $BLOCKERS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "🎉 YOU'RE DEMO READY!"
    echo ""
    echo "Next steps:"
    echo "1. Run manual smoke test (30 min)"
    echo "2. Practice demo (1 hour)"
    echo "3. You're good to go!"
    exit 0
elif [ $BLOCKERS -eq 0 ]; then
    echo "⚠️  MOSTLY READY - Address warnings for confidence"
    echo ""
    echo "Critical path: $WARNINGS issues"
    echo "Estimated time: 2-4 hours"
    echo ""
    echo "You can demo NOW if needed, but fix warnings for polish"
    exit 1
else
    echo "❌ NOT DEMO READY - Fix blockers first"
    echo ""
    echo "Critical blockers: $BLOCKERS"
    echo "Estimated time: 1-4 hours depending on SDK usage"
    echo ""
    echo "Priority order:"
    echo "1. Fix TypeScript errors (15 min)"
    echo "2. Fix build failures (variable)"
    echo "3. Fix SDK if needed (4 hours)"
    exit 2
fi
