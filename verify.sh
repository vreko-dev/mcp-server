#!/bin/bash
echo "=== VERIFICATION AUDIT ==="
echo ""
echo "1. Checkpoint References:"
CHECKPOINT_COUNT=$(grep -ri "checkpoint" apps/vscode/src/ --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
echo "   Count: $CHECKPOINT_COUNT"
if [ "$CHECKPOINT_COUNT" -eq 0 ]; then
    echo "   Status: ✅ CLEAN"
else
    echo "   Status: ❌ CONTAMINATED"
    echo "   Top 5 files:"
    grep -ri "checkpoint" apps/vscode/src/ --include="*.ts" | cut -d: -f1 | sort | uniq -c | sort -rn | head -5
fi

echo ""
echo "2. Package.json Checkpoints:"
PKG_COUNT=$(grep -i "checkpoint" apps/vscode/package.json 2>/dev/null | wc -l | tr -d ' ')
echo "   Count: $PKG_COUNT"
if [ "$PKG_COUNT" -eq 0 ]; then
    echo "   Status: ✅ CLEAN"
else
    echo "   Status: ❌ FOUND"
fi

echo ""
echo "3. Lowercase Protection Levels:"
LOWER_COUNT=$(grep -r "'watch'\|'warn'\|'block'" apps/vscode/src/ --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
echo "   Count: $LOWER_COUNT"
if [ "$LOWER_COUNT" -eq 0 ]; then
    echo "   Status: ✅ ALL CAPITALIZED"
else
    echo "   Status: ❌ FOUND LOWERCASE"
    echo "   Sample matches:"
    grep -r "'watch'\|'warn'\|'block'" apps/vscode/src/ --include="*.ts" | head -5
fi

echo ""
echo "4. Capitalized Protection Levels:"
UPPER_COUNT=$(grep -r "'Watched'\|'Warning'\|'Protected'" apps/vscode/src/ --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
echo "   Count: $UPPER_COUNT"
if [ "$UPPER_COUNT" -gt 0 ]; then
    echo "   Status: ✅ FOUND"
else
    echo "   Status: ❌ NONE FOUND"
fi

echo ""
echo "5. TypeScript Compilation:"
ERRORS=$(npx tsc --noEmit --project apps/vscode/tsconfig.json 2>&1 | grep -E "error|Error" | wc -l | tr -d ' ')
echo "   Errors: $ERRORS"
if [ "$ERRORS" -eq 0 ]; then
    echo "   Status: ✅ NO ERRORS"
else
    echo "   Status: ❌ HAS ERRORS"
fi