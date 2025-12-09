#!/bin/bash

# TDD Quality Verification Script
# Enforces TDD_AGENT_PROMPT.md compliance
# Reference: /ai_dev_utils/TDD_AGENT_PROMPT.md

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

echo "================================================"
echo "  TDD Quality Compliance Checker"
echo "================================================"
echo ""

# Check 1: Vague Assertions
echo "[1/5] Checking for vague assertions..."
VAGUE_COUNT=$(grep -rn "toBeGreaterThan\|toBeGreaterThanOrEqual\|toBeTruthy\|toBeDefined\|not.toBeNull" \
  apps/*/src/**/*.test.ts \
  packages/*/src/**/*.test.ts \
  2>/dev/null | \
  grep -v "// Expected" | \
  grep -v "mockResolvedValue" | \
  wc -l | tr -d ' ')

if [ "$VAGUE_COUNT" -gt 0 ]; then
    echo -e "${RED}❌ Found $VAGUE_COUNT vague assertions${NC}"
    echo ""
    echo "Violations:"
    grep -rn "toBeGreaterThan\|toBeGreaterThanOrEqual\|toBeTruthy\|toBeDefined\|not.toBeNull" \
      apps/*/src/**/*.test.ts \
      packages/*/src/**/*.test.ts \
      2>/dev/null | \
      grep -v "// Expected" | \
      grep -v "mockResolvedValue" | \
      head -10
    echo ""
    echo "Fix: Replace with specific assertions:"
    echo "  ❌ expect(result).toBeTruthy();"
    echo "  ✅ expect(result).toEqual({ id: '123', name: 'test' });"
    echo ""
    FAILED=1
else
    echo -e "${GREEN}✅ No vague assertions found${NC}"
fi

# Check 2: Direct Date() usage in tests
echo ""
echo "[2/5] Checking for direct Date() usage in tests..."
DATE_COUNT=$(grep -rn "new Date()" \
  apps/*/src/**/*.test.ts \
  packages/*/src/**/*.test.ts \
  2>/dev/null | \
  grep -v "// Expected" | \
  grep -v "mockResolvedValue" | \
  grep -v "toEqual.*new Date" | \
  wc -l | tr -d ' ')

if [ "$DATE_COUNT" -gt 0 ]; then
    echo -e "${RED}❌ Found $DATE_COUNT direct Date() calls in tests${NC}"
    echo ""
    echo "Violations:"
    grep -rn "new Date()" \
      apps/*/src/**/*.test.ts \
      packages/*/src/**/*.test.ts \
      2>/dev/null | \
      grep -v "// Expected" | \
      grep -v "mockResolvedValue" | \
      grep -v "toEqual.*new Date" | \
      head -10
    echo ""
    echo "Fix: Use DeterministicTime for time-based tests:"
    echo "  ❌ const now = new Date();"
    echo "  ✅ const time = new DeterministicTime(toTimestamp('2025-01-01T00:00:00Z'));"
    echo ""
    FAILED=1
else
    echo -e "${GREEN}✅ No direct Date() usage in tests${NC}"
fi

# Check 3: Missing cleanup infrastructure
echo ""
echo "[3/5] Checking for cleanup infrastructure..."
MISSING_CLEANUP=0

for file in $(find apps/*/src packages/*/src -name "*.test.ts" 2>/dev/null); do
  if ! grep -q "TestCleanupManager\|afterEach" "$file" 2>/dev/null; then
    if [ $MISSING_CLEANUP -eq 0 ]; then
      echo -e "${RED}❌ Files missing cleanup infrastructure:${NC}"
    fi
    echo "  - $file"
    MISSING_CLEANUP=$((MISSING_CLEANUP + 1))
  fi
done

if [ $MISSING_CLEANUP -gt 0 ]; then
    echo ""
    echo "Fix: Add cleanup to every test file:"
    echo "  import { TestCleanupManager } from '@snapback/testing';"
    echo "  "
    echo "  let cleanup: TestCleanupManager;"
    echo "  "
    echo "  beforeEach(() => {"
    echo "    cleanup = new TestCleanupManager();"
    echo "  });"
    echo "  "
    echo "  afterEach(async () => {"
    echo "    await cleanup.runAll();"
    echo "  });"
    echo ""
    FAILED=1
else
    echo -e "${GREEN}✅ All test files have cleanup infrastructure${NC}"
fi

# Check 4: Placeholder tests
echo ""
echo "[4/5] Checking for placeholder tests..."
PLACEHOLDER_COUNT=$(grep -rn "expect(true).toBe(true)\|it.todo\|it.skip" \
  apps/*/src/**/*.test.ts \
  packages/*/src/**/*.test.ts \
  2>/dev/null | \
  grep -v "\[GH-" | \
  wc -l | tr -d ' ')

if [ "$PLACEHOLDER_COUNT" -gt 0 ]; then
    echo -e "${RED}❌ Found $PLACEHOLDER_COUNT placeholder tests${NC}"
    echo ""
    echo "Violations:"
    grep -rn "expect(true).toBe(true)\|it.todo\|it.skip" \
      apps/*/src/**/*.test.ts \
      packages/*/src/**/*.test.ts \
      2>/dev/null | \
      grep -v "\[GH-" | \
      head -10
    echo ""
    echo "Fix: Remove placeholder tests or add GitHub issue reference:"
    echo "  ❌ it.skip('should handle timeout', () => { ... });"
    echo "  ✅ it.skip('should handle timeout [GH-1234]', () => { ... });"
    echo ""
    FAILED=1
else
    echo -e "${GREEN}✅ No placeholder tests found${NC}"
fi

# Check 5: Test file naming convention
echo ""
echo "[5/5] Checking test file naming convention..."
INCORRECT_NAMING=0

for file in $(find apps/*/src packages/*/src -name "*.spec.ts" 2>/dev/null); do
  if [ $INCORRECT_NAMING -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Found .spec.ts files (should be .test.ts):${NC}"
  fi
  echo "  - $file"
  INCORRECT_NAMING=$((INCORRECT_NAMING + 1))
done

if [ $INCORRECT_NAMING -gt 0 ]; then
    echo ""
    echo "Fix: Rename .spec.ts to .test.ts for consistency"
    echo ""
else
    echo -e "${GREEN}✅ All test files use .test.ts convention${NC}"
fi

# Summary
echo ""
echo "================================================"
if [ $FAILED -eq 1 ]; then
    echo -e "${RED}❌ TDD compliance checks FAILED${NC}"
    echo ""
    echo "Fix violations and re-run:"
    echo "  bash tools/test-quality-check.sh"
    echo ""
    echo "Reference: /ai_dev_utils/TDD_AGENT_PROMPT.md"
    exit 1
else
    echo -e "${GREEN}✅ All TDD compliance checks PASSED${NC}"
    echo ""
    echo "Quality standards met:"
    echo "  ✅ No vague assertions"
    echo "  ✅ No direct Date() usage in tests"
    echo "  ✅ All files have cleanup infrastructure"
    echo "  ✅ No placeholder tests"
    if [ $INCORRECT_NAMING -gt 0 ]; then
        echo -e "  ${YELLOW}⚠️  $INCORRECT_NAMING files use .spec.ts (consider renaming)${NC}"
    else
        echo "  ✅ Consistent .test.ts naming"
    fi
    echo ""
    echo "Ready for code review! 🎉"
    exit 0
fi
