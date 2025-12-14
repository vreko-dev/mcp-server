#!/bin/bash
# Script Usage Frequency Audit
# Part of Phase 0: Pre-Demo Freeze
# Purpose: Identify unused scripts and their last modification dates

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="$PROJECT_ROOT/.qoder/quests/audit"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Script Usage Frequency Audit${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

OUTPUT_FILE="$OUTPUT_DIR/script-usage-frequency-$(date +%Y%m%d).md"

# Initialize output file
cat > "$OUTPUT_FILE" << 'EOF'
# Script Usage Frequency Audit

**Generated:** $(date +"%Y-%m-%d %H:%M:%S")  
**Purpose:** Identify unused/stale scripts for Phase 1 consolidation

---

## Methodology

1. Check git history for last modification date
2. Check invocations in CI workflows (.github/workflows/*.yml)
3. Check invocations in package.json scripts
4. Check cross-script dependencies
5. Categorize by usage frequency

---

## Results

EOF

# Function to check last git modification
get_last_modified() {
    local file=$1
    git log -1 --format="%cd|%cr|%h" --date=short "$file" 2>/dev/null || echo "never|never|none"
}

# Function to check if script is in CI
check_ci_usage() {
    local script_name=$1
    if grep -r "$script_name" .github/workflows/ --include="*.yml" >/dev/null 2>&1; then
        echo "YES"
    else
        echo "NO"
    fi
}

# Function to check if script is in package.json
check_package_json() {
    local script_name=$1
    if grep -r "$script_name" package.json apps/*/package.json packages/*/package.json 2>/dev/null | grep -v node_modules >/dev/null; then
        echo "YES"
    else
        echo "NO"
    fi
}

# Function to check if script is in Lefthook
check_lefthook() {
    local script_name=$1
    if grep "$script_name" .lefthook.yml >/dev/null 2>&1; then
        echo "YES"
    else
        echo "NO"
    fi
}

echo "### Script Inventory with Metadata" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "| Script | Last Modified | Days Ago | CI Usage | package.json | Lefthook | Risk Level |" >> "$OUTPUT_FILE"
echo "|--------|---------------|----------|----------|--------------|----------|------------|" >> "$OUTPUT_FILE"

# Track statistics
TOTAL_SCRIPTS=0
CI_SCRIPTS=0
PACKAGE_SCRIPTS=0
LEFTHOOK_SCRIPTS=0
STALE_SCRIPTS=0
DEAD_SCRIPTS=0

# Find all scripts
SCRIPT_DIRS=(
    "scripts"
    "ops/scripts"
    "ai_dev_utils/scripts"
    "apps/vscode/scripts"
    "apps/web/scripts"
    "tooling/scripts"
)

for dir in "${SCRIPT_DIRS[@]}"; do
    if [ -d "$PROJECT_ROOT/$dir" ]; then
        echo -e "${YELLOW}Scanning $dir...${NC}"
        
        # Find shell scripts
        find "$PROJECT_ROOT/$dir" -type f \( -name "*.sh" -o -name "*.ts" -o -name "*.js" -o -name "*.mjs" \) | while read -r script; do
            TOTAL_SCRIPTS=$((TOTAL_SCRIPTS + 1))
            
            # Get relative path
            REL_PATH="${script#$PROJECT_ROOT/}"
            SCRIPT_NAME=$(basename "$script")
            
            # Get last modification
            IFS='|' read -r LAST_MOD LAST_MOD_REL COMMIT_HASH <<< "$(get_last_modified "$script")"
            
            # Calculate days ago (rough approximation)
            if [ "$LAST_MOD" != "never" ]; then
                DAYS_AGO=$(( ( $(date +%s) - $(date -j -f "%Y-%m-%d" "$LAST_MOD" +%s 2>/dev/null || echo 0) ) / 86400 ))
            else
                DAYS_AGO="N/A"
            fi
            
            # Check usage
            IN_CI=$(check_ci_usage "$SCRIPT_NAME")
            IN_PKG=$(check_package_json "$SCRIPT_NAME")
            IN_LEFTHOOK=$(check_lefthook "$REL_PATH")
            
            # Determine risk level
            RISK="LOW"
            if [ "$IN_LEFTHOOK" = "YES" ]; then
                RISK="CRITICAL"
                LEFTHOOK_SCRIPTS=$((LEFTHOOK_SCRIPTS + 1))
            elif [ "$IN_CI" = "YES" ]; then
                RISK="HIGH"
                CI_SCRIPTS=$((CI_SCRIPTS + 1))
            elif [ "$IN_PKG" = "YES" ]; then
                RISK="MEDIUM"
                PACKAGE_SCRIPTS=$((PACKAGE_SCRIPTS + 1))
            fi
            
            # Check if stale (>180 days)
            if [ "$DAYS_AGO" != "N/A" ] && [ "$DAYS_AGO" -gt 180 ]; then
                STALE_SCRIPTS=$((STALE_SCRIPTS + 1))
                if [ "$RISK" = "LOW" ]; then
                    DEAD_SCRIPTS=$((DEAD_SCRIPTS + 1))
                fi
            fi
            
            # Write to file
            echo "| \`$REL_PATH\` | $LAST_MOD | $DAYS_AGO | $IN_CI | $IN_PKG | $IN_LEFTHOOK | **$RISK** |" >> "$OUTPUT_FILE"
        done
    fi
done

# Add statistics section
cat >> "$OUTPUT_FILE" << EOF

---

## Statistics Summary

- **Total Scripts:** ${TOTAL_SCRIPTS}
- **CI-Critical Scripts:** ${CI_SCRIPTS} (in GitHub workflows)
- **Package.json Scripts:** ${PACKAGE_SCRIPTS}
- **Lefthook Scripts:** ${LEFTHOOK_SCRIPTS} (runs every commit)
- **Stale Scripts (>180 days):** ${STALE_SCRIPTS}
- **Potential Dead Code:** ${DEAD_SCRIPTS} (stale + low risk)

---

## Categorization

### CRITICAL Risk (Cannot Touch During Demo)
Scripts in Lefthook hooks - breaking these blocks all commits.

**Count:** ${LEFTHOOK_SCRIPTS}

### HIGH Risk (CI Dependencies)
Scripts called by GitHub Actions workflows.

**Count:** ${CI_SCRIPTS}

### MEDIUM Risk (Developer Workflows)
Scripts in package.json - breaking these disrupts dev experience.

**Count:** ${PACKAGE_SCRIPTS}

### LOW Risk (Safe to Consolidate)
Manual/ad-hoc scripts with no automation dependencies.

**Candidates for Phase 1 removal:** ${DEAD_SCRIPTS}

---

## Recommendations

### Immediate Actions (Phase 0)
1. **Freeze all CRITICAL and HIGH risk scripts** until post-demo
2. **Document demo-critical paths** (4 VSCode scripts identified)
3. **Create detailed dependency matrix** (see below)

### Phase 1 Post-Demo (Quick Wins)
1. **Remove ${DEAD_SCRIPTS} dead scripts** (stale + unused)
2. **Consolidate duplicate TS/JS pairs** (LOW risk only)
3. **Update documentation** for remaining scripts

### Phase 2+ (Systematic Consolidation)
1. Build system consolidation
2. Docker script unification
3. OSS extraction parameterization

---

## Next Steps

1. Review this audit with team
2. Verify demo-critical scripts are frozen
3. Generate cross-script dependency graph
4. Create migration plan for Phase 1

**Audit Location:** \`${OUTPUT_FILE}\`

EOF

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Audit Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Results saved to: ${BLUE}$OUTPUT_FILE${NC}"
echo ""
echo -e "${YELLOW}Summary:${NC}"
echo -e "  Total Scripts: $TOTAL_SCRIPTS"
echo -e "  Lefthook (CRITICAL): $LEFTHOOK_SCRIPTS"
echo -e "  CI Scripts (HIGH): $CI_SCRIPTS"
echo -e "  Package Scripts (MEDIUM): $PACKAGE_SCRIPTS"
echo -e "  Potential Dead Code: $DEAD_SCRIPTS"
echo ""
echo -e "${YELLOW}Next: Review $OUTPUT_FILE and freeze demo-critical scripts${NC}"
