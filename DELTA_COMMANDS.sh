#!/bin/bash
# Quick Reference: System Delta Implementation Commands
# Created: December 3, 2025
# Purpose: Execute phases in sequence with minimal friction

set -e  # Exit on error

# ============================================================================
# CONFIGURATION
# ============================================================================

WORKSPACE_ROOT="/Users/user1/WebstormProjects/SnapBack-Site"
DB_DIR="${WORKSPACE_ROOT}/packages/platform"
API_DIR="${WORKSPACE_ROOT}/apps/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# PHASE 1: Verify RED Tests Are Created
# ============================================================================

verify_red_tests() {
  echo -e "${BLUE}=== PHASE 1: Verifying RED Tests ===${NC}"
  
  local tests=(
    "${DB_DIR}/test/user-metrics-aggregation.spec.ts"
    "${API_DIR}/modules/lifecycle/tests/lifecycle-state-machine.red.test.ts"
    "${API_DIR}/modules/auth/tests/device-auth-flow.red.test.ts"
  )
  
  for test in "${tests[@]}"; do
    if [ -f "$test" ]; then
      echo -e "${GREEN}✓${NC} Found: $(basename $test)"
    else
      echo -e "${RED}✗${NC} Missing: $test"
      return 1
    fi
  done
  
  echo -e "${GREEN}All RED tests present!${NC}"
}

# ============================================================================
# PHASE 2: Run RED Tests (Should Fail)
# ============================================================================

run_red_tests() {
  echo -e "${BLUE}=== Running RED Tests (Expected to FAIL) ===${NC}"
  
  cd "${WORKSPACE_ROOT}"
  
  # Run just the RED test files
  pnpm vitest run \
    packages/platform/test/user-metrics-aggregation.spec.ts \
    apps/api/modules/lifecycle/tests/lifecycle-state-machine.red.test.ts \
    apps/api/modules/auth/tests/device-auth-flow.red.test.ts \
    --reporter=verbose \
    || echo -e "${YELLOW}RED tests failing as expected${NC}"
}

# ============================================================================
# PHASE 2: Create Schema Files
# ============================================================================

create_schema_files() {
  echo -e "${BLUE}=== PHASE 2: Creating Schema Files ===${NC}"
  
  mkdir -p "${DB_DIR}/src/db/schema/snapback"
  
  echo -e "${YELLOW}Required schema files:${NC}"
  echo "  1. user-daily-metrics.ts"
  echo "  2. user-product-metrics.ts"
  echo "  3. user-lifecycle-state.ts"
  echo "  4. user-analytics-identities.ts"
  echo "  5. protection-decisions.ts"
  echo "  6. nurture-track.ts"
  
  echo -e "${YELLOW}➜ Create these files based on TDD_IMPLEMENTATION_GUIDE.md${NC}"
}

# ============================================================================
# PHASE 2: Generate Migrations
# ============================================================================

generate_migrations() {
  echo -e "${BLUE}=== Generating Drizzle Migrations ===${NC}"
  
  cd "${DB_DIR}"
  
  echo -e "${YELLOW}Running: pnpm run db:generate${NC}"
  pnpm run db:generate
  
  echo -e "${GREEN}Migrations generated!${NC}"
  ls -la "${DB_DIR}/drizzle/migrations/" | tail -10
}

# ============================================================================
# PHASE 3: Implement Services
# ============================================================================

create_services() {
  echo -e "${BLUE}=== PHASE 3: Creating Service Files ===${NC}"
  
  services=(
    "${API_DIR}/modules/analytics/services/MetricsAggregator.ts"
    "${API_DIR}/modules/lifecycle/services/LifecycleEngine.ts"
    "${API_DIR}/modules/auth/services/DeviceAuthHandler.ts"
    "${API_DIR}/modules/auth/services/KeyValidator.ts"
  )
  
  for service in "${services[@]}"; do
    mkdir -p "$(dirname $service)"
    echo -e "${YELLOW}Create: $(basename $service)${NC}"
  done
}

# ============================================================================
# PHASE 4: Wire API Routes
# ============================================================================

wire_routes() {
  echo -e "${BLUE}=== PHASE 4: Wiring API Routes ===${NC}"
  
  echo -e "${YELLOW}Update files:${NC}"
  echo "  1. ${API_DIR}/modules/metrics/router.ts (CREATE)"
  echo "  2. ${API_DIR}/modules/growth/router.ts (CREATE)"
  echo "  3. ${API_DIR}/orpc/router.ts (UPDATE - add routers)"
}

# ============================================================================
# PHASE 5: Event Naming Consistency
# ============================================================================

fix_event_naming() {
  echo -e "${BLUE}=== PHASE 5: Fixing Event Naming ===${NC}"
  
  file="${WORKSPACE_ROOT}/packages/infrastructure/src/metrics/core/events.ts"
  
  if [ -f "$file" ]; then
    echo -e "${YELLOW}Review: ${file}${NC}"
    echo "Search for: 'auth_login_completed', 'welcome_panel_shown', 'auth_flow_started'"
    echo "Replace with: 'auth.flow_completed', 'welcome.panel_shown', 'auth.flow_started'"
  fi
}

# ============================================================================
# PHASE 7: Run All Tests
# ============================================================================

run_all_tests() {
  echo -e "${BLUE}=== PHASE 7: Running All Tests ===${NC}"
  
  cd "${WORKSPACE_ROOT}"
  
  pnpm test:critical-paths
}

# ============================================================================
# PHASE 7: Check Performance
# ============================================================================

check_performance() {
  echo -e "${BLUE}=== Performance Check ===${NC}"
  
  # Query: user_daily_metrics with 100K users should be < 100ms
  # (Will be tested in database tests)
  
  echo -e "${YELLOW}Verify via tests:${NC}"
  echo "  1. user_daily_metrics query time < 100ms"
  echo "  2. Aggregation job < 5 seconds"
  echo "  3. Bundle size increase < 50KB"
}

# ============================================================================
# PHASE 8: Staging Deployment
# ============================================================================

deploy_staging() {
  echo -e "${BLUE}=== PHASE 8: Deploying to Staging ===${NC}"
  
  echo -e "${YELLOW}Pre-deployment checklist:${NC}"
  echo "  [ ] All tests passing"
  echo "  [ ] Code coverage 85%+"
  echo "  [ ] No lint errors"
  echo "  [ ] No TypeScript errors"
  
  echo -e "${YELLOW}Run:${NC}"
  echo "  cd ${WORKSPACE_ROOT}"
  echo "  pnpm build"
  echo "  # Deploy to staging environment"
}

# ============================================================================
# Helper: Show Test Output
# ============================================================================

show_test_output() {
  echo -e "${BLUE}=== Test Output ===${NC}"
  
  if [ -d "${WORKSPACE_ROOT}/test-results" ]; then
    cat "${WORKSPACE_ROOT}/test-results"/*.json 2>/dev/null || echo "No test results yet"
  fi
}

# ============================================================================
# Main Menu
# ============================================================================

show_menu() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║   SnapBack System Delta - Implementation Commands      ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "PHASE 1 (RED Tests - ✅ COMPLETE)"
  echo "  1. verify_red_tests          - Check RED tests exist"
  echo "  2. run_red_tests             - Run tests (should fail)"
  echo ""
  echo "PHASE 2 (Database Schema - 🟡 IN PROGRESS)"
  echo "  3. create_schema_files       - Guide to create schemas"
  echo "  4. generate_migrations       - Generate Drizzle migrations"
  echo ""
  echo "PHASE 3 (Services - 🟡 PENDING)"
  echo "  5. create_services           - Guide to create services"
  echo ""
  echo "PHASE 4 (API Routes - 🟡 PENDING)"
  echo "  6. wire_routes               - Guide to wire routes"
  echo ""
  echo "PHASE 5 (Telemetry - 🟡 PENDING)"
  echo "  7. fix_event_naming          - Fix event naming inconsistency"
  echo ""
  echo "PHASE 7 (QA - 🟡 PENDING)"
  echo "  8. run_all_tests             - Run all tests"
  echo "  9. check_performance         - Check performance targets"
  echo ""
  echo "PHASE 8 (Deploy - 🟡 PENDING)"
  echo "  10. deploy_staging           - Deploy to staging"
  echo ""
  echo "Utilities:"
  echo "  11. show_test_output         - Show test results"
  echo "  12. show_menu                - Show this menu"
  echo ""
}

# ============================================================================
# Main Entry Point
# ============================================================================

main() {
  if [ $# -eq 0 ]; then
    show_menu
    return 0
  fi
  
  case "$1" in
    verify_red_tests)
      verify_red_tests
      ;;
    run_red_tests)
      run_red_tests
      ;;
    create_schema_files)
      create_schema_files
      ;;
    generate_migrations)
      generate_migrations
      ;;
    create_services)
      create_services
      ;;
    wire_routes)
      wire_routes
      ;;
    fix_event_naming)
      fix_event_naming
      ;;
    run_all_tests)
      run_all_tests
      ;;
    check_performance)
      check_performance
      ;;
    deploy_staging)
      deploy_staging
      ;;
    show_test_output)
      show_test_output
      ;;
    show_menu)
      show_menu
      ;;
    *)
      echo -e "${RED}Unknown command: $1${NC}"
      show_menu
      exit 1
      ;;
  esac
}

# Run main with all arguments
main "$@"
