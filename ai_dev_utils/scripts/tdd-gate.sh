#!/bin/bash

# TDD Gate Runner
# Usage: ./ai_dev_utils/scripts/tdd-gate.sh <phase>

PHASE="$1"

if [ -z "$PHASE" ]; then
  echo "Usage: ./tdd-gate.sh <phase>"
  echo "Phases: audit, red, green, refactor, quality, certify"
  exit 1
fi

# Run the TypeScript gate runner
npx ts-node ai_dev_utils/gates/gate-runner.ts "$PHASE"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  # Update state to next phase
  NEXT_PHASE=""
  case "$PHASE" in
    audit) NEXT_PHASE="RED" ;;
    red) NEXT_PHASE="GREEN" ;;
    green) NEXT_PHASE="REFACTOR" ;;
    refactor) NEXT_PHASE="VERIFY" ;;
    quality) NEXT_PHASE="CERTIFY" ;;
    certify) NEXT_PHASE="DONE" ;;
  esac

  if [ -n "$NEXT_PHASE" ]; then
    # Update state file
    jq ".phase = \"$NEXT_PHASE\" | .completedPhases += [\"$PHASE\"]" \
      ai_dev_utils/state/current-task.json > tmp.json && \
      mv tmp.json ai_dev_utils/state/current-task.json

    echo "State updated. Next phase: $NEXT_PHASE"
  fi
fi

exit $EXIT_CODE
