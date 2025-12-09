#!/bin/bash

# TDD Violation Reporter
# Records violations and updates learned patterns

echo "📝 Recording TDD Violation"
echo "=========================="
echo ""

# Check if violation template was filled
TEMPLATE_FILE="ai_dev_utils/feedback/violation-template.md"

if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "❌ Violation template not found"
  echo "Please complete @feedback/violation-template.md first"
  exit 1
fi

# Generate report filename
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="ai_dev_utils/feedback/reports/violation-$TIMESTAMP.md"

# Copy template to reports
cp "$TEMPLATE_FILE" "$REPORT_FILE"

echo "✅ Violation recorded: $REPORT_FILE"
echo ""

# Append to violations log
STATE_FILE="ai_dev_utils/state/current-task.json"
if [ -f "$STATE_FILE" ]; then
  CURRENT_PHASE=$(jq -r '.phase' "$STATE_FILE")
  
  # Update state with violation count
  jq ".violations += [{
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"phase\": \"$CURRENT_PHASE\",
    \"report\": \"$REPORT_FILE\"
  }]" "$STATE_FILE" > tmp.json && mv tmp.json "$STATE_FILE"
  
  echo "📊 Violation added to state file"
fi

echo ""
echo "Next steps:"
echo "1. Review the violation report: $REPORT_FILE"
echo "2. Fix the violation"
echo "3. Re-run the gate: ./ai_dev_utils/scripts/tdd-gate.sh [phase]"
echo "4. If proposing pattern update, manually edit ai_dev_utils/patterns/codebase-patterns.md"
