#!/bin/bash

# Validate config refactor state files
# Usage: ./ai_dev_utils/scripts/validate-state.sh

set -e

STATE_DIR="ai_dev_utils/state/config-refactor"
ERRORS=0

echo "🔍 Validating state files..."
echo ""

# 1. Check state files exist
echo "📁 Checking file existence..."
for file in discovery-state.json migration-state.json cleanup-queue.json; do
  if [ ! -f "$STATE_DIR/$file" ]; then
    echo "❌ Missing state file: $file"
    ERRORS=$((ERRORS + 1))
  else
    echo "✅ Found: $file"
  fi
done
echo ""

# 2. Check valid JSON
echo "🔍 Validating JSON syntax..."
for file in discovery-state.json migration-state.json cleanup-queue.json; do
  if [ -f "$STATE_DIR/$file" ]; then
    if jq empty "$STATE_DIR/$file" 2>/dev/null; then
      echo "✅ Valid JSON: $file"
    else
      echo "❌ Invalid JSON: $file"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done
echo ""

# 3. Check test coverage (if available)
if [ -f "coverage/coverage-summary.json" ]; then
  echo "📊 Checking test coverage..."
  COVERAGE=$(jq '.total.statements.pct' coverage/coverage-summary.json 2>/dev/null || echo "0")

  if [ "$(echo "$COVERAGE < 95" | bc 2>/dev/null || echo "1")" -eq 1 ]; then
    echo "⚠️  Test coverage: ${COVERAGE}% (target: 95%+)"
  else
    echo "✅ Test coverage: ${COVERAGE}%"
  fi
  echo ""
fi

# 4. Check schema files exist
echo "📋 Checking schema files..."
for file in discovery-state.schema.json migration-state.schema.json cleanup-queue.schema.json; do
  if [ ! -f "$STATE_DIR/$file" ]; then
    echo "⚠️  Missing schema file: $file"
  else
    echo "✅ Found: $file"
  fi
done
echo ""

# 5. Run full validation if Node.js available
if command -v node &> /dev/null; then
  echo "🔧 Running full schema validation..."
  if node ai_dev_utils/scripts/validate-refactor-state.mjs; then
    echo "✅ Schema validation passed"
  else
    echo "❌ Schema validation failed"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "⚠️  Node.js not available, skipping schema validation"
  echo "   Install Node.js to enable full validation"
fi
echo ""

# Exit with appropriate code
if [ $ERRORS -gt 0 ]; then
  echo "❌ State validation failed with $ERRORS error(s)"
  echo ""
  exit 1
else
  echo "✅ State validation passed"
  echo ""
  exit 0
fi
