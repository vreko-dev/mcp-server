# SnapBack MCP Tools - Priority 1 Implementation Plans

**Generated:** 2025-12-23
**Purpose:** Detailed roadmaps to complete Priority 1 tools to 100%

---

## Priority 1.1: validate_code (65% → 100%)

**Current Status:** All 7 layers operational but using heuristic pattern matching
**Target:** Deep semantic analysis with real compiler/AST integration
**Estimated Effort:** 2-3 weeks (80-120 hours)
**ROI:** HIGH - Core quality gate for all code validation

### Phase 1: TypeScript Compiler Integration (Week 1)

**Objective:** Replace regex patterns with real TypeScript language service

#### 1.1 Add TypeScript Compiler API
**File:** `packages/intelligence/src/validation/layers/types.ts` (new)
**Tasks:**
- [ ] Install `typescript` as dependency
- [ ] Create `TypeScriptAnalyzer` class wrapping `ts.createProgram()`
- [ ] Implement `getTypeAtLocation()` for real type checking
- [ ] Replace regex `any` detection with AST traversal
- [ ] Detect actual `@ts-ignore` with surrounding context
- [ ] Count non-null assertions (`!`) via AST not regex

**Acceptance Criteria:**
- Can detect `any` in type positions (not comments/strings)
- Identifies `@ts-ignore` without explanatory comments
- Finds non-null assertions on optional types
- Zero false positives on commented code
- Performance: <500ms for files up to 50KB

**Dependencies:**
- TypeScript API knowledge
- AST traversal utilities

**Code Reference:**
```typescript
import ts from 'typescript';

export class TypeScriptAnalyzer {
  private program: ts.Program;

  constructor(filePath: string, code: string) {
    const host = ts.createCompilerHost({});
    const sourceFile = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.Latest,
      true
    );
    this.program = ts.createProgram([filePath], {}, host);
  }

  findAnyUsages(): Array<{line: number, column: number}> {
    // Use ts.forEachChild() to traverse AST
  }
}
```

#### 1.2 Update Types Layer
**File:** `packages/intelligence/src/validation/layers/index.ts` (lines 74-124)
**Tasks:**
- [ ] Replace regex patterns with `TypeScriptAnalyzer`
- [ ] Add configurable thresholds for `any` count
- [ ] Detect type assertion abuse (`as any`)
- [ ] Check for missing return types on functions

**Acceptance Criteria:**
- Layer 2 uses TypeScript compiler API
- Zero regex-based type detection
- Test coverage updated for new implementation

---

### Phase 2: Dependency Analysis Enhancement (Week 1-2)

**Objective:** Replace 3-package hardcoded list with npm registry API

#### 2.1 npm Registry Integration
**File:** `packages/intelligence/src/validation/layers/dependencies.ts` (new)
**Tasks:**
- [ ] Create `NpmRegistryClient` class
- [ ] Fetch package metadata via `https://registry.npmjs.org/<package>`
- [ ] Check `deprecated` field in package metadata
- [ ] Implement caching (24-hour TTL) for registry responses
- [ ] Add rate limiting (100 requests/hour per npm docs)

**Code Reference:**
```typescript
export class NpmRegistryClient {
  private cache = new Map<string, CacheEntry>();

  async isDeprecated(packageName: string): Promise<{
    deprecated: boolean;
    message?: string;
    alternative?: string;
  }> {
    const cached = this.cache.get(packageName);
    if (cached && !this.isExpired(cached)) {
      return cached.data;
    }

    const response = await fetch(`https://registry.npmjs.org/${packageName}`);
    const data = await response.json();

    return {
      deprecated: !!data.deprecated,
      message: data.deprecated,
      alternative: this.extractAlternative(data),
    };
  }
}
```

**Acceptance Criteria:**
- Can detect deprecations for any npm package
- Caching reduces API calls by 90%+
- Rate limiting prevents npm blocking
- Returns migration recommendations

#### 2.2 Security Vulnerability Integration
**Tasks:**
- [ ] Integrate with `npm audit` JSON output
- [ ] Parse package-lock.json for dependency tree
- [ ] Map CVEs to affected packages
- [ ] Report severity levels (critical/high/medium/low)

**Acceptance Criteria:**
- Detects known CVEs in dependencies
- Links to advisories (e.g., GitHub Advisory Database)
- Suggests fix versions

---

### Phase 3: Test Coverage Instrumentation (Week 2)

**Objective:** Replace keyword matching with real code coverage data

#### 3.1 Istanbul/NYC Integration
**File:** `packages/intelligence/src/validation/layers/tests.ts` (refactor)
**Tasks:**
- [ ] Parse existing coverage reports (if available)
- [ ] Detect test framework (Jest/Vitest/Mocha) from imports
- [ ] Look for `.test.` or `.spec.` files in project
- [ ] Count assertions (not by keyword, by actual test framework calls)
- [ ] Verify 4-path coverage via actual test execution (optional)

**Acceptance Criteria:**
- No keyword-based detection
- Can read `coverage/coverage-final.json` if present
- Detects test framework from imports
- Zero false positives on non-test code

---

### Phase 4: AST-Based Analysis for All Layers (Week 3)

**Objective:** Replace all regex patterns with proper AST parsing

#### 4.1 Syntax Layer Enhancement
**Tasks:**
- [ ] Use `@babel/parser` or TypeScript parser for syntax errors
- [ ] Detect actual parse failures (not just bracket counting)
- [ ] Report line/column of syntax errors

#### 4.2 Performance Layer Enhancement
**Tasks:**
- [ ] Detect `await` in loop via AST (not regex)
- [ ] Distinguish loop types (for/forEach/while)
- [ ] Detect other performance antipatterns:
  - Nested loops (O(n²) or worse)
  - Repeated DOM queries
  - Inefficient array operations (`.indexOf()` in loop)

#### 4.3 Architecture Layer Enhancement
**Tasks:**
- [ ] Parse `package.json` for actual package boundaries
- [ ] Use import resolution to detect transitive violations
- [ ] Support monorepo workspace detection
- [ ] Validate against custom architecture rules (from config)

**Acceptance Criteria:**
- All layers use AST or language service
- Zero regex-based detection (except simple string literals)
- Configurable rules via `.snapback-validation.json`

---

### Phase 5: Configuration System (Week 3)

**Objective:** Allow project-specific customization

#### 5.1 Configuration File Support
**File:** `packages/intelligence/src/validation/config.ts` (new)
**Tasks:**
- [ ] Define `.snapback-validation.json` schema
- [ ] Support rule enablement/disablement per layer
- [ ] Custom thresholds (e.g., max `any` count, max issues)
- [ ] Custom patterns for security/architecture layers
- [ ] Merge with default configuration

**Example Config:**
```json
{
  "layers": {
    "types": {
      "enabled": true,
      "maxAnyUsages": 5,
      "checkTypeAssertions": true
    },
    "dependencies": {
      "enabled": true,
      "checkDeprecations": true,
      "checkVulnerabilities": true,
      "allowedDeprecated": ["moment"]
    },
    "architecture": {
      "enabled": true,
      "customRules": [
        {
          "name": "no-db-in-ui",
          "pattern": "packages/ui/**",
          "disallow": ["@snapback/db", "database"]
        }
      ]
    }
  },
  "thresholds": {
    "autoMergeConfidence": 0.90,
    "quickReviewConfidence": 0.70
  }
}
```

**Acceptance Criteria:**
- Config file loaded from project root
- Layers respect enabled/disabled settings
- Custom rules functional for architecture layer
- Backward compatible (works without config)

---

### Validation Checklist

**Before marking validate_code as 100%:**
- [ ] All 7 layers use AST/compiler API (no regex patterns)
- [ ] Dependency layer queries npm registry
- [ ] Security layer integrates with npm audit
- [ ] Test coverage uses instrumentation data
- [ ] Configuration system implemented
- [ ] Performance budgets validated (<500ms for 50KB files)
- [ ] Test coverage at 90%+ for all new code
- [ ] Documentation updated with examples
- [ ] Integration tests with real TypeScript projects

**Success Metrics:**
- False positive rate: <5%
- False negative rate: <10%
- Execution time: <500ms for typical files
- Confidence score accuracy: >85%

---

## Priority 1.2: validate_recommendation (70% → 100%)

**Current Status:** Layers 1-2 operational, Layer 3 stubbed
**Target:** Full 3-layer validation with migration guidance
**Estimated Effort:** 1-2 weeks (40-80 hours)
**ROI:** MEDIUM-HIGH - Replaces costly Context7, critical for safe upgrades

### Phase 1: Complete Layer 3 Migration Guidance (Week 1)

**Objective:** Integrate semantic pattern validator with breaking change detection

#### 1.1 Wire Up SemanticPatternValidator
**File:** `apps/mcp-server/src/services/HybridDocService.ts` (line 15 - currently stubbed)
**Tasks:**
- [ ] Remove `// TODO` comment
- [ ] Call `SemanticPatternValidator.scanCodeForPatterns()`
- [ ] Pass user code snippets (from git diff or file read)
- [ ] Match against migration patterns from `migration-patterns.json`
- [ ] Return detected deprecated patterns with fix suggestions

**Current Code (line 15):**
```typescript
// Layer 3: Semantic validation (TODO: integrate SemanticPatternValidator)
const semanticIssues: string[] = [];
```

**Updated Code:**
```typescript
// Layer 3: Semantic validation using SemanticPatternValidator
const validator = new SemanticPatternValidator();
const semanticIssues = await validator.validateUpgrade(
  packageName,
  currentVersion,
  targetVersion,
  userCode // Need to accept user code in function signature
);
```

**Acceptance Criteria:**
- `SemanticPatternValidator` integrated and called
- Detects patterns from `migration-patterns.json`
- Returns specific deprecated code locations
- Provides migration examples (before/after)

---

#### 1.2 Add User Code Input to Tool
**File:** `apps/mcp-server/src/index.ts` (lines 398-440)
**Tasks:**
- [ ] Update `ValidateRecommendationSchema` to accept optional `userCode` parameter
- [ ] Pass `userCode` to `validateRecommendation()`
- [ ] Document that Layer 3 is only active when `userCode` provided
- [ ] Return migration guidance in response

**Updated Schema:**
```typescript
const parsed = z
  .object({
    packageName: z.string(),
    targetVersion: z.string(),
    currentPackageJson: z.object({
      dependencies: z.record(z.string()).optional(),
      devDependencies: z.record(z.string()).optional(),
      peerDependencies: z.record(z.string()).optional(),
    }),
    userCode: z.string().optional(), // NEW: Optional code sample for Layer 3
    context: z
      .object({
        aiAssistant: z.string().optional(),
        recommendationReason: z.string().optional(),
      })
      .optional(),
  })
  .parse(args);
```

**Acceptance Criteria:**
- Tool accepts `userCode` parameter
- Layer 3 runs when code provided
- Returns detected patterns with fix suggestions
- Works without `userCode` (Layers 1-2 only)

---

### Phase 2: Expand Migration Patterns Library (Week 1-2)

**Objective:** Enrich `migration-patterns.json` with more libraries

#### 2.1 Add High-Impact Libraries
**File:** `apps/mcp-server/src/services/migration-patterns.json`
**Tasks:**
- [ ] Add patterns for React 16→17, 17→18 (already has 18)
- [ ] Add patterns for Vue 2→3
- [ ] Add patterns for Next.js 12→13→14
- [ ] Add patterns for Node.js 14→16→18→20
- [ ] Add patterns for Express 4→5
- [ ] Add patterns for TypeScript 4→5
- [ ] Add patterns for Jest 27→28→29
- [ ] Add patterns for Webpack 4→5
- [ ] Add patterns for ESLint 7→8→9

**Structure per library:**
```json
{
  "patterns": {
    "react": {
      "16->17": { "breaking_changes": [...], "new_features": [...] },
      "17->18": { "breaking_changes": [...], "new_features": [...] }
    },
    "vue": {
      "2->3": { "breaking_changes": [...], "new_features": [...] }
    }
  }
}
```

**Acceptance Criteria:**
- Patterns cover top 20 npm packages
- Each pattern has `deprecated`, `replacement`, `reason`, `severity`, `example_before`, `example_after`
- Patterns validated against official migration guides
- `codemod_available` field accurate

---

#### 2.2 Add Pattern Discovery via GitHub API
**File:** `apps/mcp-server/src/services/HybridDocService.ts` (enhancement)
**Tasks:**
- [ ] When no local pattern exists, search GitHub repo for `CHANGELOG.md`
- [ ] Parse `CHANGELOG.md` for "Breaking Changes" sections
- [ ] Extract breaking changes between version ranges
- [ ] Cache discovered patterns (7-day TTL)
- [ ] Update `migration-patterns.json` with discoveries (optional)

**Code Reference:**
```typescript
async function fetchBreakingChangesFromGitHub(
  packageName: string,
  fromVersion: string,
  toVersion: string
): Promise<BreakingChange[]> {
  // 1. Get GitHub repo from package metadata
  const repo = await this.getGitHubRepo(packageName);

  // 2. Fetch CHANGELOG.md
  const changelog = await this.githubClient.getFile(repo, 'CHANGELOG.md');

  // 3. Parse version sections
  const changes = this.parseChangelog(changelog, fromVersion, toVersion);

  // 4. Filter for "Breaking Changes" or "BREAKING:"
  return changes.filter(c => c.type === 'breaking');
}
```

**Acceptance Criteria:**
- Discovers breaking changes for packages not in local patterns
- Caches to avoid GitHub API rate limits
- Formats as `BreakingChange` objects
- Returns "No migration guidance available" if not found

---

### Phase 3: Type Signature Analysis Integration (Week 2)

**Objective:** Use TypeSignatureAnalyzer for API changes

#### 3.1 Compare Type Signatures
**File:** `apps/mcp-server/src/services/TypeSignatureAnalyzer.ts` (already exists, 300 lines)
**Tasks:**
- [ ] Call `TypeSignatureAnalyzer.compareVersions()` in Layer 3
- [ ] Detect function signature changes (params added/removed/reordered)
- [ ] Detect return type changes
- [ ] Detect property removals/additions on types
- [ ] Report as "API Surface Changes"

**Integration Point:**
```typescript
// In HybridDocService, Layer 3
const typeAnalyzer = new TypeSignatureAnalyzer();
const apiChanges = await typeAnalyzer.compareVersions(
  packageName,
  currentVersion,
  targetVersion
);

// Merge with semantic issues
semanticIssues.push(...apiChanges.map(c => c.description));
```

**Acceptance Criteria:**
- Detects type signature changes
- Reports parameter additions/removals
- Identifies return type changes
- Integrates with Layer 3 output

---

### Phase 4: Performance and Caching (Week 2)

**Objective:** Ensure <1s response time with caching

#### 4.1 Multi-Layer Cache Strategy
**File:** `apps/mcp-server/src/services/HybridDocService.ts`
**Tasks:**
- [ ] Implement in-memory cache for npm registry responses (24-hour TTL)
- [ ] Implement in-memory cache for GitHub API responses (7-day TTL)
- [ ] Implement disk cache for migration patterns (persistent)
- [ ] Add cache invalidation on version change
- [ ] Add metrics for cache hit rate

**Cache Keys:**
```typescript
{
  npmRegistry: `npm:${packageName}:${version}`,
  githubChangelog: `gh:${repo}:${fromVersion}-${toVersion}`,
  migrationPatterns: `patterns:${packageName}:${versionRange}`
}
```

**Acceptance Criteria:**
- Cache hit rate >70% after warmup
- Response time <500ms for cached requests
- Response time <2s for uncached requests
- Disk cache survives server restarts

---

### Validation Checklist

**Before marking validate_recommendation as 100%:**
- [ ] Layer 3 semantic validation fully integrated
- [ ] `migration-patterns.json` covers top 20 packages
- [ ] GitHub CHANGELOG parsing functional
- [ ] Type signature comparison integrated
- [ ] Cache hit rate >70%
- [ ] Response time <2s for all requests
- [ ] Test coverage at 90%+
- [ ] Documentation with examples
- [ ] Integration tests with real package upgrades

**Success Metrics:**
- Breaking change detection accuracy: >85%
- False positive rate: <10%
- Cache hit rate: >70%
- User satisfaction: >80% (from feedback)

---

## Priority 1.3: restore_snapshot (75% → 100%)

**Current Status:** Core restoration works, needs production hardening
**Target:** Production-grade reliability with conflict resolution
**Estimated Effort:** 1 week (40 hours)
**ROI:** MEDIUM-HIGH - Critical safety feature, needs testing investment

### Phase 1: Dry-Run Validation (Days 1-2)

**Objective:** Ensure dry-run mode works correctly

#### 1.1 Implement Dry-Run Preview
**File:** `apps/mcp-server/src/tools/restore-snapshot.ts`
**Tasks:**
- [ ] When `dryRun: true`, skip actual file writes
- [ ] Generate diff preview (line-by-line changes)
- [ ] Report files that would be created/modified/deleted
- [ ] Calculate total changes (lines added/removed)
- [ ] Return preview without modifying filesystem

**Code Enhancement:**
```typescript
export async function restoreSnapshot(
  snapshotId: string,
  files?: string[],
  dryRun: boolean = false
): Promise<RestoreResult> {
  const snapshot = await loadSnapshot(snapshotId);
  const changes: FileChange[] = [];

  for (const file of snapshot.files) {
    const currentContent = await readFile(file.path);
    const diff = calculateDiff(currentContent, file.content);

    changes.push({
      path: file.path,
      linesAdded: diff.added,
      linesRemoved: diff.removed,
      preview: diff.preview
    });

    if (!dryRun) {
      await writeFile(file.path, file.content);
    }
  }

  return {
    success: true,
    dryRun,
    changes,
    summary: `Would ${dryRun ? 'restore' : 'Restored'} ${changes.length} files`
  };
}
```

**Acceptance Criteria:**
- Dry-run returns preview without modifying files
- Preview shows line-by-line diffs
- Works for create/modify/delete operations
- Test coverage validates no file writes in dry-run

---

### Phase 2: Conflict Resolution Strategy (Days 2-3)

**Objective:** Handle conflicts when target files have changed since snapshot

#### 2.1 Conflict Detection
**Tasks:**
- [ ] Before restore, checksum current file vs snapshot origin
- [ ] If mismatch, file was modified since snapshot creation
- [ ] Report conflicts to user
- [ ] Provide resolution options:
  - `overwrite` - Replace with snapshot (default)
  - `skip` - Keep current file
  - `merge` - Attempt 3-way merge (advanced)

**Code Enhancement:**
```typescript
export interface RestoreOptions {
  snapshotId: string;
  files?: string[];
  dryRun?: boolean;
  conflictResolution?: 'overwrite' | 'skip' | 'merge'; // NEW
}

async function detectConflicts(
  snapshot: Snapshot
): Promise<ConflictReport[]> {
  const conflicts: ConflictReport[] = [];

  for (const file of snapshot.files) {
    const current = await readFile(file.path);
    const currentChecksum = calculateChecksum(current);

    // Check if current file matches snapshot's "origin" state
    if (currentChecksum !== file.originChecksum) {
      conflicts.push({
        path: file.path,
        reason: 'File modified since snapshot creation',
        currentChecksum,
        snapshotChecksum: file.contentChecksum
      });
    }
  }

  return conflicts;
}
```

**Acceptance Criteria:**
- Detects conflicts before restore
- Returns conflict report with affected files
- Supports `overwrite` and `skip` strategies
- Documents merge strategy as future enhancement

---

### Phase 3: Restore Validation (Days 3-4)

**Objective:** Verify restore completed successfully

#### 3.1 Post-Restore Checksums
**Tasks:**
- [ ] After restore, calculate checksums of restored files
- [ ] Compare against snapshot content checksums
- [ ] Report verification success/failure per file
- [ ] Rollback on verification failure (optional)

**Code Enhancement:**
```typescript
async function verifyRestore(
  snapshot: Snapshot,
  restoredFiles: string[]
): Promise<VerificationResult> {
  const results: FileVerification[] = [];

  for (const file of restoredFiles) {
    const content = await readFile(file);
    const checksum = calculateChecksum(content);
    const expected = snapshot.files.find(f => f.path === file)?.contentChecksum;

    results.push({
      path: file,
      verified: checksum === expected,
      checksum,
      expected
    });
  }

  return {
    allVerified: results.every(r => r.verified),
    results
  };
}
```

**Acceptance Criteria:**
- Checksums validated post-restore
- Returns verification report
- Fails restore if verification fails
- Logs verification failures for debugging

---

### Phase 4: Rollback on Failure (Days 4-5)

**Objective:** Restore to pre-restore state on failure

#### 4.1 Implement Restore Transaction
**Tasks:**
- [ ] Before restore, create temporary backup of current state
- [ ] Perform restore operations
- [ ] Verify checksums
- [ ] If verification fails, restore from temporary backup
- [ ] Clean up temporary backup on success

**Code Enhancement:**
```typescript
export async function restoreSnapshotWithRollback(
  options: RestoreOptions
): Promise<RestoreResult> {
  // Step 1: Create temporary backup
  const backupId = await createTemporaryBackup(options.files || []);

  try {
    // Step 2: Perform restore
    const result = await restoreSnapshot(options);

    // Step 3: Verify
    const verification = await verifyRestore(result.snapshot, result.restoredFiles);

    if (!verification.allVerified) {
      throw new Error('Restore verification failed');
    }

    // Step 4: Success - delete backup
    await deleteTemporaryBackup(backupId);
    return result;

  } catch (error) {
    // Step 5: Rollback from backup
    console.error('Restore failed, rolling back:', error);
    await restoreSnapshot({ snapshotId: backupId });
    throw error;
  }
}
```

**Acceptance Criteria:**
- Creates temporary backup before restore
- Rolls back on verification failure
- Cleans up backup on success
- No file corruption on failure

---

### Phase 5: Snapshot Version Compatibility (Day 5)

**Objective:** Ensure snapshot format compatibility

#### 5.1 Version Checking
**Tasks:**
- [ ] Add `version` field to snapshot metadata
- [ ] Check snapshot version before restore
- [ ] Reject incompatible snapshot versions
- [ ] Provide migration path for old snapshots (optional)

**Code Enhancement:**
```typescript
interface SnapshotMetadata {
  id: string;
  version: string; // NEW: e.g., "1.0", "2.0"
  createdAt: number;
  files: string[];
}

const CURRENT_SNAPSHOT_VERSION = "1.0";
const COMPATIBLE_VERSIONS = ["1.0"];

async function validateSnapshotVersion(
  snapshot: Snapshot
): Promise<void> {
  if (!COMPATIBLE_VERSIONS.includes(snapshot.version)) {
    throw new Error(
      `Incompatible snapshot version: ${snapshot.version}. ` +
      `Supported versions: ${COMPATIBLE_VERSIONS.join(', ')}`
    );
  }
}
```

**Acceptance Criteria:**
- All new snapshots include version field
- Restore checks version compatibility
- Rejects incompatible snapshots with clear error
- Documents migration path for version upgrades

---

### Phase 6: Integration Testing (Day 5)

**Objective:** Comprehensive testing of restore scenarios

#### 6.1 Test Scenarios
**File:** `apps/mcp-server/test/integration/restore-snapshot.test.ts` (new)
**Tasks:**
- [ ] Test dry-run preview (no file modifications)
- [ ] Test successful restore (all files)
- [ ] Test selective restore (specific files only)
- [ ] Test conflict detection and resolution
- [ ] Test rollback on verification failure
- [ ] Test version incompatibility rejection
- [ ] Test restore with missing files
- [ ] Test restore with permission errors

**Test Structure:**
```typescript
describe('Restore Snapshot - Integration Tests', () => {
  it('dry-run shows preview without modifying files');
  it('restores all files successfully');
  it('restores specific files only');
  it('detects conflicts and uses overwrite strategy');
  it('detects conflicts and uses skip strategy');
  it('rolls back on verification failure');
  it('rejects incompatible snapshot versions');
  it('handles missing snapshot gracefully');
  it('handles file permission errors');
});
```

**Acceptance Criteria:**
- 90%+ test coverage
- All scenarios passing
- Performance: <2s for typical snapshot restore
- No flaky tests

---

### Validation Checklist

**Before marking restore_snapshot as 100%:**
- [ ] Dry-run mode fully functional and tested
- [ ] Conflict detection working
- [ ] Overwrite and skip strategies implemented
- [ ] Post-restore verification with checksums
- [ ] Rollback on failure functional
- [ ] Snapshot version compatibility checking
- [ ] Integration tests at 90%+ coverage
- [ ] Performance validated (<2s for typical restore)
- [ ] Documentation with conflict resolution examples
- [ ] Production testing on real snapshots

**Success Metrics:**
- Restore success rate: >99%
- Rollback success rate: 100% on verification failure
- No data loss incidents
- User confidence: >90%

---

## Summary of Implementation Plans

| Tool | Current | Target | Effort | Key Phases |
|------|---------|--------|--------|-----------|
| **validate_code** | 65% | 100% | 2-3 weeks | TypeScript compiler, npm registry, AST analysis, config |
| **validate_recommendation** | 70% | 100% | 1-2 weeks | Layer 3 integration, pattern library, caching |
| **restore_snapshot** | 75% | 100% | 1 week | Dry-run, conflict resolution, validation, rollback |

**Total Estimated Effort:** 4-6 weeks (160-240 hours)

**Suggested Sequencing:**
1. **Week 1:** restore_snapshot (highest ROI, shortest timeline)
2. **Week 2-3:** validate_recommendation (Context7 replacement, cost savings)
3. **Week 4-6:** validate_code (most complex, foundational for quality)

**Resource Requirements:**
- 1 senior engineer (full-time)
- Access to npm registry API (free)
- Access to GitHub API (authenticated, free tier OK)
- TypeScript expertise
- Testing infrastructure (Vitest/Jest)

**Risk Factors:**
- npm API rate limits (mitigate with caching)
- GitHub API rate limits (mitigate with caching)
- TypeScript compiler performance (mitigate with lazy loading)
- Pattern library maintenance (mitigate with automated discovery)

---

**Next Steps:**
1. Review and approve plans
2. Prioritize by ROI and dependencies
3. Assign resources
4. Begin implementation with restore_snapshot (quickest win)
