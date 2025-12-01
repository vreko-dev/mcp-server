#!/bin/bash
set -e

# Alpha CI Guard Script
# Purpose: Enforce terminology, privacy, and scope constraints for Alpha release
# Author: SnapBack Team
# Last Updated: 2025-11-20

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VIOLATIONS=0
ALLOWLIST_FILE=".guard-allowlist.txt"

# Function: Check for forbidden strings with allowlist support
check_forbidden() {
  local pattern=$1
  local description=$2
  local exclude_dirs="node_modules|.git|dist|build|.next|.turbo|coverage"
  
  # Find all occurrences
  results=$(grep -rn "$pattern" . \
    --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
    --include="*.md" --include="*.mdx" \
    --exclude-dir={node_modules,.git,dist,build,.next,.turbo,coverage} \
    2>/dev/null || true)
  
  # Filter against allowlist if exists
  if [ -f "$ALLOWLIST_FILE" ]; then
    filtered_results=""
    while IFS= read -r line; do
      # Extract file path from grep output (before first colon)
      file_path=$(echo "$line" | cut -d: -f1)
      
      # Check if file path matches any allowlist pattern
      is_allowed=false
      while IFS= read -r allowed_pattern; do
        # Skip empty lines and comments
        [[ -z "$allowed_pattern" || "$allowed_pattern" =~ ^# ]] && continue
        
        # Use glob-style matching
        if [[ "$file_path" == $allowed_pattern* ]] || [[ "$file_path" == *"$allowed_pattern"* ]]; then
          is_allowed=true
          break
        fi
      done < "$ALLOWLIST_FILE"
      
      # Add to filtered results if not allowed
      if [ "$is_allowed" = false ]; then
        filtered_results="${filtered_results}${line}\n"
      fi
    done <<< "$results"
    
    results="$filtered_results"
  fi
  
  # Report violations
  if [ -n "$results" ] && [ "$results" != "\n" ]; then
    echo -e "${RED}✗ VIOLATION: $description${NC}"
    echo -e "$results" | head -n 20  # Limit output to first 20 matches
    if [ $(echo -e "$results" | wc -l) -gt 20 ]; then
      echo -e "${YELLOW}... and more matches (showing first 20)${NC}"
    fi
    VIOLATIONS=$((VIOLATIONS + 1))
  else
    echo -e "${GREEN}✓ PASS: $description${NC}"
  fi
}

# Function: Check feature flags in specific files
check_feature_flags() {
  local flag_name=$1
  local expected_value=$2
  local search_paths="packages/*/src/config.ts apps/*/src/config.ts"
  
  # Search for flag definitions
  flag_found=false
  flag_value=""
  
  for pattern in $search_paths; do
    for file in $pattern; do
      if [ -f "$file" ]; then
        # Check if file contains the flag
        if grep -q "$flag_name" "$file"; then
          flag_found=true
          # Extract the value (handles both 'true' and 'false' boolean literals)
          flag_value=$(grep "$flag_name" "$file" | grep -oE '(true|false)' | head -n 1)
          
          if [ "$flag_value" != "$expected_value" ]; then
            echo -e "${RED}✗ VIOLATION: Feature flag $flag_name should be $expected_value but is $flag_value in $file${NC}"
            VIOLATIONS=$((VIOLATIONS + 1))
            return
          fi
        fi
      fi
    done
  done
  
  # Only report success if we actually found and verified the flag
  if [ "$flag_found" = true ]; then
    echo -e "${GREEN}✓ PASS: Feature flag $flag_name = $expected_value${NC}"
  else
    # Don't fail if flag doesn't exist - it might not be implemented yet
    echo -e "${YELLOW}⚠ WARNING: Feature flag $flag_name not found${NC}"
  fi
}

echo "================================================"
echo "SnapBack Alpha CI Guards"
echo "================================================"
echo ""

# Check 1: Legacy "checkpoint" terminology
check_forbidden '\bcheckpoint\b' "Legacy 'checkpoint' terminology (use 'snapshot' instead)"

# Check 2: Legacy policy actions
check_forbidden '"apply".*policy|policy.*"apply"' "Legacy 'apply' policy action"
check_forbidden '"review".*policy|policy.*"review"' "Legacy 'review' policy action"

# Check 3: Direct PostHog usage (must use wrapper)
check_forbidden 'posthog\.capture\(' "Direct PostHog usage (must use analytics wrapper)"

# Check 4: SSO/SAML/SCIM mentions outside enterprise docs
echo ""
echo "Checking enterprise feature scope..."

# Special handling for enterprise features - only allowed in specific directories
enterprise_dirs="apps/docs/content/enterprise"
sso_results=$(grep -rn '\bSSO\b|\bSAML\b|\bSCIM\b' . \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.md" --include="*.mdx" \
  --exclude-dir={node_modules,.git,dist,build,.next,.turbo,coverage} \
  2>/dev/null || true)

# Filter out allowed enterprise docs directory
if [ -n "$sso_results" ]; then
  filtered_enterprise=""
  while IFS= read -r line; do
    file_path=$(echo "$line" | cut -d: -f1)
    
    # Check if in allowed enterprise directory or is environment variable reference
    if [[ ! "$file_path" =~ $enterprise_dirs ]] && [[ ! "$line" =~ (ENABLE_SSO|SSO_ENABLED|SAML_ENABLED|SCIM_ENABLED) ]]; then
      filtered_enterprise="${filtered_enterprise}${line}\n"
    fi
  done <<< "$sso_results"
  
  if [ -n "$filtered_enterprise" ] && [ "$filtered_enterprise" != "\n" ]; then
    echo -e "${RED}✗ VIOLATION: SSO/SAML/SCIM mentioned outside enterprise docs${NC}"
    echo -e "$filtered_enterprise" | head -n 10
    VIOLATIONS=$((VIOLATIONS + 1))
  else
    echo -e "${GREEN}✓ PASS: Enterprise features properly scoped${NC}"
  fi
else
  echo -e "${GREEN}✓ PASS: No enterprise features found${NC}"
fi

# Check 5: Feature flags validation
echo ""
echo "Checking feature flags..."
check_feature_flags "ENABLE_TEAMS" "false"
check_feature_flags "ENABLE_BILLING" "false"
check_feature_flags "ENABLE_SSO" "false"

echo ""
echo "================================================"

# Exit with failure if violations found
if [ $VIOLATIONS -gt 0 ]; then
  echo -e "${RED}❌ Guard failed with $VIOLATIONS violation(s)${NC}"
  echo ""
  echo "💡 Tip: Add exceptions to .guard-allowlist.txt if needed"
  exit 1
fi

echo -e "${GREEN}✅ All guards passed successfully${NC}"
exit 0
