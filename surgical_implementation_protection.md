You are an expert TypeScript / Node / VS Code extension engineer working on the SnapBack “Protect This Repo” system.

Context:
- Phase 1 is complete and verified.
- You have an architecture investigation report describing the current state and the target architecture (ProtectionPolicy, StackProfiles, AIRiskService, ProtectionService, etc.).
- Phase 2 is NOT implemented yet. Your job is to implement it **incrementally and surgically**, aligning with that report.

Your priorities:
1. Preserve all existing, verified Phase 1 behavior.
2. Introduce new architecture primitives as **facades and data models first**, then gently wire them in.
3. Keep changes localized, well-tested, and reversible.

You MUST:
- Re-anchor in real code before edits (read files, don’t assume).
- Propose a short change plan per slice before making edits.
- Keep each slice shippable and behind existing behavior (no big-bang refactors).
- Run tests relevant to the touched modules after each slice.
- Summarize what changed (files + key behaviors) at the end.

You MUST NOT:
- Rename or move large modules “for cleanliness” unless absolutely necessary.
- Change user-visible behavior outside the described Phase 2 goals.
- Introduce new runtime dependencies without strong justification.

====================================================
PHASE 2 SCOPE (WHAT YOU ARE IMPLEMENTING)
====================================================

You will implement Phase 2 in **slices**, roughly aligned with the investigation report:

- Slice 1: Explicit ProtectionLevel model + legacy mapping (no behavior change).
- Slice 2: ProtectionPolicy + ProtectionManager (data/logic abstraction only).
- Slice 3: StackProfile model + stack detection (data-driven, initially informational).
- Slice 4: AIRiskService interface + Noop implementation + refactor of current risk calls.
- Slice 5: ProtectionService facade + repo “protection status” audit + context keys + minimal UX wiring.

Do NOT go beyond this (e.g., strict AI gating, complex webviews) unless the slice explicitly calls for it.

====================================================
GENERAL SETUP
====================================================

0. Re-anchor in code

- Confirm the current locations from the report (but re-read the real files):

  - Protection types / metadata (e.g., `src/types/protection.ts`, `src/views/types.ts`, `policy.types.ts`).
  - Config + merge logic (e.g., `protection/SnapBackRCLoader.ts`, `config/defaultConfig.ts`, `snapbackrc.types.ts`).
  - Registry and handlers (e.g., `services/protectedFileRegistry.ts`, `handlers/ProtectionLevelHandler.ts`, `handlers/SaveHandler.ts`).
  - Commands (e.g., `commands/protectionCommands.ts`, `statusBarCommands.ts`, `contextManager.ts`).
  - Repo scanner (e.g., `repoProtectionScanner.ts`).
  - Risk integration (e.g., `handlers/AnalysisCoordinator.ts`, any AI/guardian modules).
  - Tests around these areas.

- Verify the investigation report is still accurate. If there are material divergences, note them in your output.

====================================================
SLICE 1 – ProtectionLevel ENUM + LEGACY MAPPING
====================================================

Goal: Introduce a centralized, explicit `ProtectionLevel` enum + mapping between the current string levels and a numeric/enum model, **without changing runtime behavior**.

Steps:

1. Create a new file for the canonical model
   Example: `src/types/protectionLevel.ts`

   - Define:

     - `export enum ProtectionLevel { Unprotected = 0, Checkpoint = 1, Guarded = 2, Strict = 3 }`
     - Legacy strings: `"Watched" | "Warning | "Protected"`
     - Mapping helpers:
       - `legacyStringToLevel(legacy: "Watched" | "Warning" | "Protected"): ProtectionLevel`
       - `levelToLegacyString(level: ProtectionLevel): "Watched" | "Warning" | "Protected"`

   - Do NOT change existing types yet; this is additive.

2. Identify all current usages of string protection levels

   - Where levels are stored in registry (`ProtectedFileEntry.protectionLevel`, etc.)
   - Where `.snapbackrc` uses string levels.
   - Where switch statements rely on `"Watched" | "Warning" | "Protected"` (e.g., `ProtectionLevelHandler`, commands, views).

3. Introduce **type-safe aliases** (no behavior change)

   - In the main protection types file, re-export the new enum and mapping functions.
   - Introduce a `LegacyProtectionLevel = "Watched" | "Warning" | "Protected"` union.
   - Do NOT yet convert all code to use the enum; just make the mapping available.

4. Adjust tests minimally (if needed) to import the new types without changing behavior.

5. Run the relevant test suites (at least unit tests around protection types/handlers) and ensure no behavior change.

Output for this slice:
- Files created/changed.
- Where the new enum + mapping live.
- Confirmation that behavior is unchanged.

====================================================
SLICE 2 – ProtectionPolicy + ProtectionManager
====================================================

Goal: Introduce a `ProtectionPolicy` data model and a `ProtectionManager` that can compute repo-level status, without yet changing existing command flows.

Steps:

1. Define interfaces

   Create a new file, e.g. `src/services/protectionPolicy.ts`:

   - `ProtectionRule` (pattern, minLevel, category).
   - `ProtectionPolicy` (rules, metadata, stacks placeholder).
   - Repo status result type, e.g.:

     ```ts
     export type RepoProtectionStatus =
       | "unprotected"
       | "partial"
       | "complete"
       | "error";
     ```

   - `AttentionItem` model for later: under-protected critical files, etc.

2. Implement `ProtectionManager` skeleton

   - Constructor takes:

     - `protectedFileRegistry`
     - access to merged config from `SnapBackRCLoader` (or a `getMergedConfig()` function)
     - (Optionally) a hook for stack profiles you will add in Slice 3.

   - Implement:

     - `getEffectivePolicy()` – builds a `ProtectionPolicy` from defaults + merged config.
     - `computeRepoStatus()` – for now, you can return a simple stub that:

       - Counts how many protected files exist (using registry).
       - Counts how many “critical” patterns are known (from defaults/merged config).
       - Returns a basic `status` and counts, but does NOT alter any behavior.

3. Wire `ProtectionManager` minimally

   - Expose a singleton or factory from a central place (e.g. `services/index.ts`).
   - Do NOT yet change any commands to depend on it.
   - You may add a **debug command** (behind a low-impact command id) that logs the repo status, purely for validation.

4. Add minimal tests

   - Unit tests for `getEffectivePolicy()` given:

     - defaults only,
     - defaults + user override,
     - empty protection array.

   - Unit tests for `computeRepoStatus()` that validate the basic counts / statuses for a small fake registry.

5. Run tests.

Output for this slice:
- Definition of `ProtectionPolicy`, `ProtectionRule`, `RepoProtectionStatus`, and `ProtectionManager`.
- Brief explanation of how `ProtectionManager` gets its config/registry.

====================================================
SLICE 3 – StackProfile MODEL + STACK DETECTION (DATA ONLY)
====================================================

Goal: Extract the hardcoded stack heuristics from `RepoProtectionScanner` into a reusable, data-driven `StackProfile` system, without yet changing recommendation behavior.

Steps:

1. Create `src/stacks/stackProfiles.ts`

   - Define `StackProfile` interface:

     ```ts
     interface StackProfile {
       id: string;
       name: string;
       detect: { glob: string; confidence: number }[];
       rules: ProtectionRule[]; // reuse from ProtectionPolicy
     }
     ```

   - Create a minimal `STACK_PROFILES` array that mirrors a subset of existing patterns (Next.js, Node, Terraform, etc.), derived from the current hardcoded rules in `RepoProtectionScanner`.

2. Create `src/stacks/stackDetection.ts`

   - Implement `detectStacks(workspaceRoot: string): Promise<StackProfile[]>` using `vscode.workspace.findFiles` and `STACK_PROFILES.detect` globs.
   - This function MUST be side-effect free (no registry updates, no UI).

3. Integrate with `ProtectionManager`

   - Extend `ProtectionPolicy` to optionally include `stacks: StackProfile[]`.
   - Have `ProtectionManager.getEffectivePolicy()` call `detectStacks()` and attach the active profiles (for now, just informational).

4. Add tests

   - Unit tests for `detectStacks()` using a mocked `findFiles`.
   - Tests for `ProtectionManager.getEffectivePolicy()` verifying that stacks are present when detection heuristics hit.

5. Do NOT yet change:

   - `RepoProtectionScanner` recommendation behavior.
   - Any commands or UI that depend on scanner internals.

Output for this slice:
- Where `StackProfile` lives.
- How detection works.
- Confirmation that existing recommendation behavior is unchanged.

====================================================
SLICE 4 – AIRiskService INTERFACE + NOOP IMPLEMENTATION
====================================================

Goal: Introduce an `AIRiskService` abstraction and have existing risk calls go through it, with a `NoopAIRiskService` default. No behavior changes, other than making failures more graceful.

Steps:

1. Create `src/services/aiRiskService.ts`

   - Define:

     ```ts
     export interface AIRiskAssessment {
       level: "low" | "medium" | "high";
       score: number;
       confidence: number;
       factors: string[];
       timestamp: number;
     }

     export interface AIRiskService {
       assessChange(input: {
         filePath: string;
         before: string;
         after: string;
         category: string; // reuse or alias FileCategory
       }): Promise<AIRiskAssessment>;
       getCachedRisk(filePath: string): AIRiskAssessment | null;
       clearCache(filePath: string): void;
     }
     ```

   - Implement `NoopAIRiskService` that always returns low risk with full confidence.

2. Refactor current risk integration

   - Identify where risk is currently computed (e.g. `AnalysisCoordinator.ts` and any “guardian” modules).
   - Wrap the existing API call logic into a `RemoteAIRiskService` that implements `AIRiskService`.
   - Add light caching (e.g. a `Map<filePath, AIRiskAssessment>` with TTL).

3. Inject `AIRiskService` where needed

   - Pass either `NoopAIRiskService` or `RemoteAIRiskService` into the existing analysis/diagnostic pipeline.
   - Behavior MUST remain the same from the user’s point of view: diagnostics still appear; saves are still allowed.

4. Add tests

   - Unit tests for `NoopAIRiskService`.
   - Unit tests for `RemoteAIRiskService` (mocking the HTTP calls).
   - Tests for the coordinator verifying it uses the service instead of calling the API directly.

5. Run tests.

Output for this slice:
- Where `AIRiskService`, `NoopAIRiskService`, and `RemoteAIRiskService` live.
- Short description of how existing risk behavior is now mediated through the service.

====================================================
SLICE 5 – ProtectionService FACADE + REPO STATUS + CONTEXT KEYS
====================================================

Goal: Introduce a `ProtectionService` facade that coordinates registry, policy, manager, and AI risk, and expose repo-level status via VS Code context keys + a minimal UX touch.

Steps:

1. Create `src/services/protectionService.ts`

   - Constructor depends on:

     - `protectedFileRegistry`
     - `ProtectionManager`
     - `AIRiskService`
     - any existing loggers/telemetry that are already used.

   - Implement at least:

     ```ts
     getRepoStatus(): Promise<{
       status: RepoProtectionStatus;
       attentionCount: number;
     }>;

     refreshContextKeys(): Promise<void>; // sets snapback.protectionStatus, snapback.attentionCount
     ```

   - Add a **thin** method for “run full protection audit” that delegates to `ProtectionManager.computeRepoStatus()`.

2. Wire context keys

   - In the current `contextManager` or equivalent, replace any ad-hoc repo status computation with calls to `ProtectionService`.
   - Introduce new context keys:

     - `snapback.protectionStatus`
     - `snapback.attentionCount`

   - Keep existing file-level keys (`snapback.isProtected`, etc.) intact.

3. Minimal UX integration

   - In `package.json`, add or adjust a view title button for the main SnapBack view:

     - Command: existing “protect repo” command (e.g. `snapback.protectEntireRepo`).
     - Label/icon driven by `snapback.protectionStatus` and `snapback.attentionCount`.

   - Do NOT yet implement full “attention list” UI; just make the button reflect:

     - `"unprotected"` → “Protect this repo”
     - `"partial"` → “Fix protection (${attentionCount})”
     - `"complete"` → “Protected ✓”
     - `"error"` → “Protection error”

4. Add tests

   - Unit tests for `ProtectionService.getRepoStatus()` with fake policy/registry.
   - Tests for `refreshContextKeys()` to ensure correct keys are set given different statuses.

5. Run tests.

Output for this slice:
- How `ProtectionService` is instantiated (central place).
- Which context keys are now driven by it.
- Evidence that existing commands still work.

====================================================
FINAL OUTPUT EXPECTATIONS
====================================================

When you are done (or after each slice, if you stop early), provide:

1. A list of slices completed.
2. For each completed slice:
   - Files created/modified.
   - Behavioral changes (should mostly be “none” or “only new status/context wiring”).
   - Tests added/updated and which commands/tests you ran.
3. Any new technical debt or TODOs explicitly introduced (keep these minimal and justified).
4. A short note on remaining work for full Phase 2 (e.g., strict AI gating, attention list UI, analytics).

Do not proceed to speculative future features beyond what is covered above.
