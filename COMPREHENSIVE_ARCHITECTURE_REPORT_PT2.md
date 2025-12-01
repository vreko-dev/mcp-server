# SnapBack Comprehensive Architecture Analysis - Part 2 of 5

**Continued from Part 1**

---

## SECTION 1 (Continued): CURRENT ARCHITECTURE INVENTORY

### 1.3 Data Flow Mapping

This section traces the complete flow for 5 critical user journeys with file paths, function names, and decision points.

---

#### **Journey A: User Saves File in VSCode**

**Scenario:** User has `src/auth.ts` protected at WARN level, makes changes, presses Cmd+S

```
START: User presses Cmd+S in VSCode editor
  ↓
Step 1: VSCode triggers 'workspace.onWillSaveTextDocument' event
  File: apps/vscode/src/handlers/SaveHandler.ts
  Function: SaveHandler.register() → onWillSaveTextDocument callback (line ~50)
  Data: TextDocument object with file URI and content
  ↓
Step 2: Check if file is protected
  File: apps/vscode/src/handlers/SaveHandler.ts
  Function: SaveHandler.handleSave() (line ~80)
  External Call: protectedFileRegistry.isProtected(filePath)
  Decision: Is file protected?
    → NO: Allow save immediately (skip to Step 10)
    → YES: Continue to Step 3
  ↓
Step 3: Get protection level
  File: apps/vscode/src/handlers/SaveHandler.ts
  Function: SaveHandler.handleSave() (line ~85)
  External Call: protectedFileRegistry.getProtectionLevel(filePath)
  Data: Returns "watch" | "warn" | "block"
  ↓
Step 4: Run Guardian analysis (if enabled)
  File: apps/vscode/src/handlers/SaveHandler.ts
  Function: SaveHandler.analyzeChanges() (line ~120)
  External Call: guardian.analyze(fileContent, filePath)
  File: packages/core/src/guardian.ts
  Function: Guardian.analyze() (line ~23)
    → Runs all registered plugins:
      - SecretDetectionPlugin.analyze()
      - MockReplacementPlugin.analyze()  
      - PhantomDependencyPlugin.analyze()
  Data: Returns { score, factors, recommendations, severity }
  ↓
Step 5: Check cooldown period
  File: apps/vscode/src/handlers/SaveHandler.ts
  Function: SaveHandler.isInCooldown() (line ~200)
  Data: Checks last save timestamp vs cooldown duration
  Decision: Is in cooldown?
    → YES: Skip snapshot, allow save (go to Step 10)
    → NO: Continue to Step 6
  ↓
Step 6: Protection level decision logic
  File: apps/vscode/src/handlers/SaveHandler.ts
  Function: SaveHandler.handleProtectionLevel() (line ~150)
  
  BRANCH A: Protection Level = "watch" (Silent Mode)
    → Auto-create snapshot (go to Step 7)
    → No user prompt
    → Continue save immediately
    
  BRANCH B: Protection Level = "warn" (Confirm Mode)
    → Show confirmation dialog
    File: apps/vscode/src/ui/dialogs.ts
    Function: showSaveConfirmationDialog() (line ~50)
    Data: Shows risk score, factors, recommendations
    User Decision:
      → "Save" clicked: Continue to Step 7
      → "Cancel" clicked: ABORT save (END)
      
  BRANCH C: Protection Level = "block" (Required Note)
    → Show required note dialog
    File: apps/vscode/src/ui/dialogs.ts
    Function: showRequiredNoteDialog() (line ~120)
    User Input: Must enter note text
    User Decision:
      → Note entered + "Save": Continue to Step 7
      → "Cancel" clicked: ABORT save (END)
  ↓
Step 7: Create snapshot
  File: apps/vscode/src/services/SnapshotService.ts
  Function: SnapshotService.createSnapshot() (line ~41)
  Data: { filePath, content, reason, protectionLevel }
  ↓
Step 8: Generate snapshot metadata
  File: apps/vscode/src/services/SnapshotService.ts
  Function: SnapshotService.generateMetadata() (line ~100)
  External Call: gitIntegration.getCommitContext()
  File: packages/core/src/git-integration.ts
  Function: GitIntegration.getCommitContext()
  Data: { branch, lastCommit, uncommittedChanges }
  ↓
Step 9: Persist snapshot to SQLite
  File: apps/vscode/src/storage/SqliteStorageAdapter.ts
  Function: SqliteStorageAdapter.createSnapshot() (line ~150)
  Database: Local .snapback/snapback.db
  SQL: INSERT INTO snapshots (id, file_path, content, metadata, ...)
  ↓
Step 10: Allow VSCode save operation
  File: apps/vscode/src/handlers/SaveHandler.ts
  Function: SaveHandler.handleSave() (line ~180)
  Data: File written to disk by VSCode
  ↓
Step 11: Publish telemetry event (async)
  File: apps/vscode/src/telemetry.ts
  Function: trackEvent("snapshot_created")
  External Call: PostHog.capture()
  Data: { event: "snapshot_created", properties: { filePath, protectionLevel, riskScore } }
  ↓
Step 12: Update UI
  File: apps/vscode/src/handlers/SaveHandler.ts
  Function: SaveHandler.refreshUI() (line ~220)
  External Calls:
    - statusBar.update()
    - treeViews.refresh()
    - showNotification() [if enabled]
  ↓
END: File saved, snapshot created (or not), UI updated
```

**Data NOT Persisted:**
- ❌ User decision (allow/cancel/bypass)
- ❌ Bypass reason (if user bypassed warning)
- ❌ Time spent in dialog
- ❌ Risk score from Guardian analysis
- ❌ Detection plugin findings

**Performance:**
- Cold path: ~500-800ms (includes Guardian analysis)
- Hot path: ~50-100ms (skip analysis if in cooldown)

---

#### **Journey B: Git Pre-Commit Hook Runs**

**Scenario:** User runs `git commit -m "feat: add auth"` and SnapBack pre-commit hook is installed

```
START: User runs 'git commit'
  ↓
Step 1: Git triggers pre-commit hook
  File: .git/hooks/pre-commit (or via lefthook/husky)
  Command: snapback check --staged
  ↓
Step 2: CLI entry point
  File: apps/cli/src/index.ts
  Function: program.command("check") (line ~100)
  Data: --staged flag parsed
  ↓
Step 3: Get staged files from Git
  File: apps/cli/src/index.ts
  Function: getStagedFiles() (line ~50)
  External Command: git diff --cached --name-only --diff-filter=ACM
  Data: Array of file paths
  ↓
Step 4: Read file contents
  File: apps/cli/src/index.ts
  Function: readStagedFileContent() (line ~70)
  External Command: git show :0:<filePath>
  Data: Array of { path, content }
  ↓
Step 5: Check if backend API is available
  File: apps/cli/src/services/api-client.ts
  Function: ApiClient.healthCheck()
  External Call: GET https://api.snapback.dev/health
  Decision: Is backend available?
    → YES: Use backend analysis (go to Step 6A)
    → NO: Use local Guardian (go to Step 6B)
  ↓
BRANCH 6A: Backend Analysis
  File: apps/cli/src/services/api-client.ts
  Function: ApiClient.analyzeFiles() (line ~80)
  External Call: POST https://api.snapback.dev/api/guardian/analyze
  Headers: { Authorization: "Bearer <API_KEY>" }
  Body: { files: [{ path, content }], userId, apiKeyId }
  ↓
  Backend Processing:
    File: packages/api/src/services/guardian.ts
    Function: GuardianService.analyze() (line ~67)
    Steps:
      1. Validate API key (line ~70-80)
      2. Check permissions (advancedDetection, customRules)
      3. Run detection logic:
         - Large deletions (line ~100-120)
         - Secret patterns (line ~140-180)
         - SQL injection (line ~190-220)
         - Hardcoded credentials (line ~230-260)
         - Custom rules (if tier allows)
      4. Calculate risk score (line ~329)
      5. Persist to database:
         - INSERT INTO analysis_events (line ~366)
         - INSERT INTO rule_violations (line ~148, ~293)
         - UPDATE user_safety_profiles (line ~459)
    Returns: { analysisId, riskScore, riskLevel, riskFactors, violations }
  ↓
  Go to Step 7
  
BRANCH 6B: Local Guardian Analysis
  File: apps/cli/src/index.ts
  Function: runLocalAnalysis() (line ~150)
  External Call: guardian.analyze(content)
  File: packages/core/src/guardian.ts
  Function: Guardian.analyze() (line ~23)
    → Runs plugins (same as Journey A Step 4)
  Data: { score, factors, recommendations, severity }
  ↓
  Go to Step 7
  ↓
Step 7: Evaluate policy
  File: apps/cli/src/index.ts
  Function: evaluateCommitPolicy() (line ~180)
  Logic:
    - If ANY file has severity="critical" → BLOCK commit
    - If ANY file has severity="high" → WARN (allow with message)
    - Otherwise → ALLOW
  ↓
Step 8: Decision point
  Decision: Should block commit?
    → YES: Print errors, exit code 1 (go to END BLOCK)
    → NO: Continue to Step 9
  ↓
Step 9: Log findings (if any)
  File: apps/cli/src/index.ts
  Function: logFindings() (line ~220)
  Output: Console with colored messages (chalk)
  Data: Findings with severity, file, line number
  ↓
Step 10: Exit successfully
  Process exit code: 0
  ↓
END: Git commit proceeds

END BLOCK: Commit blocked
  Process exit code: 1
  Git aborts commit
```

**Data NOT Persisted (Local Guardian branch):**
- ❌ Analysis results
- ❌ Findings
- ❌ User bypass (no bypass option in CLI)

**Performance:**
- Backend analysis: ~200-500ms per file
- Local analysis: ~50-150ms per file
- Total for 10 files: ~2-5 seconds

---

#### **Journey C: CLI Analyzes File**

**Scenario:** User runs `snapback analyze src/auth.ts`

```
START: User runs 'snapback analyze src/auth.ts'
  ↓
Step 1: CLI entry point
  File: apps/cli/src/index.ts
  Function: program.command("analyze") (line ~50)
  Data: args = ["src/auth.ts"]
  ↓
Step 2: Validate file exists
  File: apps/cli/src/index.ts
  Function: validateFilePath() (line ~30)
  External Call: fs.existsSync()
  Decision: Does file exist?
    → NO: Print error, exit code 1 (END)
    → YES: Continue to Step 3
  ↓
Step 3: Read file content
  File: apps/cli/src/index.ts
  Function: readFileContent() (line ~40)
  External Call: fs.readFileSync()
  Data: File content as string
  ↓
Step 4: Check backend availability
  (Same as Journey B Step 5)
  ↓
Step 5: Run analysis
  (Same as Journey B Step 6A or 6B)
  ↓
Step 6: Display results
  File: apps/cli/src/index.ts
  Function: displayAnalysisResults() (line ~250)
  Output:
    - Risk Score: 7.5/10
    - Risk Level: HIGH
    - Findings:
      * [HIGH] Secret pattern detected: AWS_ACCESS_KEY (line 42)
      * [MEDIUM] Large function detected (lines 100-250)
    - Recommendations:
      * Move secrets to environment variables
      * Break large function into smaller units
  ↓
END: Analysis complete
```

**Performance:**
- Single file: ~100-300ms

---

#### **Journey D: MCP Tool Called by External Client**

**Scenario:** Claude Desktop calls `snapback.analyze_risk` tool via MCP

```
START: Claude sends tool call via stdio
  ↓
Step 1: MCP server receives request
  File: apps/mcp-server/src/index.ts
  Function: server.setRequestHandler(CallToolRequestSchema) (line ~250)
  Data: { method: "tools/call", params: { name: "snapback.analyze_risk", arguments: {...} } }
  ↓
Step 2: Validate tool name
  File: apps/mcp-server/src/index.ts
  Function: switch(request.params.name) (line ~260)
  Decision: Is tool name valid?
    → NO: Return error (END)
    → YES: Continue to Step 3
  ↓
Step 3: Validate tool arguments
  File: packages/core/src/mcp-response-processor.ts
  Function: validateToolArgs() (line ~20)
  Data: Validates against Zod schema
  Decision: Are arguments valid?
    → NO: Return error (END)
    → YES: Continue to Step 4
  ↓
Step 4: Extract hunks and file content
  File: apps/mcp-server/src/index.ts
  Function: case "snapback.analyze_risk" handler (line ~270)
  Data: { hunks, filePath, metadata }
  ↓
Step 5: Check if should use backend API
  File: apps/mcp-server/src/index.ts
  Function: shouldUseBackend() (line ~150)
  Logic:
    - Check if API key is configured (env var)
    - Check if file is critical (based on path patterns)
  Decision: Use backend?
    → YES: Go to Step 6A
    → NO: Go to Step 6B (use local Guardian)
  ↓
BRANCH 6A: Backend API Analysis
  File: apps/mcp-server/src/client/snapback-api.ts
  Function: SnapBackAPIClient.analyzeFast() (line ~50)
  External Call: POST https://api.snapback.dev/api/analyze/fast
  Headers: { Authorization: "Bearer <API_KEY>" }
  Body: { files: [{ path, content, hunks }], metadata }
  ↓
  (Backend processing same as Journey B Step 6A)
  ↓
  Go to Step 7

BRANCH 6B: Local Guardian Analysis
  File: apps/mcp-server/src/index.ts
  Function: analyzeWithLocalGuardian() (line ~320)
  External Call: guardian.analyze(content, filePath)
  File: packages/core/src/guardian.ts
  (Same as previous journeys)
  ↓
  Go to Step 7
  ↓
Step 7: Generate SARIF log
  File: apps/mcp-server/src/utils/sarif.ts
  Function: createSarifLog() (line ~10)
  Data: Convert findings to SARIF format
  ↓
Step 8: Evaluate policy
  File: apps/mcp-server/src/index.ts
  Function: evaluatePolicy(sarifLog) (line ~26)
  Logic:
    - Count critical/high/medium/low issues
    - Return "apply" | "review" | "block"
  Data: { action, reason, details }
  ↓
Step 9: Format response for Claude
  File: apps/mcp-server/src/index.ts
  Function: formatMCPResponse() (line ~400)
  Data: {
    content: [
      {
        type: "text",
        text: "Analysis complete. Risk Level: MEDIUM\n\nFindings: ..."
      }
    ],
    isError: false
  }
  ↓
Step 10: Send response via stdio
  File: apps/mcp-server/src/index.ts
  Function: return response (line ~450)
  Data: JSON-RPC 2.0 response
  ↓
END: Claude receives analysis results
```

**MCP Tools Available:**
1. `snapback.analyze_risk` - Risk analysis (this journey)
2. `snapback.create_checkpoint` - Create snapshot
3. `snapback.restore_checkpoint` - Restore snapshot
4. `snapback.list_checkpoints` - List snapshots
5. `snapback.get_protection_status` - Protection info
6. Context7 tools (if enabled)

**Performance:**
- With backend: ~200-400ms
- Local only: ~50-150ms

---

#### **Journey E: Backend API Enhances Analysis**

**Scenario:** VSCode extension sends file to backend for enhanced analysis

```
START: User clicks "Analyze with AI" in VSCode
  ↓
Step 1: VSCode command triggered
  File: apps/vscode/src/commands/analyzeWithAI.ts
  Function: analyzeWithAI() (line ~10)
  Data: Active editor file path and content
  ↓
Step 2: Check API key configuration
  File: apps/vscode/src/services/api-client.ts
  Function: ApiClient.isConfigured() (line ~30)
  External Call: Read API key from config
  Decision: Is API key configured?
    → NO: Show error, prompt for key (END)
    → YES: Continue to Step 3
  ↓
Step 3: Show progress indicator
  File: apps/vscode/src/commands/analyzeWithAI.ts
  Function: vscode.window.withProgress() (line ~20)
  UI: Progress bar in status bar
  ↓
Step 4: Send to backend API
  File: apps/vscode/src/services/api-client.ts
  Function: ApiClient.analyzeWithAI() (line ~120)
  External Call: POST https://api.snapback.dev/api/guardian/analyze
  Headers: {
    Authorization: "Bearer <API_KEY>",
    Content-Type: "application/json"
  }
  Body: {
    files: [{
      path: "src/auth.ts",
      content: "...",
      changeType: "modified",
      linesAdded: 50,
      linesDeleted: 10,
      totalLines: 300
    }],
    userId: "<user_id>",
    apiKeyId: "<api_key_id>",
    workspaceId: "<workspace_id>",
    customRules: [...] // if user has custom rules
  }
  ↓
Step 5: Backend receives request
  File: packages/api/src/routes/v1/guardian-analyze.ts
  Function: POST handler (line ~20)
  Middleware:
    1. Authentication (validate API key)
    2. Rate limiting
    3. Request validation (Zod schema)
  ↓
Step 6: Validate API key and permissions
  File: packages/api/src/services/guardian.ts
  Function: GuardianService.analyze() (line ~67-95)
  Database Query:
    SELECT * FROM api_keys WHERE id = $1
  Data: { id, user_id, permissions, tier }
  Decision: Does user have 'advancedDetection' permission?
    → NO: Return 403 error (END)
    → YES: Continue to Step 7
  ↓
Step 7: Run enhanced detection (backend-only algorithms)
  File: packages/api/src/services/guardian.ts
  Function: GuardianService.analyze() (line ~96-330)
  
  Detection Logic:
  
  A. Large Deletions (line ~100-120)
     - Check if linesDeleted > 100
     - Calculate deletion ratio
     - Risk factor: HIGH if >50% deleted
  
  B. Secret Detection (line ~140-180)
     - Proprietary patterns (NOT in client):
       * AWS keys: /AKIA[0-9A-Z]{16}/
       * API tokens with entropy check
       * Database URLs
       * JWT tokens
     - Shannon entropy calculation
     - Database persistence: INSERT INTO rule_violations
  
  C. SQL Injection Patterns (line ~190-220)
     - Check for string concatenation with SQL
     - Detect unparameterized queries
     - Risk factor: HIGH
  
  D. Hardcoded Credentials (line ~230-260)
     - Pattern: password|secret|key|token = "..."
     - Context-aware detection
     - Risk factor: HIGH
  
  E. Dangerous Function Calls (line ~270-300)
     - eval(), exec(), system()
     - Unsafe deserialization
     - Risk factor: CRITICAL
  
  F. Custom Rules (if tier allows) (line ~310-330)
     - User-defined regex patterns
     - File path filtering
     - Configurable severity
  ↓
Step 8: Calculate risk score
  File: packages/api/src/services/guardian.ts
  Function: GuardianService.analyze() (line ~329)
  Algorithm:
    riskScore = 0
    for each violation:
      riskScore += violation.weight
    finalRiskScore = min(100, riskScore)
    riskLevel = finalRiskScore < 30 ? "low" : finalRiskScore < 70 ? "medium" : "high"
  ↓
Step 9: Persist analysis event
  File: packages/api/src/services/guardian.ts
  Function: GuardianService.analyze() (line ~366-390)
  Database Operations:
    1. INSERT INTO analysis_events (
         id, user_id, api_key_id, workspace_id,
         risk_score, risk_level, analysis_duration_ms,
         file_count, total_lines, created_at
       )
    2. INSERT INTO rule_violations (for each violation)
    3. UPDATE user_safety_profiles (update average risk score)
  ↓
Step 10: Generate recommendations
  File: packages/api/src/services/guardian.ts
  Function: GuardianService.analyze() (line ~400-420)
  Logic:
    - Based on violation types
    - Severity-based prioritization
    - Actionable suggestions
  Data: Array of recommendation strings
  ↓
Step 11: Return response
  File: packages/api/src/routes/v1/guardian-analyze.ts
  Function: return json() (line ~80)
  Response: {
    analysisId: "cuid123...",
    riskScore: 75,
    riskLevel: "high",
    riskFactors: [
      { type: "secret_detected", severity: "high", message: "AWS access key found", details: {...} },
      { type: "sql_injection", severity: "high", message: "Unparameterized query", details: {...} }
    ],
    summary: "2 high-severity issues detected",
    recommendations: [
      "Move AWS credentials to environment variables",
      "Use parameterized queries to prevent SQL injection"
    ],
    violations: [...],
    timestamp: "2025-11-06T10:30:00Z"
  }
  ↓
Step 12: VSCode receives response
  File: apps/vscode/src/services/api-client.ts
  Function: ApiClient.analyzeWithAI() (line ~150)
  Data: AnalysisResult object
  ↓
Step 13: Display results in VSCode
  File: apps/vscode/src/commands/analyzeWithAI.ts
  Function: displayResults() (line ~50)
  UI:
    1. Show webview panel with formatted results
    2. Add diagnostics to Problems panel
    3. Add CodeLens actions
    4. Show notification with summary
  ↓
Step 14: Store results locally (optional)
  File: apps/vscode/src/storage/SqliteStorageAdapter.ts
  Function: storeAnalysisResult() (line ~200)
  Database: Local .snapback/snapback.db
  Table: analysis_cache
  ↓
END: Results displayed, user can take action
```

**Data Persisted:**
- ✅ Analysis event (backend database)
- ✅ Rule violations (backend database)
- ✅ User safety profile updated (backend database)
- ⚠️ Results cached locally (VSCode SQLite)

**Data NOT Persisted:**
- ❌ User's subsequent action (did they fix the issue?)
- ❌ Time to remediation
- ❌ False positive feedback

**Performance:**
- Total: ~500-1200ms
  - Network: ~100-200ms
  - Backend processing: ~300-800ms
  - UI rendering: ~100-200ms

---

### Integration Points Summary

| Journey | Client | Server | Database | External | Total Time |
|---------|--------|--------|----------|----------|------------|
| A: Save File | VSCode | None | Local SQLite | PostHog | ~500ms |
| B: Pre-commit | CLI | Optional Backend | Backend Postgres (if used) | Git | ~2-5s (multiple files) |
| C: Analyze File | CLI | Optional Backend | Backend Postgres (if used) | None | ~100-300ms |
| D: MCP Tool | MCP Server | Optional Backend | None | None | ~200-400ms |
| E: Enhanced Analysis | VSCode | Backend API | Backend Postgres + Local SQLite | None | ~500-1200ms |

---

### Critical Gaps in Data Flows

1. **No user decision persistence** (Journey A) - Lost compliance data
2. **No false positive feedback loop** (All journeys) - Can't improve detection
3. **Inconsistent backend usage** (Journeys B, D) - Sometimes local, sometimes backend
4. **No snapshot sync to cloud** (Journey A) - Local-only snapshots
5. **No ML training data collection** - Not capturing structured data for model training
6. **No real-time collaboration** - Multiple users can't see each other's snapshots
7. **No audit trail** - Can't reconstruct who did what when

---

## End of Part 2

**Next:** Part 3 will cover Sections 2 (IP Protection Analysis) and 3 (Redundancy & Waste Analysis).
