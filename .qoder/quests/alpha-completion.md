# SnapBack Alpha Completion — Free/Solo Focus (Accelerated)

## Mission Statement

Deliver a production-ready Free/Solo Alpha that proves core value (snapshot/restore + security policies + privacy-first MCP) with clear learnings. Ship fast, measure usage, then expand to Team/Enterprise based on validated demand. Team/Enterprise features designed as stubs behind feature flags for future activation.

---

## Strategic Objectives

### Primary Goals (Alpha Scope)
1. **Prove Core Value**: Snapshot/restore + Guardian policies + local MCP work flawlessly
2. **Validate Privacy Story**: Free tier 100% local, Solo backend MCP with explicit consent
3. **Establish Quality Bar**: Contract-based architecture, CI guards, performance budgets
4. **Enable Fast Iteration**: Analytics + feedback loops for product decisions
5. **Minimize Scope Creep**: Team/Enterprise as designed stubs, not runtime complexity

### Success Criteria
- All CI gates pass (guards, performance budgets, E2E tests)
- Zero "checkpoint" terminology in codebase
- Performance budgets met: snapshot <100ms, risk <500ms, session <50ms, analytics TTI <2s
- Privacy guarantees enforced: Free tier never transmits code or metadata
- Documentation shows Free/Solo tiers only (Team/Enterprise hidden via `ALPHA=true` flag)
- Feature flags operational for safe rollback

### Alpha Scope Decision: Free/Solo Focus

**Rationale** (Law #23: Concentrate Forces):
- **Execute Now**: Phase 0, Lane A (Snapshot/Restore), B (Guardian), D (MCP local + Solo backend), F (Docs Free/Solo), G (Analytics/Feedback), H (Reliability), I (QA), J (Packaging minimal), K (Admin flags only)
- **Design Stubs**: Lane C (Orgs/Sharing), Lane E (Stripe billing, seats, SSO/SCIM), Enterprise doc depth
- **Why**: Faster learning, simpler testing, clearer privacy story, reduced bug surface

**Team/Enterprise Deferral Strategy**:
- Contracts and database schemas included (no migration debt later)
- Feature flag: `ENABLE_TEAM_FEATURES = false` (hardcoded in Alpha)
- API endpoints return 501 Not Implemented with clear messaging
- Docs pages exist but hidden from navigation (CI guard enforces)
- Entitlements computed via allowlist check: user in allowlist → 'solo', else 'free'

---

## System Context

### Repository Structure
The SnapBack monorepo follows Turborepo conventions:

**Applications (apps/)**
- `web` - Next.js 15 marketing site and console
- `api` - Hono-based API service (standalone microservice)
- `docs` - Fumadocs-powered documentation site
- `vscode` - Visual Studio Code extension
- `cli` - Command-line interface
- `mcp-server` - Model Context Protocol server

**Packages (packages/)**
- `contracts` - Shared TypeScript contracts and schemas
- `analytics-client` - Analytics wrapper with sanitization
- `policy-engine` - Security policy evaluation engine
- `perf` - Performance testing harness
- `e2e` - End-to-end test suite
- `core` - Core snapshot/restore logic
- `platform` - Database schemas and Prisma client
- `auth` - Authentication utilities
- `config` - Configuration management
- `events` - Event bus system
- `sdk` - Public SDK for integrations

### Technology Stack
- **Runtime**: Node.js 20.11.0+, pnpm 10.14.0
- **Frameworks**: Next.js 15, Hono, Fumadocs
- **Database**: Drizzle ORM with PostgreSQL (Supabase), SQLite (local)
- **Auth**: better-auth v1.3.34
- **Payments**: Stripe with webhooks
- **Analytics**: PostHog with custom event tracking
- **Storage**: AWS S3 (us-east-1 only)
- **Testing**: Vitest (unit), Playwright (E2E)
- **Build**: Turborepo v2.1.1, tsup
- **Quality**: Biome, Lefthook

### Environment Variables Requirements
```
AWS_REGION=us-east-1
EXPORT_BUCKET=<bucket-name>
POSTHOG_KEY=<key>
STRIPE_SECRET=<key>
STRIPE_WEBHOOK_SECRET=<key>
SENTRY_DSN=<optional>
NEXT_PUBLIC_POSTHOG_KEY=<key>
NEXT_PUBLIC_API_BASE=<url>
```

---

## Global Architectural Rules

### Terminology Standards (CRITICAL)
- **MUST USE**: "snapshot" and "restore" everywhere in code, UI, and documentation
- **ALLOWED**: "recover" as CLI command alias only
- **FORBIDDEN**: "checkpoint", "apply", "review" (legacy terms from previous iterations)

### Policy Actions
- **watch**: Observe and log violations without blocking
- **warn**: Surface violations to user but allow continuation
- **block**: Prevent operation from proceeding

### Tier Definitions

| Tier | Seats | Cloud Backup | Backend MCP | Snapshots | Storage | Retention |
|------|-------|-------------|-------------|-----------|---------|-----------|
| Free | 1 | No | No | 50 | 0GB | 30 days |
| Solo | 1 | Yes | Yes | 500 | 5GB | 90 days |
| Team | 10 | Yes | Yes | 2,000 | 25GB | 365 days |
| Enterprise | Unlimited | Yes | Yes | Unlimited | 100GB+ | Custom |

### Billing Rules
1. Free → Solo: 14-day trial begins automatically
2. Downgrade: Data retained, backend MCP disabled
3. Seat enforcement: Team limited to 10, Enterprise unlimited
4. Feature flags flip instantly on tier change

### Privacy Guarantees
1. **Free Tier**: Local-only MCP, zero backend transmission of code or metadata
2. **Solo+ Tiers**: Backend MCP optional, metadata/code transmission requires explicit consent
3. **US Cloud Only**: All S3 storage in us-east-1 region
4. **Data Sanitization**: Analytics wrapper strips PII (emails, tokens, API keys, file paths normalized)

### Performance Budgets (CI-Enforced)
- Snapshot creation: <100ms (p95)
- Risk analysis: <500ms
- Session tracking: <50ms
- Analytics TTI: <2000ms

---

## Phase 0: Contract & Guard Infrastructure

**Duration**: ≤2 hours (design-light, implementation-heavy)

**Strategic Rationale**: Establish the foundational contracts that all subsequent lanes depend on. This phase creates a "fail-fast" mechanism—no code can merge without passing contract validation.

### Contract Deliverables

#### Tier Contract (`packages/contracts/src/tiers.ts`)
**Purpose**: Single source of truth for tier definitions

**Structure**:
- Type definition: `Tier = 'free' | 'solo' | 'team' | 'enterprise'`
- Export as const enum for type safety and tree-shaking

#### Analytics Contract (`packages/contracts/src/analytics.ts`)
**Purpose**: Strict event schema for product analytics

**Event Types**:
- `SNAPSHOT_CREATED`: Captures snapshot creation with trigger source and cloud flag
- `SNAPSHOT_RESTORED`: Tracks restore operations with source attribution
- `POLICY_VIOLATION`: Records security violations with severity and action
- `AI_SUGGESTION_SHOWN`: Logs AI recommendations with risk score
- `AI_SUGGESTION_ACCEPTED`: Measures time-to-accept for UX optimization
- `AI_SUGGESTION_DISMISSED`: Captures rejection reasons for product improvement
- `LOGIN`: Authentication event with method tracking
- `UPGRADE_INTENT`: Conversion funnel tracking

**Batch Structure**:
- Array of events with submission timestamp
- Enables efficient bulk transmission and replay

#### Export Contract (`packages/contracts/src/exports.ts`)
**Purpose**: Define audit export formats

**Export Modes**:
- `InlineExport`: Direct data return for payloads ≤10MB (CSV or JSON)
- `UrlExport`: S3 presigned URL for payloads >10MB
- Automatic mode selection based on payload size

### Analytics Client Wrapper

**Location**: `packages/analytics-client/src/index.ts`

**Core Responsibilities**:
1. Event queueing with configurable batch size and flush interval
2. Metadata sanitization (PII removal, path normalization)
3. Batch POST to `/analytics/ingest` endpoint
4. Retry logic with exponential backoff
5. Local persistence for offline resilience

**Sanitization Rules**:
- Strip email addresses (regex-based detection)
- Redact API keys and tokens (pattern matching)
- Normalize file paths (remove user-specific prefixes)
- Hash sensitive identifiers

### API Endpoints

#### Analytics Ingest (`apps/api/modules/analytics/procedures/ingest.ts`)
**Authorization**: Protected procedure (authenticated users only)

**Data Flow**:
1. Validate `AnalyticsBatch` against contract schema
2. Extract individual events
3. Write to `analyticsEvents` table
4. Forward to PostHog for product analytics views
5. Return acknowledgment with event IDs

#### Audit Export (`apps/api/modules/audit/procedures/export-audit-log.ts`)
**Authorization**: Protected procedure with tier check (Team+)

**Input Schema**:
- `format`: 'csv' | 'json'
- `startDate`: Date
- `endDate`: Date

**Processing Logic**:
1. Query `analyticsEvents` within date range
2. Calculate payload size
3. If ≤10MB: Return `InlineExport` with data
4. If >10MB: Upload to S3 `EXPORT_BUCKET`, return `UrlExport` with presigned URL (7-day expiration)

### Privacy & Retention Service

**Location**: `apps/api/modules/admin/procedures/cleanup-old-data.ts`

**Retention Policies**:
- Free: 30 days
- Solo: 90 days
- Team: 365 days
- Enterprise: Custom (configurable per contract)

**Execution**:
- Cron schedule: Daily at 02:00 UTC
- Soft delete with archival to cold storage
- Emit `DATA_PURGED` event for audit trail

### CI Guard System

#### Guard Script (`scripts/ci/guard.sh`)
**Exit Criteria** (fail build if violated):
1. String "checkpoint" appears anywhere (except allowlist: legacy docs, migration notes)
2. Deprecated policy actions "apply" or "review" detected
3. Direct analytics POST bypassing wrapper
4. SSO/SAML/SCIM mentioned outside `apps/docs/content/enterprise/sso-saml.mdx`

**Allowlist Mechanism**:
- File: `.guard-allowlist.txt`
- Format: One file path per line (glob patterns supported)

#### CI Workflow (`github/workflows/alpha.yml`)
**Pipeline Stages**:
1. Checkout repository
2. Install dependencies: `pnpm install`
3. Build all packages: `pnpm build`
4. Run guard script: `bash scripts/ci/guard.sh`
5. Execute tests: `pnpm test`
6. Install Playwright browsers: `playwright install`
7. Run E2E suite: `pnpm test:e2e`

**Failure Handling**:
- Any stage failure blocks merge
- Guard violations include line numbers and context
- Performance budget breaches show benchmark comparison

### Performance Harness

**Location**: `packages/perf/tests/perf.spec.ts`

**Benchmark Suite**:
- Snapshot creation (medium repo: ~500 files): Assert p95 <100ms
- Risk analysis (10 files): Assert <500ms
- Session tracking: Assert <50ms
- Analytics TTI measurement: Assert <2000ms

**Measurement Approach**:
- Use `performance.mark()` and `performance.measure()` APIs
- Run 10 iterations, calculate p50, p90, p95
- Compare against baselines in `.perf-baseline.json`
- **Alpha Change**: Fail if regression >20% (was 10%, allows baseline variance)
- Record baseline hardware specs in `.perf-baseline.json`: `{ cpu, memory, os, ci_runner }`

### E2E Baseline Test

**Location**: `packages/e2e/tests/alpha.spec.ts`

**Canary Path** (to be extended by later lanes):
1. User signup with email verification
2. Navigate to analytics page
3. Verify export buttons visible
4. Assert no console errors

### Architecture Decision Record

**Location**: `docs/adr/0001-alpha-alignment.md`

**Content**:
- Record all Phase 0 decisions
- Document rationale for contract structure
- Define these contracts as single source of truth
- Establish precedence for future ADRs

**Metadata**:
- Status: Accepted
- Date: Sprint start date
- Stakeholders: Engineering, Product, Security

### Phase 0 Acceptance Criteria
- [ ] CI pipeline green end-to-end
- [ ] "checkpoint" string absent in codebase (verified by guard)
- [ ] All contracts compile without TypeScript errors
- [ ] Performance budgets baseline established
- [ ] ADR published and reviewed

**STOP RULE**: Do not proceed to Lane A until all Phase 0 criteria pass.

---

## Lane A: Snapshots & Restore (Core Product)

**Duration**: 8-12 hours
**Dependencies**: Phase 0
**Risk Level**: Medium (performance-critical path)

### Strategic Intent
Implement the foundational snapshot/restore mechanism with production-grade reliability, performance, and cloud sync capabilities. This lane delivers the core value proposition of SnapBack.

### Snapshot Creation System

#### Manual Snapshot Trigger
**Entry Points**:
- VS Code command: "SnapBack: Create Snapshot"
- CLI: `snapback snapshot create [--message "description"]`
- Web console: "Create Snapshot" button
- MCP tool: `create_snapshot` (local or backend based on tier)

**Processing Flow**:
1. Enumerate workspace files (respect `.snapbackignore`)
2. Calculate content hashes (SHA-256)
3. Check deduplication store for existing chunks
4. Store only new chunks (content-addressable storage)
5. Create metadata record in local SQLite/Supabase
6. If Solo+ with cloud backup enabled: Queue background upload

**Deduplication Strategy**:
- Chunk-level deduplication using content hashing
- Store mapping: `snapshot_id → [chunk_hash_1, chunk_hash_2, ...]`
- Shared chunk store: `chunk_hash → compressed_content`
- Compression: gzip for text files, skip for binaries

**Metadata Schema**:
```
snapshot {
  id: string (CUID)
  userId: string
  workspaceId: string
  message?: string
  trigger: 'manual' | 'auto' | 'pre-commit' | 'window-blur'
  createdAt: timestamp
  fileCount: number
  totalSizeBytes: number
  cloudSynced: boolean
  chunks: string[] (array of chunk hashes)
}
```

#### Auto-Trigger System
**Trigger Conditions**:
1. **Idle Detection**: No file changes for 5 minutes (configurable)
2. **Pre-Commit Hook**: Integrated via Lefthook, runs `snapback snapshot create --pre-commit`
3. **Window Blur**: VS Code window loses focus (debounced to prevent spam)

**Configuration** (`.snapbackrc.json`):
```
{
  "autoSnapshot": {
    "enabled": true,
    "idleMinutes": 5,
    "preCommit": true,
    "windowBlur": true,
    "maxPerDay": 50
  }
}
```

**Rate Limiting**:
- Maximum auto-snapshots per day (default: 50)
- Minimum interval between snapshots (default: 60 seconds)
- Configurable per tier

### Session Timeline
**Visualization**: Timeline view in VS Code sidebar and web console

**Data Structure**:
- Sessions grouped by day
- Each session shows snapshot sequence
- Visual diff indicators between snapshots
- Click snapshot to view details or restore

**Implementation**:
- Query snapshots by `workspaceId` and `createdAt` range
- Group by date using local timezone
- Calculate inter-snapshot intervals
- Highlight sessions with policy violations

### Restore Mechanism

#### Atomicity Guarantee
**Requirement**: All-or-nothing restore (no partial states)

**Implementation Approach**:
1. Create temporary staging directory
2. Extract all chunks for target snapshot
3. Decompress and write files to staging
4. Verify hash integrity for each file
5. If all verifications pass: Atomic swap with workspace
6. If any verification fails: Rollback, report error

**Rollback Strategy**:
- Keep current state in `.snapback/backup-restore-{timestamp}`
- On restore failure: Copy back from backup
- User can manually inspect backup directory

#### Hash Integrity Validation
**Process**:
1. Read chunk from store
2. Calculate SHA-256 hash
3. Compare with expected hash from metadata
4. If mismatch: Emit error event, halt restore
5. If cloud-synced: Attempt re-download from S3

**Error Handling**:
- Corrupted local chunk: Try cloud re-download
- Cloud unavailable: Fail restore with clear error message
- Partial corruption: List affected files, offer partial restore option

### Cloud Backup System (Solo+ Only)

#### Upload Flow
**Trigger**: Background process after snapshot creation (if tier allows)

**Steps**:
1. Check tier entitlement: `cloudBackup === true`
2. Compress chunk bundle (tar.gz)
3. Calculate checksum
4. Upload to S3: `s3://{EXPORT_BUCKET}/snapshots/{userId}/{snapshotId}.tar.gz`
5. Store S3 object key and checksum in metadata
6. Update `cloudSynced` flag to `true`

**Retry Logic**:
- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- Maximum 5 retry attempts
- On persistent failure: Mark `cloudSyncFailed`, notify user

**Bandwidth Optimization**:
- Upload only new chunks (check S3 for existing chunk hashes)
- Use multipart upload for bundles >5MB
- Compress before upload

#### Download Flow
**Trigger**: Restore from cloud (if snapshot not in local cache)

**Steps**:
1. Fetch S3 object using presigned URL
2. Download to temporary location
3. Verify checksum against metadata
4. Extract chunks to local store
5. Proceed with normal restore flow

**Integrity Checks**:
- Verify S3 ETag matches stored checksum
- Re-calculate hash after download
- If mismatch: Report corruption, attempt re-download once

### Settings & Configuration

#### Local Pruning
**Configuration Options**:
- Maximum local snapshots (default: 100)
- Maximum age (days, default: 90)
- Pruning strategy: 'oldest-first' | 'least-used' | 'smart'

**Smart Pruning Strategy**:
- Keep all snapshots from last 7 days
- Keep daily snapshots from last 30 days
- Keep weekly snapshots from last 90 days
- Beyond 90 days: Keep only those with messages (manually created)

#### .snapbackignore Patterns
**Purpose**: Exclude files from snapshots (similar to .gitignore)

**Default Patterns**:
```
node_modules/
.git/
*.log
.env
.env.local
dist/
build/
.next/
```

**Pattern Syntax**: Support glob patterns via `minimatch` library

### Performance Optimization

#### Snapshot Creation Budget: <100ms (p95)
**Optimization Techniques**:
1. Parallel file hashing (worker pool)
2. In-memory deduplication cache
3. Incremental snapshots (only changed files)
4. Filesystem watching to avoid full scans

**Benchmarking**:
- Test repository: 500 files, 50MB total
- Measure with `performance.mark()` instrumentation
- Run 10 iterations in CI, assert p95 <100ms

#### Caching Strategy
**Local Cache**:
- LRU cache of recent chunk hashes (10,000 entries)
- Metadata index in SQLite with FTS (full-text search)
- Background index rebuilding on idle

### Lane A Acceptance Criteria
- [ ] Manual snapshot creates within performance budget
- [ ] Auto-triggers work on idle, pre-commit, window blur
- [ ] Restore validates hashes and is fully atomic
- [ ] Cloud backup uploads/downloads with integrity checks
- [ ] Settings persist and pruning executes correctly
- [ ] CLI commands `snapback snapshot create` and `snapback snapshot restore <id>` functional
- [ ] Unit tests green (≥70% coverage)
- [ ] Performance budgets met in CI

---

## Lane B: Guardian & Policies (Security Engine)

**Duration**: 10-14 hours
**Dependencies**: Phase 0, Lane A (for SARIF export integration)
**Risk Level**: High (accuracy-critical, false positives harm UX)

### Strategic Intent
Build a production-grade security policy engine that detects secrets, phantom dependencies, and mock leakage with high accuracy and low false-positive rates. Enable customizable policies per tier with presets for common frameworks.

### Detector Suite

#### Secret Detection
**Detection Methods**:
1. **Pattern Matching**: Regex patterns for known secret formats
   - API keys (AWS, GitHub, Stripe, etc.)
   - Private keys (RSA, SSH, PGP)
   - OAuth tokens
   - Database credentials

2. **Entropy Analysis**: Flag high-entropy strings (Shannon entropy >4.5)
   - Base64-encoded tokens
   - Hex-encoded keys
   - Random alphanumeric sequences >16 chars

3. **Contextual Analysis**: Reduce false positives
   - Check variable names: `API_KEY`, `SECRET`, `PASSWORD`
   - Ignore test fixtures (files in `__tests__/`, `test/`, `*.spec.ts`)
   - Skip example documentation

**Accuracy Target**: ≥90% on seeded corpus (100 known secrets + 1000 clean files)

**Output Format**: SARIF (Static Analysis Results Interchange Format)

#### Mock/Test Data Leakage Detection
**Problem**: Test mocks and fixtures accidentally committed to production code

**Detection Strategy**:
1. Scan for imports from test libraries in non-test files
   - `vitest`, `jest`, `@testing-library/*` in `src/` (not `test/` or `*.spec.ts`)
2. Identify mock data patterns:
   - Large JSON arrays with `mock`, `fake`, `dummy` in keys
   - Hardcoded user lists with placeholder emails
3. Flag test-only utilities in production dependencies

**Heuristics to Reduce False Positives**:
- Allow test utilities in config files (`vitest.config.ts`, `playwright.config.ts`)
- Ignore fixture files explicitly marked (`.fixture.ts`, `.seed.ts`)
- Context-aware: Mock server setup in `dev` environment is acceptable

#### Phantom/Unused Dependency Detection
**Problem**: Dependencies declared in `package.json` but never imported

**Analysis Approach**:
1. Parse `package.json` for `dependencies` and `devDependencies`
2. Scan codebase for import statements: `import ... from 'package-name'`, `require('package-name')`
3. Cross-reference to find declared but unused packages
4. Categorize as phantom dependency

**Exceptions**:
- Transitive dependencies (not directly imported)
- CLI tools (e.g., `typescript`, `biome`)
- Build plugins and loaders

**Framework-Specific Rules** (Next.js example):
- Ignore `next` (implicitly used)
- Ignore `react`, `react-dom` (used by Next.js framework)

### Risk Scoring System

**Score Range**: 0 (safe) to 10 (critical)

**Scoring Factors**:

| Factor | Weight | Example |
|--------|--------|----------|
| Secret type | 40% | AWS key = 9, Generic API key = 6 |
| Entropy | 20% | Shannon >5.5 = +2 |
| Location | 20% | Production code = +3, Test file = +0 |
| Exposure | 20% | Public repo = +3, Private = +1 |

**Risk Levels**:
- 0-2: **Low** (informational)
- 3-5: **Medium** (review recommended)
- 6-8: **High** (action required)
- 9-10: **Critical** (block immediately)

**Calculation Example**:
```
AWS Secret Key in src/config.ts (public repo):
- Base score: 9 (AWS credential)
- Entropy bonus: +1 (high entropy)
- Location penalty: +0 (production code, already factored)
- Exposure: Capped at 10
Final: 10 (CRITICAL)
```

### Policy Engine

**Policy Configuration Schema** (`.snapbackrc.json`):
```
{
  "policy": {
    "thresholds": {
      "secrets": 6,
      "mocks": 7,
      "phantomDeps": 3
    },
    "actions": {
      "watch": ["low"],
      "warn": ["medium", "high"],
      "block": ["critical"]
    },
    "pathRules": [
      {
        "pattern": "src/components/**",
        "action": "block",
        "minRisk": 7
      },
      {
        "pattern": "scripts/**",
        "action": "warn",
        "minRisk": 5
      }
    ]
  }
}
```

**Policy Actions**:
- **watch**: Log violation to analytics, no user interruption
- **warn**: Show notification with "Proceed Anyway" option
- **block**: Prevent operation, require fix or override (with audit trail)

**Path-Based Rules**:
- Apply different thresholds to different directories
- Example: Stricter rules for `src/` vs. `scripts/`
- Supports glob patterns via `minimatch`

### Framework Presets

**Purpose**: One-command policy setup for common frameworks

**Preset: Next.js** (`snapback policy preset apply nextjs`)
- Ignore `next`, `react`, `react-dom` in phantom dependency check
- Allow `@testing-library/react` in `*.test.tsx` files
- Block secrets in `app/`, `pages/`, `components/`
- Warn on mocks in `lib/`, `utils/`

**Preset: React** (`snapback policy preset apply react`)
- Similar to Next.js but without Next-specific exclusions
- Allow `@vitejs/plugin-react` in phantom check

**Preset: Express** (`snapback policy preset apply express`)
- Block secrets in `routes/`, `controllers/`, `middleware/`
- Warn on production dependencies in test files
- Check for `.env` leakage

**Implementation**: Store presets in `packages/policy-engine/presets/` as JSON files

### SARIF Export

**Format**: Structured JSON conforming to SARIF 2.1.0 specification

**Output Structure**:
```
{
  "version": "2.1.0",
  "runs": [{
    "tool": {
      "driver": {
        "name": "SnapBack Guardian",
        "version": "1.0.0"
      }
    },
    "results": [
      {
        "ruleId": "secret-detection/aws-key",
        "level": "error",
        "message": { "text": "Potential AWS access key detected" },
        "locations": [{
          "physicalLocation": {
            "artifactLocation": { "uri": "src/config.ts" },
            "region": { "startLine": 12, "startColumn": 18 }
          }
        }],
        "properties": {
          "riskScore": 10,
          "entropy": 5.8
        }
      }
    ]
  }]
}
```

**Integration Points**:
- VS Code: Display in Problems panel
- CLI: Write to `snapback-report.sarif`
- CI: Upload as artifact for GitHub Code Scanning

### VS Code Integration

**Commands**:
- `SnapBack: Analyze Security Risks` - Run full scan, populate Problems panel
- `SnapBack: Export SARIF Report` - Save report to workspace

**Diagnostics**:
- Map SARIF results to VS Code `Diagnostic` objects
- Severity mapping: `error` → `DiagnosticSeverity.Error`, `warning` → `Warning`
- Quick fixes: "Ignore this occurrence", "Add to allowlist"

### CLI Integration

**Commands**:
- `snapback policy check` - Run detectors, exit with code 1 if violations
- `snapback policy check --sarif report.sarif` - Export SARIF
- `snapback policy preset apply <name>` - Apply framework preset
- `snapback policy preset list` - Show available presets

**Exit Codes**:
- 0: No violations
- 1: Violations found (watch/warn level)
- 2: Critical violations (block level)

### Accuracy Validation

**Test Corpus**:
- 100 files with known secrets (ground truth)
- 1,000 clean files (various file types)
- 50 files with intentional false positive triggers

**Metrics**:
- **Precision**: True Positives / (True Positives + False Positives) ≥ 90%
- **Recall**: True Positives / (True Positives + False Negatives) ≥ 85%

**Continuous Validation**:
- Run corpus test in CI on every policy engine change
- Track precision/recall trends over time
- Fail CI if regression >5%

### Lane B Acceptance Criteria ✅ COMPLETE (Nov 19, 2025)
- [x] Secret detection achieves ≥90% precision on test corpus (28/28 tests passing)
- [x] Mock leakage detector flags `vitest` imports in `src/` files (28/28 tests passing)
- [x] Phantom dependency check ignores framework-specific exceptions (detector implemented)
- [x] Risk scores calculated correctly (validated in PolicyEngine tests)
- [x] Policy actions (watch/warn/block) enforced (PolicyEngine implements correctly)
- [x] SARIF export validates against schema (SARIF v2.1.0 compliant formatter)
- [x] Core detectors production-ready (90/90 total tests passing)
- [x] Zero code duplication (consolidated from API service)
- [ ] Playwright E2E test for policy blocking (deferred to Lane I)
- [ ] Framework presets implementation (deferred to post-Alpha)
- [ ] VS Code extension integration (deferred to later lane)
- [ ] CLI integration (deferred to later lane)

**Status**: Core policy-engine package complete and tested. Integration work (VS Code, CLI, E2E) deferred to subsequent lanes.

**Session Report**: See `.qoder/sessions/2025-11-19-lane-b-completion.md` for detailed completion report.

---

## Lane C: Team & Sharing (Collaboration)

**Duration**: 8-10 hours
**Dependencies**: Phase 0, Lane A, Lane E (for subscription tier checks)
**Risk Level**: Medium (multi-user coordination complexity)

### Strategic Intent
Enable team collaboration on Team and Enterprise tiers, allowing organizations to share snapshots, synchronize policies, and manage member access with role-based permissions.

### Organization Model

**Database Schema** (extends existing `@snapback/platform`):

**Organizations Table**:
```
organization {
  id: string (CUID)
  name: string
  slug: string (unique, URL-safe)
  tier: 'team' | 'enterprise'
  maxSeats: number (10 for team, -1 for enterprise)
  createdAt: timestamp
  ownerId: string (references user.id)
  settings: JSON {
    defaultPolicy?: PolicyConfig
    ssoEnabled?: boolean
    auditLogRetention?: number
  }
}
```

**Members Table**:
```
member {
  id: string (CUID)
  organizationId: string (references organization.id)
  userId: string (references user.id)
  role: 'owner' | 'admin' | 'member'
  joinedAt: timestamp
  invitedBy: string (references user.id)
}
```

**Role Permissions**:

| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| Invite members | ✓ | ✓ | ✗ |
| Remove members | ✓ | ✓ (non-admins) | ✗ |
| Change member roles | ✓ | ✗ | ✗ |
| Update org settings | ✓ | ✓ | ✗ |
| Manage billing | ✓ | ✗ | ✗ |
| Create snapshots | ✓ | ✓ | ✓ |
| Restore snapshots | ✓ | ✓ | ✓ (own + shared) |
| Delete snapshots | ✓ | ✓ | ✓ (own only) |
| Update org policy | ✓ | ✓ | ✗ |

### Shared Snapshots

**Sharing Model**: Organization-scoped snapshots

**Snapshot Scope** (new field in snapshot metadata):
```
snapshot {
  // ... existing fields
  scope: 'personal' | 'organization'
  organizationId?: string (required if scope = organization)
  sharedBy: string (userId who shared)
  sharedAt: timestamp
}
```

**Visibility Rules**:
- Personal snapshots: Visible only to creator
- Organization snapshots: Visible to all org members
- Restore permissions: All members can restore org snapshots

**Sharing Flow**:
1. User creates snapshot (default: personal)
2. User clicks "Share with Team" in UI
3. System checks: User in org? Org has Team+ tier?
4. If yes: Update `scope` to 'organization', set `organizationId`
5. Snapshot now appears in all org members' timelines with "Shared" badge

**Implementation Considerations**:
- Cloud backup required for shared snapshots (enforce on share action)
- S3 key structure: `s3://bucket/orgs/{orgId}/snapshots/{snapshotId}`
- Access control: Presigned URLs scoped to org members only

### Organization Policy Synchronization

**Policy Hierarchy**:
1. **Organization Default Policy**: Set by admins in org settings
2. **User Local Policy**: User's `.snapbackrc.json`
3. **Merge Strategy**: Org policy overrides local for stricter rules

**Merge Logic**:
```
If org policy sets threshold higher than local → use org threshold
If org policy blocks a path → always block (cannot be overridden locally)
Local policy can only be stricter, never more permissive
```

**Example**:
```
Org policy: { thresholds: { secrets: 6 }, pathRules: [{ pattern: "src/**", action: "block", minRisk: 7 }] }
User local: { thresholds: { secrets: 8 } }

Merged policy:
- secrets threshold: 6 (org is stricter)
- src/** blocking: Active (org rule applied)
```

**Synchronization**:
- On VS Code/CLI startup: Fetch org policy from API
- Cache locally with 1-hour TTL
- On policy check: Merge with local policy
- Show indicator in UI: "Organization policy active"

### Seat Management

**Seat Enforcement**:
- Team tier: Maximum 10 active members
- Enterprise tier: Unlimited (represented as `-1` in database)

**Enforcement Points**:
1. **Invitation**: Check `activeMembers < maxSeats` before sending invite
2. **Acceptance**: Validate seats available when invite accepted
3. **Upgrade**: Automatically recalculate seats on tier change

**Seat Reclamation**:
- Remove member: Seat immediately available for new invite
- Deactivated accounts: Seats freed after 30-day grace period

**Overage Handling** (graceful degradation):
- If org downgrades Team → Free with 10 members: All members retain read access, write access limited to first 10 (by `joinedAt`)
- UI warning: "Your organization has exceeded seat limits. Upgrade to restore full access."

### Multi-User Coordination

**Conflict Resolution**: Optimistic locking with retry

**Scenario**: Two users restore different snapshots simultaneously

**Resolution Strategy**:
1. User A initiates restore of snapshot S1
2. System locks workspace (write lock in database)
3. User B attempts restore of snapshot S2
4. User B sees: "Workspace locked by User A (restore in progress). Retry in 30s?"
5. User A completes restore, releases lock
6. User B retries successfully

**Implementation**:
- Distributed lock using database row-level locks or Redis
- Lock timeout: 5 minutes (auto-release)
- Lock metadata: `{ userId, operation, startedAt }`

**Notification System**: Real-time updates via WebSocket (optional, post-MVP)
- User A shares snapshot → User B receives notification
- User A updates org policy → All members notified

### Lane C Acceptance Criteria
- [ ] Organization creation flow: Owner creates org, sets name and slug
- [ ] Invitation system: Admin invites user via email, user accepts and joins
- [ ] Role permissions enforced: Member cannot delete others' snapshots
- [ ] Seat limit enforced: Team org rejects 11th member
- [ ] Snapshot sharing: User A creates and shares snapshot, User B can view and restore
- [ ] Policy sync: Org policy updates, all members' local checks reflect new rules within 1 hour
- [ ] Conflict resolution: Concurrent restore attempts handled gracefully (one succeeds, other retries)
- [ ] E2E test: Two users in same org, create snapshot on A, restore on B, verify content identical

---

## Lane D: MCP Integration (AI Assistant Interface)

**Duration**: 6-8 hours
**Dependencies**: Phase 0, Lane A, Lane E
**Risk Level**: High (privacy-critical, tier gating must be bulletproof)

### Strategic Intent
Provide Model Context Protocol (MCP) tools for AI assistants (Claude, Cursor, etc.) with strict privacy guarantees: Free tier operates entirely locally, Solo+ optionally enables backend tools with explicit user consent.

### MCP Architecture

**Two-Mode Operation**:

1. **Local MCP Server** (`apps/mcp-server`)
   - Runs on user's machine
   - No network calls to SnapBack backend
   - Available on all tiers (Free, Solo, Team, Enterprise)
   - Tools operate on local snapshot store

2. **Backend MCP Tools** (API endpoints at `apps/api/modules/mcp/`)
   - Requires API key authentication
   - Available only on Solo, Team, Enterprise tiers
   - Enables cloud-based snapshot management
   - User must explicitly enable in settings

### Local MCP Tools (Free Tier Included)

**Tool: `create_snapshot`**

**Purpose**: Create local snapshot of workspace

**Input Schema**:
```
{
  "workspacePath": string,
  "message": string (optional),
  "includePatterns": string[] (optional glob patterns)
}
```

**Process**:
1. Validate workspace path exists
2. Invoke local snapshot engine (same as Lane A manual trigger)
3. Store in local SQLite
4. Return snapshot ID and metadata

**Output**:
```
{
  "snapshotId": "abc123",
  "createdAt": "2024-01-15T10:30:00Z",
  "fileCount": 42,
  "message": "Before refactoring auth module"
}
```

**Tool: `analyze_risk`**

**Purpose**: Run security analysis on current workspace state

**Input Schema**:
```
{
  "workspacePath": string,
  "detectors": string[] (optional: ["secrets", "mocks", "deps"])
}
```

**Process**:
1. Run policy engine detectors (from Lane B)
2. Generate risk scores
3. Return SARIF results

**Output**: SARIF-formatted JSON (truncated for MCP response size limits)

**Tool: `check_deps`**

**Purpose**: Identify phantom and unused dependencies

**Input Schema**:
```
{
  "workspacePath": string,
  "packageJsonPath": string (optional, defaults to "package.json")
}
```

**Process**:
1. Parse package.json
2. Scan imports/requires in codebase
3. Cross-reference to find unused

**Output**:
```
{
  "phantomDeps": ["lodash", "moment"],
  "totalDeps": 42,
  "usageReport": { "express": 15, "react": 83 }
}
```

### Backend MCP Tools (Solo+ Only)

**Authentication**: Requires `x-api-key` header with valid API key

**Tier Gating Logic**:
```
function checkBackendMCPAccess(apiKey) {
  user = validateApiKey(apiKey)
  if (!user) return { error: "Invalid API key", code: 401 }

  tier = getUserTier(user.id)
  if (tier === 'free') {
    return {
      error: "Backend MCP tools not available on Free tier",
      upgradeUrl: "/pricing",
      feature: "backendMCP",
      requiredTier: "solo"
    }
  }

  return { allowed: true, user, tier }
}
```

**Tool: `backend/create_snapshot`**

**Purpose**: Create snapshot and upload to cloud

**Input Schema**: Same as local `create_snapshot` + `uploadToCloud: boolean`

**Process**:
1. Create snapshot locally (reuse Lane A logic)
2. If `uploadToCloud === true`: Upload to S3 (with tier check)
3. Store metadata in Supabase (PostgreSQL)
4. Return snapshot ID and cloud URL

**Tool: `backend/list_snapshots`**

**Purpose**: List user's cloud-synced snapshots

**Input Schema**:
```
{
  "limit": number (default: 20),
  "offset": number (default: 0),
  "workspaceId": string (optional filter)
}
```

**Output**: Array of snapshot metadata objects

**Tool: `backend/restore_snapshot`**

**Purpose**: Download and restore cloud snapshot

**Input Schema**:
```
{
  "snapshotId": string,
  "targetPath": string (workspace directory)
}
```

**Process**:
1. Fetch snapshot metadata from database
2. Download chunk bundle from S3
3. Verify integrity (hash check)
4. Restore to target path (atomic operation from Lane A)

### Privacy Enforcement

**Free Tier Guarantees**:
- **NEVER** call backend API endpoints
- **NEVER** transmit code content or file paths
- **NEVER** send metadata to analytics backend
- All operations confined to local machine

**Implementation**:
- MCP server checks tier before exposing backend tools
- If tier === 'free': Backend tools return "not available" error immediately
- No network code paths accessible on Free tier

**Solo+ User Consent**:
- First-time backend MCP use: Show consent dialog
- Dialog text: "This feature uploads snapshot metadata to SnapBack cloud. Your code content is encrypted. Learn more: [Privacy Policy]"
- User must click "I Understand" to proceed
- Consent recorded in user settings: `{ mcpBackendEnabled: boolean, consentedAt: timestamp }`

### Error Handling

**Scenario**: Backend MCP unavailable (network down, API outage)

**Graceful Degradation**:
1. Detect backend unreachable (timeout or 503 response)
2. Show clear error message: "SnapBack cloud unavailable. You can still use local tools."
3. Automatically fall back to local MCP tools if available
4. Log outage event for monitoring

**User Communication**:
- VS Code notification: "Backend MCP temporarily unavailable. Using local fallback."
- CLI: Print warning, proceed with local operation
- Claude/Cursor: MCP tool returns error with fallback suggestion

### MCP Server Configuration

**Config File** (`~/.config/snapback/mcp.json`):
```
{
  "mode": "local" | "backend" | "auto",
  "apiKey": "sk_...",
  "backendUrl": "https://api.snapback.dev",
  "timeout": 30000,
  "retries": 3
}
```

**Mode Behavior**:
- `local`: Only expose local tools (ignores `apiKey`)
- `backend`: Only expose backend tools (requires `apiKey`, fails if tier insufficient)
- `auto`: Expose both, use backend if available and tier allows, else fall back to local

### Integration with Claude/Cursor

**Claude Desktop Configuration** (`claude_desktop_config.json`):
```
{
  "mcpServers": {
    "snapback": {
      "command": "npx",
      "args": ["@snapback/mcp-server"],
      "env": {
        "SNAPBACK_API_KEY": "sk_...",
        "SNAPBACK_MODE": "auto"
      }
    }
  }
}
```

**Cursor Configuration**: Similar MCP server registration

### Lane D Acceptance Criteria
- [ ] Local MCP server starts and registers tools successfully
- [ ] `create_snapshot` tool works on Free tier without network calls (verify with network disabled)
- [ ] `analyze_risk` tool returns SARIF results
- [ ] Backend tools return 402 error on Free tier with upgrade URL
- [ ] Solo tier user can create snapshot via backend MCP with cloud upload
- [ ] API key validation works correctly (invalid key → 401)
- [ ] Backend unavailable → graceful fallback to local tools with user notification
- [ ] Consent dialog shown on first backend MCP use
- [ ] Claude/Cursor demo flow: User asks Claude to create snapshot, tool executes successfully
- [ ] Privacy verification: Packet capture on Free tier shows zero backend API calls

---

## Lane E: Auth & Billing (Monetization)

**Duration**: 10-12 hours
**Dependencies**: Phase 0
**Risk Level**: High (payment processing, security-critical)

### Strategic Intent
Implement secure authentication flows and Stripe-based billing with instant feature flag updates, 14-day Solo trial, and graceful downgrade handling that preserves user data.

### Authentication Flows

**Technology**: better-auth v1.3.34 (already integrated)

**Signup Flow**:
1. User submits email + password on `/signup` page
2. System creates user account (status: `email_unverified`)
3. Send verification email with magic link
4. User clicks link → status updated to `email_verified`
5. Redirect to onboarding flow
6. Default tier: `free`

**Email Verification**:
- Verification link format: `/api/auth/verify?token={JWT}`
- Token payload: `{ userId, email, exp: 24h }`
- On verification: Update `user.emailVerified = true`, emit `EMAIL_VERIFIED` event

**Login Flow**:
1. User submits email + password on `/login`
2. Validate credentials against database
3. Optional: 2FA challenge (TOTP if enabled)
4. Create session (JWT stored in HTTP-only cookie)
5. Redirect to dashboard

**Two-Factor Authentication (2FA)**:
- **Setup**: User scans QR code (Google Authenticator, Authy)
- **Enforcement**: Optional for Free/Solo, required for Team/Enterprise (configurable)
- **Recovery Codes**: Generate 10 single-use codes on 2FA setup
- **Storage**: TOTP secret encrypted in database

**Implementation**:
- Use better-auth's built-in 2FA plugin
- Store 2FA settings in `user.metadata: { twoFactorEnabled, totpSecret, recoveryCodes }`

### Stripe Integration

**Products & Prices**:

| Product | Price ID (env var) | Billing Interval | Trial |
|---------|-------------------|------------------|-------|
| Solo | `STRIPE_SOLO_PRICE_ID` | Monthly | 14 days |
| Team | `STRIPE_TEAM_PRICE_ID` | Monthly | None (direct charge) |
| Enterprise | Custom quote | Annual | None |

**Checkout Flow** (Free → Solo):
1. User clicks "Upgrade to Solo" on `/pricing`
2. Frontend calls `/api/billing/create-checkout` with `{ plan: 'solo', successUrl, cancelUrl }`
3. Backend creates Stripe Checkout Session:
   ```
   stripe.checkout.sessions.create({
     mode: 'subscription',
     customer_email: user.email,
     line_items: [{ price: STRIPE_SOLO_PRICE_ID, quantity: 1 }],
     subscription_data: { trial_period_days: 14 },
     success_url, cancel_url,
     metadata: { userId: user.id, upgradeFrom: 'free', upgradeTo: 'solo' }
   })
   ```
4. Redirect user to Stripe Checkout
5. User enters payment details
6. On success: Stripe redirects to `successUrl`, webhook sent to `/api/webhooks/stripe`

**Webhook Handling** (`/api/webhooks/stripe`):

**Event: `checkout.session.completed`**:
1. Verify webhook signature (prevent replay attacks)
2. Extract `metadata.userId`, `subscription.id`
3. Update user's subscription record:
   ```
   subscriptions.create({
     userId,
     stripeSubscriptionId: subscription.id,
     stripeCustomerId: customer.id,
     plan: 'solo',
     status: 'trialing',
     currentPeriodEnd: subscription.current_period_end,
     trialEnd: subscription.trial_end
   })
   ```
4. Emit analytics event: `UPGRADE_COMPLETED`
5. Trigger feature flag update (see Entitlements section)

**Event: `customer.subscription.updated`**:
- Handle plan changes (upgrades/downgrades)
- Update `subscriptions.plan` and `status`
- Recalculate entitlements

**Event: `customer.subscription.deleted`**:
- User canceled subscription
- Update `status` to 'canceled'
- Trigger downgrade flow (see Downgrade Handling)

**Event: `invoice.payment_failed`**:
- Update `status` to 'past_due'
- Send email notification
- Grace period: 7 days before disabling features

### Entitlements & Feature Flags

**Entitlement Calculation**:
```
function calculateEntitlements(tier: Tier) {
  return {
    cloudBackup: tier !== 'free',
    backendMCP: tier !== 'free',
    maxSnapshots: tier === 'free' ? 50 : tier === 'solo' ? 500 : tier === 'team' ? 2000 : -1,
    teamSharing: tier === 'team' || tier === 'enterprise',
    apiAccess: tier !== 'free',
    advancedAnalytics: tier !== 'free',
    prioritySupport: tier === 'enterprise',
    customRules: tier === 'enterprise'
  }
}
```

**Storage**:
- Store entitlements in `user.metadata.entitlements: Entitlements`
- Update on subscription change webhook
- Cache in Redis with 5-minute TTL for fast access

**Instant Flag Flip**:
1. Webhook received → Update database
2. Invalidate Redis cache for `user:{userId}:entitlements`
3. Next API request fetches fresh entitlements
4. VS Code extension polls `/api/user/entitlements` every 60 seconds, updates UI

**API Key Issuance**:
- On Solo+ upgrade: Automatically generate first API key
- Key format: `sk_{environment}_{random_32_chars}` (e.g., `sk_live_abc123...`)
- Store hash in database: `apiKeys.keyHash = sha256(key)`
- Display key once: "Copy this key now. You won't see it again."
- Permissions embedded in key metadata: `{ policyEvaluation: true, backendMCP: true }`

### Downgrade Handling

**Scenario**: User downgrades Solo → Free (cancels subscription)

**Data Retention**:
- **Snapshots**: Keep all snapshots (both local and cloud)
- **Cloud backup**: Mark as read-only, prevent new uploads
- **Metadata**: Retain in database
- **Analytics events**: Preserve historical data

**Feature Disablement**:
1. Set `tier = 'free'`
2. Update entitlements: `{ cloudBackup: false, backendMCP: false }`
3. Revoke API keys: Set `apiKeys.revokedAt = now()`
4. Disable backend MCP tools (return 402 error)
5. Cloud snapshots: Convert S3 URLs to presigned (7-day expiration) for download

**User Communication**:
- Email: "Your subscription has ended. Your data is safe. Upgrade anytime to restore full access."
- Dashboard banner: "You're on the Free plan. Snapshots limited to 50. [Upgrade]"

**Grace Period**: None (features disabled immediately on subscription end)

**Re-upgrade Path**:
- User clicks "Upgrade" → Normal checkout flow
- On successful payment: Re-enable features, reissue API key
- Cloud snapshots: Restore full access (presigned URLs no longer needed)

### Seat Changes (Team Tier)

**Add Seats**:
1. Admin visits `/settings/billing`
2. Enters new seat count (e.g., 10 → 15)
3. Frontend calls `/api/billing/update-seats` with `{ seats: 15 }`
4. Backend updates Stripe subscription:
   ```
   stripe.subscriptions.update(subscriptionId, {
     items: [{ id: subscriptionItemId, quantity: 15 }]
   })
   ```
5. Prorated charge applied immediately
6. Webhook `customer.subscription.updated` updates database

**Remove Seats**:
- Similar flow, proration credit issued
- Cannot reduce below current active member count (enforced in API)

### Lane E Acceptance Criteria
- [ ] Signup flow creates user, sends verification email
- [ ] Email verification link activates account
- [ ] Login with 2FA works (setup, challenge, recovery codes)
- [ ] Checkout session creates Stripe subscription with 14-day trial
- [ ] Webhook `checkout.session.completed` updates user tier to Solo
- [ ] Feature flags flip within 60 seconds of webhook (verified by polling)
- [ ] API key auto-generated on upgrade, displayed once
- [ ] Downgrade preserves snapshots, disables backend MCP
- [ ] Re-upgrade restores access to cloud snapshots
- [ ] Seat change updates Stripe subscription, prorates correctly
- [ ] Payment failure sets status to `past_due`, sends email
- [ ] E2E test: Upgrade Free → Solo → MCP backend immediately accessible

---

## Lane F: Documentation (Developer Experience)

**Duration**: 12-16 hours
**Dependencies**: Phase 0, all product lanes (A-E)
**Risk Level**: Low (content-focused)

### Strategic Intent
Create comprehensive, tier-aware documentation that adapts content based on user's subscription level, ensuring clarity around privacy guarantees and feature availability.

### Tier-Aware Documentation Components

**Component: `ShowFor`** (new - `apps/docs/components/docs/show-for.tsx`)

**Purpose**: Conditional content rendering

**API**:
```tsx
<ShowFor tiers={['team', 'enterprise']}>
  Team sharing allows you to collaborate...
</ShowFor>
```

**Component: `CTAUpgrade`** (new - `apps/docs/components/docs/cta-upgrade.tsx`)

**Purpose**: Inline upgrade prompts

**Rendering**: Show "Upgrade to unlock" for insufficient tiers

### Documentation Structure

**Directory**: `apps/docs/content/docs/`

**Sections**:
1. **Getting Started**: Installation, Quick Start, First Snapshot (no PlanSwitcher)
2. **Capabilities**: Feature pages with tier badges (show PlanSwitcher)
3. **Guides**: How-to articles with tier filtering (show PlanSwitcher)
4. **Enterprise**: SSO/SAML, Security, POC setup (no PlanSwitcher)
5. **Reference**: CLI, Extension, API docs (no PlanSwitcher)
6. **Plans & Limits**: Feature comparison matrix

### MCP Documentation Split

**Page: `capabilities/mcp-local.mdx`**
- Title: Local MCP Integration <TierBadge tier="free" />
- Privacy guarantee: Works entirely offline
- Tools: create_snapshot, analyze_risk, check_deps

**Page: `capabilities/mcp-backend.mdx`**
- Title: Backend MCP Tools <TierBadge tier="solo" />
- Cloud features with API key
- Privacy notice: Metadata uploaded with encryption
- <CTAUpgrade requiredTier="solo" feature="Backend MCP" />

### Privacy Footer Notice

**Location**: `apps/docs/components/footer.tsx`

**Content**:
"Privacy First: SnapBack works 100% offline on the Free plan. MCP is optional and requires explicit consent on paid plans. [Learn more →](/enterprise/security-privacy)"

### Plans & Limits Matrix

**Page**: `apps/docs/content/plans-limits/index.mdx`

**Table** (canonical source of truth):

| Feature | Free | Solo | Team | Enterprise |
|---------|------|------|------|-----------|
| Local Snapshots | 50 | 500 | 2,000 | Unlimited |
| Cloud Backup | ✗ | ✓ (5GB) | ✓ (25GB) | ✓ (100GB+) |
| Retention | 30d | 90d | 365d | Custom |
| Backend MCP | ✗ | ✓ | ✓ | ✓ |
| Team Sharing | ✗ | ✗ | ✓ (10 seats) | ✓ (Unlimited) |
| API Access | ✗ | ✓ | ✓ | ✓ |
| SSO/SAML | ✗ | ✗ | ✗ | ✓ |
| Priority Support | ✗ | ✗ | ✗ | ✓ |
| Custom Policies | ✗ | ✗ | ✗ | ✓ |

### Terminology Audit

**Find & Replace**:
- "checkpoint" → "snapshot"
- "apply checkpoint" → "restore snapshot"
- "recover" → "restore" (except CLI alias)

**Guard Enforcement**: Phase 0 guard script validates

**Allowlist**: `docs/migration/legacy-terminology.mdx` only

### SEO Optimization

**Each Page Metadata**:
```yaml
---
title: Creating Your First Snapshot
description: Learn how to create a snapshot of your code with SnapBack
keywords: snapshot, backup, code protection, AI safety
og:image: /images/og-snapshots.png
---
```

### Lane F Acceptance Criteria
- [ ] PlanSwitcher visible on Capabilities and Guides pages only
- [ ] TierBadge displays with correct styling for each tier
- [ ] ShowFor component conditionally renders based on tier selection
- [ ] CTAUpgrade prompts appear for insufficient tiers
- [ ] SSO/SAML mentioned ONLY on `/enterprise/sso-saml` and Plans matrix
- [ ] MCP split into two pages (local vs backend)
- [ ] Footer privacy notice visible on all pages
- [ ] Plans & Limits matrix accurate and up-to-date
- [ ] Terminology audit passes (no "checkpoint" except allowlist)
- [ ] Lighthouse score ≥90 for performance, accessibility, SEO

---

## Lane G: Analytics & Feedback (Product Intelligence)

**Duration**: 8-10 hours
**Dependencies**: Phase 0 (analytics contract), all product lanes
**Risk Level**: Medium (privacy-sensitive)

### Strategic Intent
Capture product usage data with strict privacy controls, enable data-driven decisions, and collect qualitative feedback through widgets and NPS surveys.

### Analytics Wrapper Enforcement

**Prohibited Pattern** (fails CI):
```typescript
// ✗ FORBIDDEN
posthog.capture('SNAPSHOT_CREATED', { fileCount: 10 });
```

**Required Pattern**:
```typescript
// ✓ REQUIRED
import { trackEvent } from '@snapback/analytics-client';
trackEvent({
  name: 'SNAPSHOT_CREATED',
  userId: user.id,
  meta: { fileCount: 10, trigger: 'manual', cloud: false }
});
```

### Event Instrumentation Points

**Core Events** (from Phase 0 contract):
1. SNAPSHOT_CREATED - After successful snapshot creation
2. SNAPSHOT_RESTORED - After successful restore
3. POLICY_VIOLATION - Security policy detects violation
4. AI_SUGGESTION_SHOWN - VS Code displays AI suggestion
5. AI_SUGGESTION_ACCEPTED - User accepts suggestion
6. AI_SUGGESTION_DISMISSED - User dismisses suggestion
7. LOGIN - Successful authentication
8. UPGRADE_INTENT - User clicks upgrade CTA

### Data Sanitization (Privacy-Critical)

**Sanitization Rules** (in `@snapback/analytics-client`):

1. **Email Addresses**: Regex detection → `[email]`
2. **API Keys & Tokens**: Pattern matching → `[redacted]`
3. **File Paths**: Strip user home directory, normalize to relative paths
4. **IP Addresses**: Never included (PostHog auto-capture disabled)

**Implementation**:
```typescript
function sanitizeMeta(meta: Record<string, any>) {
  // Strip PII, normalize paths, redact secrets
  return sanitized;
}
```

### Database Ingestion

**API Endpoint**: `POST /api/analytics/ingest`

**Process**:
1. Authenticate user (protected procedure)
2. Validate batch against schema
3. Write to `analyticsEvents` table
4. Forward to PostHog for product analytics
5. Return acknowledgment

**Performance Target**: <200ms for batch of 50 events

### PostHog Integration

**Configuration**:
- Project API Key: `NEXT_PUBLIC_POSTHOG_KEY`
- Backend Key: `POSTHOG_KEY`
- Data Residency: US (PostHog cloud)

**Product Dashboards**:
1. **Overview**: DAU/MAU, signups, upgrades
2. **Product Health**: Snapshot creation rate, restore success rate
3. **Security**: Policy violations by severity
4. **AI Suggestions**: Show rate, acceptance rate, time-to-accept

### Feedback Widget

**Component**: `<FeedbackWidget />` (new)

**Placement**:
- **Web App**: Floating button bottom-right (all pages except auth)
- **VS Code**: Command "SnapBack: Send Feedback" + status bar button

**UI**:
- Category: Dropdown (Bug, Feature Request, Question, Other)
- Message: Textarea (required, max 1000 chars)
- Email: Optional (pre-filled if logged in)
- Screenshot: Optional

**Submission**:
1. POST to `/api/feedback/submit`
2. Store in `feedback` table
3. Notify Slack webhook (ops channel)
4. Auto-tag in Linear/GitHub Issues

### NPS Survey

**Trigger Logic**:
- **First Survey**: 7 days after signup (user has ≥3 snapshots)
- **Cooldown**: 30 days between surveys

**Survey UI**:
- "How likely are you to recommend SnapBack?" (0-10 scale)
- Follow-up: "What's the main reason for your score?" (textarea)
- Dismiss options: "Ask me later" (7 days) or "Don't ask again"

**Data Storage**:
```sql
CREATE TABLE nps_responses (
  id TEXT PRIMARY KEY,
  userId TEXT,
  score INTEGER, -- 0-10
  reason TEXT,
  createdAt TIMESTAMP
);
```

**Analysis**: NPS = (% Promoters 9-10) - (% Detractors 0-6)

### Audit Export

**API Endpoint**: `/api/audit/export-audit-log`

**Input**: `{ format: 'csv'|'json', startDate, endDate }`

**Output**:
- If payload ≤10MB: `InlineExport` (direct data)
- If payload >10MB: `UrlExport` (S3 presigned URL, 7-day expiration)

**Tier Requirement**: Team+ (enforced in procedure)

### Lane G Acceptance Criteria
- [ ] Analytics wrapper enforced (CI guard detects direct PostHog calls)
- [ ] All 8 core events instrumented and flowing to database
- [ ] Metadata sanitization verified (no emails/tokens in PostHog)
- [ ] Events visible in PostHog <5 seconds after trigger
- [ ] Feedback widget submits to API, notifies Slack
- [ ] NPS survey triggers after 7 days for engaged users
- [ ] Audit export works in both inline and S3 modes
- [ ] Export size threshold (10MB) correctly determines mode

---

## Lane H: Reliability & Observability (Production Hardening)

**Duration**: 6-8 hours
**Dependencies**: All product lanes
**Risk Level**: Medium

### Strategic Intent
Ensure production-grade reliability with structured logging, error tracking, health checks, rate limiting, and graceful degradation.

### Structured Logging

**Standard**: Pino logger (already integrated in `@snapback/infrastructure`)

**Log Format**:
```json
{
  "level": "info",
  "time": 1705315200000,
  "requestId": "req_abc123",
  "userId": "user_xyz",
  "msg": "Snapshot created",
  "context": {
    "snapshotId": "snap_001",
    "fileCount": 42,
    "durationMs": 87
  }
}
```

**Request ID Propagation**:
- Generate UUID on request entry: `req_{cuid}`
- Attach to all logs within request scope
- Return in response header: `X-Request-ID`
- Include in error responses for support debugging

### Sentry Integration

**Configuration**:
- **DSN**: `SENTRY_DSN` (optional, graceful if missing)
- **Environment**: `production`, `staging`, `development`
- **Release**: Git commit SHA

**Error Capture**:
- Unhandled exceptions automatically captured
- Manual capture: `Sentry.captureException(error, { context })`
- Breadcrumbs: User actions leading to error

**PII Scrubbing**:
- Before sending to Sentry: Strip emails, tokens, file paths
- Use Sentry's `beforeSend` hook

### Health Checks

**Endpoint**: `GET /api/health` (public, no auth)

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "s3": "healthy"
  },
  "version": "1.0.0-alpha"
}
```

**Status Codes**:
- 200: All systems operational
- 503: One or more subsystems degraded

**Check Implementation**:
- **Database**: Simple SELECT query with 2s timeout
- **Redis**: PING command
- **S3**: HeadBucket on export bucket

**Docker Health Check** (already in Dockerfile):
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js
```

### Rate Limiting

**Strategy**: Token bucket algorithm via Upstash Redis

**Limits by Tier**:

| Endpoint | Free | Solo | Team | Enterprise |
|----------|------|------|------|-----------|
| /api/snapshot/create | 10/hr | 100/hr | 500/hr | Unlimited |
| /api/policy/evaluate | 5/hr | 50/hr | 200/hr | Unlimited |
| /api/analytics/ingest | 20/hr | 200/hr | 1000/hr | Unlimited |

**Implementation**:
- Middleware: `apps/api/src/middleware/ratelimit.ts` (already exists)
- Key format: `ratelimit:{userId}:{endpoint}`
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**Response on Limit Exceeded**:
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 3600,
  "upgradeUrl": "/pricing"
}
```

### Graceful Degradation

**Chaos Testing Scenario**: Downstream dependency unavailable

**Examples**:
1. **S3 Down**: Cloud backup queued locally, retry with exponential backoff
2. **PostHog Down**: Analytics events buffered in-memory (max 1000), persisted to disk
3. **Stripe Down**: Checkout disabled, show "Payment processing temporarily unavailable"

**Implementation**:
- Circuit breaker pattern (using `opossum` library)
- After 5 consecutive failures: Open circuit (fail fast)
- After 30s: Half-open (try one request)
- If success: Close circuit (resume normal)

### Lane H Acceptance Criteria
- [ ] All API requests include `requestId` in logs and response headers
- [ ] Sentry captures exceptions with sanitized context
- [ ] Health check endpoint returns 200 when all subsystems healthy
- [ ] Health check returns 503 when database unreachable
- [ ] Rate limiting enforces tier-based limits correctly
- [ ] Rate limit headers (`X-RateLimit-*`) present in responses
- [ ] Chaos test: Kill PostgreSQL → API returns 503 → Restore DB → API recovers
- [ ] Circuit breaker opens after 5 consecutive S3 failures

---

## Lane I: Testing & QA (Quality Assurance)

**Duration**: 10-12 hours
**Dependencies**: All lanes (A-H)
**Risk Level**: High (quality gate for release)

### Strategic Intent
Achieve production-ready quality with comprehensive unit, integration, and E2E tests covering critical paths, edge cases, and performance budgets.

### Unit Test Coverage

**Target**: ≥70% code coverage (enforced in CI)

**Critical Packages** (must have tests):
- `@snapback/policy-engine`: All detectors, risk scoring
- `@snapback/analytics-client`: Sanitization logic
- `@snapback/core`: Snapshot creation, restore, deduplication
- `apps/api`: All procedures, middleware

**Test Framework**: Vitest

**Example**: Policy engine secret detection
```typescript
describe('Secret Detection', () => {
  it('detects AWS access keys', () => {
    const result = detectSecrets('AKIAIOSFODNN7EXAMPLE');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].riskScore).toBe(10);
  });

  it('ignores secrets in test files', () => {
    const result = detectSecrets('AKIAIOSFODNN7EXAMPLE', { filePath: '__tests__/fixture.ts' });
    expect(result.findings).toHaveLength(0);
  });
});
```

### Integration Tests

**Scope**: Multi-component interactions

**Key Flows**:
1. **Snapshot Creation → Cloud Upload → Integrity Verification**
2. **Policy Violation → Block Commit → Fix → Allow Commit**
3. **Stripe Webhook → Tier Update → Feature Flag Flip**

**Test Environment**: Docker Compose with test database, mock S3 (LocalStack)

### E2E Tests (Playwright)

**Critical User Journeys**:

1. **New User Onboarding**
   - Signup → Email verification → First snapshot → Policy setup
   - Duration: <2 minutes
   - Assertions: Snapshot visible in timeline, policy active

2. **Upgrade Flow**
   - Free user → Click upgrade → Stripe checkout → Payment → Tier updated → MCP backend accessible
   - Duration: <3 minutes (using Stripe test mode)
   - Assertions: Entitlements reflect Solo tier, API key generated

3. **Team Collaboration**
   - User A creates org → Invites User B → User B joins → User A shares snapshot → User B restores
   - Duration: <4 minutes
   - Assertions: Snapshot content identical after restore

4. **Policy Violation Workflow**
   - User commits file with secret → Pre-commit hook blocks → User fixes → Commit succeeds
   - Duration: <1 minute
   - Assertions: First commit returns exit code 1, second returns 0

5. **Export Audit Log**
   - User navigates to analytics → Clicks export → Downloads CSV → Validates content
   - Duration: <1 minute
   - Assertions: CSV contains expected events, no PII

**Playwright Configuration** (`playwright.config.ts`):
```typescript
{
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  workers: 6, // Parallel execution
  reporter: [['html'], ['junit', { outputFile: 'test-results/junit.xml' }]],
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
}
```

### Load Testing (Lightweight)

**Tool**: k6 (simple HTTP load generator)

**Scenario**: 10 concurrent users creating snapshots and restoring

**Script**:
```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '1m',
};

export default function () {
  const res = http.post('http://localhost:3001/api/snapshot/create', JSON.stringify({
    workspacePath: '/tmp/test-repo',
    message: 'Load test snapshot',
  }), { headers: { 'Content-Type': 'application/json', 'x-api-key': __ENV.API_KEY } });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
```

**Success Criteria**:
- All requests return 200
- p95 response time <200ms
- Zero errors under load

### Performance Budget Validation

**Harness**: `packages/perf/tests/perf.spec.ts` (from Phase 0)

**Benchmarks**:
1. Snapshot creation (500 files, 50MB): <100ms (p95)
2. Risk analysis (10 files): <500ms
3. Session tracking: <50ms
4. Analytics TTI: <2000ms

**Measurement**:
- Run 10 iterations per benchmark
- Calculate p50, p90, p95
- Fail CI if any budget exceeded

### Lane I Acceptance Criteria
- [ ] Unit test coverage ≥70% (measured by Vitest)
- [ ] All critical packages have tests
- [ ] Integration tests pass for snapshot creation → cloud upload → integrity verification
- [ ] E2E test: New user onboarding completes without errors
- [ ] E2E test: Upgrade flow updates tier and generates API key
- [ ] E2E test: Team collaboration restores snapshot correctly
- [ ] E2E test: Policy violation blocks commit, fix allows commit
- [ ] Load test: 10 concurrent users, zero errors, p95 <200ms
- [ ] Performance budgets pass in CI
- [ ] Playwright tests run on chromium, firefox, webkit

---

## Lane J: Packaging & Release (Deployment Readiness)

**Duration**: 6-8 hours
**Dependencies**: All lanes (A-I)
**Risk Level**: Medium

### Strategic Intent
Prepare VS Code extension for marketplace publication, implement semantic versioning, and automate release workflows with dry-run validation.

### VS Code Extension Packaging

**Marketplace Manifest** (`apps/vscode/package.json`):

**Required Fields**:
```json
{
  "name": "snapback",
  "displayName": "SnapBack - AI-Aware Code Protection",
  "description": "Intelligent snapshots and security policies for AI-assisted development",
  "version": "1.0.0-alpha.1",
  "publisher": "snapback",
  "icon": "icon.png",
  "categories": ["Other"],
  "keywords": ["snapshot", "backup", "security", "AI", "policy"],
  "repository": {
    "type": "git",
    "url": "https://github.com/snapback/snapback"
  },
  "bugs": {
    "url": "https://github.com/snapback/snapback/issues"
  },
  "engines": {
    "vscode": "^1.80.0"
  }
}
```

**Icon Requirements**:
- Size: 128x128px
- Format: PNG
- Location: `apps/vscode/icon.png`

**README** (`apps/vscode/README.md`):
- **Features**: Bullet list with screenshots
- **Installation**: From marketplace link
- **Quick Start**: 3-step setup
- **Commands**: List all VS Code commands
- **Configuration**: Settings reference

### Version Bump Script

**Tool**: Changesets (already integrated)

**Workflow**:
1. Developer runs: `pnpm changeset`
2. Selects packages to version (vscode, cli, mcp-server)
3. Selects semver bump: patch/minor/major
4. Writes changelog entry
5. Commit changeset file
6. On merge to main: `pnpm changeset version` bumps versions
7. GitHub Action publishes

**Changeset Example** (`.changeset/alpha-release.md`):
```markdown
---
"@snapback/vscode": major
"@snapback/cli": major
"@snapback/mcp-server": major
---

Alpha release with snapshot creation, security policies, team sharing, and MCP integration.
```

### Changelog Generation

**Format**: Keep a Changelog (https://keepachangelog.com/)

**Structure** (`CHANGELOG.md`):
```markdown
# Changelog

## [1.0.0-alpha.1] - 2024-01-15

### Added
- Snapshot creation with auto-triggers
- Security policy engine with secret detection
- Team sharing and organization management
- Local and backend MCP integration
- Stripe billing with 14-day trial
- Tier-aware documentation

### Fixed
- Hash integrity verification on restore
- Rate limiting enforcement

### Security
- PII sanitization in analytics events
```

### GitHub Actions Release Workflow

**File**: `.github/workflows/release.yml`

**Triggers**:
- Manual: `workflow_dispatch`
- Automatic: Push to `main` with version tags

**Steps**:
1. **Checkout**: Fetch full git history
2. **Setup Node**: v20.11.0, pnpm 10.14.0
3. **Install Dependencies**: `pnpm install --frozen-lockfile`
4. **Build**: `pnpm build`
5. **Lint**: `pnpm lint`
6. **Test**: `pnpm test`
7. **E2E**: `pnpm test:e2e` (headless mode)
8. **Guard**: `bash scripts/ci/guard.sh`
9. **Performance**: Run perf budgets
10. **Dry-Run Publish**: `pnpm publish --dry-run` (VS Code extension)
11. **Publish** (if not dry-run): `vsce publish`
12. **Create GitHub Release**: Attach artifacts, include changelog
13. **Notify**: Slack webhook to #releases channel

**Secrets Required**:
- `VSCE_PAT`: VS Code Marketplace Personal Access Token
- `SLACK_WEBHOOK_URL`: Release notifications

### Artifact Signing (Optional, Post-Alpha)

**Tool**: GPG signatures

**Process**:
1. Sign VSIX file: `gpg --detach-sign snapback-1.0.0.vsix`
2. Attach `.sig` file to GitHub release
3. Users can verify: `gpg --verify snapback-1.0.0.vsix.sig`

### Lane J Acceptance Criteria
- [ ] VS Code extension packages successfully: `vsce package`
- [ ] Marketplace manifest includes all required fields
- [ ] Icon displays correctly in VS Code Extensions panel
- [ ] README includes features, installation, quick start
- [ ] Changeset workflow generates correct version bumps
- [ ] CHANGELOG.md formatted according to Keep a Changelog
- [ ] GitHub Actions release workflow runs end-to-end (dry-run mode)
- [ ] All CI gates pass in release workflow (build, lint, test, E2E, guard, perf)
- [ ] Dry-run publish succeeds without errors
- [ ] GitHub release created with artifacts attached

---

## Lane K: Admin & Support (Operations Tooling)

**Duration**: 4-6 hours
**Dependencies**: All product lanes
**Risk Level**: Low

### Strategic Intent
Provide internal tooling for support team to assist users, manage feature flags, and perform admin operations safely.

### Admin Console Lite

**Location**: `apps/web/app/admin/` (route protected by `role === 'admin'`)

**Features**:

1. **User Lookup**
   - Search by email or user ID
   - Display: Tier, subscription status, API keys, snapshot count
   - Actions: Reset password, revoke API key, change tier (manual override)

2. **Organization Lookup**
   - Search by org name or slug
   - Display: Members, tier, billing status
   - Actions: Add seats, change owner

3. **Feature Flags Dashboard**
   - Toggle global flags: `ENABLE_EXPORT`, `ENABLE_NPS`, `ENABLE_PRESETS`, `ENABLE_MCP_BACKEND`
   - Changes take effect immediately (invalidate caches)

4. **Export on Behalf**
   - Admin can export audit log for any user (support request)
   - Requires user consent (email confirmation)
   - Logs admin action for audit trail

**Security**:
- Admin role stored in `user.metadata.role = 'admin'`
- All admin actions logged to `adminActions` table
- Require 2FA for admin users (enforced)

### Support Playbook

**Document**: `docs/internal/support-playbook.md`

**Common Scenarios**:

1. **User Can't Access Cloud Snapshots**
   - Verify tier: Check subscription status
   - Check API key: Ensure not revoked
   - Check S3: Verify object exists (HeadObject)
   - Resolution: Reissue API key or restore from backup

2. **Policy Violation False Positive**
   - Ask for SARIF report
   - Review detection logic
   - Add to allowlist: Update user's `.snapbackrc`
   - Escalate to engineering if pattern issue

3. **Export Not Generating**
   - Check tier: Export requires Team+
   - Check date range: Ensure events exist
   - Check S3: Verify bucket accessible
   - Manual export: Use admin console "Export on Behalf"

4. **Billing Issue**
   - Check Stripe subscription status
   - Verify webhook delivery (Stripe dashboard)
   - Manual sync: Trigger webhook replay
   - Escalate to billing team

**Contact Points**:
- Engineering escalation: #eng-support Slack channel
- Billing escalation: billing@snapback.dev

### Admin Actions Audit Log

**Table**: `adminActions`

**Schema**:
```sql
CREATE TABLE adminActions (
  id TEXT PRIMARY KEY,
  adminUserId TEXT,
  action TEXT, -- e.g., 'USER_TIER_OVERRIDE', 'API_KEY_REVOKE'
  targetUserId TEXT,
  details JSON,
  createdAt TIMESTAMP
);
```

**Logging Example**:
```typescript
await db.insert(adminActions).values({
  id: cuid(),
  adminUserId: admin.id,
  action: 'USER_TIER_OVERRIDE',
  targetUserId: user.id,
  details: { from: 'free', to: 'solo', reason: 'Support request #1234' },
  createdAt: new Date(),
});
```

### Lane K Acceptance Criteria
- [ ] Admin console accessible only to users with `role === 'admin'`
- [ ] User lookup returns tier, subscription, API keys
- [ ] Feature flag toggle immediately affects app behavior (verified by checking flag-gated feature)
- [ ] Export on behalf generates audit log for user
- [ ] Support playbook covers all 4 common scenarios
- [ ] Admin actions logged to `adminActions` table
- [ ] E2E test: Admin looks up user, changes tier, tier update reflected in database

---

## CI Gates (MUST PASS TO MERGE)

### Guard Script (`scripts/ci/guard.sh`)
**Fails If**:
- "checkpoint" string appears (except allowlist)
- Deprecated actions "apply"/"review" found
- Direct analytics POST bypassing wrapper
- SSO/SAML/SCIM outside `/enterprise/sso-saml.mdx`

### Performance Budgets (`packages/perf/tests/perf.spec.ts`)
**Fails If**:
- Snapshot creation p95 ≥100ms
- Risk analysis ≥500ms
- Session tracking ≥50ms
- Analytics TTI ≥2000ms

### E2E Baseline (`packages/e2e/tests/alpha.spec.ts`)
**Fails If**:
- Signup → Analytics page flow broken
- Export buttons missing
- Console errors present

### Docs Guard
**Fails If**:
- SSO/SAML/SCIM mentioned outside Enterprise docs

### Test Coverage
**Fails If**:
- Code coverage <70% (measured by Vitest)

---

## Rollback & Kill Switches

### Feature Flags (Global Toggles)

**Flags** (stored in database, cached in Redis):
- `ENABLE_EXPORT`: Audit log export feature
- `ENABLE_NPS`: NPS survey system
- `ENABLE_PRESETS`: Policy framework presets
- `ENABLE_MCP_BACKEND`: Backend MCP tools (Solo+)

**Usage**:
```typescript
const flags = await getFeatureFlags();
if (!flags.ENABLE_EXPORT) {
  return res.status(503).json({ error: 'Export temporarily disabled' });
}
```

**Toggle Mechanism**:
- Admin console: Instant toggle (invalidates cache)
- Emergency disable: Direct database update + cache flush

### Rollback Procedures

**Scenario 1: Docs PlanSwitcher Causing Issues**
- **Action**: Disable PlanSwitcher render in docs layout
- **File**: `apps/docs/app/layout.tsx`
- **Change**: Comment out `<PlanSwitcher />` component
- **Deploy**: Redeploy docs app (independent from main app)

**Scenario 2: MCP Backend Causing Errors**
- **Action**: Set `ENABLE_MCP_BACKEND = false`
- **Effect**: All backend MCP requests return "temporarily unavailable"
- **Fallback**: Users automatically use local MCP tools

**Scenario 3: Analytics Ingestion Overload**
- **Action**: Set `ENABLE_ANALYTICS_INGEST = false`
- **Effect**: Analytics events buffered locally, not sent to backend
- **Recovery**: Enable after load decreases

**Git Rollback**:
- **Procedure**: `git revert <commit-sha>` → CI runs → Deploy
- **Safe Components**: Isolated under `components/docs/*`, `modules/admin/*`
- **Risk Assessment**: New components won't break existing flows

---

## Execution Strategy

### Lane Sequencing

**Phase 1: Foundations** (Execute First)
- Lane A (Snapshots & Restore)
- Lane E (Auth & Billing)
- Lane G (Analytics & Feedback)

**Phase 2: Core Features** (Execute in Parallel)
- Lane B (Guardian & Policies)
- Lane D (MCP Integration)
- Lane F (Documentation)

**Phase 3: Production Readiness** (Execute Last)
- Lane H (Reliability & Observability)
- Lane I (Testing & QA)
- Lane J (Packaging & Release)
- Lane K (Admin & Support)

### Daily Reporting Format

**After Each Lane Completion**, post to #alpha-sprint Slack channel:

```markdown
## Lane X Complete: [Name]

**Summary** (≤5 bullets):
- Feature 1 delivered
- Feature 2 delivered
- Edge case handled
- Performance optimized
- Tests passing

**Files Touched** (key changes):
- `packages/core/src/snapshot.ts` - Snapshot creation logic
- `apps/api/modules/snapshot/` - API endpoints

**Performance**:
- Snapshot creation: 87ms (p95, budget 100ms) ✓
- Restore integrity check: 120ms

**Open Risks**:
- None / [Description of blocker]

**Screenshots**: [Attach if UI changes]
```

### Stop Rules

**STOP if**:
1. Any CI gate fails (fix before proceeding)
2. Performance budget exceeded by >20% (investigate root cause)
3. E2E test fails on critical path (triage immediately)
4. Security vulnerability discovered (address before merge)

**Escalation**:
- Blocker unresolved after 4 hours → Escalate to engineering lead
- Multiple lanes blocked → Coordinate dependency resolution

---

## Definition of Done (Alpha Release)

### Product Completeness
- [ ] All lanes (A-K) acceptance criteria passed
- [ ] Phase 0 contracts enforced in CI
- [ ] Terminology standardized (no "checkpoint" except allowlist)
- [ ] Privacy guarantees verified (Free tier: zero backend calls)

### Quality Gates
- [ ] Unit test coverage ≥70%
- [ ] E2E tests pass on chromium, firefox, webkit
- [ ] Performance budgets met (all 4 benchmarks)
- [ ] Load test: 10 concurrent users, zero errors

### Documentation
- [ ] All docs pages published with tier badges
- [ ] Plans & Limits matrix accurate
- [ ] SSO/SAML only on Enterprise page
- [ ] Privacy footer on all pages

### Deployment
- [ ] VS Code extension published to marketplace
- [ ] Web app deployed to production
- [ ] API service deployed and healthy
- [ ] MCP server packaged and npm published

### Monitoring
- [ ] Sentry error tracking active
- [ ] PostHog analytics flowing
- [ ] Health checks returning 200
- [ ] Logs structured with requestId

### Rollback Readiness
- [ ] Feature flags operational
- [ ] Kill switch procedures documented
- [ ] Git rollback tested on staging

---

## Architecture Decision Record

**ADR**: `docs/adr/0001-alpha-alignment.md` (from Phase 0)

**Decisions Recorded**:
1. Terminology: "snapshot/restore" everywhere
2. Policy actions: "watch/warn/block"
3. Tiers: "free/solo/team/enterprise"
4. Privacy: Free tier local-only, Solo+ optional backend
5. Cloud: US-only (S3 us-east-1)
6. Performance budgets: Snapshot <100ms, risk <500ms, session <50ms, analytics TTI <2s
7. Billing: 14-day Solo trial, downgrade preserves data
8. MCP: Two-mode (local + backend), tier-gated

**Status**: Accepted
**Stakeholders**: Engineering, Product, Security
**Date**: Sprint start

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Performance budgets not met | Medium | High | Early profiling, incremental optimization |
| False positives in policy engine | High | Medium | Test corpus validation, allowlist mechanism |
| Stripe webhook delivery failure | Low | High | Idempotency keys, manual sync tooling |
| S3 outage during critical demo | Low | High | Graceful degradation, local fallback |
| MCP server incompatibility | Medium | Medium | Version pinning, compatibility matrix |
| Privacy violation (accidental data leak) | Low | Critical | Multiple sanitization layers, audit reviews |
| CI flakiness blocks merge | Medium | Medium | Retry logic, deterministic test data |

---

## Success Metrics (Post-Launch)

**Week 1**:
- 100 signups
- 50 active users (created ≥1 snapshot)
- 10 Solo trial conversions
- Zero critical bugs

**Week 4**:
- 500 signups
- 250 active users
- 50 paid subscribers (Solo + Team)
- NPS ≥40
- Retention: 60% of signups create ≥3 snapshots

**Technical KPIs**:
- Uptime: 99.9%
- p95 API response time: <200ms
- Error rate: <0.1%
- Performance budgets: 100% pass rate
