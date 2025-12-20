# AI Pair Programmer System - Comprehensive Test Specification

**System:** `ai_dev_utils/` + Codebase MCP
**Purpose:** Ensure accuracy and efficiency of self-learning pair programmer
**Critical Metric:** System must improve AI coding assistant accuracy from ~70% to 95%

---

## Table of Contents

1. [MCP Tool Tests](#1-mcp-tool-tests)
2. [Gate Runner Tests](#2-gate-runner-tests)
3. [Router System Tests](#3-router-system-tests)
4. [Learning Loop Tests](#4-learning-loop-tests)
5. [Context Retrieval Accuracy Tests](#5-context-retrieval-accuracy-tests)
6. [Token Efficiency Tests](#6-token-efficiency-tests)
7. [Integration Tests](#7-integration-tests)
8. [Edge Cases & Failure Modes](#8-edge-cases--failure-modes)
9. [Performance Tests](#9-performance-tests)
10. [Library Integration Tests](#10-library-integration-tests)
11. [Regression Tests](#11-regression-tests)
12. [Security Tests](#12-security-tests)

---

## 1. MCP Tool Tests

### 1.1 `codebase:get_context`

#### 1.1.1 Basic Functionality
| Test ID | Scenario | Input | Expected Output | Priority |
|---------|----------|-------|-----------------|----------|
| MCP-CTX-001 | Returns context for valid task | `{ task: "add auth to MCP" }` | Non-empty context with relevant sections | P0 |
| MCP-CTX-002 | Filters by file path | `{ task: "fix bug", files: ["apps/vscode/"] }` | Context only from VS Code extension docs | P0 |
| MCP-CTX-003 | Filters by keywords | `{ task: "fix", keywords: ["snapshot", "restore"] }` | Context containing snapshot/restore patterns | P0 |
| MCP-CTX-004 | Combines file + keyword filters | `{ task: "x", files: ["apps/api/"], keywords: ["service"] }` | Intersection of both filters | P1 |
| MCP-CTX-005 | Returns learnings when relevant | `{ task: "vitest config", keywords: ["test"] }` | Includes L004 about @snapback/vitest-config | P0 |
| MCP-CTX-006 | Returns violations when relevant | `{ task: "add service", files: ["apps/api/src/services/"] }` | Includes MISSING_SERVICE_LOCATION pattern | P0 |

#### 1.1.2 Relevance Accuracy
| Test ID | Scenario | Input | Expected | Acceptance Criteria |
|---------|----------|-------|----------|---------------------|
| MCP-CTX-010 | High relevance for exact match | `{ task: "DBSCAN clustering" }` | Returns clustering docs | ≥90% precision |
| MCP-CTX-011 | Semantic relevance | `{ task: "group similar changes" }` | Returns session grouping docs | ≥80% precision |
| MCP-CTX-012 | No false positives | `{ task: "unrelated random task" }` | Returns general patterns only, not specific | ≤10% noise |
| MCP-CTX-013 | Cross-reference accuracy | `{ task: "snapshot creation", files: ["packages/core/"] }` | Returns both core patterns AND snapshot patterns | Both present |

#### 1.1.3 Edge Cases
| Test ID | Scenario | Input | Expected Behavior |
|---------|----------|-------|-------------------|
| MCP-CTX-020 | Empty task | `{ task: "" }` | Returns error or general context |
| MCP-CTX-021 | Very long task | `{ task: "[2000 char string]" }` | Handles gracefully, extracts keywords |
| MCP-CTX-022 | Special characters in task | `{ task: "fix <script>alert(1)</script>" }` | Sanitizes input, no injection |
| MCP-CTX-023 | Non-existent file path | `{ files: ["nonexistent/path/"] }` | Returns empty or fallback context |
| MCP-CTX-024 | Unicode in keywords | `{ keywords: ["日本語", "émoji 🚀"] }` | Handles gracefully |
| MCP-CTX-025 | Null/undefined parameters | `{ task: null }` | Returns error message |

---

### 1.2 `codebase:check_patterns`

#### 1.2.1 Pattern Detection
| Test ID | Scenario | Input | Expected Output | Priority |
|---------|----------|-------|-----------------|----------|
| MCP-PAT-001 | Detects vague assertion | Code with `.toBeTruthy()` | Returns VAGUE_ASSERTION violation | P0 |
| MCP-PAT-002 | Detects console.log | Code with `console.log()` | Returns CONSOLE_LOG violation | P0 |
| MCP-PAT-003 | Detects missing error handling | Async code without try/catch | Returns MISSING_ERROR_HANDLING | P1 |
| MCP-PAT-004 | Passes clean code | Well-written code | Returns empty violations array | P0 |
| MCP-PAT-005 | Detects layer violation | Core importing from API | Returns LAYER_VIOLATION | P0 |
| MCP-PAT-006 | Detects service bypass | Direct DB call outside service | Returns SERVICE_BYPASS | P1 |

#### 1.2.2 False Positive Prevention
| Test ID | Scenario | Input | Expected |
|---------|----------|-------|----------|
| MCP-PAT-010 | console.log in test file | `*.test.ts` with console.log | NO violation (tests allowed) |
| MCP-PAT-011 | toBeTruthy for boolean | `expect(isValid).toBeTruthy()` for actual boolean | Context-aware: maybe warn |
| MCP-PAT-012 | Intentional any type | `// @ts-expect-error` above any | NO violation |
| MCP-PAT-013 | Logger vs console | `logger.info()` | NO violation |

#### 1.2.3 Multi-Pattern Detection
| Test ID | Scenario | Input | Expected |
|---------|----------|-------|----------|
| MCP-PAT-020 | Multiple violations in one file | Code with 3 different issues | Returns all 3 violations |
| MCP-PAT-021 | Same violation multiple times | 5 vague assertions | Returns 5 separate entries or grouped |
| MCP-PAT-022 | Nested violations | Layer violation inside untested code | Returns both violations |

---

### 1.3 `codebase:report_violation`

#### 1.3.1 Storage
| Test ID | Scenario | Input | Expected |
|---------|----------|-------|----------|
| MCP-VIO-001 | Creates JSONL entry | Valid violation object | Appends to violations.jsonl |
| MCP-VIO-002 | Includes timestamp | Any violation | Entry has ISO date |
| MCP-VIO-003 | Includes all fields | Full violation object | All fields persisted |
| MCP-VIO-004 | Handles missing optional fields | Violation without `file` | Stores with null/undefined |

#### 1.3.2 Auto-Promotion Triggers
| Test ID | Scenario | Setup | Expected |
|---------|----------|-------|----------|
| MCP-VIO-010 | 3x triggers promotion | Report same type 3x | codebase-patterns.md updated |
| MCP-VIO-011 | 5x triggers automation | Report same type 5x | 🤖 badge added |
| MCP-VIO-012 | Different types don't combine | 2x type A, 2x type B | Neither promoted |
| MCP-VIO-013 | Already promoted doesn't re-promote | Report promoted type | No duplicate in patterns.md |

#### 1.3.3 Validation
| Test ID | Scenario | Input | Expected |
|---------|----------|-------|----------|
| MCP-VIO-020 | Missing required field | `{ message: "x" }` (no type) | Error response |
| MCP-VIO-021 | Invalid type | `{ type: 123 }` | Error response |
| MCP-VIO-022 | XSS in message | `{ message: "<script>..." }` | Sanitized storage |

---

### 1.4 `codebase:record_learning`

#### 1.4.1 Storage
| Test ID | Scenario | Input | Expected |
|---------|----------|-------|----------|
| MCP-LRN-001 | Creates JSONL entry | Valid learning | Appends to learnings.jsonl |
| MCP-LRN-002 | Auto-generates ID | Learning without ID | L00X ID assigned |
| MCP-LRN-003 | Stores tags | `{ tags: ["test", "config"] }` | Tags searchable |
| MCP-LRN-004 | Stores context | `{ context: "extension-activation" }` | Context filterable |

#### 1.4.2 Retrieval Integration
| Test ID | Scenario | Setup | Expected |
|---------|----------|-------|----------|
| MCP-LRN-010 | New learning appears in get_context | Record learning about X | get_context for X returns it |
| MCP-LRN-011 | Tag-based retrieval | Record with tags | query_learnings by tag finds it |

---

### 1.5 `codebase:get_violations_summary`

| Test ID | Scenario | Setup | Expected |
|---------|----------|-------|----------|
| MCP-SUM-001 | Returns counts by type | 10 violations, 3 types | Grouped counts |
| MCP-SUM-002 | Shows promotion status | Mix of promoted/not | Status column accurate |
| MCP-SUM-003 | Shows automation status | 5x+ violation | 🤖 indicator |
| MCP-SUM-004 | Empty state | No violations | Empty summary or message |
| MCP-SUM-005 | Large dataset | 1000+ violations | Returns in <100ms |

---

### 1.6 `codebase:query_learnings`

| Test ID | Scenario | Input | Expected |
|---------|----------|-------|----------|
| MCP-QLN-001 | Search by keyword | `{ query: "vitest" }` | Returns vitest learnings |
| MCP-QLN-002 | Filter by context | `{ context: "extension" }` | Only extension learnings |
| MCP-QLN-003 | Filter by tags | `{ tags: ["config"] }` | Only config-tagged |
| MCP-QLN-004 | Combine filters | `{ query: "test", context: "api" }` | Intersection |
| MCP-QLN-005 | No results | `{ query: "nonexistent12345" }` | Empty array, not error |

---

## 2. Gate Runner Tests

### 2.1 Phase Execution

| Test ID | Phase | Scenario | Expected |
|---------|-------|----------|----------|
| GATE-001 | audit | Valid audit completed | Passes, logs evidence |
| GATE-002 | audit | Missing service search | Fails with MISSING_SERVICE_SEARCH |
| GATE-003 | red | Test fails as expected | Passes |
| GATE-004 | red | Test passes (should fail) | Fails with TEST_PASSED_IN_RED_PHASE |
| GATE-005 | red | Vague assertion detected | Fails with VAGUE_ASSERTION |
| GATE-006 | green | All tests pass | Passes |
| GATE-007 | green | Tests still failing | Fails with TESTS_NOT_PASSING |
| GATE-008 | refactor | Tests still pass after refactor | Passes |
| GATE-009 | refactor | Refactor broke tests | Fails with REFACTOR_BROKE_TESTS |
| GATE-010 | quality | Coverage meets threshold | Passes |
| GATE-011 | quality | Coverage below threshold | Fails with INCOMPLETE_COVERAGE |
| GATE-012 | certify | All quality gates pass | Passes, updates ARCHITECTURE.md |

### 2.2 Violation Detection Accuracy

| Test ID | Violation Type | Test Code | Expected Detection |
|---------|---------------|-----------|-------------------|
| GATE-DET-001 | VAGUE_ASSERTION | `expect(x).toBeTruthy()` | ✓ Detected |
| GATE-DET-002 | VAGUE_ASSERTION | `expect(x).toBeDefined()` | ✓ Detected |
| GATE-DET-003 | VAGUE_ASSERTION | `expect(x).toBeNull()` | ✓ Detected |
| GATE-DET-004 | VAGUE_ASSERTION | `expect(x).toEqual(expected)` | ✗ Not flagged |
| GATE-DET-005 | CONSOLE_LOG | `console.log("debug")` | ✓ Detected |
| GATE-DET-006 | CONSOLE_LOG | `logger.info("debug")` | ✗ Not flagged |
| GATE-DET-007 | LAYER_VIOLATION | Core imports API | ✓ Detected |
| GATE-DET-008 | LAYER_VIOLATION | API imports Core | ✗ Not flagged (correct direction) |

### 2.3 Auto-Promotion Logic

| Test ID | Scenario | Setup | Expected |
|---------|----------|-------|----------|
| GATE-PROMO-001 | First occurrence | New violation type | Stored, count = 1 |
| GATE-PROMO-002 | Second occurrence | Same type again | Count = 2, not promoted |
| GATE-PROMO-003 | Third occurrence | Same type again | Count = 3, PROMOTED to patterns.md |
| GATE-PROMO-004 | Fourth occurrence | Same type again | Count = 4, already promoted |
| GATE-PROMO-005 | Fifth occurrence | Same type again | Count = 5, AUTOMATED flag added |
| GATE-PROMO-006 | Pattern ID assignment | New promotion | Gets next AP-XXX ID |
| GATE-PROMO-007 | Multiple promotions same run | 2 types hit 3x | Both promoted |

### 2.4 State Management

| Test ID | Scenario | Action | Expected |
|---------|----------|--------|----------|
| GATE-STATE-001 | Task initialization | Start new task | current-task.json created |
| GATE-STATE-002 | Phase progression | Complete phase | completedPhases updated |
| GATE-STATE-003 | Evidence storage | Pass audit | evidence.auditSearchLog saved |
| GATE-STATE-004 | Violation storage | Fail gate | violations array updated |
| GATE-STATE-005 | Resume after crash | Restart mid-task | Resumes from last phase |
| GATE-STATE-006 | Clear state | Complete task | State reset for next task |

---

## 3. Router System Tests

### 3.1 Task Classification

| Test ID | Input Task | Expected Classification | Signal Words |
|---------|-----------|------------------------|--------------|
| ROUTE-001 | "fix the login button" | BUG_FIX | "fix" |
| ROUTE-002 | "add user authentication" | NEW_FEATURE | "add" |
| ROUTE-003 | "refactor the service layer" | REFACTORING | "refactor" |
| ROUTE-004 | "investigate memory leak" | INVESTIGATION | "investigate" |
| ROUTE-005 | "update dependencies" | MAINTENANCE | "update", "dependencies" |
| ROUTE-006 | "improve performance of X" | PERFORMANCE | "improve", "performance" |
| ROUTE-007 | "document the API" | DOCUMENTATION | "document" |
| ROUTE-008 | "review PR #123" | CODE_REVIEW | "review", "PR" |

### 3.2 Workflow Assignment

| Test ID | Classification | Expected Workflow | Files Loaded |
|---------|---------------|-------------------|--------------|
| ROUTE-WF-001 | BUG_FIX | workflow-1-bugfix.md | Phases 1-5 |
| ROUTE-WF-002 | NEW_FEATURE | workflow-2-feature.md | Phases 0-5 |
| ROUTE-WF-003 | REFACTORING | workflow-5-refactoring.md | Phases 0-5 |
| ROUTE-WF-004 | INVESTIGATION | workflow-6-investigation.md | Phase 0 only |

### 3.3 Ambiguous Task Handling

| Test ID | Input Task | Expected Behavior |
|---------|-----------|-------------------|
| ROUTE-AMB-001 | "fix and add feature" | Classify as primary (first signal) or ask |
| ROUTE-AMB-002 | "make it better" | Request clarification |
| ROUTE-AMB-003 | "" (empty) | Request task description |
| ROUTE-AMB-004 | "asdfghjkl" | Request clarification |

---

## 4. Learning Loop Tests

### 4.1 Violation → Pattern Pipeline

| Test ID | Stage | Input | Output |
|---------|-------|-------|--------|
| LOOP-001 | Detection | Code with issue | Violation logged |
| LOOP-002 | Storage | Violation object | JSONL entry created |
| LOOP-003 | Counting | Same type 3x | Count accurate |
| LOOP-004 | Promotion | Count = 3 | codebase-patterns.md updated |
| LOOP-005 | Automation | Count = 5 | Gate check added |
| LOOP-006 | Prevention | AI queries context | Pattern returned |
| LOOP-007 | Avoidance | AI sees pattern | Doesn't make mistake |

### 4.2 Learning → Context Pipeline

| Test ID | Stage | Input | Output |
|---------|-------|-------|--------|
| LOOP-LRN-001 | Recording | Learning object | JSONL entry |
| LOOP-LRN-002 | Indexing | New learning | Searchable immediately |
| LOOP-LRN-003 | Retrieval | Relevant query | Learning returned |
| LOOP-LRN-004 | Application | AI sees learning | Applies insight |

### 4.3 Feedback Loop Closure

| Test ID | Scenario | Steps | Verification |
|---------|----------|-------|--------------|
| LOOP-CLOSE-001 | Full cycle | Make mistake → detect → promote → prevent | Same mistake not made again |
| LOOP-CLOSE-002 | Cross-session | Learn in session 1 | Available in session 2 |
| LOOP-CLOSE-003 | Cross-AI | Learn via Cursor | Available in Qoder |

---

## 5. Context Retrieval Accuracy Tests

### 5.1 Precision Tests

| Test ID | Query | Expected Results | Precision Target |
|---------|-------|------------------|------------------|
| CTX-PREC-001 | "snapshot creation" | Snapshot-related patterns | ≥90% |
| CTX-PREC-002 | "extension activation" | VS Code extension patterns | ≥90% |
| CTX-PREC-003 | "database migration" | Drizzle ORM patterns | ≥85% |
| CTX-PREC-004 | "API endpoint" | oRPC patterns | ≥85% |
| CTX-PREC-005 | "clustering algorithm" | DBSCAN patterns | ≥90% |

### 5.2 Recall Tests

| Test ID | Query | Must Include | Recall Target |
|---------|-------|--------------|---------------|
| CTX-REC-001 | "vitest config" | L004 learning | 100% |
| CTX-REC-002 | "service layer" | AP-001 pattern | 100% |
| CTX-REC-003 | "vague assertion" | AP-002 pattern | 100% |
| CTX-REC-004 | "layer boundaries" | C-001 constraint | 100% |

### 5.3 Semantic Understanding

| Test ID | Query (Synonym) | Actual Content | Should Match |
|---------|----------------|----------------|--------------|
| CTX-SEM-001 | "group similar changes" | "session clustering" | ✓ Yes |
| CTX-SEM-002 | "undo code changes" | "rollback/restore" | ✓ Yes |
| CTX-SEM-003 | "save point" | "checkpoint/snapshot" | ✓ Yes |
| CTX-SEM-004 | "code protection" | "SnapBack" | ✓ Yes |

---

## 6. Token Efficiency Tests

### 6.1 Context Size Reduction

| Test ID | Scenario | Full Context | Filtered Context | Reduction |
|---------|----------|--------------|------------------|-----------|
| TOK-001 | Specific file task | 11,000 tokens | <2,000 tokens | ≥80% |
| TOK-002 | Broad task | 11,000 tokens | <4,000 tokens | ≥60% |
| TOK-003 | Unknown task | 11,000 tokens | ~3,000 tokens | ~70% |

### 6.2 Prompt Caching (When Implemented)

| Test ID | Scenario | First Call | Cached Call | Savings |
|---------|----------|------------|-------------|---------|
| TOK-CACHE-001 | Same static context | Full price | 10% price | 90% |
| TOK-CACHE-002 | Context within 5 min | Full price | 10% price | 90% |
| TOK-CACHE-003 | Context after 30 min | Full price | Full price | 0% |

### 6.3 Semantic Retrieval (When Implemented)

| Test ID | Query | Vector Search Results | Relevance |
|---------|-------|----------------------|-----------|
| TOK-VEC-001 | Technical query | Top 5 chunks | ≥80% relevant |
| TOK-VEC-002 | Ambiguous query | Top 5 chunks | ≥60% relevant |

---

## 7. Integration Tests

### 7.1 End-to-End Workflows

| Test ID | Workflow | Steps | Success Criteria |
|---------|----------|-------|------------------|
| INT-E2E-001 | Bug fix with TDD | Audit→Red→Green→Refactor→Quality→Certify | All gates pass |
| INT-E2E-002 | New feature | Full workflow with feature branch | Feature works, tests pass |
| INT-E2E-003 | Violation recovery | Make mistake→Detect→Log→Retry→Pass | System recovers |
| INT-E2E-004 | Cross-session continuity | Start task→Close→Resume | State preserved |

### 7.2 MCP + Gate Runner Integration

| Test ID | Scenario | MCP Action | Gate Runner Action | Expected |
|---------|----------|------------|-------------------|----------|
| INT-MCP-001 | Context before implementation | get_context | N/A | Context returned |
| INT-MCP-002 | Violation during red phase | N/A | Detect violation | Both log violation |
| INT-MCP-003 | Report via MCP | report_violation | Check promotion | Both update counts |
| INT-MCP-004 | Promotion sync | N/A | Promote pattern | MCP sees new pattern |

### 7.3 AI Assistant Integration

| Test ID | AI Tool | Scenario | Expected Behavior |
|---------|---------|----------|-------------------|
| INT-AI-001 | Cursor | New task | Calls get_context first |
| INT-AI-002 | Qoder | New task | Calls get_context first |
| INT-AI-003 | Claude Desktop | New task | Calls get_context first |
| INT-AI-004 | Any | Mistake made | Calls report_violation |
| INT-AI-005 | Any | Success | Calls record_learning |

---

## 8. Edge Cases & Failure Modes

### 8.1 File System Issues

| Test ID | Scenario | Expected Behavior |
|---------|----------|-------------------|
| EDGE-FS-001 | violations.jsonl doesn't exist | Create it |
| EDGE-FS-002 | violations.jsonl is corrupted | Backup and recreate |
| EDGE-FS-003 | Disk full | Error message, no data loss |
| EDGE-FS-004 | File locked by another process | Retry or queue |
| EDGE-FS-005 | Permission denied | Clear error message |

### 8.2 Concurrent Access

| Test ID | Scenario | Expected Behavior |
|---------|----------|-------------------|
| EDGE-CONC-001 | Two AIs report violation simultaneously | Both stored, no corruption |
| EDGE-CONC-002 | Gate runner + MCP write same time | Atomic writes, no race |
| EDGE-CONC-003 | Read during write | Consistent read or wait |

### 8.3 Invalid Input

| Test ID | Tool | Invalid Input | Expected |
|---------|------|---------------|----------|
| EDGE-INV-001 | get_context | `task: null` | Error message |
| EDGE-INV-002 | check_patterns | `code: [object]` | Error message |
| EDGE-INV-003 | report_violation | Missing `type` | Validation error |
| EDGE-INV-004 | record_learning | 1MB learning text | Truncate or reject |
| EDGE-INV-005 | Any | SQL injection attempt | Sanitized, no effect |
| EDGE-INV-006 | Any | Path traversal `../../../etc/passwd` | Blocked |

### 8.4 MCP Server Issues

| Test ID | Scenario | Expected Behavior |
|---------|----------|-------------------|
| EDGE-MCP-001 | MCP server not running | Clear error, fallback to @ROUTER.md |
| EDGE-MCP-002 | MCP server crashes mid-call | Timeout, retry |
| EDGE-MCP-003 | MCP returns malformed JSON | Parse error handling |
| EDGE-MCP-004 | MCP takes >5s to respond | Timeout, log slow call |

### 8.5 State Corruption

| Test ID | Scenario | Expected Behavior |
|---------|----------|-------------------|
| EDGE-STATE-001 | current-task.json invalid JSON | Reset to default |
| EDGE-STATE-002 | Phase out of order | Detect and warn |
| EDGE-STATE-003 | Missing state file mid-task | Recover from last known |

---

## 9. Performance Tests

### 9.1 Response Time

| Test ID | Operation | Target | Max Acceptable |
|---------|-----------|--------|----------------|
| PERF-001 | get_context | <100ms | <500ms |
| PERF-002 | check_patterns (100 lines) | <50ms | <200ms |
| PERF-003 | check_patterns (1000 lines) | <200ms | <1s |
| PERF-004 | report_violation | <50ms | <200ms |
| PERF-005 | get_violations_summary | <50ms | <200ms |
| PERF-006 | query_learnings | <50ms | <200ms |
| PERF-007 | Gate runner (single phase) | <2s | <5s |
| PERF-008 | Full promotion check | <500ms | <2s |

### 9.2 Scale Tests

| Test ID | Scale | Operation | Expected |
|---------|-------|-----------|----------|
| PERF-SCALE-001 | 1000 violations | get_summary | <100ms |
| PERF-SCALE-002 | 500 learnings | query_learnings | <100ms |
| PERF-SCALE-003 | 100 patterns | check_patterns | <200ms |
| PERF-SCALE-004 | 10MB JSONL file | Read operations | <500ms |

### 9.3 Memory Usage

| Test ID | Operation | Max Memory |
|---------|-----------|------------|
| PERF-MEM-001 | MCP server idle | <50MB |
| PERF-MEM-002 | MCP server active | <200MB |
| PERF-MEM-003 | Gate runner | <100MB |
| PERF-MEM-004 | Large file check | <500MB |

---

## 10. Library Integration Tests

### 10.1 atomically

| Test ID | Scenario | Expected |
|---------|----------|----------|
| LIB-ATOM-001 | Normal write | File written correctly |
| LIB-ATOM-002 | Process crash during write | No partial file |
| LIB-ATOM-003 | Disk full during write | Clean error, no corruption |
| LIB-ATOM-004 | Concurrent writes | All writes succeed, order preserved |

### 10.2 p-retry

| Test ID | Scenario | Expected |
|---------|----------|----------|
| LIB-RETRY-001 | First attempt succeeds | Returns immediately |
| LIB-RETRY-002 | Second attempt succeeds | Retries once, returns |
| LIB-RETRY-003 | All attempts fail | Throws after max retries |
| LIB-RETRY-004 | Exponential backoff | Delays increase correctly |
| LIB-RETRY-005 | AbortError | Stops retrying immediately |

### 10.3 bottleneck

| Test ID | Scenario | Expected |
|---------|----------|----------|
| LIB-RATE-001 | Under limit | All requests immediate |
| LIB-RATE-002 | At limit | Requests queued |
| LIB-RATE-003 | Over limit | Backpressure applied |
| LIB-RATE-004 | Queue full | Oldest or error |

### 10.4 ml-dbscan

| Test ID | Scenario | Expected |
|---------|----------|----------|
| LIB-DBS-001 | Clear clusters | Correct grouping |
| LIB-DBS-002 | Noise points | Identified as noise |
| LIB-DBS-003 | epsilon = 0 | Each point own cluster |
| LIB-DBS-004 | minPts = 1 | All points clustered |
| LIB-DBS-005 | Large dataset (10k) | <1s execution |
| LIB-DBS-006 | Empty dataset | Empty result, no crash |

### 10.5 chokidar (CLI surface)

| Test ID | Scenario | Expected |
|---------|----------|----------|
| LIB-CHOK-001 | File change | Event fired |
| LIB-CHOK-002 | File create | Event fired |
| LIB-CHOK-003 | File delete | Event fired |
| LIB-CHOK-004 | Rename | Both delete and create |
| LIB-CHOK-005 | Dotfile change | Ignored (per config) |
| LIB-CHOK-006 | node_modules change | Ignored |
| LIB-CHOK-007 | Symlink change | Handled correctly |

---

## 11. Regression Tests

### 11.1 Known Bug Fixes

| Test ID | Bug Description | Test Case |
|---------|----------------|-----------|
| REG-001 | UI not updating after snapshot | Create snapshot, verify tree refresh |
| REG-002 | Events on wrong bus | Check SnapBackEventBus receives events |
| REG-003 | AutoDecision bypassing coordinator | Verify coordinator.coordinateSnapshotCreation called |

### 11.2 Previously Promoted Patterns

| Test ID | Pattern ID | Still Detected |
|---------|------------|----------------|
| REG-PAT-001 | AP-001 (Missing Service Location) | ✓ |
| REG-PAT-002 | AP-002 (Vague Assertion) | ✓ |
| REG-PAT-003 | AP-003 (Incomplete Coverage) | ✓ |

---

## 12. Security Tests

### 12.1 Input Sanitization

| Test ID | Attack Vector | Input | Expected |
|---------|--------------|-------|----------|
| SEC-001 | Path traversal | `../../etc/passwd` | Blocked |
| SEC-002 | Command injection | `; rm -rf /` | Sanitized |
| SEC-003 | XSS in violation | `<script>alert(1)</script>` | Escaped |
| SEC-004 | JSON injection | `{"__proto__": {}}` | Safe parsing |
| SEC-005 | Regex DoS | `(a+)+$` pattern | Timeout protection |

### 12.2 File Access

| Test ID | Scenario | Expected |
|---------|----------|----------|
| SEC-FILE-001 | Read outside project | Denied |
| SEC-FILE-002 | Write outside ai_dev_utils | Denied |
| SEC-FILE-003 | Execute arbitrary command | Denied |

### 12.3 MCP Security

| Test ID | Scenario | Expected |
|---------|----------|----------|
| SEC-MCP-001 | Unauthorized tool call | Rejected |
| SEC-MCP-002 | Tool with excessive permissions | Sandboxed |
| SEC-MCP-003 | Sensitive data in response | Redacted or excluded |

---

## Test Execution Plan

### Priority Order

1. **P0 (Blocking)**: MCP-CTX-001 through MCP-CTX-006, GATE-001 through GATE-012
2. **P1 (Critical)**: All accuracy tests, integration tests
3. **P2 (Important)**: Edge cases, performance tests
4. **P3 (Nice to have)**: Scale tests, security hardening

### Automation Strategy

```bash
# Unit tests (Vitest)
pnpm --filter ai-dev-utils test

# Integration tests
pnpm --filter ai-dev-utils test:integration

# Performance benchmarks
pnpm --filter ai-dev-utils bench

# Full test suite
pnpm --filter ai-dev-utils test:all
```

### Coverage Targets

| Component | Line Coverage | Branch Coverage |
|-----------|---------------|-----------------|
| MCP Tools | ≥90% | ≥85% |
| Gate Runner | ≥95% | ≥90% |
| Router Logic | ≥90% | ≥85% |
| Learning Loop | ≥90% | ≥85% |

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| AI accuracy (task completion) | ~70% | 95% | Manual tracking |
| Context relevance | Unknown | ≥85% | Precision/recall tests |
| Token efficiency | 0% reduction | 80% reduction | Before/after comparison |
| Violation detection rate | Unknown | ≥95% | Known bad code tests |
| False positive rate | Unknown | ≤5% | Clean code tests |
| Response latency (p95) | Unknown | <500ms | Performance tests |
| System uptime | Unknown | 99.9% | Monitoring |

---

## Appendix: Test Data Fixtures

### Sample Violations
```json
{"date":"2025-12-20","type":"VAGUE_ASSERTION","file":"test.ts","message":"Used toBeTruthy","prevention":"Use toEqual with specific value"}
{"date":"2025-12-20","type":"MISSING_SERVICE_LOCATION","file":"api.ts","message":"Service not in services/","prevention":"Check services/ first"}
```

### Sample Learnings
```json
{"id":"L001","context":"extension","learning":"Use @snapback/vitest-config","tags":["test","config"]}
{"id":"L002","context":"api","learning":"Services in apps/api/src/services/","tags":["architecture","api"]}
```

### Sample Clean Code (Should Pass)
```typescript
import { describe, it, expect } from 'vitest';

describe('UserService', () => {
  it('should return user by id', async () => {
    const user = await userService.getById('123');
    expect(user).toEqual({ id: '123', name: 'Test User' });
  });
});
```

### Sample Bad Code (Should Fail)
```typescript
import { describe, it, expect } from 'vitest';

describe('UserService', () => {
  it('should return user', async () => {
    const user = await userService.getById('123');
    console.log(user); // VIOLATION: CONSOLE_LOG
    expect(user).toBeTruthy(); // VIOLATION: VAGUE_ASSERTION
  });
});
```
