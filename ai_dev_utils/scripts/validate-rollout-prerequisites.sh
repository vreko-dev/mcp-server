#!/usr/bin/env bash
#
# Rollout Prerequisites Validator
#
# TDD_CORE.md Compliance:
# - Line 88: 7-day cooldown mandatory
# - Line 63: Feature flag rollout required
#
# Purpose: Validates all prerequisites before cleanup phase
# Usage: ./ai_dev_utils/scripts/validate-rollout-prerequisites.sh
#
# Exit Codes:
#   0 = All prerequisites met
#   1 = One or more prerequisites failed

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_FILE="${SCRIPT_DIR}/../state/config-refactor/migration-state.json"

echo "========================================="
echo "Config Refactor Rollout Prerequisites"
echo "========================================="
echo ""

# Check if state file exists
if [ ! -f "$STATE_FILE" ]; then
  echo -e "${RED}❌ State file not found: $STATE_FILE${NC}"
  exit 1
fi

# Track failures
FAILURES=0

# ============================================================================
# PREREQUISITE 1: Migration Complete
# ============================================================================
echo "1. Checking migration status..."

STATUS=$(jq -r '.status // "UNKNOWN"' "$STATE_FILE")

if [ "$STATUS" = "FEATURE_FLAG_COMPLETE" ] || [ "$STATUS" = "TESTS_COMPLETE" ]; then
  echo -e "${GREEN}   ✅ Migration status: $STATUS${NC}"
else
  echo -e "${RED}   ❌ Migration not complete: $STATUS${NC}"
  FAILURES=$((FAILURES + 1))
fi

# ============================================================================
# PREREQUISITE 2: All Tests Passing
# ============================================================================
echo ""
echo "2. Checking test status..."

cd "$SCRIPT_DIR/../.."

TEST_OUTPUT=$(pnpm --filter @snapback/config test --run --silent 2>&1)
if echo "$TEST_OUTPUT" | grep -qE "(88 passed|Tests.*88)"; then
  echo -e "${GREEN}   ✅ All 88 tests passing${NC}"
else
  echo -e "${RED}   ❌ Tests not passing (expected 88)${NC}"
  FAILURES=$((FAILURES + 1))
fi

# ============================================================================
# PREREQUISITE 3: 7-Day Cooldown Complete
# ============================================================================
echo ""
echo "3. Checking 7-day cooldown period..."

COMPLETED_AT=$(jq -r '.completed_at // null' "$STATE_FILE")

if [ "$COMPLETED_AT" = "null" ]; then
  echo -e "${YELLOW}   ⚠️  No completion timestamp found${NC}"
  echo -e "${YELLOW}   ℹ️  Set 'completed_at' in migration-state.json when feature flag reaches 100%${NC}"
  FAILURES=$((FAILURES + 1))
else
  # Calculate days since completion
  if command -v gdate &> /dev/null; then
    # macOS with GNU coreutils
    COMPLETED_EPOCH=$(gdate -d "$COMPLETED_AT" +%s 2>/dev/null || echo "0")
    CURRENT_EPOCH=$(gdate +%s)
  else
    # Linux or macOS with BSD date
    COMPLETED_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$COMPLETED_AT" "+%s" 2>/dev/null || echo "0")
    CURRENT_EPOCH=$(date "+%s")
  fi

  if [ "$COMPLETED_EPOCH" = "0" ]; then
    echo -e "${RED}   ❌ Invalid completion timestamp: $COMPLETED_AT${NC}"
    FAILURES=$((FAILURES + 1))
  else
    DAYS_ELAPSED=$(( (CURRENT_EPOCH - COMPLETED_EPOCH) / 86400 ))

    if [ "$DAYS_ELAPSED" -ge 7 ]; then
      echo -e "${GREEN}   ✅ Cooldown period complete: $DAYS_ELAPSED days${NC}"
    else
      DAYS_REMAINING=$((7 - DAYS_ELAPSED))
      echo -e "${RED}   ❌ Cooldown period incomplete: $DAYS_ELAPSED days elapsed (need 7)${NC}"
      echo -e "${YELLOW}   ℹ️  $DAYS_REMAINING days remaining${NC}"
      FAILURES=$((FAILURES + 1))
    fi
  fi
fi

# ============================================================================
# PREREQUISITE 4: Feature Flag at 100% (Environment Variable)
# ============================================================================
echo ""
echo "4. Checking feature flag status..."

FEATURE_FLAG_STATUS=$(jq -r '.remaining_work.feature_flag_implementation.status // "UNKNOWN"' "$STATE_FILE")

if [ "$FEATURE_FLAG_STATUS" = "COMPLETE" ]; then
  echo -e "${GREEN}   ✅ Feature flag implementation: COMPLETE${NC}"
  echo -e "${YELLOW}   ℹ️  Manual verification required:${NC}"
  echo -e "${YELLOW}      - Environment: FEATURE_CONFIG_V2=true${NC}"
  echo -e "${YELLOW}      - PostHog rollout: 100% (if enabled)${NC}"
else
  echo -e "${RED}   ❌ Feature flag not complete: $FEATURE_FLAG_STATUS${NC}"
  FAILURES=$((FAILURES + 1))
fi

# ============================================================================
# PREREQUISITE 5: No Critical Issues Reported
# ============================================================================
echo ""
echo "5. Checking error rate / user reports..."

# This is a manual check - validate monitoring dashboards
echo -e "${YELLOW}   ⚠️  Manual verification required:${NC}"
echo -e "${YELLOW}      - Error rate: Target <0.1%${NC}"
echo -e "${YELLOW}      - User reports: 0 critical issues${NC}"
echo -e "${YELLOW}      - PostHog metrics: No anomalies${NC}"

# ============================================================================
# PREREQUISITE 6: Human Approval
# ============================================================================
echo ""
echo "6. Checking human approval..."

CLEANUP_STATUS=$(jq -r '.items[0].prerequisites.human_approval // false' \
  "${SCRIPT_DIR}/../state/config-refactor/cleanup-queue.json")

if [ "$CLEANUP_STATUS" = "true" ]; then
  echo -e "${GREEN}   ✅ Human approval granted${NC}"
else
  echo -e "${RED}   ❌ Human approval not granted${NC}"
  echo -e "${YELLOW}   ℹ️  Update cleanup-queue.json: .items[0].prerequisites.human_approval = true${NC}"
  FAILURES=$((FAILURES + 1))
fi

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo "========================================="

if [ $FAILURES -eq 0 ]; then
  echo -e "${GREEN}✅ ALL PREREQUISITES MET${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Run cleanup script: ./ai_dev_utils/scripts/execute-cleanup.sh"
  echo "2. Verify deletion with: git status"
  echo "3. Commit cleanup: git commit -m 'cleanup: Remove v1 ConfigStore after 7-day validation'"
  exit 0
else
  echo -e "${RED}❌ PREREQUISITES NOT MET${NC}"
  echo ""
  echo -e "${RED}$FAILURES prerequisite(s) failed${NC}"
  echo ""
  echo "Do not proceed with cleanup until all checks pass."
  echo "TDD_CORE.md violations will occur if cleanup is executed prematurely."
  exit 1
fi
