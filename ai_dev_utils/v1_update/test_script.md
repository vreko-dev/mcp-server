# Test Infrastructure Surgery: VSCode Mock Consolidation

## Mission

Fix the 62% test failure rate caused by mock fragmentation. 254 test files override `vi.mock("vscode")`, shadowing the global setup and creating inconsistent mock behavior.

**Success Criteria:**
- Test failures reduced from 300 to <50
- Single canonical vscode mock in setup.ts
- Zero or minimal test files with inline vi.mock("vscode")
- No new timeout failures introduced

**Anti-Goals:**
- Do NOT "fix" tests by making mocks more permissive (returning undefined, empty objects)
- Do NOT remove mocks that tests genuinely need for custom behavior
- Do NOT batch-delete mocks without verifying each category works

---

## Phase 0: Establish Ground Truth (DO NOT SKIP)

Before ANY changes, capture exact current state:
````bash
# 1. Full test results with failure details
pnpm run test --reporter=verbose 2>&1 | tee test-baseline-$(date +%Y%m%d-%H%M).log

# 2. Summary counts
echo "=== BASELINE METRICS ==="
grep -c "FAIL\|PASS\|SKIP" test-baseline-*.log || true
pnpm run test --reporter=summary 2>&1 | tail -30

# 3. Verify setup.ts is actually loaded
grep -A5 "setupFiles" apps/vscode/vitest.config.ts

# 4. Count mock overrides
find apps/vscode/src -name "*.test.ts" -exec grep -l "vi.mock.*vscode" {} \; | wc -l

# 5. Categorize failure patterns
grep -A2 "FAIL" test-baseline-*.log | grep -E "undefined|TypeError|Cannot read" | head -30
````

**Gate 0:** Record these numbers. You must improve them, not regress.

| Metric | Baseline Value |
|--------|----------------|
| Total test files | ___ |
| Passing | ___ |
| Failing | ___ |
| Timeout failures | ___ |
| Files with vi.mock("vscode") | ___ |

---

## Phase 1: Understand the Mock Architecture

### 1.1 Find All Mock Definitions
````bash
# Global setup file
cat apps/vscode/test/unit/setup.ts | head -100

# Alternative mock locations
find apps/vscode -name "*mock*" -o -name "__mocks__" | grep -v node_modules

# Check if __mocks__/vscode.ts exists (vitest auto-loads this)
ls -la apps/vscode/test/__mocks__/ 2>/dev/null || echo "No __mocks__ directory"
````

### 1.2 Determine Which Mock Wins

Vitest mock precedence (highest to lowest):
1. `vi.mock()` in test file (WINS - shadows everything)
2. `__mocks__/` directory auto-mock
3. `setupFiles` mock

**This is the root cause:** Individual `vi.mock("vscode")` calls override the global setup.

### 1.3 Audit the Global Mock Completeness
````bash
# What does setup.ts mock provide?
grep -E "^export|workspace|window|commands|extensions|Uri|authentication" apps/vscode/test/unit/setup.ts

# What APIs are tests actually calling that fail?
grep -B5 "undefined is not\|Cannot read properties of undefined" test-baseline-*.log | head -50
````

**Document which vscode APIs are:**
- ✅ Properly mocked in setup.ts
- ❌ Missing from setup.ts (need to add)
- ⚠️ Mocked but with wrong return type

---

## Phase 2: Categorize the 254 Mock Overrides

### 2.1 Generate Override Inventory
````bash
# Create inventory file
echo "file,has_custom_behavior,mock_apis" > mock-inventory.csv

find apps/vscode/src -name "*.test.ts" -exec grep -l "vi.mock.*vscode" {} \; | while read f; do
  # Check if file customizes mock behavior
  has_custom=$(grep -c "mockReturnValue\|mockImplementation\|mockResolvedValue" "$f" || echo "0")

  # What APIs does it mock?
  apis=$(grep -oE "workspace|window|commands|Uri|extensions|authentication" "$f" | sort -u | tr '\n' '|')

  echo "$f,$has_custom,$apis" >> mock-inventory.csv
done

# Show summary
echo "=== OVERRIDE CATEGORIES ==="
echo "Files with custom behavior:"
grep -v ",0," mock-inventory.csv | wc -l

echo "Files with cargo-cult mocks (no customization):"
grep ",0," mock-inventory.csv | wc -l
````

### 2.2 Categorize Each Override

| Category | Pattern | Action |
|----------|---------|--------|
| **CARGO** | `vi.mock("vscode")` with no customization | Remove entirely |
| **PARTIAL** | Mocks 1-2 APIs that setup.ts also mocks | Remove, verify setup.ts covers it |
| **CUSTOM** | Uses `mockReturnValue` for specific test behavior | Keep but refactor to use `vi.mocked()` |
| **BROKEN** | Mocks API incorrectly (wrong return type) | Fix or remove |
````bash
# Sample 10 cargo-cult files to verify they don't need custom mocks
grep ",0," mock-inventory.csv | head -10 | cut -d',' -f1 | while read f; do
  echo "=== $f ==="
  grep -A10 "vi.mock.*vscode" "$f" | head -15
  echo ""
done
````

---

## Phase 3: Prepare the Global Mock

Before removing overrides, ensure setup.ts handles all common cases.

### 3.1 Audit Common Failure Patterns
````bash
# What's undefined that shouldn't be?
grep "Cannot read properties of undefined" test-baseline-*.log | \
  sed "s/.*reading '\([^']*\)'.*/\1/" | sort | uniq -c | sort -rn | head -20
````

### 3.2 Add Missing APIs to setup.ts

For each missing API, add to `apps/vscode/test/unit/setup.ts`:
````typescript
// Template for adding missing mocks
export const mockVscode = {
  // REQUIRED: These must return proper types, not undefined
  workspace: {
    getConfiguration: vi.fn().mockReturnValue({
      get: vi.fn((key: string, defaultValue?: unknown) => defaultValue),
      update: vi.fn().mockResolvedValue(undefined),
      has: vi.fn().mockReturnValue(false),
      inspect: vi.fn().mockReturnValue(undefined),
    }),
    workspaceFolders: [],
    onDidChangeConfiguration: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onDidSaveTextDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onDidChangeTextDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onWillSaveTextDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    fs: {
      readFile: vi.fn().mockResolvedValue(new Uint8Array()),
      writeFile: vi.fn().mockResolvedValue(undefined),
      stat: vi.fn().mockResolvedValue({ type: 1, ctime: 0, mtime: 0, size: 0 }),
      readDirectory: vi.fn().mockResolvedValue([]),
      createDirectory: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  },

  window: {
    showInformationMessage: vi.fn().mockResolvedValue(undefined),
    showWarningMessage: vi.fn().mockResolvedValue(undefined),
    showErrorMessage: vi.fn().mockResolvedValue(undefined),
    showQuickPick: vi.fn().mockResolvedValue(undefined),
    showInputBox: vi.fn().mockResolvedValue(undefined),
    createOutputChannel: vi.fn().mockReturnValue({
      appendLine: vi.fn(),
      append: vi.fn(),
      clear: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    }),
    createStatusBarItem: vi.fn().mockReturnValue({
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
      text: '',
      tooltip: '',
      command: undefined,
    }),
    activeTextEditor: undefined,
    onDidChangeActiveTextEditor: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  },

  commands: {
    registerCommand: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    executeCommand: vi.fn().mockResolvedValue(undefined),
    getCommands: vi.fn().mockResolvedValue([]),
  },

  extensions: {
    getExtension: vi.fn().mockReturnValue({
      packageJSON: { version: '1.0.0-test', name: 'snapback' },
      extensionPath: '/test/extension/path',
      isActive: true,
      exports: {},
    }),
    all: [],
  },

  Uri: {
    file: vi.fn((path: string) => ({
      fsPath: path,
      scheme: 'file',
      path,
      toString: () => `file://${path}`,
    })),
    parse: vi.fn((str: string) => ({
      fsPath: str.replace('file://', ''),
      scheme: 'file',
      path: str.replace('file://', ''),
      toString: () => str,
    })),
    joinPath: vi.fn((base, ...paths) => ({
      fsPath: [base.fsPath, ...paths].join('/'),
      scheme: 'file',
      path: [base.path, ...paths].join('/'),
      toString: () => `file://${[base.fsPath, ...paths].join('/')}`,
    })),
  },

  authentication: {
    getSession: vi.fn().mockResolvedValue(null),
    onDidChangeSessions: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  },

  // Enums (must be actual values, not mocks)
  StatusBarAlignment: { Left: 1, Right: 2 },
  TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
  FileType: { Unknown: 0, File: 1, Directory: 2, SymbolicLink: 64 },
  ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },

  // Classes
  EventEmitter: vi.fn().mockImplementation(() => ({
    event: vi.fn(),
    fire: vi.fn(),
    dispose: vi.fn(),
  })),

  Disposable: {
    from: vi.fn((...disposables) => ({ dispose: vi.fn() })),
  },
};

// Apply the mock
vi.mock('vscode', () => mockVscode);
````

### 3.3 Verify Global Mock Works Standalone
````bash
# Create a minimal test that ONLY uses global mock
cat > apps/vscode/test/unit/mock-sanity.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';
import * as vscode from 'vscode';

describe('Global Mock Sanity', () => {
  it('workspace.getConfiguration returns proper mock', () => {
    const config = vscode.workspace.getConfiguration('snapback');
    expect(config.get).toBeDefined();
    expect(config.get('someKey', 'default')).toBe('default');
  });

  it('extensions.getExtension returns proper mock', () => {
    const ext = vscode.extensions.getExtension('snapback.snapback');
    expect(ext).toBeDefined();
    expect(ext?.packageJSON.version).toBe('1.0.0-test');
  });

  it('Uri.file returns proper structure', () => {
    const uri = vscode.Uri.file('/test/path');
    expect(uri.fsPath).toBe('/test/path');
    expect(uri.scheme).toBe('file');
  });

  it('window.createStatusBarItem returns proper mock', () => {
    const item = vscode.window.createStatusBarItem();
    expect(item.show).toBeDefined();
    expect(item.text).toBe('');
  });
});
EOF

# Run ONLY this test
pnpm vitest run apps/vscode/test/unit/mock-sanity.test.ts
````

**Gate 3:** All 4 sanity tests must pass before proceeding.

---

## Phase 4: Surgical Mock Removal (Batch Approach)

### 4.1 Start with Cargo-Cult Mocks (No Custom Behavior)
````bash
# Get list of files with vi.mock("vscode") but no customization
cargo_files=$(grep ",0," mock-inventory.csv | cut -d',' -f1)

# Process in batches of 10
echo "$cargo_files" | head -10 > batch-1.txt
````

### 4.2 For Each Batch
````bash
# 1. View the mock being removed
for f in $(cat batch-1.txt); do
  echo "=== $f ==="
  grep -B2 -A10 "vi.mock.*vscode" "$f"
done

# 2. Remove the mock (careful - preserve imports)
for f in $(cat batch-1.txt); do
  # Remove vi.mock("vscode", ...) block but keep import
  # This is complex - recommend manual review for first batch
  echo "Review and manually remove mock from: $f"
done

# 3. Run tests for JUST these files
pnpm vitest run $(cat batch-1.txt | tr '\n' ' ')

# 4. If pass, commit and continue to next batch
# 5. If fail, investigate which specific test needs custom mock
````

### 4.3 Pattern for Removing Simple Mocks
````typescript
// BEFORE: File has unnecessary mock override
import { describe, it, vi, expect } from 'vitest';

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn().mockReturnValue({
      get: vi.fn(),
    }),
  },
}));

import * as vscode from 'vscode';

// AFTER: Remove the vi.mock, keep the import
import { describe, it, vi, expect } from 'vitest';
import * as vscode from 'vscode';

// Global mock from setup.ts now applies
````

### 4.4 Pattern for Tests That Need Custom Behavior
````typescript
// BEFORE: Test overrides entire mock for one custom return
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn().mockReturnValue({
      get: vi.fn().mockReturnValue('custom-value'),
    }),
  },
  // Missing: extensions, commands, window, Uri, etc.
}));

// AFTER: Use vi.mocked() to customize specific behavior
import { describe, it, vi, expect, beforeEach } from 'vitest';
import * as vscode from 'vscode';

describe('MyTest', () => {
  beforeEach(() => {
    // Customize just what this test needs
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn().mockReturnValue('custom-value'),
      update: vi.fn().mockResolvedValue(undefined),
      has: vi.fn().mockReturnValue(true),
      inspect: vi.fn(),
    } as any);
  });

  it('uses custom config value', () => {
    const config = vscode.workspace.getConfiguration('snapback');
    expect(config.get('key')).toBe('custom-value');
  });
});
````

---

## Phase 5: Handle Complex Cases

### 5.1 Tests That Mock Multiple APIs
````bash
# Find tests that customize multiple APIs
grep -l "mockReturnValue\|mockImplementation" apps/vscode/src --include="*.test.ts" -r | while read f; do
  count=$(grep -c "mockReturnValue\|mockImplementation" "$f")
  if [ "$count" -gt 3 ]; then
    echo "COMPLEX: $f ($count customizations)"
  fi
done
````

For complex tests:
1. Keep the test file's mock structure
2. But ensure it includes ALL required APIs (merge with setup.ts mock)
3. Or refactor to use `beforeEach` with `vi.mocked()`

### 5.2 Tests with Timing/Async Issues

If removing mocks causes timeouts:
````typescript
// Check if test relies on mock returning resolved promise immediately
// vs setup.ts mock returning something different

// SYMPTOM: Test times out after mock removal
// CAUSE: Mock returned sync value, setup.ts returns Promise

// FIX: Ensure setup.ts mock matches expected async behavior
vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(new Uint8Array());
// Not: .mockReturnValue(new Uint8Array()) // This is sync!
````

---

## Phase 6: Verification Gates

### After Each Batch
````bash
# 1. Run affected tests
pnpm vitest run [batch files]

# 2. Run full suite
pnpm run test --reporter=summary

# 3. Compare to baseline
echo "Baseline failures: [X]"
echo "Current failures: $(grep -c FAIL test-output.log)"
````

### Final Verification
````bash
# 1. Count remaining overrides
find apps/vscode/src -name "*.test.ts" -exec grep -l "vi.mock.*vscode" {} \; | wc -l
# Target: <20 (tests that genuinely need custom mocks)

# 2. Full test suite
pnpm run test --reporter=summary
# Target: <50 failures (down from 300)

# 3. No new timeout failures
grep -c "timeout\|Timeout" test-output.log
# Target: Same or less than baseline

# 4. Sanity check - run the test that failed with enhanced mock earlier
pnpm vitest run apps/vscode/src/services/mcpServerCommunication.integration.test.ts
````

---

## Rollback Plan

If things get worse:
````bash
# 1. Stash all changes
git stash

# 2. Verify tests return to baseline
pnpm run test --reporter=summary

# 3. If baseline restored, apply changes more surgically
git stash pop
git checkout -- [problem files]
````

---

## Deliverables

### Required Outputs

1. **Updated `test/unit/setup.ts`** with comprehensive vscode mock
2. **Removed vi.mock("vscode")** from 200+ cargo-cult test files
3. **Refactored remaining tests** to use `vi.mocked()` pattern
4. **Test results comparison:**

| Metric | Before | After |
|--------|--------|-------|
| Total failures | 300 | <50 |
| Timeout failures | X | ≤X |
| Files with vi.mock("vscode") | 254 | <20 |

### Documentation

Update `CONTRIBUTING.md` or create `test/README.md`:
````markdown
## VSCode Mock Guidelines

### DO NOT add vi.mock("vscode") to test files

The global mock in `test/unit/setup.ts` covers all standard vscode APIs.

### If you need custom mock behavior:
```typescript
import { vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

beforeEach(() => {
  vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
    get: vi.fn().mockReturnValue('my-custom-value'),
    // ... include all required properties
  } as any);
});
```

### Never override the entire vscode module in a test file.
````

---

## Time Estimate

| Phase | Effort |
|-------|--------|
| Phase 0-1: Baseline & Audit | 1 hour |
| Phase 2: Categorize 254 files | 1-2 hours |
| Phase 3: Enhance setup.ts | 1-2 hours |
| Phase 4: Remove cargo-cult mocks | 2-4 hours |
| Phase 5: Handle complex cases | 2-4 hours |
| Phase 6: Verification | 1 hour |
| **Total** | **8-14 hours** |

---

## Critical Reminders

1. **Run tests after EVERY batch** - don't bulk-remove 254 mocks at once
2. **Timeout failures are signals** - they mean async behavior changed
3. **Don't make mocks more permissive** - returning undefined "fixes" the error but hides bugs
4. **Some tests legitimately need custom mocks** - the goal is ~20, not 0
5. **Commit after each successful batch** - enables easy rollback
