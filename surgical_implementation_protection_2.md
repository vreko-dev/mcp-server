You are an expert TypeScript + VS Code extension engineer.

Context:
- SnapBack VS Code extension, with Phase 1 complete and verified.
- Phase 2 Slices 1–3 are implemented and audited:
  - ProtectionLevel enum + legacy mapping (apps/vscode/src/types/protectionLevel.ts)
  - ProtectionPolicy + ProtectionManager (apps/vscode/src/services/protectionPolicy.ts)
  - StackProfile + stackDetection infrastructure (apps/vscode/src/stacks/*.ts)
- The audit rated:
  - Slice 1: GREEN – additive only.
  - Slice 2: GREEN – observational only, safe to depend on.
  - Slice 3: AMBER – advisory, no hard dependency yet, no tests.

Your job now is to implement **Phase 2 Slices 4 and 5**:

- Slice 4: AIRiskService interface + Noop + Remote extraction.
- Slice 5: ProtectionService facade + repo status + minimal VS Code context/UX wiring.

You MUST:
- Keep Phase 1 behavior intact.
- Treat stack detection as advisory (no hard gates with it in this pass).
- Use the existing ProtectionManager as the single source for repo policy status.
- Integrate AI risk in a way that’s pluggable and testable.

====================================================
STEP 0 – RE-ANCHOR IN REAL CODE
====================================================

First, re-open these files to ground yourself:

Core:
- apps/vscode/src/handlers/SaveHandler.ts
- apps/vscode/src/handlers/ProtectionLevelHandler.ts
- apps/vscode/src/handlers/AnalysisCoordinator.ts
- apps/vscode/src/services/protectedFileRegistry.ts
- apps/vscode/src/repoProtectionScanner.ts
- apps/vscode/src/contextManager.ts
- apps/vscode/src/commands/protectionCommands.ts

New infrastructure:
- apps/vscode/src/types/protectionLevel.ts
- apps/vscode/src/services/protectionPolicy.ts
- apps/vscode/src/stacks/stackProfiles.ts
- apps/vscode/src/stacks/stackDetection.ts
- apps/vscode/src/protection/SnapBackRCLoader.ts

Do NOT change anything yet. Just confirm the audit’s picture:
- ProtectionLevel enum is additive.
- ProtectionManager is observational + safe.
- Stack detection is not wired to behavior yet.

====================================================
SLICE 4 – AIRISKSERVICE + EXTRACTION FROM ANALYSISCOORDINATOR
====================================================

Goal: Introduce a clean AI risk abstraction (AIRiskService) with:
- A No-op implementation (always low risk).
- A Remote implementation that wraps the existing API calls.
- AnalysisCoordinator and any risk callers using the service, NOT raw HTTP.

### 4.1 – Create AIRiskService interface

Create: apps/vscode/src/services/aiRiskService.ts

Define:

- AIRiskLevel = "low" | "medium" | "high"
- AIRiskAssessment:
  - level: AIRiskLevel
  - score: number (0–100)
  - confidence: number (0–1)
  - factors: string[]
  - timestamp: number

- AIRiskService methods:
  - assessChange({ filePath, before, after, category }): Promise<AIRiskAssessment>
  - getCachedRisk(filePath): AIRiskAssessment | null
  - clearCache(filePath): void

Implement **NoopAIRiskService**:
- assessChange() → always returns level "low", score 0, confidence 1.
- getCachedRisk() → null.
- clearCache() → no-op.

No side effects. No network.

### 4.2 – Extract Remote risk logic from AnalysisCoordinator

Locate the existing risk API call in apps/vscode/src/handlers/AnalysisCoordinator.ts.

Create **RemoteAIRiskService** in aiRiskService.ts that:

- Accepts:
  - base URL or client, and
  - configuration (VS Code workspace configuration) or an options object.
- Implements assessChange() by calling the existing risk API the same way AnalysisCoordinator currently does.
- Maps the API’s RiskAnalysis shape → AIRiskAssessment:
  - riskLevel → AIRiskLevel
  - riskScore → score
  - confidence → confidence
  - riskFactors → factors

Add:
- A simple in-memory Map<string, AIRiskAssessment> cache with TTL (e.g. 5 minutes).
- getCachedRisk()/clearCache() respect that TTL.

Then refactor AnalysisCoordinator:

- Inject an AIRiskService into AnalysisCoordinator (constructor parameter).
- Replace direct API call with:
  - const assessment = await aiRiskService.assessChange({ ... });

Ensure:
- Diagnostics behavior stays the same (you still publish diagnostics from the API result).
- If the API is disabled or fails, RemoteAIRiskService should fail **gracefully**:
  - Log the error.
  - Fall back to a "low" risk assessment instead of throwing.

### 4.3 – Configuration wiring

Use existing config flags if present, for example:

- "snapback.guardian.enabled"
- "snapback.guardian.protectionLevel"
- "snapback.guardian.thresholds.warn"
- "snapback.guardian.thresholds.block"

Behavior for now:
- If guardian/risk is disabled → AnalysisCoordinator should use NoopAIRiskService.
- If enabled → use RemoteAIRiskService.

Do NOT add save-gating yet; this slice is about wiring the risk service, not enforcing it.

### 4.4 – Tests for AIRiskService

Add tests (or update an existing test file) under:

- apps/vscode/test/unit/services/aiRiskService.test.ts (new)

Cover:
- NoopAIRiskService:
  - Returns low risk.
  - getCachedRisk() always null.
- RemoteAIRiskService:
  - Maps RiskAnalysis → AIRiskAssessment correctly.
  - Respects cache TTL (you can mock Date.now or abstract time).
  - Handles API errors by returning low risk instead of throwing.

You can mock the HTTP layer or the underlying client used in AnalysisCoordinator.

Run tests and TypeScript check and ensure **no behavior regression** in existing tests.

====================================================
SLICE 5 – PROTECTIONSERVICE FACADE + REPO STATUS + CONTEXT KEYS
====================================================

Goal: Introduce a ProtectionService that centralizes:
- Reads from ProtectedFileRegistry.
- Reads policy/status from ProtectionManager.
- Consults AIRiskService where needed.
- Exposes:
  - repo-level status for UX/context keys.
  - a save-check hook for future gating.
  - convenience methods for “Protect This Repo” implementations.

For this slice, keep behavior mostly **advisory**:
- Compute status + context keys.
- Add minimal wiring for the view title button.
- Do not radically change save semantics yet.

### 5.1 – Create ProtectionService

Create: apps/vscode/src/services/protectionService.ts

Class ProtectionService should accept in constructor:

- registry: ProtectedFileRegistry
- policyManager: ProtectionManager
- aiRiskService: AIRiskService

Implement methods:

1. getRepoStatus():
   - Calls policyManager.computeRepoStatus().
   - Returns:
     - protectionStatus (unprotected | partial | complete | error)
     - attentionCount
     - protectedCount
     - any other useful fields.

   Note: given current implementation, `partial` will not appear yet; that’s OK.

2. refreshContextKeys():
   - Uses vscode.commands.executeCommand("setContext", ...) or contextManager abstraction to set:
     - snapback.protectionStatus
     - snapback.attentionCount
   - Strictly read-only / advisory.

3. checkSaveAllowed(document: vscode.TextDocument):
   - **For this slice**, just a thin wrapper around existing semantics:
     - Read protection level using current registry APIs.
     - Optionally look at cached AI risk via aiRiskService.getCachedRisk(filePath).
     - Return a structure like:
       - { allowed: true } for now.
   - You are NOT yet changing save behavior; think of this as the future hook.

4. auditRepo():
   - Calls getRepoStatus() and refreshContextKeys().
   - Intended to be called:
     - on activation,
     - when workspace changes,
     - when protection-related commands run.

Ensure ProtectionService does not:
- Change registry state directly (no add/remove/update yet).
- Mutate policy; that remains the ProtectionManager’s concern.

### 5.2 – Wire ProtectionService into extension activation

Open apps/vscode/src/extension.ts (or similar main entry).

During activation:

- Instantiate AIRiskService:
  - If risk is enabled → RemoteAIRiskService.
  - Else → NoopAIRiskService.
- Obtain:
  - protectedFileRegistry (existing).
  - snapbackrcLoader (existing).
  - protectionManager = snapbackrcLoader.getProtectionManager().

- Create a singleton ProtectionService instance and pass it into:
  - SaveHandler (if appropriate) OR
  - Some shared context object used by commands/status.

At this stage:
- Use ProtectionService.auditRepo() after activation and when the SnapBack view becomes visible.

### 5.3 – Repo-level context keys + view title button

Update context handling:

- In contextManager or equivalent, add support for repo-level keys:
  - snapback.protectionStatus
  - snapback.attentionCount

Ensure ProtectionService.refreshContextKeys() calls into contextManager to set these.

Then, in package.json contributions:

- Under "menus": "view/title" for the SnapBack view container, define a button (the “Protect This Repo” button) with dynamic label and icon based on context keys:

States:
- when: snapback.protectionStatus == "unprotected"
  - title: "Protect this repo"
- when: snapback.protectionStatus == "partial"
  - title: "Fix protection"
- when: snapback.protectionStatus == "complete"
  - title: "Protected ✓"
- when: snapback.protectionStatus == "error"
  - title: "Protection error"

All states should invoke the **same command**, e.g. "snapback.protectRepo".

For now, the implementation of snapback.protectRepo can continue to use the existing repoProtectionScanner and QuickPick logic, but:

- Before doing anything heavy, call ProtectionService.auditRepo() so the status/context are fresh.
- Later we can teach this command to consult ProtectionPolicy and StackProfiles for default rules; do NOT overcomplicate it in this slice.

### 5.4 – Minimal tests for ProtectionService

Create tests in:

- apps/vscode/test/unit/services/protectionService.test.ts

Mock:
- ProtectionManager (returning specific RepoProtectionAudit shapes).
- ProtectedFileRegistry (if needed).
- AIRiskService (Noop).

Test:

1. getRepoStatus() passes through values from ProtectionManager.
2. refreshContextKeys() sets the right contexts for a few scenarios:
   - unprotected + attentionCount 0
   - complete + attentionCount > 0
3. auditRepo() calls computeRepoStatus() and then sets context keys.

You can mock the VS Code context API or the contextManager wrapper.

====================================================
STEP 6 – FINAL REGRESSION + RISK REPORT
====================================================

After implementing Slices 4 & 5:

1. Run TypeScript type-check across the whole workspace.
2. Run all tests:
   - Existing Phase 1 tests.
   - New aiRiskService and protectionService tests.

3. Produce a short, structured summary at the end:

- Slice 4 (AIRiskService): status + key decisions.
- Slice 5 (ProtectionService + context keys): status + key decisions.
- Confirm:
  - No behavior changes to Phase 1 save behavior yet.
  - Risk detection is pluggable and can be disabled.
  - Repo status appears in context keys and drives the view title button.

Do NOT implement hard save-blocking or aggressive AI risk gating in this pass.
Keep it advisory; we’ll tighten policies in a later slice.
