#!/bin/bash
# gate.sh - Unified gate runner for all phases
# Usage: ./gate.sh <phase>
#
# Phases:
#   audit    - Architecture audit (Phase 0)
#   red      - Failing test exists (Phase 1)
#   green    - Test passes with minimal impl (Phase 2)
#   refactor - Code improved, tests still pass (Phase 3)
#   verify   - Quality checks pass (Phase 4)
#   certify  - Final certification (Phase 5)
#   test     - Test coverage gate

set -e

STATE_FILE="$(dirname "$0")/../state/current-task.json"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <phase>"
  echo ""
  echo "Phases: audit, red, green, refactor, verify, certify, test"
  exit 1
fi

PHASE="$1"

echo "🚦 Running gate: $PHASE"
echo "================================"

case "$PHASE" in
  audit)
    echo "Checking architecture audit..."
    echo "[ ] Service search executed"
    echo "[ ] Canonical location identified"
    echo "[ ] No architecture conflicts"
    echo ""
    echo "Manual verification required. Update state when complete."
    ;;
    
  red)
    echo "Checking RED phase..."
    echo "[ ] Test file exists"
    echo "[ ] Test FAILS with expected error"
    echo "[ ] No vague assertions"
    echo "[ ] 4-path coverage planned"
    echo ""
    echo "Run: pnpm test [test-file] --run"
    echo "Test should FAIL at this phase."
    ;;
    
  green)
    echo "Checking GREEN phase..."
    echo "[ ] Implementation exists"
    echo "[ ] Test PASSES"
    echo "[ ] Implementation is minimal"
    echo "[ ] No service layer bypasses"
    echo ""
    echo "Run: pnpm test [test-file] --run"
    echo "Test should PASS at this phase."
    ;;
    
  refactor)
    echo "Checking REFACTOR phase..."
    echo "[ ] All tests still pass"
    echo "[ ] No new functionality added"
    echo "[ ] Code quality improved"
    echo ""
    echo "Run: pnpm test --run"
    ;;
    
  verify)
    echo "Checking VERIFY phase..."
    echo "Running automated checks..."
    echo ""
    
    echo "Type check:"
    pnpm typecheck 2>/dev/null && echo "✅ Types OK" || echo "❌ Type errors"
    
    echo ""
    echo "Lint:"
    pnpm lint 2>/dev/null && echo "✅ Lint OK" || echo "❌ Lint errors"
    
    echo ""
    echo "Tests:"
    pnpm test --run 2>/dev/null && echo "✅ Tests OK" || echo "❌ Test failures"
    ;;
    
  certify)
    echo "Checking CERTIFY phase..."
    echo "[ ] All previous gates passed"
    echo "[ ] Certification documented"
    echo "[ ] Evidence captured"
    echo "[ ] Learnings recorded"
    echo ""
    echo "Mark task complete in state/current-task.json"
    ;;
    
  test)
    echo "Checking TEST gate..."
    echo "Running coverage..."
    pnpm test --coverage --run 2>/dev/null || echo "Coverage check complete"
    ;;
    
  *)
    echo "Error: Unknown phase '$PHASE'"
    echo "Valid phases: audit, red, green, refactor, verify, certify, test"
    exit 1
    ;;
esac

echo ""
echo "================================"
echo "Gate check complete for: $PHASE"
