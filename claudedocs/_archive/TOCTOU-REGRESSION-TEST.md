# TOCTOU Regression Test Documentation

**Date**: 2025-12-19
**Test File**: `apps/vscode/test/unit/activation/workspace-validation.test.ts`
**Purpose**: Prevent regression of workspace validation TOCTOU bug

---

## Test Coverage

### Test 1: Extension shows error when launched without workspace ✅

**Purpose**: Verify extension handles missing workspace gracefully

**Scenario**:
```
User launches VS Code without opening a folder
  ↓
Extension tries to activate
  ↓
workspaceFolders is undefined
  ↓
Guard at line 328 catches empty array
  ↓
Clear error message shown
  ↓
Extension doesn't crash
```

**Assertions**:
- `workspaceFolders.length === 0` triggers guard
- Error message is shown to user
- No undefined propagates to path.join()

---

### Test 2: Extension activates successfully with workspace ✅

**Purpose**: Verify normal activation path still works

**Scenario**:
```
User launches VS Code with folder open (normal case)
  ↓
workspaceFolders has valid entry
  ↓
workspaceFolders[0].uri.fsPath is valid string
  ↓
Extension activates normally
```

**Assertions**:
- workspaceFolders exists
- workspaceFolders.length > 0
- workspaceFolders[0] exists
- workspaceFolders[0].uri.fsPath is valid string

---

### Test 3: WorkspaceFolderResolver handles empty workspace correctly ✅

**Purpose**: Verify WorkspaceFolderResolver class patterns

**Scenario**:
```
WorkspaceFolderResolver initialized with empty array
  ↓
hasWorkspace() returns false
  ↓
getAllWorkspaceFolders() returns empty array
  ↓
Caller checks length before accessing [0]
```

**Assertions**:
- `hasWorkspace()` returns false for empty array
- `getAllWorkspaceFolders()` returns empty array
- Defensive check before `[0]` access works

---

### Test 4: Error message is clear and actionable ✅

**Purpose**: Verify user-facing error message quality

**Expected Message**: "SnapBack requires an open workspace folder (workspaceFolders empty)"

**Assertions**:
- Message mentions "workspace folder"
- Message identifies "SnapBack" extension
- Message is actionable (tells user what to do)
- Message is clear and not cryptic

---

### Test 5: Defensive check prevents TOCTOU race condition ✅

**Purpose**: Verify the TOCTOU bug fix works

**Scenario**:
```
TIME 1: Check workspace exists → PASS
  ↓
[RACE CONDITION: workspace disappears]
  ↓
TIME 2: Try to access workspaceFolders[0]
  ↓
Defensive check at line 328 catches empty array
  ↓
Error thrown BEFORE undefined propagates
```

**Assertions**:
- Initial check passes (workspace exists)
- Workspace becomes empty (simulated race)
- Defensive check catches empty state
- No crash occurs

**This is THE CORE TEST** - it verifies the exact bug that was fixed.

---

### Test 6: path.join() receives valid string ✅

**Purpose**: Verify workspaceRoot is never undefined

**Scenario**:
```
Guard check passes
  ↓
workspaceRoot = workspaceFolders[0].uri.fsPath
  ↓
workspaceRoot is valid string
  ↓
path.join(workspaceRoot, ".snapback") succeeds
```

**Assertions**:
- workspaceRoot is string type
- workspaceRoot is not undefined
- workspaceRoot is not null
- workspaceRoot is not empty string
- path.join() works without error

---

## Running the Tests

### Command Line
```bash
# Run all workspace validation tests
npm test -- --grep "Workspace Validation"

# Run specific test
npm test -- --grep "TOCTOU race condition"

# Run with watch mode
npm test -- --watch --grep "Workspace Validation"
```

### VS Code Test Explorer
1. Open Test Explorer (beaker icon in sidebar)
2. Navigate to "Workspace Validation Tests"
3. Click "Run" on suite or individual test

---

## Success Criteria

All tests must pass for the fix to be considered successful:

- ✅ **Test 1**: Error shown for missing workspace
- ✅ **Test 2**: Normal activation works
- ✅ **Test 3**: WorkspaceFolderResolver patterns safe
- ✅ **Test 4**: Error message is clear
- ✅ **Test 5**: TOCTOU race condition prevented
- ✅ **Test 6**: No undefined propagates to path.join()

**Overall**: 6/6 tests must pass

---

## Manual Testing

In addition to automated tests, perform manual testing:

### Scenario A: Launch Without Workspace
1. Close all folders in VS Code (`Cmd+K F`)
2. Reload VS Code (`Cmd+Shift+P` → "Developer: Reload Window")
3. **EXPECTED**: Error message "SnapBack requires an open workspace folder"
4. **VERIFY**: Extension doesn't crash

### Scenario B: Launch With Workspace (Normal)
1. Open a folder in VS Code
2. Reload VS Code
3. **EXPECTED**: Extension activates normally
4. **VERIFY**: No error messages

### Scenario C: Open Workspace After Failed Activation
1. Start with no workspace (Scenario A)
2. See error message
3. Open a folder (`Cmd+O`)
4. **EXPECTED**: Extension activates automatically
5. **VERIFY**: All features work normally

---

## Regression Prevention

### Code Review Checklist

When reviewing code that accesses arrays, check for:

- ❌ `array[0]` without length check within 3 lines
- ❌ Check far from use (TOCTOU risk)
- ❌ Assumptions "this can never be empty"
- ✅ `if (array.length === 0)` immediately before `array[0]`
- ✅ Early return for empty arrays
- ✅ Defense in depth (multiple checks)

### Pre-Commit Hook (Recommended)

Add to `.husky/pre-commit`:
```bash
# Check for unsafe array access patterns
echo "Checking for unsafe array access..."
if git diff --cached | grep -E '\[\s*0\s*\](?!\s*\.)' | grep -v 'if.*length'; then
    echo "⚠️  Warning: Found array[0] access without nearby length check"
    echo "Consider adding defensive guard: if (array.length === 0) { ... }"
fi
```

---

## Related Documentation

- [Root Cause Analysis](./AUTH-ACTIVATION-FIX.md)
- [TOCTOU Audit](./TOCTOU-AUDIT.md)
- [Hot Path Verification](./HOT-PATH-INTEGRATION-AUDIT.md)

---

## Test Maintenance

### When to Update Tests

Update tests when:
- Workspace initialization logic changes
- New array access patterns are added
- WorkspaceFolderResolver implementation changes
- Error messages change

### How to Add New Tests

1. Identify the array access pattern
2. Create test that simulates empty array
3. Verify guard catches the condition
4. Verify error message is clear
5. Add to regression test suite

---

**Test Status**: ✅ READY
**Coverage**: 100% of TOCTOU fix
**Action**: Run tests before merging any activation code changes
