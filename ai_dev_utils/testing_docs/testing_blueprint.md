# SnapBack Testing Blueprint

**Version**: 1.0
**Purpose**: Definitive testing reference for all systems
**Structure**: Test Pyramid → Happy/Sad/Edge/Error → Cross-System

---

## Table of Contents

1. [Test Pyramid Overview](#1-test-pyramid-overview)
2. [VS Code Extension Tests](#2-vs-code-extension-tests)
3. [MCP Server Tests](#3-mcp-server-tests)
4. [CLI Tests](#4-cli-tests)
5. [Web Dashboard Tests](#5-web-dashboard-tests)
6. [API/Backend Tests](#6-apibackend-tests)
7. [Cross-System Tests](#7-cross-system-tests)
8. [LLM Agent Rules](#8-llm-agent-rules)

---

# 1. Test Pyramid Overview

```
                    ┌─────────────┐
                    │    E2E      │  5-10% (Slow, Expensive)
                    │  Playwright │
                 ┌──┴─────────────┴──┐
                 │   Integration     │  20-30% (Medium)
                 │  Cross-Component  │
              ┌──┴───────────────────┴──┐
              │        Unit Tests       │  60-70% (Fast, Cheap)
              │  Functions, Classes     │
              └─────────────────────────┘
```

**Coverage Targets**:
- Unit: 80%+ per package
- Integration: Critical paths only
- E2E: Activation funnel + demo paths

---

# 2. VS Code Extension Tests

## 2.1 Unit Tests (apps/vscode/test/unit/)

### Storage Layer

#### CooldownCache
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| CC-01 | Set and retrieve cooldown | Happy | Basic storage works |
| CC-02 | Expired cooldown returns null | Happy | TTL expiration |
| CC-03 | Different protection levels independent | Edge | Key isolation |
| CC-04 | Clear all cooldowns | Happy | Bulk clear |
| CC-05 | Concurrent access same key | Edge | Race condition safety |
| CC-06 | Negative TTL rejected | Error | Invalid input |
| CC-07 | Empty string path rejected | Error | Validation |

**Related**: BlobStore (content source), SessionStore (session context)

#### BlobStore
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| BS-01 | Store content, retrieve by hash | Happy | Core functionality |
| BS-02 | Duplicate content returns same hash | Happy | Deduplication |
| BS-03 | Non-existent hash returns null | Sad | Missing blob |
| BS-04 | Empty content stores correctly | Edge | Zero-byte files |
| BS-05 | Large file (10MB) stores correctly | Edge | Size handling |
| BS-06 | Binary content (images) handled | Edge | Non-text files |
| BS-07 | Concurrent writes same content | Edge | Race condition |
| BS-08 | Corrupted blob detected | Error | Integrity check |
| BS-09 | Disk full handled gracefully | Error | Resource exhaustion |
| BS-10 | Invalid UTF-8 handled | Edge | Encoding edge case |

**Related**: SnapshotStore (consumer), StorageManager (orchestrator)

#### SnapshotStore
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| SS-01 | Create snapshot with multiple files | Happy | Basic creation |
| SS-02 | Retrieve snapshot with content | Happy | Full retrieval |
| SS-03 | List snapshots newest first | Happy | Ordering |
| SS-04 | Filter by trigger type | Happy | Filtering |
| SS-05 | Filter by date range | Happy | Time filtering |
| SS-06 | Non-existent snapshot returns null | Sad | Missing snapshot |
| SS-07 | Delete snapshot | Happy | Removal |
| SS-08 | Snapshot with 100+ files | Edge | Scale |
| SS-09 | Snapshot with special chars in path | Edge | Path encoding |
| SS-10 | Manifest JSON corrupted | Error | Corruption recovery |
| SS-11 | Referenced blob missing | Error | Orphaned reference |
| SS-12 | Concurrent snapshot creation | Edge | Race condition |

**Related**: BlobStore (dependency), SessionStore (session link)

#### SessionStore
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| SE-01 | Start session returns ID | Happy | Session start |
| SE-02 | Finalize session persists | Happy | Session end |
| SE-03 | Active session persists across calls | Happy | State retention |
| SE-04 | List sessions filtered by reason | Happy | Filtering |
| SE-05 | No active session to finalize | Sad | Invalid state |
| SE-06 | Session timeout auto-finalize | Edge | Timeout handling |
| SE-07 | Multiple rapid session starts | Edge | State management |

**Related**: SnapshotStore (snapshot association)

#### AuditLog
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| AL-01 | Append entry | Happy | Basic write |
| AL-02 | Get entries for file | Happy | File filtering |
| AL-03 | Get entries by action type | Happy | Action filtering |
| AL-04 | Entries ordered newest first | Happy | Ordering |
| AL-05 | Empty log returns empty array | Sad | Empty state |
| AL-06 | Large log (10k entries) performance | Edge | Scale |
| AL-07 | Concurrent appends | Edge | Race condition |
| AL-08 | Malformed JSONL line skipped | Error | Corruption handling |

### Protection Engine

#### AutoDecisionEngine
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| AD-01 | Watch level passes through | Happy | Watch behavior |
| AD-02 | Warn level shows notification | Happy | Warn behavior |
| AD-03 | Block level prevents save | Happy | Block behavior |
| AD-04 | AI detected elevates protection | Happy | Signal response |
| AD-05 | Burst detected elevates protection | Happy | Signal response |
| AD-06 | No signals uses default level | Happy | Default behavior |
| AD-07 | Config override respected | Happy | Configuration |
| AD-08 | Cooldown suppresses repeated alerts | Edge | Cooldown integration |
| AD-09 | Unknown protection level defaults safe | Error | Invalid config |

**Related**: SignalAggregator (input), CooldownCache (suppression)

#### SignalAggregator
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| SA-01 | Aggregate zero signals | Happy | Empty case |
| SA-02 | Aggregate single signal | Happy | Single signal |
| SA-03 | Aggregate multiple signals | Happy | Combination |
| SA-04 | Confidence weighted correctly | Happy | Weighting |
| SA-05 | Conflicting signals resolved | Edge | Conflict resolution |
| SA-06 | Invalid signal ignored | Error | Bad input |

**Related**: AI detectors, Burst detector (inputs)

#### AI Detection (Basic)
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| AI-01 | No AI patterns returns false | Happy | Clean code |
| AI-02 | Cursor comment detected | Happy | Cursor pattern |
| AI-03 | Copilot suggestion marker detected | Happy | Copilot pattern |
| AI-04 | Claude Code pattern detected | Happy | Claude pattern |
| AI-05 | Generic LLM boilerplate detected | Happy | Generic pattern |
| AI-06 | False positive on similar text | Edge | Specificity |
| AI-07 | Large diff performance (<50ms) | Edge | Performance |
| AI-08 | Empty diff returns false | Edge | Empty input |
| AI-09 | Binary file returns false | Edge | Non-text |

**Related**: SignalAggregator (consumer)

#### Burst Detection
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| BD-01 | No recent saves returns false | Happy | Clean state |
| BD-02 | Rapid saves detected as burst | Happy | Detection |
| BD-03 | Slow saves not detected | Happy | Threshold |
| BD-04 | Burst ends after cooldown | Happy | Recovery |
| BD-05 | Configurable threshold works | Happy | Configuration |
| BD-06 | First save never burst | Edge | Initial state |

### Authentication

#### Token Manager
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| TM-01 | Store token in SecretStorage | Happy | Secure storage |
| TM-02 | Retrieve stored token | Happy | Retrieval |
| TM-03 | Clear token on logout | Happy | Cleanup |
| TM-04 | Token refresh before expiry | Happy | Auto-refresh |
| TM-05 | No token returns null | Sad | Unauthenticated |
| TM-06 | Expired token triggers refresh | Happy | Expiry handling |
| TM-07 | Refresh fails gracefully | Error | Network error |
| TM-08 | Corrupted token cleared | Error | Corruption |

### Configuration

#### Config Loader
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| CL-01 | Load .snapbackrc JSON | Happy | JSON config |
| CL-02 | Load .snapbackrc.yaml | Happy | YAML config |
| CL-03 | No config uses defaults | Happy | Default fallback |
| CL-04 | Invalid JSON shows error | Error | Parse error |
| CL-05 | Unknown keys ignored | Edge | Forward compatibility |
| CL-06 | Nested workspace config | Edge | Monorepo support |
| CL-07 | Config reload on change | Happy | Watch mode |

---

## 2.2 Integration Tests (apps/vscode/test/integration/)

### Save Flow
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| SF-01 | Save creates snapshot | Happy | Full save path |
| SF-02 | Save with AI detection creates enriched snapshot | Happy | Detection integration |
| SF-03 | Save during cooldown skips snapshot | Happy | Cooldown integration |
| SF-04 | Warn level shows notification, allows proceed | Happy | UI integration |
| SF-05 | Block level prevents save until confirmed | Happy | Block flow |
| SF-06 | Save telemetry fires | Happy | Analytics integration |
| SF-07 | Save fails gracefully if storage full | Error | Error handling |

**Cross-System**: Telemetry → API (F30.4)

### Restore Flow
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| RF-01 | Restore single file | Happy | Basic restore |
| RF-02 | Restore multiple files | Happy | Multi-file |
| RF-03 | Restore shows confirmation | Happy | UI confirmation |
| RF-04 | Restore cancelled by user | Sad | User cancel |
| RF-05 | Restore with dirty editor | Edge | Unsaved changes |
| RF-06 | Restore non-existent file creates it | Edge | File creation |
| RF-07 | Restore telemetry fires | Happy | Analytics |

**Cross-System**: Same storage as CLI restore (F30.3)

### Session Flow
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| SEF-01 | Session starts on first save | Happy | Auto-start |
| SEF-02 | Session finalizes on idle timeout | Happy | Timeout |
| SEF-03 | Session finalizes on window close | Happy | Cleanup |
| SEF-04 | Multiple files in session | Happy | Multi-file tracking |
| SEF-05 | Session spans multiple saves | Happy | Continuity |

---

## 2.3 E2E Tests (apps/vscode/test/e2e/)

### Activation Funnel (CRITICAL)
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| AF-01 | Extension activates on startup | Happy | Activation |
| AF-02 | First-run wizard shown | Happy | Onboarding |
| AF-03 | Auth flow completes | Happy | Authentication |
| AF-04 | First protected save creates snapshot | Happy | Core value |
| AF-05 | Dashboard accessible from extension | Happy | Web integration |

**Cross-System**: Web auth, API token validation

### Demo Scenarios
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| DM-01 | AI-generated code detected and snapshotted | Happy | Core demo |
| DM-02 | User restores after AI mistake | Happy | Recovery demo |
| DM-03 | Multiple rapid saves handled | Happy | Burst handling |

---

# 3. MCP Server Tests

## 3.1 Unit Tests (apps/mcp-server/test/unit/)

### Tool Handlers
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| TH-01 | analyze_risk with clean code | Happy | No risk |
| TH-02 | analyze_risk with risky code | Happy | Risk detected |
| TH-03 | analyze_risk invalid input | Error | Validation |
| TH-04 | check_dependencies no issues | Happy | Clean deps |
| TH-05 | check_dependencies vulnerability | Happy | Issue detected |
| TH-06 | create_checkpoint stores locally | Happy | Local storage |
| TH-07 | list_checkpoints returns history | Happy | Listing |
| TH-08 | restore_checkpoint retrieves content | Happy | Retrieval |
| TH-09 | restore_checkpoint missing ID | Error | Not found |

**Cross-System**: Uses same BlobStore as Extension

### Authentication
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| MA-01 | Valid API key passes | Happy | Auth success |
| MA-02 | Invalid API key rejected | Sad | Auth failure |
| MA-03 | Expired key rejected | Sad | Expiry |
| MA-04 | Free tier accesses free tools | Happy | Tier gating |
| MA-05 | Free tier blocked from Pro tools | Sad | Tier enforcement |
| MA-06 | Pro tier accesses all tools | Happy | Full access |
| MA-07 | Missing key rejected | Error | No auth |

### Security
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| MS-01 | Path traversal blocked | Error | Security |
| MS-02 | Symlink outside workspace blocked | Error | Security |
| MS-03 | Workspace boundary enforced | Edge | Containment |
| MS-04 | Input sanitization works | Happy | XSS prevention |

---

## 3.2 Integration Tests (apps/mcp-server/test/integration/)

### Tool Execution
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| TE-01 | Full analyze_risk flow | Happy | End-to-end |
| TE-02 | Checkpoint create → list → restore | Happy | Full cycle |
| TE-03 | Tool timeout handled | Error | Timeout |
| TE-04 | Concurrent tool calls | Edge | Concurrency |

**Cross-System**: Storage shared with Extension

### Transport
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| TR-01 | STDIO transport works | Happy | Primary transport |
| TR-02 | HTTP/SSE transport works | Happy | Web transport |
| TR-03 | Malformed message rejected | Error | Protocol |

---

# 4. CLI Tests

## 4.1 Unit Tests (apps/cli/test/unit/)

### Commands
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| CLI-01 | init creates .snapbackrc | Happy | Initialization |
| CLI-02 | init in existing project warns | Sad | Re-init |
| CLI-03 | snapshot creates snapshot | Happy | Manual snapshot |
| CLI-04 | snapshot with message | Happy | Custom message |
| CLI-05 | restore by ID | Happy | Restore |
| CLI-06 | restore latest | Happy | Latest shorthand |
| CLI-07 | restore invalid ID | Error | Not found |
| CLI-08 | status shows protection state | Happy | Status display |
| CLI-09 | status no snapshots | Sad | Empty state |
| CLI-10 | scan finds issues | Happy | Issue detection |
| CLI-11 | scan clean codebase | Happy | No issues |
| CLI-12 | scan --fail-on error exits 1 | Happy | CI mode |
| CLI-13 | config get | Happy | Read config |
| CLI-14 | config set | Happy | Write config |
| CLI-15 | auth login | Happy | Authentication |
| CLI-16 | auth logout | Happy | Logout |

**Cross-System**: Same BlobStore as Extension/MCP

### Output Formatting
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| OF-01 | Table format | Happy | Human readable |
| OF-02 | JSON format | Happy | Machine readable |
| OF-03 | SARIF format | Happy | GitHub integration |

---

## 4.2 Integration Tests (apps/cli/test/integration/)

### Workflow
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| CW-01 | init → snapshot → restore | Happy | Full cycle |
| CW-02 | scan → fix → rescan | Happy | Remediation |
| CW-03 | CI pipeline simulation | Happy | CI/CD |

**Cross-System**: Snapshots readable by Extension

---

# 5. Web Dashboard Tests

## 5.1 Unit Tests (apps/web/test/unit/)

### Components
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| WC-01 | MetricsGrid renders counts | Happy | Display |
| WC-02 | MetricsGrid loading state | Happy | Loading |
| WC-03 | MetricsGrid error state | Error | Error handling |
| WC-04 | AIDetectionStats by tool | Happy | Tool breakdown |
| WC-05 | ActivityFeed renders events | Happy | Event display |
| WC-06 | ActivityFeed empty state | Sad | No events |
| WC-07 | APIKeyList displays keys | Happy | Key display |
| WC-08 | APIKeyList revoke action | Happy | Revocation |
| WC-09 | CreateKeyModal validation | Happy | Form validation |
| WC-10 | CreateKeyModal success | Happy | Key creation |

### Hooks
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| WH-01 | useMetrics fetches data | Happy | Data fetching |
| WH-02 | useMetrics caches response | Happy | Caching |
| WH-03 | useMetrics refresh | Happy | Cache invalidation |
| WH-04 | useAPIKeys CRUD operations | Happy | Key management |

---

## 5.2 Integration Tests (apps/web/test/integration/)

### Auth Flow
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| WA-01 | GitHub OAuth redirect | Happy | OAuth start |
| WA-02 | OAuth callback success | Happy | OAuth complete |
| WA-03 | Session persists | Happy | Session |
| WA-04 | Logout clears session | Happy | Logout |
| WA-05 | Protected route redirects | Sad | Auth guard |

**Cross-System**: Token used by Extension

### API Key Flow
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| WK-01 | Create key returns secret | Happy | Key creation |
| WK-02 | List keys shows masked | Happy | Key listing |
| WK-03 | Revoke key invalidates | Happy | Revocation |

**Cross-System**: Key used by Extension/CLI/MCP

---

## 5.3 E2E Tests (apps/web/test/e2e/)

### User Journeys
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| WE-01 | Sign up → Dashboard | Happy | Onboarding |
| WE-02 | Login → View metrics | Happy | Returning user |
| WE-03 | Create API key → Copy | Happy | Key flow |
| WE-04 | Extension grant flow | Happy | Extension auth |

**Cross-System**: Extension auth callback

---

# 6. API/Backend Tests

## 6.1 Unit Tests (packages/api/test/unit/)

### Procedures
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| AP-01 | createAPIKey hashes correctly | Happy | Security |
| AP-02 | validateAPIKey succeeds | Happy | Validation |
| AP-03 | validateAPIKey rejects invalid | Sad | Rejection |
| AP-04 | getUserMetrics aggregates | Happy | Aggregation |
| AP-05 | ingestTelemetry sanitizes | Happy | Privacy |
| AP-06 | ingestTelemetry rejects blocked props | Happy | Blocklist |

### Tier Gating
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| TG-01 | Free tier limits enforced | Happy | Limits |
| TG-02 | Pro tier unlimited | Happy | No limits |
| TG-03 | Upgrade prompt on limit | Happy | Upsell |

---

## 6.2 Integration Tests (packages/api/test/integration/)

### Database
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| DB-01 | User CRUD | Happy | User operations |
| DB-02 | API Key CRUD | Happy | Key operations |
| DB-03 | Snapshot metadata CRUD | Happy | Snapshot ops |
| DB-04 | Cascade delete user | Happy | FK constraints |
| DB-05 | Transaction rollback | Error | Atomicity |

### oRPC Contracts
| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| OC-01 | Schema validation works | Happy | Type safety |
| OC-02 | Invalid input rejected | Error | Validation |
| OC-03 | Response matches schema | Happy | Contract |

---

# 7. Cross-System Tests

## 7.1 Extension ↔ Web Dashboard

| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| XW-01 | Extension opens web for auth | Happy | Auth handoff |
| XW-02 | Web grants token to extension | Happy | Token exchange |
| XW-03 | Extension snapshot appears in dashboard | Happy | Data sync |
| XW-04 | Dashboard metrics reflect extension activity | Happy | Telemetry |

## 7.2 Extension ↔ CLI

| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| XC-01 | CLI snapshot visible in extension | Happy | Shared storage |
| XC-02 | Extension snapshot restorable via CLI | Happy | Interoperability |
| XC-03 | Same .snapbackrc respected | Happy | Config sharing |

## 7.3 Extension ↔ MCP

| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| XM-01 | MCP checkpoint visible in extension | Happy | Shared storage |
| XM-02 | Extension snapshot restorable via MCP | Happy | Interoperability |
| XM-03 | Same API key works | Happy | Auth sharing |

## 7.4 CLI ↔ MCP

| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| CM-01 | CLI snapshot visible via MCP list | Happy | Shared storage |
| CM-02 | MCP restore matches CLI restore | Happy | Consistency |

## 7.5 Full Activation Funnel

| ID | Scenario | Type | What It Tests |
|----|----------|------|---------------|
| FA-01 | Install ext → Web auth → First save → Dashboard shows | Happy | Complete funnel |
| FA-02 | Funnel telemetry fires at each step | Happy | Analytics |

---

# 8. LLM Agent Rules

## 8.1 Universal Rules (All Systems)

```markdown
### TESTING RULES - ALL SYSTEMS

1. **Test Pyramid Enforcement**
   - Unit tests FIRST, then integration, then E2E
   - Never write E2E for something unit-testable
   - Unit test ratio: 70%+ of test count

2. **Coverage Requirements**
   - New code: 80%+ coverage mandatory
   - Critical paths: 95%+ coverage
   - No PR merges below thresholds

3. **Test Naming Convention**
   - Format: `describe('Component', () => { it('should [behavior] when [condition]') })`
   - Example: `it('should return null when cooldown expired')`

4. **Test Independence**
   - Tests must not depend on other tests
   - Use beforeEach for setup, afterEach for cleanup
   - No shared mutable state between tests

5. **Mock Boundaries**
   - Mock external services (API, filesystem in unit tests)
   - Never mock the thing you're testing
   - Integration tests use real implementations

6. **Scenario Coverage**
   - Every function needs: Happy, Sad, Edge, Error
   - Happy: Normal successful path
   - Sad: Expected failure (user error, not found)
   - Edge: Boundary conditions (empty, max, concurrent)
   - Error: System failures (network, disk, timeout)

7. **Cross-System Awareness**
   - If your code writes data, test that other systems can read it
   - Storage format changes require cross-system tests
   - Auth token changes affect all systems
```

## 8.2 VS Code Extension Rules

```markdown
### EXTENSION TESTING RULES

1. **VS Code API Mocking**
   - Use `/test/unit/mocks/vscode.ts` for all unit tests
   - Never import real 'vscode' in unit tests
   - Integration tests use @vscode/test-electron

2. **Storage Tests**
   - All storage classes use temp directories
   - Clean up in afterEach, not afterAll
   - Test atomic write recovery (simulate crash)

3. **Performance Budgets**
   - Save handler: <50ms (no snapshot), <100ms (with snapshot)
   - Test with performance.now() assertions
   - Bundle size tested in CI

4. **Telemetry Tests**
   - Verify events fire with correct properties
   - Verify PII never included (path, email, etc.)
   - Mock PostHog client, verify calls

5. **Cross-System: CLI**
   - Snapshots stored in shared `.snapback/` format
   - Test: Create snapshot, verify CLI can list/restore
   - Config changes must update both

6. **Cross-System: MCP**
   - MCP checkpoint writes to SAME BlobStore
   - Test: MCP create_checkpoint, Extension sees in history
   - Same API key validation

7. **Cross-System: Web**
   - Auth token received from web must work
   - Telemetry events reach dashboard
   - Test: Extension grant → token → API call succeeds
```

## 8.3 MCP Server Rules

```markdown
### MCP SERVER TESTING RULES

1. **Transport Testing**
   - STDIO: Test with actual stdin/stdout streams
   - HTTP: Test with supertest
   - Both must handle malformed input

2. **Tool Registration**
   - Every tool needs input validation test
   - Every tool needs auth test (free vs pro)
   - Every tool needs timeout test

3. **Security Tests**
   - Path traversal: Test `../` patterns
   - Symlink: Test links outside workspace
   - Input size: Test oversized payloads

4. **Tier Gating**
   - Free tools work without Pro key
   - Pro tools reject free keys
   - Test tier middleware directly

5. **Cross-System: Extension**
   - create_checkpoint writes to local BlobStore
   - NOT to server (see architecture feedback)
   - Test: MCP checkpoint appears in Extension TreeView

6. **Cross-System: CLI**
   - Same storage path as CLI
   - Test: MCP checkpoint restorable via CLI

7. **Performance**
   - analyze_risk: <200ms budget
   - create_checkpoint: <500ms budget
   - Test with performance assertions
```

## 8.4 CLI Rules

```markdown
### CLI TESTING RULES

1. **Command Testing**
   - Use commander's built-in test utilities
   - Test exit codes (0 success, 1 failure)
   - Test stdout/stderr output

2. **Output Formats**
   - Test all formats: table, json, sarif
   - JSON must be parseable
   - SARIF must validate against schema

3. **CI Mode**
   - `--fail-on` must exit non-zero correctly
   - Test GitHub Actions integration
   - Test environment variable handling

4. **Cross-System: Extension**
   - Snapshots created by CLI visible in Extension
   - Same `.snapback/` directory structure
   - Test: CLI snapshot → Extension lists it

5. **Cross-System: MCP**
   - Same storage format
   - Test: CLI restore of MCP checkpoint

6. **Config**
   - Respect workspace `.snapbackrc`
   - Test config precedence (local > global)
   - Test invalid config handling
```

## 8.5 Web Dashboard Rules

```markdown
### WEB DASHBOARD TESTING RULES

1. **Component Tests**
   - Use React Testing Library
   - Test user interactions, not implementation
   - Test loading, error, empty states

### Test Structure & Naming
- **File Naming**: `*.test.ts` or `*.spec.ts` (consistent with package usage)
- **Test Descriptions**:
  - Top-level `describe`: Component or Class name.
  - Nested `describe`: Method name or Feature area.
  - `it`/`test`: Should read like a sentence. Start with a verb (e.g., "should render...", "handles...", "returns...").
  - **SDK Consistency**: Adopt the robust naming patterns found in `packages-oss/sdk`.
    - Example: `describe('SnapBackClient', () => { describe('restore', () => { it('should successfully restore a snapshot', ...); }); });`

### TDD Process (Red-Green-Refactor)
1. **Red**: Write a failing test that defines the expected behavior (e.g., "should verify content update on pricing page").
2. **Green**: Write the minimal code to make the test pass.
3. **Refactor**: Improve code quality while keeping tests green.

2. **Hook Tests**
   - Mock oRPC client
   - Test cache behavior (stale time, refetch)
   - Test error handling

3. **Auth Tests**
   - Test OAuth redirect flow
   - Test session persistence
   - Test protected route guards

4. **E2E Tests**
   - Use Playwright
   - Test critical user journeys only
   - No flaky tests allowed (retry 3x)

5. **Cross-System: Extension**
   - Extension grant flow must complete
   - Token must work for Extension API calls
   - Test: Web login → Extension receives token

6. **Cross-System: API**
   - Dashboard metrics reflect API data
   - Test: API event → Dashboard shows
   - Telemetry ingestion visible
```

## 8.6 API/Backend Rules

```markdown
### API/BACKEND TESTING RULES

1. **oRPC Contract Tests**
   - Test input validation (Zod schemas)
   - Test response shape matches contract
   - Test error responses

2. **Database Tests**
   - Use transaction rollback pattern
   - Test cascade deletes
   - Test unique constraints

3. **Auth Tests**
   - Test API key validation
   - Test session token validation
   - Test rate limiting

4. **Privacy Tests**
   - Verify blocked properties stripped
   - Verify IP never stored in telemetry
   - Verify userId → anonymousId mapping

5. **Cross-System: All Clients**
   - API key works from Extension, CLI, MCP
   - Token works from Web, Extension
   - Test: Create key in Web → Use in Extension
```

---

# Quick Reference: Test File Locations

```
apps/vscode/test/
├── unit/
│   ├── storage/           # CC-*, BS-*, SS-*, SE-*, AL-*
│   ├── protection/        # AD-*, SA-*, AI-*, BD-*
│   ├── auth/              # TM-*
│   └── config/            # CL-*
├── integration/
│   ├── save-flow.test.ts  # SF-*
│   ├── restore-flow.test.ts # RF-*
│   └── session-flow.test.ts # SEF-*
└── e2e/
    ├── activation.test.ts # AF-*
    └── demo.test.ts       # DM-*

apps/mcp-server/test/
├── unit/
│   ├── tools/             # TH-*
│   ├── auth/              # MA-*
│   └── security/          # MS-*
└── integration/
    ├── tool-execution.test.ts # TE-*
    └── transport.test.ts  # TR-*

apps/cli/test/
├── unit/
│   ├── commands/          # CLI-*
│   └── output/            # OF-*
└── integration/
    └── workflow.test.ts   # CW-*

apps/web/test/
├── unit/
│   ├── components/        # WC-*
│   └── hooks/             # WH-*
├── integration/
│   ├── auth.test.ts       # WA-*
│   └── api-keys.test.ts   # WK-*
└── e2e/
    └── journeys.test.ts   # WE-*

packages/api/test/
├── unit/
│   ├── procedures/        # AP-*
│   └── tier-gating/       # TG-*
└── integration/
    ├── database.test.ts   # DB-*
    └── contracts.test.ts  # OC-*

test/cross-system/
├── extension-web.test.ts  # XW-*
├── extension-cli.test.ts  # XC-*
├── extension-mcp.test.ts  # XM-*
├── cli-mcp.test.ts        # CM-*
└── activation-funnel.test.ts # FA-*
```

---

# Test Count Summary

| System | Unit | Integration | E2E | Cross-System | Total |
|--------|------|-------------|-----|--------------|-------|
| Extension | 67 | 14 | 5 | - | 86 |
| MCP | 16 | 6 | - | - | 22 |
| CLI | 19 | 3 | - | - | 22 |
| Web | 14 | 8 | 4 | - | 26 |
| API | 9 | 8 | - | - | 17 |
| Cross-System | - | - | - | 12 | 12 |
| **Total** | **125** | **39** | **9** | **12** | **185** |

**Pyramid Ratio**: 68% Unit / 21% Integration / 11% E2E+Cross ✓
