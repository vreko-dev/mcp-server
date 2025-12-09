#!/bin/bash

# TDD Workflow Starter
# Usage: ./ai_dev_utils/scripts/tdd-start.sh "Task description"

TASK="$1"
STATE_FILE="ai_dev_utils/state/current-task.json"

if [ -z "$TASK" ]; then
  echo "Usage: ./tdd-start.sh \"Task description\""
  exit 1
fi

# Initialize state
cat > "$STATE_FILE" << EOF
{
  "task": "$TASK",
  "phase": "AUDIT",
  "startedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "completedPhases": [],
  "violations": [],
  "evidence": {}
}
EOF

echo "📋 TDD Task Started"
echo "==================="
echo "Task: $TASK"
echo "Phase: AUDIT"
echo ""
echo "Next steps:"
echo "1. Load @TDD_CORE.md"
echo "2. Load @phases/0-architecture-audit.md"
echo "3. Complete audit checklist"
echo "4. Run: ./ai_dev_utils/scripts/tdd-gate.sh audit"
