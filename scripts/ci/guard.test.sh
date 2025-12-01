#!/bin/bash
# Test suite for CI guard script (TDD - RED phase)
# This validates the guard.sh script catches all violations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
GUARD_SCRIPT="$SCRIPT_DIR/guard.sh"

# Test utilities
TESTS_PASSED=0
TESTS_FAILED=0

log_test() {
  echo "TEST: $1"
}

assert_failure() {
  local test_name="$1"
  local command="$2"
  
  if eval "$command" >/dev/null 2>&1; then
    echo "  ✗ FAILED: $test_name - Expected guard to fail but it passed"
    ((TESTS_FAILED++))
    return 1
  else
    echo "  ✓ PASSED: $test_name"
    ((TESTS_PASSED++))
    return 0
  fi
}

assert_success() {
  local test_name="$1"
  local command="$2"
  
  if eval "$command" >/dev/null 2>&1; then
    echo "  ✓ PASSED: $test_name"
    ((TESTS_PASSED++))
    return 0
  else
    echo "  ✗ FAILED: $test_name - Expected guard to pass but it failed"
    ((TESTS_FAILED++))
    return 1
  fi
}

# Setup test directory
TEST_DIR="$(mktemp -d)"
trap "rm -rf $TEST_DIR" EXIT

cd "$TEST_DIR"

# Initialize test repo structure matching real repo
mkdir -p apps/web/src apps/api/modules apps/docs/content/enterprise
mkdir -p packages/contracts/src packages/analytics/src
mkdir -p scripts
touch .guard-allowlist.txt

echo "=== CI Guard Test Suite ==="
echo "Testing guard script at: $GUARD_SCRIPT"
echo ""

# Test 1: Detect "checkpoint" terminology
log_test "Should detect 'checkpoint' in source files"
echo "const checkpoint = createCheckpoint();" > apps/web/src/app.ts
assert_failure "checkpoint detection" "REPO_ROOT='$TEST_DIR' bash $GUARD_SCRIPT"
rm apps/web/src/app.ts

# Test 2: Allow "checkpoint" in allowlisted files
log_test "Should allow 'checkpoint' in allowlisted files"
echo "apps/docs/migration.md" > .guard-allowlist.txt
echo "## Checkpoint Migration Guide" > apps/docs/migration.md
assert_success "checkpoint in allowlist" "REPO_ROOT='$TEST_DIR' bash $GUARD_SCRIPT"
rm apps/docs/migration.md
echo "" > .guard-allowlist.txt

# Test 3: Detect deprecated policy action "apply"
log_test "Should detect deprecated policy action 'apply'"
echo "policy.action = 'apply';" > packages/contracts/src/policy.ts
assert_failure "deprecated 'apply' action" "REPO_ROOT='$TEST_DIR' bash $GUARD_SCRIPT"
rm packages/contracts/src/policy.ts

# Test 4: Detect deprecated policy action "review"
log_test "Should detect deprecated policy action 'review'"
echo "const action = 'review';" > packages/analytics/src/guardian.ts
assert_failure "deprecated 'review' action" "REPO_ROOT='$TEST_DIR' bash $GUARD_SCRIPT"
rm packages/analytics/src/guardian.ts

# Test 5: Detect direct analytics POST bypassing wrapper
log_test "Should detect direct analytics POST calls"
echo "fetch('/analytics/ingest', { method: 'POST' })" > apps/web/src/tracking.ts
assert_failure "direct analytics POST" "REPO_ROOT='$TEST_DIR' bash $GUARD_SCRIPT"
rm apps/web/src/tracking.ts

# Test 6: Allow analytics wrapper usage
log_test "Should allow analytics wrapper usage"
echo "import { trackEvent } from '@snapback/analytics-client';" > apps/web/src/tracking.ts
echo "trackEvent('SNAPSHOT_CREATED', { trigger: 'manual' });" >> apps/web/src/tracking.ts
assert_success "analytics wrapper usage" "REPO_ROOT='$TEST_DIR' bash $GUARD_SCRIPT"
rm apps/web/src/tracking.ts

# Test 7: Detect SSO/SAML mentions outside enterprise docs
log_test "Should detect SSO/SAML outside enterprise docs"
echo "# SAML Configuration" > apps/docs/setup.md
assert_failure "SSO outside enterprise docs" "REPO_ROOT='$TEST_DIR' bash $GUARD_SCRIPT"
rm apps/docs/setup.md

# Test 8: Allow SSO in enterprise docs
log_test "Should allow SSO in enterprise documentation"
echo "# SSO and SAML Setup" > apps/docs/content/enterprise/sso-saml.mdx
assert_success "SSO in enterprise docs" "REPO_ROOT='$TEST_DIR' bash $GUARD_SCRIPT"
rm apps/docs/content/enterprise/sso-saml.mdx

# Test 9: Detect SCIM outside enterprise docs
log_test "Should detect SCIM mentions outside enterprise docs"
echo "// SCIM provisioning enabled" > apps/api/modules/auth.ts
assert_failure "SCIM outside enterprise docs" "REPO_ROOT='$TEST_DIR' bash $GUARD_SCRIPT"
rm apps/api/modules/auth.ts

# Test 10: Allow "snapshot" and "restore" terminology
log_test "Should allow correct terminology"
echo "const snapshot = createSnapshot();" > apps/web/src/app.ts
echo "restoreSnapshot(snapshot);" >> apps/web/src/app.ts
assert_success "snapshot and restore terms" "REPO_ROOT='$TEST_DIR' bash $GUARD_SCRIPT"
rm apps/web/src/app.ts

# Test 11: Multiple violations in same file
log_test "Should detect multiple violations"
cat > apps/web/src/multi.ts << 'EOF'
const checkpoint = true;
policy.action = 'apply';
fetch('/analytics/ingest', { method: 'POST' });
EOF
assert_failure "multiple violations" "REPO_ROOT='$TEST_DIR' bash $GUARD_SCRIPT"
rm apps/web/src/multi.ts

# Test 12: Case sensitivity for checkpoint
log_test "Should be case-insensitive for checkpoint"
echo "const Checkpoint = {};" > packages/contracts/src/types.ts
assert_failure "checkpoint case insensitive" "REPO_ROOT='$TEST_DIR' bash $GUARD_SCRIPT"
rm packages/contracts/src/types.ts

# Test 13: Glob pattern support in allowlist
log_test "Should support glob patterns in allowlist"
echo "apps/docs/**/*.md" > .guard-allowlist.txt
mkdir -p apps/docs/legacy
echo "checkpoint migration notes" > apps/docs/legacy/migration.md
assert_success "glob pattern allowlist" "REPO_ROOT='$TEST_DIR' bash $GUARD_SCRIPT"

# Print summary
echo ""
echo "=== Test Summary ==="
echo "Passed: $TESTS_PASSED"
echo "Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo "✓ All tests passed!"
  exit 0
else
  echo "✗ Some tests failed"
  exit 1
fi
