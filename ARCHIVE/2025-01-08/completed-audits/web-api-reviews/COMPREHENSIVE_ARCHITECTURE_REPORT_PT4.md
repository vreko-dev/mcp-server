# SnapBack Comprehensive Architecture Analysis - Part 4 of 5

**Continued from Part 3**

---

## SECTION 4: DATABASE SCHEMA ALIGNMENT

### 4.1 Current Data Persistence

Based on the schema in `packages/platform/src/db/schema/`, here's what's being used:

#### **Table: `api_keys`**

**Schema Location:** `packages/platform/src/db/schema/postgres.ts`

**Columns:**
- `id`, `key_hash`, `user_id`, `name`, `permissions`, `tier`, `last_used_at`, `created_at`, `expires_at`

**Write Operations:**
- ✅ `packages/api/src/routes/v1/api-keys.ts` - Creates new API keys
- Location: API key creation endpoint
- Frequency: Per user action (rare, ~1-2 times per user)

**Read Operations:**
- ✅ `packages/api/src/services/guardian.ts` (line ~70-80) - Validates API key
- ✅ `apps/mcp-server/src/auth.ts` - Validates API key
- Location: Every backend API request
- Frequency: HIGH (every analysis request)
- Access Pattern: By `id` or `key_hash` (indexed)

**Current Indexes:**
- ✅ Primary key on `id`
- ⚠️ Need index on `key_hash` for lookups

**Assessment:** ✅ Well-used, core authentication

---

#### **Table: `analysis_events`**

**Schema Location:** `packages/platform/src/db/schema/snapback.ts`

**Columns:**
- `id`, `user_id`, `api_key_id`, `workspace_id`, `risk_score`, `risk_level`, `analysis_duration_ms`, `file_count`, `total_lines`, `created_at`, `metadata`

**Write Operations:**
- ✅ `packages/api/src/services/guardian.ts` (line ~366) - After each analysis
  ```typescript
  await db.insert(analysisEvents).values({
    id: analysisId,
    user_id: request.userId,
    api_key_id: request.apiKeyId,
    risk_score: finalRiskScore,
    // ...
  });
  ```
- Frequency: Per backend analysis (~100-1000x per day per active user)

**Read Operations:**
- ⚠️ **MINIMAL** - Only for dashboard analytics (rare)
- Location: `apps/web/lib/dashboard/metrics.ts`
- Frequency: LOW (only when user views dashboard)
- Access Pattern: By `user_id` + date range

**Missing Operations:**
- ❌ No aggregation queries for analytics
- ❌ No ML training data export
- ❌ No historical analysis trending

**Assessment:** ⚠️ **Underutilized** - Data captured but not used effectively

---

#### **Table: `rule_violations`**

**Schema Location:** `packages/platform/src/db/schema/snapback.ts`

**Columns:**
- `id`, `analysis_event_id`, `rule_id`, `rule_name`, `severity`, `file_path`, `line_number`, `column_number`, `message`, `context`, `created_at`

**Write Operations:**
- ✅ `packages/api/src/services/guardian.ts` (lines ~148, ~293) - Per violation found
  ```typescript
  await db.insert(ruleViolations).values({
    analysis_event_id: analysisId,
    rule_name: "Secret Detected",
    severity: "high",
    file_path: file.path,
    // ...
  });
  ```
- Frequency: Per violation (0-10 per analysis)

**Read Operations:**
- ⚠️ **RARE** - Only for detailed violation drill-down
- No aggregation for common violation types
- No trending analysis

**Missing Operations:**
- ❌ Top violations by project
- ❌ False positive tracking
- ❌ Violation resolution tracking (did user fix it?)

**Assessment:** ⚠️ **Underutilized** - Could power valuable insights

---

#### **Table: `user_safety_profiles`**

**Schema Location:** `packages/platform/src/db/schema/snapback.ts`

**Columns:**
- `id`, `user_id`, `total_analyses`, `total_blocked`, `total_warnings`, `average_risk_score`, `last_analysis_at`, `created_at`, `updated_at`

**Write Operations:**
- ✅ `packages/api/src/services/guardian.ts` (line ~459) - Updates after each analysis
  ```typescript
  await db.insert(userSafetyProfiles).values({
    user_id: userId,
    total_analyses: 1,
    average_risk_score: riskScore,
    // ...
  }).onConflictDoUpdate({
    total_analyses: profile.total_analyses + 1,
    average_risk_score: newAverage,
    // ...
  });
  ```
- Frequency: Per analysis (frequent)

**Read Operations:**
- ⚠️ **RARE** - Only read for user profile page
- No ML features based on user history
- No adaptive policies based on user trust score

**Missing Operations:**
- ❌ User risk scoring (trust level)
- ❌ Adaptive policies (more lenient for trusted users)
- ❌ Anomaly detection (unusual activity for user)

**Assessment:** ⚠️ **Underutilized** - Rich data not leveraged

---

#### **Table: `snapshots`**

**Schema Location:** `packages/platform/src/db/schema/snapback.ts`

**Columns:**
- `id`, `user_id`, `workspace_id`, `file_path`, `content_hash`, `content`, `metadata`, `protection_level`, `risk_score`, `trigger`, `created_at`, `deleted_at`

**Write Operations:**
- 🚨 **NOT BEING WRITTEN TO** from client apps
- Schema exists but clients use local SQLite only
- Backend API has snapshot endpoints but not fully wired

**Read Operations:**
- ❌ **NONE** - Table is empty or minimal data

**Missing Operations:**
- ❌ Sync local snapshots to cloud
- ❌ Cross-device snapshot access
- ❌ Team snapshot sharing
- ❌ Snapshot analytics

**Assessment:** 🚨 **CRITICAL GAP** - Table exists but unused

---

#### **Table: `user_decisions`** (DOES NOT EXIST)

**What Should Be Captured:**
- When user allows/blocks/bypasses a warning
- Reason for bypass (if provided)
- Time spent in decision dialog
- Final action taken

**Currently:**
- 🚨 **NOT PERSISTED ANYWHERE**
- Generated in `apps/vscode/src/handlers/SaveHandler.ts`
- Lost after dialog closes

**Why It Matters:**
- Compliance audits (who bypassed what warning?)
- False positive tracking (user always bypasses X warning)
- ML training (learn from user decisions)
- User trust scoring

**Proposed Schema:**
```sql
CREATE TABLE user_decisions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  analysis_id TEXT REFERENCES analysis_events(id),
  protection_level TEXT NOT NULL, -- 'watch' | 'warn' | 'block'
  risk_score INTEGER,
  decision TEXT NOT NULL, -- 'allow' | 'block' | 'bypass'
  bypass_reason TEXT,
  time_to_decision_ms INTEGER, -- How long user thought about it
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Impact:** HIGH - Critical compliance data

---

#### **Table: `false_positives`** (DOES NOT EXIST)

**What Should Be Captured:**
- User reports false positive
- Violation ID that was wrong
- User feedback on why it's wrong
- Resolution (did we fix detection?)

**Currently:**
- 🚨 **NO FEEDBACK MECHANISM**

**Why It Matters:**
- Improve detection accuracy
- Measure false positive rate
- Prioritize detection improvements

**Proposed Schema:**
```sql
CREATE TABLE false_positives (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  violation_id TEXT REFERENCES rule_violations(id),
  analysis_id TEXT REFERENCES analysis_events(id),
  feedback_text TEXT,
  resolution_status TEXT, -- 'pending' | 'confirmed' | 'rejected' | 'fixed'
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Impact:** HIGH - Critical for improving accuracy

---

#### **Table: `workspace_context`** (DOES NOT EXIST)

**What Should Be Captured:**
- Project metadata (tech stack, frameworks)
- File structure patterns
- Common patterns in codebase
- Team-specific rules

**Currently:**
- 🚨 **EACH ANALYSIS IS ISOLATED**
- No learning from project context

**Why It Matters:**
- Context-aware detection (GraphQL project has GraphQL patterns)
- Reduce false positives (project uses specific patterns)
- Team-wide policies

**Proposed Schema:**
```sql
CREATE TABLE workspace_context (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  project_type TEXT, -- 'nextjs' | 'express' | 'react' | etc.
  tech_stack JSONB, -- { languages: ['ts'], frameworks: ['next'] }
  common_patterns JSONB, -- Learned patterns that are OK for this project
  custom_suppressions JSONB, -- Specific suppressions for this project
  last_analyzed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Impact:** MEDIUM - Improves accuracy for repeat projects

---

#### **Table: `ml_training_data`** (DOES NOT EXIST)

**What Should Be Captured:**
- Code snippets with labels (risky/safe)
- User decisions on each snippet
- Context and metadata
- Structured for ML training

**Currently:**
- 🚨 **NO ML TRAINING PIPELINE**
- Data exists but not structured for training

**Why It Matters:**
- Train custom ML models
- Improve detection over time
- Personalized risk scoring

**Proposed Schema:**
```sql
CREATE TABLE ml_training_data (
  id TEXT PRIMARY KEY,
  snippet_hash TEXT NOT NULL,
  code_snippet TEXT NOT NULL,
  language TEXT NOT NULL,
  file_path TEXT,
  label TEXT NOT NULL, -- 'risky' | 'safe' | 'unknown'
  features JSONB, -- Extracted features for ML
  user_decision TEXT, -- What did user do?
  violation_types JSONB, -- What violations were detected?
  false_positive BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ml_training_label ON ml_training_data(label);
CREATE INDEX idx_ml_training_language ON ml_training_data(language);
```

**Impact:** HIGH - Foundation for ML capabilities

---

### 4.2 Missing Data Capture

#### **Category: User Behavior Data**

**Generated but NOT Persisted:**

1. **Dialog Interaction Metrics**
   - Generated: `apps/vscode/src/ui/dialogs.ts`
   - Data: Dialog shown, user clicked "Allow"/"Cancel", time to decision
   - Why: Understand user friction points
   - Proposed Table: `user_decisions` (see above)

2. **Snapshot Creation Triggers**
   - Generated: `apps/vscode/src/services/SnapshotService.ts`
   - Data: Was snapshot auto-created (watch) or manual? Did user cancel?
   - Why: Understand protection level effectiveness
   - Proposed Table: Add `trigger_type` column to `snapshots`

3. **Protection Level Changes**
   - Generated: `apps/vscode/src/commands/changeProtectionLevel.ts`
   - Data: User changed file from watch→warn→block
   - Why: Understand which files users consider critical
   - Proposed Table: `protection_level_changes`

**Impact:** Understanding user behavior improves UX

---

#### **Category: Performance Metrics**

**Generated but NOT Persisted:**

1. **Analysis Duration Breakdown**
   - Generated: Throughout analysis pipeline
   - Data: Time spent in each plugin, network latency, DB queries
   - Why: Optimize slow operations
   - Proposed Table: `performance_metrics`

2. **Extension Performance**
   - Generated: `apps/vscode/src/performance/`
   - Data: Extension activation time, save handler latency
   - Why: Ensure fast UX
   - Proposed Table: `extension_performance`

**Impact:** Data-driven performance optimization

---

#### **Category: Detection Accuracy**

**Generated but NOT Persisted:**

1. **Detection Plugin Results**
   - Generated: Each plugin in `packages/core/src/detection/plugins/`
   - Data: Which plugin triggered? What was the score? Did other plugins also trigger?
   - Why: Understand plugin effectiveness
   - Proposed Table: `plugin_results` (one row per plugin per analysis)

2. **Risk Score Components**
   - Generated: `packages/api/src/services/guardian.ts` (line ~329)
   - Data: Breakdown of risk score (10 from secrets, 5 from complexity, etc.)
   - Why: Understand what drives high risk scores
   - Proposed Table: Add `risk_breakdown` JSONB column to `analysis_events`

**Impact:** Improve detection accuracy

---

#### **Category: Compliance & Audit**

**Generated but NOT Persisted:**

1. **Bypass Attempts**
   - Generated: When user bypasses warning
   - Data: Who, what, when, why
   - Why: Audit trail for compliance
   - Proposed Table: `user_decisions` with bypass tracking

2. **Blocked Saves**
   - Generated: When protection level = block
   - Data: File that was blocked, reason, user response
   - Why: Audit trail
   - Proposed Table: `blocked_actions`

3. **Config Changes**
   - Generated: When user modifies `.snapbackrc`
   - Data: What changed, who changed it, when
   - Why: Audit trail for team policies
   - Proposed Table: `config_changes`

**Impact:** CRITICAL for enterprise compliance

---

### Database Schema Recommendations

#### **Priority 1: Immediate (Week 1)**

1. **Add `user_decisions` table** - Capture user allow/bypass decisions
2. **Add `false_positives` table** - Capture user feedback
3. **Add indexes to `analysis_events`** - Optimize dashboard queries
   - Index on `user_id, created_at`
   - Index on `workspace_id, created_at`

#### **Priority 2: Short-term (Weeks 2-3)**

4. **Add `workspace_context` table** - Project-specific learning
5. **Add `plugin_results` table** - Per-plugin metrics
6. **Add `blocked_actions` table** - Compliance audit trail
7. **Sync snapshots to cloud** - Wire up cloud snapshot storage

#### **Priority 3: Medium-term (Month 2)**

8. **Add `ml_training_data` table** - Foundation for ML
9. **Add `performance_metrics` table** - Performance optimization
10. **Add `config_changes` table** - Audit trail for config

---

## SECTION 5: SERVICE LAYER GAPS

### 5.1 Current Backend Services

#### **Service 1: Guardian Analysis**

**Endpoint:** `POST /api/guardian/analyze`  
**Handler:** `packages/api/src/services/guardian.ts`  
**Purpose:** Enhanced risk analysis with proprietary detection patterns  
**Auth:** API key required  
**Used By:** VSCode (optional), CLI (optional), MCP server (optional)

**Capabilities:**
- Large deletion detection
- Secret pattern matching (50+ patterns)
- SQL injection detection
- Hardcoded credential detection
- Custom rule evaluation (paid tiers)
- Database persistence

**Tier Gating:**
- Free: Basic detection (10 patterns)
- Pro: Advanced detection (50+ patterns)
- Enterprise: Custom rules + priority support

**Performance:** ~300-800ms per analysis

**Assessment:** ✅ Good foundation, but underused (clients prefer local analysis)

---

#### **Service 2: Secret Detection**

**Endpoint:** `POST /api/detect-secrets`  
**Handler:** `packages/api/src/services/secret-detection.ts`  
**Purpose:** Specialized secret detection with entropy analysis  
**Auth:** API key required  
**Used By:** CLI, VSCode (rare)

**Capabilities:**
- Advanced secret patterns
- Shannon entropy calculation
- Context-aware detection
- Database persistence

**Assessment:** ✅ Good, but overlaps with Guardian service (consolidate?)

---

#### **Service 3: Policy Evaluation**

**Endpoint:** `POST /api/policy/evaluate`  
**Handler:** `packages/api/src/routes/v1/policy-evaluate.ts`  
**Purpose:** Evaluate SARIF findings against policies  
**Auth:** API key required, `policyEvaluation` permission  
**Used By:** MCP server, CLI

**Capabilities:**
- SARIF parsing
- Permission checks
- Currently: **MINIMAL IMPLEMENTATION** (just returns "apply")

**Assessment:** ⚠️ Needs full policy engine implementation

---

#### **Service 4: Snapshot Storage (Cloud)**

**Endpoint:** `POST /api/snapshots/create`, `GET /api/snapshots/:id`  
**Handler:** Exists in code but not fully wired  
**Purpose:** Cloud storage for snapshots  
**Auth:** API key required  
**Used By:** **NONE** (clients use local SQLite only)

**Assessment:** 🚨 **NOT IMPLEMENTED** - Critical gap for multi-device/team use

---

#### **Service 5: Health Check**

**Endpoint:** `GET /api/health`  
**Handler:** `packages/api/src/routes/health.ts`  
**Purpose:** Service health and status  
**Auth:** None  
**Used By:** CLI, MCP server (to check if backend is available)

**Assessment:** ✅ Good

---

### 5.2 Missing Backend Services

Based on IP protection analysis (Section 2) and architecture gaps, here are services that SHOULD exist:

---

#### **Missing Service 1: Policy Engine Service**

**Proposed:** `POST /api/policy/evaluate-enhanced`

**Purpose:** Full-featured policy evaluation engine

**Input:**
```json
{
  "findings": [...], // SARIF findings
  "fileContext": {
    "filePath": "src/auth.ts",
    "fileType": "authentication",
    "protectionLevel": "block"
  },
  "userProfile": {
    "trustScore": 8.5,
    "averageRiskScore": 3.2,
    "totalAnalyses": 150
  },
  "workspaceContext": {
    "projectType": "nextjs",
    "techStack": ["typescript", "react"],
    "teamPolicies": {...}
  }
}
```

**Output:**
```json
{
  "decision": "block" | "warn" | "allow",
  "reason": "Critical file with high-risk changes",
  "suggestedActions": [
    "Request code review from senior engineer",
    "Add unit tests for authentication logic"
  ],
  "requiresApproval": true,
  "approvers": ["user@example.com"],
  "policyRulesApplied": [
    "enterprise_auth_file_protection",
    "high_risk_threshold_exceeded"
  ]
}
```

**Why:**
- Centralized policy logic (not scattered)
- Enterprise customization
- Adaptive policies based on user/project context
- Complex rule evaluation (AND/OR conditions)

**Effort:** 3-4 days

---

#### **Missing Service 2: Snapshot Sync Service**

**Proposed:** 
- `POST /api/snapshots/sync` - Sync local snapshots to cloud
- `GET /api/snapshots/list` - List user's snapshots (all devices)
- `GET /api/snapshots/:id/download` - Download snapshot content

**Purpose:** Cloud backup and multi-device access

**Features:**
- Differential sync (only upload changes)
- Content-addressed storage (deduplication)
- Encryption at rest
- Cross-device access
- Team snapshot sharing (future)

**Why:**
- Users lose snapshots when changing machines
- No backup if local DB is corrupted
- Can't share snapshots with team

**Effort:** 4-5 days

---

#### **Missing Service 3: False Positive Management**

**Proposed:** 
- `POST /api/feedback/false-positive` - Report false positive
- `GET /api/feedback/status/:violationId` - Check if violation was fixed
- `GET /api/admin/false-positives` - Admin dashboard for false positives

**Purpose:** Improve detection accuracy through user feedback

**Flow:**
1. User sees violation in VSCode
2. Clicks "Report False Positive"
3. Sends to backend with context
4. Backend logs to `false_positives` table
5. Admin reviews and updates detection rules
6. User gets notification when fixed

**Why:**
- Current: No way to report false positives
- Users frustrated by inaccurate detections
- No systematic improvement process

**Effort:** 2-3 days

---

#### **Missing Service 4: User Trust Scoring**

**Proposed:** `GET /api/users/:userId/trust-score`

**Purpose:** Calculate user trust score for adaptive policies

**Calculation:**
```typescript
function calculateTrustScore(profile: UserSafetyProfile) {
  let score = 5.0; // Start at neutral
  
  // Positive factors
  if (profile.total_analyses > 100) score += 1.0;
  if (profile.average_risk_score < 3.0) score += 1.0;
  if (profile.false_positive_rate < 0.05) score += 1.0;
  
  // Negative factors
  if (profile.total_blocked > profile.total_analyses * 0.1) score -= 1.0;
  if (profile.bypass_rate > 0.5) score -= 2.0;
  
  return Math.max(0, Math.min(10, score));
}
```

**Usage:**
- High trust users get fewer warnings
- Low trust users get stricter policies
- Adaptive protection levels

**Why:**
- One-size-fits-all policies frustrate users
- Experienced developers deserve more trust
- New/risky users need more guidance

**Effort:** 2 days

---

#### **Missing Service 5: Analytics & Insights**

**Proposed:**
- `GET /api/analytics/summary` - User analytics dashboard
- `GET /api/analytics/trends` - Risk trends over time
- `GET /api/analytics/violations/top` - Most common violations
- `GET /api/analytics/projects/:projectId` - Project-specific insights

**Purpose:** Data-driven insights for users and admins

**Metrics:**
- Total analyses, average risk score, trend
- Top violations by project
- False positive rate
- Time to remediation
- Protection effectiveness

**Why:**
- Users want to see their progress
- Admins need visibility into team behavior
- Data-driven decision making

**Effort:** 3-4 days

---

#### **Missing Service 6: ML Feature Extraction**

**Proposed:** 
- `POST /api/ml/extract-features` - Extract features from code
- `POST /api/ml/predict` - ML-based risk prediction (future)

**Purpose:** Foundation for ML-powered detection

**Features Extracted:**
- Code complexity metrics
- AST-based features
- Token statistics
- Language-specific patterns
- Historical context

**Output:**
```json
{
  "features": {
    "complexity": 15,
    "lines": 200,
    "functions": 8,
    "imports": 12,
    "entropy": 4.2,
    "token_stats": {...},
    "ast_features": {...}
  }
}
```

**Why:**
- Current detection is rule-based only
- ML can catch subtle patterns
- Adaptive to new threats

**Effort:** 1 week (for feature extraction; ML training is separate)

---

#### **Missing Service 7: Team Management**

**Proposed:**
- `POST /api/teams/create` - Create team workspace
- `POST /api/teams/:teamId/invite` - Invite team members
- `GET /api/teams/:teamId/activity` - Team activity feed
- `POST /api/teams/:teamId/policies` - Set team policies

**Purpose:** Multi-user collaboration features

**Features:**
- Shared snapshots
- Team policies
- Activity feed
- Role-based permissions

**Why:**
- Currently: Single-user only
- Teams need shared snapshots and policies
- Enterprise requirement

**Effort:** 1-2 weeks

---

### Service Priority Matrix

| Service | IP Protection | Revenue Impact | Complexity | Priority | Effort |
|---------|---------------|----------------|------------|----------|--------|
| Policy Engine | HIGH | HIGH (enables enterprise) | MEDIUM | P1 | 3-4 days |
| Snapshot Sync | LOW | MEDIUM (paid feature) | MEDIUM | P1 | 4-5 days |
| False Positive Mgmt | LOW | HIGH (reduces churn) | LOW | P1 | 2-3 days |
| User Trust Scoring | LOW | MEDIUM (better UX) | LOW | P2 | 2 days |
| Analytics & Insights | LOW | MEDIUM (engagement) | MEDIUM | P2 | 3-4 days |
| ML Feature Extraction | HIGH | HIGH (differentiation) | HIGH | P3 | 1 week |
| Team Management | LOW | HIGH (enterprise) | HIGH | P3 | 1-2 weeks |

**Phase 1 (Critical - Weeks 1-2):**
1. Policy Engine Service
2. Snapshot Sync Service
3. False Positive Management

**Phase 2 (Important - Weeks 3-4):**
4. User Trust Scoring
5. Analytics & Insights

**Phase 3 (Future - Month 2+):**
6. ML Feature Extraction
7. Team Management

---

## End of Part 4

**Next:** Part 5 will cover Sections 6-8 (Integration Points, Developer Experience, Optimization Opportunities) plus final recommendations and migration plan.
