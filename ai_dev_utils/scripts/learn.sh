#!/bin/bash
# learn.sh - Record learnings to the self-learning system
# Usage: ./learn.sh <type> <trigger> <action> <source>
#
# Types:
#   pattern   - Reusable code pattern discovered
#   pitfall   - Common mistake to avoid
#   efficiency - Better way to do something
#   discovery - Useful finding about the codebase
#   incident  - Post-mortem learning
#   stale_doc - Documentation that was outdated
#
# Example:
#   ./learn.sh "pattern" "inline db query" "use service layer instead" "task-4-1"

set -e

LEARNINGS_FILE="$(dirname "$0")/../feedback/learnings.jsonl"

if [ $# -lt 4 ]; then
  echo "Usage: $0 <type> <trigger> <action> <source>"
  echo ""
  echo "Types: pattern, pitfall, efficiency, discovery, incident, stale_doc"
  echo ""
  echo "Example:"
  echo "  $0 \"pattern\" \"inline db query\" \"use service layer\" \"task-4-1\""
  exit 1
fi

TYPE="$1"
TRIGGER="$2"
ACTION="$3"
SOURCE="$4"
ID="L$(date +%s)"
DATE=$(date -I)

# Validate type
case "$TYPE" in
  pattern|pitfall|efficiency|discovery|incident|stale_doc)
    ;;
  *)
    echo "Error: Invalid type '$TYPE'"
    echo "Valid types: pattern, pitfall, efficiency, discovery, incident, stale_doc"
    exit 1
    ;;
esac

# Escape quotes in strings for JSON
TRIGGER_ESC=$(echo "$TRIGGER" | sed 's/"/\\"/g')
ACTION_ESC=$(echo "$ACTION" | sed 's/"/\\"/g')
SOURCE_ESC=$(echo "$SOURCE" | sed 's/"/\\"/g')

# Append to learnings file
echo "{\"id\":\"$ID\",\"type\":\"$TYPE\",\"trigger\":\"$TRIGGER_ESC\",\"action\":\"$ACTION_ESC\",\"learned_from\":\"$SOURCE_ESC\",\"added\":\"$DATE\"}" >> "$LEARNINGS_FILE"

echo "✅ Learning recorded: $ID"
echo "   Type: $TYPE"
echo "   Trigger: $TRIGGER"
echo "   Action: $ACTION"
echo "   Source: $SOURCE"
