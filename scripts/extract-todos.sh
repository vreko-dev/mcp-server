#!/bin/bash
# Extract all TODO/FIXME markers and create GitHub issues

OUTPUT="TODO_REPORT.md"

echo "# TODO Report - $(date +%Y-%m-%d)" > "$OUTPUT"
echo "" >> "$OUTPUT"
echo "Total TODOs found: $(grep -r "TODO\|FIXME\|HACK" apps/ packages/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)" >> "$OUTPUT"
echo "" >> "$OUTPUT"

echo "## By Priority" >> "$OUTPUT"
echo "" >> "$OUTPUT"

echo "### 🔴 Critical (Blocking Production)" >> "$OUTPUT"
grep -rn "TODO.*CRITICAL\|FIXME.*CRITICAL\|TODO.*BLOCKER" apps/ packages/ --include="*.ts" --include="*.tsx" 2>/dev/null | \
  sed 's/:/ /g' | \
  awk '{print "- [ ] `"$1":"$2"` - "substr($0, index($0,$4))}' >> "$OUTPUT"
echo "" >> "$OUTPUT"

echo "### 🟡 High (Should Fix)" >> "$OUTPUT"
grep -rn "TODO\|FIXME" apps/ packages/ --include="*.ts" --include="*.tsx" 2>/dev/null | \
  grep -v "CRITICAL\|BLOCKER" | \
  head -20 | \
  sed 's/:/ /g' | \
  awk '{print "- [ ] `"$1":"$2"` - "substr($0, index($0,$4))}' >> "$OUTPUT"
echo "" >> "$OUTPUT"

echo "## By Package" >> "$OUTPUT"
echo "" >> "$OUTPUT"

for dir in apps/* packages/*; do
  if [ -d "$dir/src" ]; then
    count=$(grep -r "TODO\|FIXME\|HACK" "$dir" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$count" -gt 0 ]; then
      echo "### $(basename $dir) ($count TODOs)" >> "$OUTPUT"
      grep -rn "TODO\|FIXME\|HACK" "$dir" --include="*.ts" --include="*.tsx" 2>/dev/null | \
        head -5 | \
        sed 's/:/ /g' | \
        awk '{print "- [ ] `"$1":"$2"` - "substr($0, index($0,$4))}' >> "$OUTPUT"
      echo "" >> "$OUTPUT"
    fi
  fi
done

echo "✅ TODO report generated: $OUTPUT"
echo ""
echo "Found $(grep -r "TODO\|FIXME\|HACK" apps/ packages/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ') total TODOs"
echo ""
echo "Next steps:"
echo "1. Review $OUTPUT"
echo "2. Create GitHub issues for critical TODOs"
echo "3. Link TODOs to issue numbers in code"
