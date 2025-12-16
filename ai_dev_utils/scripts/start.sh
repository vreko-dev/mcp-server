#!/bin/bash
# start.sh - Start a new task and initialize state
# Usage: ./start.sh "Task description"

set -e

STATE_FILE="$(dirname "$0")/../state/current-task.json"

if [ $# -lt 1 ]; then
  echo "Usage: $0 \"Task description\""
  exit 1
fi

TASK="$1"
TIMESTAMP=$(date -Iseconds)

# Create/update state file
cat > "$STATE_FILE" << EOF
{
  "task": "$TASK",
  "taskType": "PENDING_CLASSIFICATION",
  "phase": "NOT_STARTED",
  "startedAt": "$TIMESTAMP",
  "completedPhases": [],
  "violations": [],
  "evidence": {}
}
EOF

echo "✅ Task initialized"
echo "   Task: $TASK"
echo "   State: $STATE_FILE"
echo ""
echo "Next step: Load @ROUTER.md and say:"
echo "   \"Route: $TASK\""
