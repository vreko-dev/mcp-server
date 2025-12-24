# SnapBack: AI Seatbelt for Developers

## Technical Specification & Architecture

**Version:** 1.0  
**Last Updated:** October 2025  
**Stack:** Next.js 15, TypeScript, Supabase, VS Code Extension API

---

## Executive Summary

SnapBack is an "AI seatbelt" for coding—a safety layer between developers and AI code assistants. It operates on a core principle: **invisible until critical**. The system stays completely hidden during normal coding, only intervening with surgical precision when AI-generated changes pose genuine risks.

### Core Value Proposition

-   **Time Savings:** Prevent debugging sessions before they start (targeting 10-20% reduction in the 17.3 hours/week developers spend on debugging)
-   **Quality Assurance:** Catch security vulnerabilities and performance issues introduced by AI tools (research shows ~40% of AI-written code contains flaws)
-   **Developer Confidence:** Enable fearless experimentation with AI coding tools through instant one-click restore
-   **Measurable ROI:** Track and quantify time saved, risks prevented, and productivity gains

---

## 🎯 Core Architecture Principles

### 1. Invisible by Default

SnapBack creates automatic snapshots and monitors code changes without any developer action. When everything is safe, the developer might never notice it's running—which is exactly the point.

### 2. Lightning Strike Intervention

When a critical risk is detected (security vulnerability, breaking change, AI over-correction loop), SnapBack immediately alerts the developer with actionable options.

### 3. One-Click Restore

Every risky change can be instantly reverted to the last safe snapshot. No git commands, no manual undo operations—just one click.

### 4. Two-Tier Analysis

-   **Fast Path (<100ms):** Heuristic checks for immediate feedback
-   **Deep Path (1-3s):** LLM-powered semantic analysis triggered conditionally

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     VS Code Extension                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ File Watcher │  │ AI Detector  │  │ UI Manager   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                    ┌───────▼────────┐                       │
│                    │ Invisible      │                       │
│                    │ Guardian       │                       │
│                    └───────┬────────┘                       │
└────────────────────────────┼──────────────────────────────┘
                             │ WebSocket + REST
                             │
┌────────────────────────────▼──────────────────────────────┐
│                    Next.js Backend (SaaS)                  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │            Risk Analysis Engine                      │  │
│  │  ┌──────────────┐         ┌──────────────┐         │  │
│  │  │ Fast Checks  │────────▶│ Deep Checks  │         │  │
│  │  │  <100ms      │         │  1-3s (LLM)  │         │  │
│  │  └──────────────┘         └──────────────┘         │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Snapshot     │  │ Iteration    │  │ Session      │   │
│  │ Manager      │  │ Tracker      │  │ Manager      │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ WebSocket    │  │ Metrics      │  │ LLM Client   │   │
│  │ Server       │  │ Collector    │  │ (GPT/Claude) │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                    Supabase                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Postgres     │  │ Storage      │  │ Real-time    │ │
│  │ (Snapshots)  │  │ (Diffs)      │  │ (Sessions)   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 Core Components

### 1. Invisible Guardian (Client-Side)

The main orchestrator in the VS Code extension that coordinates all activities.

```typescript
// src/core/invisible-guardian.ts

interface CodeChange {
	fileUri: string;
	source: "ai" | "human";
	diff: string;
	timestamp: number;
	affectsProtectedFile: boolean;
	complexity: number;
}

interface RiskAnalysis {
	fast: FastRiskResult;
	deep?: DeepRiskResult;
}

class InvisibleGuardian {
	private snapshotManager: SmartSnapshotManager;
	private riskEngine: RiskAnalysisEngine;
	private restoreManager: RestoreManager;
	private wsClient: SnapBackClient;

	async processChange(change: CodeChange, context: SessionContext) {
		// 1. Always create snapshot (invisible to developer)
		const snapshot = await this.snapshotManager.createInvisibleSnapshot(
			change
		);

		// 2. Run fast analysis (<100ms - always)
		const fastRisk = await this.riskEngine.analyzeFast(change);

		// 3. Decide if intervention needed
		if (this.isInterventionNeeded(change, { fast: fastRisk }, context)) {
			// Lightning strike: immediate alert + restore option
			await this.restoreManager.showRestoreOption(change, {
				fast: fastRisk,
			});

			// Trigger deep analysis in background if warranted
			if (fastRisk.triggersDeepAnalysis) {
				this.queueDeepAnalysis(change, context);
			}
		}

		// 4. Update session tracking
		await this.wsClient.sendEvent({
			type: "code-change",
			userId: context.userId,
			change: this.sanitizeForTransport(change),
			riskScore: fastRisk.riskLevel,
		});

		// If no intervention needed, developer never knows we're here
	}

	private isInterventionNeeded(
		change: CodeChange,
		risk: RiskAnalysis,
		context: SessionContext
	): boolean {
		return (
			risk.fast.riskLevel === "high" ||
			risk.deep?.recommendation === "block" ||
			context.consecutiveAIEdits >= 5 ||
			change.affectsSecurityCriticalFile() ||
			risk.fast.issues.some((i) => i.type === "breaking-change")
		);
	}
}
```

### 2. Two-Tier Risk Analysis Engine

Combines instant heuristics with optional deep LLM analysis.

```typescript
// src/analysis/risk-engine.ts

interface FastRiskResult {
	riskLevel: "safe" | "low" | "medium" | "high" | "critical";
	triggersDeepAnalysis: boolean;
	issues: RiskIssue[];
	analysisTimeMs: number;
}

interface DeepRiskResult {
	securityRisks: SecurityRisk[];
	performanceImpact: PerformanceAnalysis;
	maintainabilityScore: number;
	recommendation: "allow" | "warn" | "block";
	confidence: number;
	explanation: string;
}

class RiskAnalysisEngine {
	// Fast Path: Heuristic checks - NO API calls
	async analyzeFast(change: CodeChange): Promise<FastRiskResult> {
		const startTime = performance.now();

		const checks = await Promise.all([
			this.checkConfigChanges(change), // 5ms - tsconfig, package.json
			this.checkComplexityJump(change), // 10ms - cyclomatic complexity
			this.checkSecurityPatterns(change), // 15ms - known vulnerabilities
			this.checkVersionConflicts(change), // 20ms - dependency issues
			this.checkMissingValidation(change), // 10ms - input validation
			this.checkBreakingAPIChanges(change), // 15ms - public interface changes
			this.checkDatabaseMigrations(change), // 10ms - schema changes
		]);

		const issues = checks.filter((c) => c.hasIssue);
		const riskLevel = this.computeRiskLevel(issues);

		return {
			riskLevel,
			triggersDeepAnalysis: this.shouldTriggerDeep(issues, riskLevel),
			issues,
			analysisTimeMs: performance.now() - startTime,
		};
	}

	// Slow Path: LLM-powered semantic analysis
	async analyzeDeep(
		change: CodeChange,
		context: SessionContext
	): Promise<DeepRiskResult> {
		const prompt = this.buildAnalysisPrompt(change, context);

		// Call LLM (OpenAI GPT-4 or Anthropic Claude)
		const llmResponse = await this.llmClient.analyze({
			model: "gpt-4-turbo",
			messages: [
				{
					role: "system",
					content:
						"You are a senior security and code quality expert...",
				},
				{
					role: "user",
					content: prompt,
				},
			],
			temperature: 0.2, // Low temperature for consistent analysis
			max_tokens: 1000,
		});

		const analysis = this.parseAnalysisResponse(llmResponse);

		return {
			securityRisks: analysis.security,
			performanceImpact: analysis.performance,
			maintainabilityScore: analysis.maintainability,
			recommendation: analysis.shouldBlock
				? "block"
				: analysis.shouldWarn
				? "warn"
				: "allow",
			confidence: analysis.confidence,
			explanation: analysis.reasoning,
		};
	}

	private buildAnalysisPrompt(
		change: CodeChange,
		context: SessionContext
	): string {
		return `
Analyze this code change for potential risks:

**Context:**
- Project Type: ${context.projectType}
- AI Iteration: #${context.consecutiveAIEdits}
- File: ${change.fileUri}
- Change Source: ${change.source}

**Code Diff:**
\`\`\`diff
${change.diff}
\`\`\`

**Surrounding Code:**
\`\`\`typescript
${change.surroundingCode}
\`\`\`

**Previous Snapshots:**
${context.recentSnapshots.map((s) => s.summary).join("\n")}

**Analysis Required:**
1. Security vulnerabilities (injection, auth bypass, data exposure)
2. Performance degradation (N+1 queries, memory leaks, blocking ops)
3. Breaking changes (API contracts, backward compatibility)
4. Code quality degradation (complexity, maintainability)
5. Intent vs implementation mismatch

**Special Considerations:**
- This is iteration #${context.consecutiveAIEdits} by AI
- Research shows quality degrades after 5+ AI iterations
- Look for signs of "AI over-correction loop"

Respond in JSON format:
{
  "security": [...],
  "performance": {...},
  "maintainability": 0-100,
  "shouldBlock": boolean,
  "shouldWarn": boolean,
  "confidence": 0-1,
  "reasoning": "..."
}
`;
	}

	// Fast checks implementation
	private async checkConfigChanges(change: CodeChange): Promise<CheckResult> {
		const configFiles = [
			"package.json",
			"tsconfig.json",
			"webpack.config.js",
		];

		if (!configFiles.some((f) => change.fileUri.endsWith(f))) {
			return { hasIssue: false };
		}

		// Parse config changes
		const removed = this.extractRemovedKeys(change.diff);
		const modified = this.extractModifiedValues(change.diff);

		const issues: string[] = [];

		// Check for risky removals
		if (removed.includes("strict") || removed.includes("esModuleInterop")) {
			issues.push("TypeScript strict mode or esModuleInterop removed");
		}

		// Check for dependency downgrades
		if (modified.dependencies?.some((d) => this.isDowngrade(d))) {
			issues.push(
				"Dependency version downgraded - potential security risk"
			);
		}

		return {
			hasIssue: issues.length > 0,
			severity: "high",
			message: issues.join("; "),
			type: "config-change",
		};
	}

	private async checkComplexityJump(
		change: CodeChange
	): Promise<CheckResult> {
		const beforeComplexity = calculateCyclomaticComplexity(change.before);
		const afterComplexity = calculateCyclomaticComplexity(change.after);

		const increase = afterComplexity - beforeComplexity;
		const percentIncrease = (increase / beforeComplexity) * 100;

		if (percentIncrease > 50) {
			return {
				hasIssue: true,
				severity: "medium",
				message: `Complexity jumped ${percentIncrease.toFixed(
					0
				)}% (${beforeComplexity} → ${afterComplexity})`,
				type: "complexity-increase",
			};
		}

		return { hasIssue: false };
	}

	private async checkSecurityPatterns(
		change: CodeChange
	): Promise<CheckResult> {
		const vulnerablePatterns = [
			{ pattern: /eval\s*\(/, message: "eval() usage detected" },
			{
				pattern: /innerHTML\s*=/,
				message: "innerHTML assignment (XSS risk)",
			},
			{
				pattern: /exec\s*\(/,
				message: "exec() usage (command injection risk)",
			},
			{
				pattern: /\$\{.*req\..*\}/,
				message: "Unsanitized request data in template",
			},
			{
				pattern: /password.*=.*['"]/,
				message: "Hardcoded password detected",
			},
		];

		const detected = vulnerablePatterns.filter(
			(vp) =>
				vp.pattern.test(change.after) && !vp.pattern.test(change.before)
		);

		if (detected.length > 0) {
			return {
				hasIssue: true,
				severity: "critical",
				message: detected.map((d) => d.message).join("; "),
				type: "security-vulnerability",
			};
		}

		return { hasIssue: false };
	}
}
```

### 3. Iteration Tracker (Critical New Feature)

Tracks consecutive AI edits and detects over-correction loops.

```typescript
// src/session/iteration-tracker.ts

interface EditSession {
	fileUri: string;
	consecutiveAIEdits: number;
	lastHumanEdit: Date;
	lastAIEdit: Date;
	riskTrend: "improving" | "stable" | "degrading";
	snapshots: Snapshot[];
	changeVelocity: number; // edits per minute
}

interface IterationAlert {
	type:
		| "high-iteration-warning"
		| "over-correction-loop"
		| "iteration-caution";
	message: string;
	action: "suggest-snapshot" | "block-edit" | "force-review";
	severity: "info" | "warning" | "critical";
}

class IterationTracker {
	private sessions = new Map<string, EditSession>();
	private readonly HIGH_ITERATION_THRESHOLD = 5;
	private readonly CAUTION_THRESHOLD = 3;

	async recordEdit(
		fileUri: string,
		edit: Edit,
		context: SessionContext
	): Promise<IterationAlert | null> {
		const session = this.getOrCreateSession(fileUri);

		if (edit.source === "ai") {
			session.consecutiveAIEdits++;
			session.lastAIEdit = new Date();
			session.changeVelocity = this.calculateVelocity(session);

			// CRITICAL: Research shows 5+ iterations significantly increase risk
			// 37.6% increase in vulnerabilities after 5 rounds
			if (session.consecutiveAIEdits >= this.HIGH_ITERATION_THRESHOLD) {
				return {
					type: "high-iteration-warning",
					message:
						`⚠️ ${session.consecutiveAIEdits} consecutive AI edits detected. ` +
						`Quality tends to degrade after multiple iterations. ` +
						`Consider manual review or testing.`,
					action: "suggest-snapshot",
					severity: "warning",
				};
			}

			// Soft warning at 3 iterations
			if (session.consecutiveAIEdits === this.CAUTION_THRESHOLD) {
				return {
					type: "iteration-caution",
					message:
						"Multiple AI iterations on this code. Consider a manual review.",
					action: "suggest-snapshot",
					severity: "info",
				};
			}

			// Detect over-correction loop (AI undoing its own changes)
			if (this.isOverCorrectionLoop(session)) {
				return {
					type: "over-correction-loop",
					message:
						"🔄 AI over-correction loop detected. " +
						"Recent changes are oscillating. Human intervention recommended.",
					action: "force-review",
					severity: "critical",
				};
			}
		} else {
			// Human edit resets the counter
			session.consecutiveAIEdits = 0;
			session.lastHumanEdit = new Date();
			session.riskTrend = "improving";
		}

		return null;
	}

	// Detect if AI is making conflicting changes
	private isOverCorrectionLoop(session: EditSession): boolean {
		if (session.consecutiveAIEdits < 3) return false;

		// Get last 3 snapshots
		const recentDiffs = session.snapshots.slice(-3).map((s) => s.diff);

		// Check if changes are reversing each other
		return this.detectOscillation(recentDiffs);
	}

	private detectOscillation(diffs: string[]): boolean {
		if (diffs.length < 3) return false;

		// Parse diffs to extract added/removed lines
		const changes = diffs.map((d) => this.parseDiffToChanges(d));

		// Check if latest change undoes previous change
		const [first, second, third] = changes;

		// If lines added in second were removed in third, it's oscillation
		const secondAdded = new Set(second.added);
		const thirdRemoved = new Set(third.removed);

		const overlap = [...secondAdded].filter((line) =>
			thirdRemoved.has(line)
		);

		// If >50% of changes were reversed, flag as oscillation
		return overlap.length / secondAdded.size > 0.5;
	}

	private calculateVelocity(session: EditSession): number {
		const timeWindow = 60 * 1000; // 1 minute
		const recentEdits = session.snapshots.filter(
			(s) => Date.now() - s.timestamp < timeWindow
		);

		return recentEdits.length; // edits per minute
	}

	getIterationStats(fileUri: string): IterationStats {
		const session = this.sessions.get(fileUri);
		if (!session) return { consecutiveAIEdits: 0, riskLevel: "safe" };

		return {
			consecutiveAIEdits: session.consecutiveAIEdits,
			riskLevel: this.computeIterationRisk(session),
			velocity: session.changeVelocity,
			trend: session.riskTrend,
			recommendation: this.getRecommendation(session),
		};
	}

	private computeIterationRisk(session: EditSession): RiskLevel {
		if (session.consecutiveAIEdits >= 5) return "high";
		if (session.consecutiveAIEdits >= 3) return "medium";
		return "low";
	}

	private getRecommendation(session: EditSession): string {
		if (session.consecutiveAIEdits >= 5) {
			return "Stop and test: Run tests or manually verify before continuing.";
		}
		if (session.consecutiveAIEdits >= 3) {
			return "Consider review: Review changes before accepting more AI suggestions.";
		}
		return "Continue safely: Current iteration count is within safe limits.";
	}
}
```

### 4. Smart Snapshot Manager

Handles invisible snapshot creation and efficient storage.

```typescript
// src/snapshots/smart-snapshot-manager.ts

interface Snapshot {
	id: string;
	timestamp: number;
	fileUri: string;
	diff: string;
	metadata: SnapshotMetadata;
	iterationNumber: number;
	riskScore: number;
	canQuickRestore: boolean;
}

interface SnapshotMetadata {
	source: "ai" | "human";
	triggerReason: string;
	complexity: number;
	linesChanged: number;
	filesAffected: string[];
}

class SmartSnapshotManager {
	private cache = new Map<string, Snapshot[]>();
	private storage: SnapshotStorage;

	async shouldCreateSnapshot(
		change: CodeChange,
		context: SessionContext
	): Promise<boolean> {
		// Always snapshot on:
		return (
			change.isAIGenerated || // Every AI edit
			change.affectsProtectedFile || // Config changes
			context.consecutiveAIEdits >= 2 || // Multi-iteration
			change.complexity > context.baselineComplexity * 1.5 || // Complexity jump
			context.timeSinceLastSnapshot > 5 * 60 * 1000 || // 5 min elapsed
			change.linesChanged > 50 // Large change
		);
	}

	async createInvisibleSnapshot(change: CodeChange): Promise<Snapshot> {
		const snapshot: Snapshot = {
			id: this.generateId(),
			timestamp: Date.now(),
			fileUri: change.fileUri,
			diff: await this.computeDiff(change.before, change.after),
			metadata: {
				source: change.source,
				triggerReason: this.determineTriggerReason(change),
				complexity: change.complexity,
				linesChanged: change.linesChanged,
				filesAffected: [change.fileUri],
			},
			iterationNumber: change.sessionContext.consecutiveAIEdits,
			riskScore: change.riskAnalysis?.fast.riskLevel || 0,
			canQuickRestore: true,
		};

		// Store in cache for instant access
		this.addToCache(snapshot);

		// Persist to database asynchronously
		this.storage.save(snapshot).catch((err) => {
			console.error("Failed to persist snapshot:", err);
			// Keep in cache as fallback
		});

		return snapshot;
	}

	async getLatestSafe(fileUri: string): Promise<Snapshot | null> {
		// Check cache first
		const cached = this.cache.get(fileUri);
		if (cached && cached.length > 0) {
			// Return most recent "safe" snapshot
			return cached.find((s) => s.riskScore < 3) || cached[0];
		}

		// Fallback to database
		return this.storage.getLatestSafe(fileUri);
	}

	async getSnapshotHistory(
		fileUri: string,
		limit: number = 10
	): Promise<Snapshot[]> {
		return this.storage.getHistory(fileUri, limit);
	}

	private computeDiff(before: string, after: string): string {
		// Use fast diff algorithm (Myers, or similar)
		// Store only the diff, not full file content
		const diff = this.diffAlgorithm.compute(before, after);
		return this.compressDiff(diff);
	}

	private compressDiff(diff: string): string {
		// Optional: compress for storage efficiency
		return diff; // Or use zlib/gzip if needed
	}

	private addToCache(snapshot: Snapshot): void {
		const existing = this.cache.get(snapshot.fileUri) || [];
		existing.push(snapshot);

		// Keep only last 20 snapshots in cache per file
		if (existing.length > 20) {
			existing.shift();
		}

		this.cache.set(snapshot.fileUri, existing);
	}

	private generateId(): string {
		return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private determineTriggerReason(change: CodeChange): string {
		if (change.isAIGenerated) return "ai-edit";
		if (change.affectsProtectedFile) return "config-change";
		if (change.linesChanged > 50) return "large-change";
		return "periodic";
	}
}
```

### 5. One-Click Restore Manager

Provides instant rollback with <100ms perceived latency.

```typescript
// src/ui/restore-manager.ts

class RestoreManager {
	private snapshotManager: SmartSnapshotManager;
	private telemetry: TelemetryClient;

	/**
	 * Show inline restore option when risk detected
	 */
	async showRestoreOption(
		change: CodeChange,
		risk: RiskAnalysis
	): Promise<void> {
		// Create visual indicator in editor
		const decoration = vscode.window.createTextEditorDecorationType({
			after: {
				contentText: " 🚨 SnapBack: Risky change detected",
				color: new vscode.ThemeColor("errorForeground"),
				backgroundColor: new vscode.ThemeColor("errorBackground"),
				margin: "0 0 0 1em",
			},
			isWholeLine: false,
		});

		// Apply decoration to affected lines
		const editor = vscode.window.activeTextEditor;
		if (editor && editor.document.uri.toString() === change.fileUri) {
			const range = this.getChangeRange(change);
			editor.setDecorations(decoration, [range]);
		}

		// Show modal with options
		const action = await vscode.window.showWarningMessage(
			this.formatRiskMessage(risk),
			{ modal: false },
			"Undo with SnapBack",
			"Keep Change",
			"Tell Me More"
		);

		switch (action) {
			case "Undo with SnapBack":
				await this.instantRestore(change.fileUri);
				break;
			case "Tell Me More":
				await this.showDetailedAnalysis(change, risk);
				break;
			case "Keep Change":
				// User accepts risk - log and continue
				this.telemetry.recordRiskAccepted(change.fileUri, risk);
				break;
		}

		// Clear decoration after interaction
		decoration.dispose();
	}

	/**
	 * Instant restore: <100ms perceived latency
	 */
	private async instantRestore(fileUri: string): Promise<void> {
		const startTime = performance.now();

		try {
			// Get last safe snapshot
			const snapshot = await this.snapshotManager.getLatestSafe(fileUri);

			if (!snapshot) {
				vscode.window.showErrorMessage(
					"No safe snapshot available for restore"
				);
				return;
			}

			// Read current file content
			const uri = vscode.Uri.parse(fileUri);
			const currentContent = await vscode.workspace.fs.readFile(uri);
			const currentText = Buffer.from(currentContent).toString("utf8");

			// Apply reverse diff
			const restoredContent = this.applyReverseDiff(
				currentText,
				snapshot.diff
			);

			// Write back (this is atomic)
			await vscode.workspace.fs.writeFile(
				uri,
				Buffer.from(restoredContent, "utf8")
			);

			const elapsedMs = performance.now() - startTime;

			// Show success notification
			vscode.window.showInformationMessage(
				`✅ Restored to snapshot from ${this.formatRelativeTime(
					snapshot.timestamp
				)} ` + `(${elapsedMs.toFixed(0)}ms)`
			);

			// Log telemetry
			this.telemetry.recordRestore({
				fileUri,
				snapshotId: snapshot.id,
				elapsedMs,
				iterationNumber: snapshot.iterationNumber,
			});
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to restore: ${error.message}`
			);
			console.error("Restore failed:", error);
		}
	}

	/**
	 * Show detailed risk analysis (triggers deep analysis if not done)
	 */
	private async showDetailedAnalysis(
		change: CodeChange,
		risk: RiskAnalysis
	): Promise<void> {
		// Create webview panel for detailed view
		const panel = vscode.window.createWebviewPanel(
			"snapbackAnalysis",
			"SnapBack: Risk Analysis",
			vscode.ViewColumn.Beside,
			{ enableScripts: true }
		);

		// Show loading state
		panel.webview.html = this.getLoadingHtml();

		// If deep analysis not done, trigger it
		let deepAnalysis = risk.deep;
		if (!deepAnalysis) {
			deepAnalysis = await this.triggerDeepAnalysis(change);
		}

		// Render detailed analysis
		panel.webview.html = this.getAnalysisHtml(risk.fast, deepAnalysis);

		// Add restore button in webview
		panel.webview.onDidReceiveMessage(async (message) => {
			if (message.command === "restore") {
				await this.instantRestore(change.fileUri);
				panel.dispose();
			}
		});
	}

	private applyReverseDiff(content: string, diff: string): string {
		// Apply diff in reverse to get previous content
		const lines = content.split("\n");
		const diffLines = diff.split("\n");

		// Parse diff and apply in reverse
		// This is simplified - use a proper diff library like 'diff' or 'fast-diff'
		return this.diffEngine.applyReverse(lines, diffLines).join("\n");
	}

	private formatRiskMessage(risk: RiskAnalysis): string {
		const primaryIssue = risk.fast.issues[0];
		if (!primaryIssue) return "Potential risk detected";

		return (
			`⚠️ ${primaryIssue.message}\n\n` +
			`Risk Level: ${risk.fast.riskLevel.toUpperCase()}\n` +
			`Would you like to undo this change?`
		);
	}

	private formatRelativeTime(timestamp: number): string {
		const seconds = Math.floor((Date.now() - timestamp) / 1000);

		if (seconds < 60) return `${seconds}s ago`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
		return `${Math.floor(seconds / 86400)}d ago`;
	}

	private getAnalysisHtml(
		fast: FastRiskResult,
		deep?: DeepRiskResult
	): string {
		return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: var(--vscode-font-family); padding: 20px; }
    .risk-high { color: var(--vscode-errorForeground); }
    .risk-medium { color: var(--vscode-editorWarning-foreground); }
    .issue { margin: 10px 0; padding: 10px; background: var(--vscode-editor-background); }
    .restore-btn { 
      background: var(--vscode-button-background); 
      color: var(--vscode-button-foreground);
      border: none;
      padding: 10px 20px;
      cursor: pointer;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <h2>Risk Analysis</h2>
  
  <h3>Fast Analysis (${fast.analysisTimeMs}ms)</h3>
  <p><strong>Risk Level:</strong> <span class="risk-${
		fast.riskLevel
  }">${fast.riskLevel.toUpperCase()}</span></p>
  
  <h4>Issues Detected:</h4>
  ${fast.issues
		.map(
			(issue) => `
    <div class="issue">
      <strong>${issue.type}</strong>: ${issue.message}
    </div>
  `
		)
		.join("")}
  
  ${
		deep
			? `
    <h3>Deep Analysis (LLM-Powered)</h3>
    <p><strong>Recommendation:</strong> ${deep.recommendation.toUpperCase()}</p>
    <p><strong>Confidence:</strong> ${(deep.confidence * 100).toFixed(0)}%</p>
    
    <h4>Explanation:</h4>
    <p>${deep.explanation}</p>
    
    ${
		deep.securityRisks.length > 0
			? `
      <h4>Security Risks:</h4>
      <ul>
        ${deep.securityRisks.map((r) => `<li>${r.description}</li>`).join("")}
      </ul>
    `
			: ""
	}
  `
			: "<p><em>Deep analysis in progress...</em></p>"
  }
  
  <button class="restore-btn" onclick="restore()">Restore to Safe Snapshot</button>
  
  <script>
    const vscode = acquireVsCodeApi();
    function restore() {
      vscode.postMessage({ command: 'restore' });
    }
  </script>
</body>
</html>
    `;
	}
}
```

### 6. WebSocket Client (Real-Time Communication)

```typescript
// src/extension/websocket-client.ts

interface WebSocketMessage {
	type: "risk-detected" | "snapshot-created" | "session-update";
	payload: any;
}

class SnapBackClient {
	private ws: WebSocket | null = null;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private restoreManager: RestoreManager;

	async connect(userId: string, apiKey: string): Promise<void> {
		const wsUrl = `${SNAPBACK_WS_URL}?userId=${userId}&auth=${apiKey}`;

		this.ws = new WebSocket(wsUrl);

		this.ws.on("open", () => {
			console.log("SnapBack: Connected to server");
			this.reconnectAttempts = 0;
			this.sendHeartbeat();
		});

		this.ws.on("message", (data: string) => {
			this.handleMessage(JSON.parse(data));
		});

		this.ws.on("error", (error) => {
			console.error("SnapBack WebSocket error:", error);
		});

		this.ws.on("close", () => {
			console.log("SnapBack: Disconnected from server");
			this.attemptReconnect(userId, apiKey);
		});
	}

	private handleMessage(message: WebSocketMessage): void {
		switch (message.type) {
			case "risk-detected":
				// Lightning strike: immediate intervention
				this.handleRiskAlert(message.payload);
				break;

			case "snapshot-created":
				// Acknowledge snapshot creation (optional feedback)
				this.handleSnapshotAck(message.payload);
				break;

			case "session-update":
				// Update session context (iteration count, etc.)
				this.handleSessionUpdate(message.payload);
				break;
		}
	}

	private async handleRiskAlert(alert: RiskAlert): Promise<void> {
		// Only surface critical alerts via WebSocket
		if (alert.severity === "critical" || alert.severity === "high") {
			await this.restoreManager.showRestoreOption(
				alert.change,
				alert.risk
			);
		}
	}

	async sendEvent(event: CodeChangeEvent): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			console.warn("WebSocket not connected, queuing event");
			this.queueEvent(event);
			return;
		}

		this.ws.send(
			JSON.stringify({
				type: "code-change",
				payload: event,
			})
		);
	}

	private sendHeartbeat(): void {
		setInterval(() => {
			if (this.ws?.readyState === WebSocket.OPEN) {
				this.ws.send(JSON.stringify({ type: "ping" }));
			}
		}, 30000); // Every 30 seconds
	}

	private attemptReconnect(userId: string, apiKey: string): void {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			vscode.window.showWarningMessage(
				"SnapBack: Connection lost. Extension will work in offline mode."
			);
			return;
		}

		const delay = Math.min(
			1000 * Math.pow(2, this.reconnectAttempts),
			30000
		);
		this.reconnectAttempts++;

		setTimeout(() => {
			console.log(
				`SnapBack: Reconnecting (attempt ${this.reconnectAttempts})...`
			);
			this.connect(userId, apiKey);
		}, delay);
	}
}
```

---

## 🖥️ Next.js Backend Architecture

### API Routes

```typescript
// app/api/snapshots/create/route.ts
export async function POST(request: Request) {
	const { userId, snapshot } = await request.json();

	// Validate request
	if (!userId || !snapshot) {
		return Response.json(
			{ error: "Missing required fields" },
			{ status: 400 }
		);
	}

	// Store snapshot
	const { data, error } = await supabase.from("snapshots").insert({
		user_id: userId,
		file_uri: snapshot.fileUri,
		diff: snapshot.diff,
		metadata: snapshot.metadata,
		iteration_number: snapshot.iterationNumber,
		risk_score: snapshot.riskScore,
		created_at: new Date().toISOString(),
	});

	if (error) {
		return Response.json({ error: error.message }, { status: 500 });
	}

	return Response.json({ success: true, snapshot: data });
}

// app/api/analyze/fast/route.ts
export async function POST(request: Request) {
	const { change } = await request.json();

	const engine = new RiskAnalysisEngine();
	const result = await engine.analyzeFast(change);

	return Response.json(result);
}

// app/api/analyze/deep/route.ts
export async function POST(request: Request) {
	const { change, context } = await request.json();

	const engine = new RiskAnalysisEngine();
	const result = await engine.analyzeDeep(change, context);

	return Response.json(result);
}

// app/api/restore/route.ts
export async function POST(request: Request) {
	const { userId, fileUri, snapshotId } = await request.json();

	// Get snapshot
	const { data: snapshot } = await supabase
		.from("snapshots")
		.select("*")
		.eq("id", snapshotId)
		.eq("user_id", userId)
		.single();

	if (!snapshot) {
		return Response.json({ error: "Snapshot not found" }, { status: 404 });
	}

	// Return snapshot data for client-side restore
	return Response.json({ snapshot });
}
```

### WebSocket Server

```typescript
// app/api/ws/route.ts
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ noServer: true });
const connections = new Map<string, WebSocket>();

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const userId = searchParams.get("userId");
	const auth = searchParams.get("auth");

	// Validate auth
	if (!(await validateAuth(userId, auth))) {
		return new Response("Unauthorized", { status: 401 });
	}

	// Upgrade to WebSocket
	const upgrade = request.headers.get("upgrade");
	if (upgrade !== "websocket") {
		return new Response("Expected WebSocket", { status: 426 });
	}

	return new Response(null, {
		status: 101,
		headers: {
			Upgrade: "websocket",
			Connection: "Upgrade",
		},
	});
}

wss.on("connection", (ws, request) => {
	const userId = getUserIdFromRequest(request);
	connections.set(userId, ws);

	ws.on("message", (data) => {
		const message = JSON.parse(data.toString());
		handleClientMessage(userId, message);
	});

	ws.on("close", () => {
		connections.delete(userId);
	});
});

function notifyClient(userId: string, alert: RiskAlert) {
	const ws = connections.get(userId);
	if (!ws) return;

	ws.send(
		JSON.stringify({
			type: "risk-detected",
			payload: alert,
		})
	);
}
```

---

## 🗄️ Supabase Database Schema

```sql
-- Snapshots table (storing diffs, not full files)
CREATE TABLE snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  file_uri TEXT NOT NULL,
  diff JSONB NOT NULL,
  metadata JSONB NOT NULL,
  iteration_number INTEGER DEFAULT 0,
  risk_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  INDEX idx_user_file (user_id, file_uri),
  INDEX idx_created_at (created_at DESC)
);

-- Edit sessions table (track AI iteration counts)
CREATE TABLE edit_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  file_uri TEXT NOT NULL,
  consecutive_ai_edits INTEGER DEFAULT 0,
  last_human_edit TIMESTAMP WITH TIME ZONE,
  last_ai_edit TIMESTAMP WITH TIME ZONE,
  risk_trend TEXT CHECK (risk_trend IN ('improving', 'stable', 'degrading')),
  snapshot_ids UUID[] DEFAULT '{}',
  change_velocity REAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE (user_id, file_uri),
  INDEX idx_user_sessions (user_id)
);

-- Risk events table (audit log)
CREATE TABLE risk_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  snapshot_id UUID REFERENCES snapshots(id),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT,
  action_taken TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  INDEX idx_user_events (user_id, created_at DESC)
);

-- Metrics table (DX ROI tracking)
CREATE TABLE user_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Time savings
  debugging_hours_saved REAL DEFAULT 0,
  interventions_count INTEGER DEFAULT 0,
  average_restore_time_ms REAL DEFAULT 0,

  -- Quality impact
  vulnerabilities_prevented INTEGER DEFAULT 0,
  breaking_changes_caught INTEGER DEFAULT 0,

  -- AI usage patterns
  average_ai_iterations REAL DEFAULT 0,
  over_correction_loops_detected INTEGER DEFAULT 0,

  -- Developer confidence
  restore_success_rate REAL DEFAULT 0,
  false_positive_rate REAL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE (user_id, period_start, period_end)
);

-- Row Level Security policies
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_metrics ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can access own snapshots"
  ON snapshots FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can access own sessions"
  ON edit_sessions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can access own events"
  ON risk_events FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can access own metrics"
  ON user_metrics FOR ALL
  USING (auth.uid() = user_id);
```

---

## 📊 DX ROI Metrics & Dashboard

```typescript
// src/analytics/dx-metrics.ts

interface DXMetrics {
	// Time savings
	debuggingHoursSaved: number;
	interventionsCount: number;
	averageRestoreTimeMs: number;

	// Quality impact
	vulnerabilitiesPrevented: number;
	breakingChangesCaught: number;
	configErrorsPrevented: number;

	// AI usage patterns
	averageAIIterations: number;
	overCorrectionLoopsDetected: number;
	totalSnapshotsCreated: number;

	// Developer confidence
	restoreSuccessRate: number;
	falsePositiveRate: number;
	userSatisfactionScore: number;
}

interface ROIReport {
	timeSavedHours: number;
	percentageOfDebugTimeSaved: number;
	estimatedCostSavings: number;
	confidenceBoost: number;
	topRisksPrevented: RiskSummary[];
}

class DXMetricsCollector {
	private readonly HOURLY_DEV_COST = 75; // Average hourly cost
	private readonly WEEKLY_DEBUG_TIME = 17.3; // Hours per week

	async collectMetrics(
		userId: string,
		period: DateRange
	): Promise<DXMetrics> {
		// Query snapshots created in period
		const { data: snapshots } = await supabase
			.from("snapshots")
			.select("*")
			.eq("user_id", userId)
			.gte("created_at", period.start)
			.lte("created_at", period.end);

		// Query risk events
		const { data: events } = await supabase
			.from("risk_events")
			.select("*")
			.eq("user_id", userId)
			.gte("created_at", period.start)
			.lte("created_at", period.end);

		// Calculate metrics
		const interventions = events.filter(
			(e) => e.action_taken === "restored" || e.action_taken === "blocked"
		);

		const vulnerabilities = events.filter(
			(e) => e.event_type === "security-vulnerability"
		);

		const overCorrectionLoops = events.filter(
			(e) => e.event_type === "over-correction-loop"
		);

		// Time saved calculation
		// Assume each intervention saves ~30 minutes of debugging
		const debuggingHoursSaved = interventions.length * 0.5;

		return {
			debuggingHoursSaved,
			interventionsCount: interventions.length,
			averageRestoreTimeMs: this.calculateAverageRestoreTime(events),
			vulnerabilitiesPrevented: vulnerabilities.length,
			breakingChangesCaught: events.filter(
				(e) => e.event_type === "breaking-change"
			).length,
			configErrorsPrevented: events.filter(
				(e) => e.event_type === "config-change"
			).length,
			averageAIIterations: this.calculateAverageIterations(snapshots),
			overCorrectionLoopsDetected: overCorrectionLoops.length,
			totalSnapshotsCreated: snapshots.length,
			restoreSuccessRate: this.calculateRestoreSuccessRate(events),
			falsePositiveRate: this.calculateFalsePositiveRate(events),
			userSatisfactionScore: await this.getUserSatisfactionScore(userId),
		};
	}

	async calculateROI(userId: string, period: DateRange): Promise<ROIReport> {
		const metrics = await this.collectMetrics(userId, period);

		// Calculate percentage of debug time saved
		const weeklyHoursSaved = metrics.debuggingHoursSaved;
		const percentageSaved =
			(weeklyHoursSaved / this.WEEKLY_DEBUG_TIME) * 100;

		// Estimate cost savings
		const costSavings = weeklyHoursSaved * this.HOURLY_DEV_COST;

		// Calculate confidence boost (based on intervention success)
		const confidenceBoost = this.calculateConfidenceBoost(metrics);

		// Get top risks prevented
		const topRisks = await this.getTopRisksPrevented(userId, period);

		return {
			timeSavedHours: weeklyHoursSaved,
			percentageOfDebugTimeSaved: percentageSaved,
			estimatedCostSavings: costSavings,
			confidenceBoost,
			topRisksPrevented: topRisks,
		};
	}

	private calculateConfidenceBoost(metrics: DXMetrics): number {
		// Confidence boost based on:
		// 1. High restore success rate
		// 2. Low false positive rate
		// 3. Number of vulnerabilities prevented

		const successWeight = metrics.restoreSuccessRate * 0.4;
		const falsePositiveWeight = (1 - metrics.falsePositiveRate) * 0.3;
		const preventionWeight =
			Math.min(metrics.vulnerabilitiesPrevented / 10, 1) * 0.3;

		return (successWeight + falsePositiveWeight + preventionWeight) * 100;
	}

	async storeMetrics(userId: string, metrics: DXMetrics, period: DateRange) {
		await supabase.from("user_metrics").upsert({
			user_id: userId,
			period_start: period.start,
			period_end: period.end,
			...metrics,
		});
	}
}
```

### Dashboard Component

```typescript
// app/dashboard/metrics/page.tsx

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function MetricsDashboard() {
	const [metrics, setMetrics] = useState<DXMetrics | null>(null);
	const [roi, setROI] = useState<ROIReport | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadMetrics();
	}, []);

	async function loadMetrics() {
		const response = await fetch("/api/metrics/current-week");
		const data = await response.json();

		setMetrics(data.metrics);
		setROI(data.roi);
		setLoading(false);
	}

	if (loading) return <LoadingSpinner />;

	return (
		<div className="dashboard">
			<h1>SnapBack Developer Experience ROI</h1>

			{/* Time Savings Card */}
			<div className="metric-card">
				<h2>⏱️ Time Saved This Week</h2>
				<div className="stat-large">
					{roi.timeSavedHours.toFixed(1)} hours
				</div>
				<div className="stat-detail">
					{roi.percentageOfDebugTimeSaved.toFixed(0)}% of typical
					debug time
				</div>
				<div className="stat-money">
					≈ ${roi.estimatedCostSavings.toFixed(0)} in productivity
				</div>
			</div>

			{/* Interventions Card */}
			<div className="metric-card">
				<h2>🛡️ Risks Prevented</h2>
				<div className="stat-large">{metrics.interventionsCount}</div>
				<ul className="risk-list">
					<li>
						{metrics.vulnerabilitiesPrevented} security
						vulnerabilities
					</li>
					<li>{metrics.breakingChangesCaught} breaking changes</li>
					<li>{metrics.configErrorsPrevented} config errors</li>
				</ul>
			</div>

			{/* AI Usage Card */}
			<div className="metric-card">
				<h2>🤖 AI Safety Metrics</h2>
				<div className="stat">
					Average iterations: {metrics.averageAIIterations.toFixed(1)}
				</div>
				<div className="stat">
					Over-correction loops detected:{" "}
					{metrics.overCorrectionLoopsDetected}
				</div>
				<div className="stat">
					Total snapshots created: {metrics.totalSnapshotsCreated}
				</div>
			</div>

			{/* Confidence Card */}
			<div className="metric-card">
				<h2>✨ Developer Confidence</h2>
				<div className="stat-large">
					{roi.confidenceBoost.toFixed(0)}%
				</div>
				<div className="confidence-bars">
					<div className="bar">
						<span>Restore Success Rate</span>
						<div
							className="bar-fill"
							style={{
								width: `${metrics.restoreSuccessRate * 100}%`,
							}}
						/>
						<span>
							{(metrics.restoreSuccessRate * 100).toFixed(0)}%
						</span>
					</div>
					<div className="bar">
						<span>False Positive Rate</span>
						<div
							className="bar-fill warning"
							style={{
								width: `${metrics.falsePositiveRate * 100}%`,
							}}
						/>
						<span>
							{(metrics.falsePositiveRate * 100).toFixed(0)}%
						</span>
					</div>
				</div>
			</div>

			{/* Top Risks Prevented */}
			<div className="metric-card full-width">
				<h2>🔝 Top Risks Prevented</h2>
				<table className="risks-table">
					<thead>
						<tr>
							<th>Date</th>
							<th>Risk Type</th>
							<th>Severity</th>
							<th>Description</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						{roi.topRisksPrevented.map((risk) => (
							<tr key={risk.id}>
								<td>
									{new Date(
										risk.timestamp
									).toLocaleDateString()}
								</td>
								<td>{risk.type}</td>
								<td className={`severity-${risk.severity}`}>
									{risk.severity}
								</td>
								<td>{risk.description}</td>
								<td>{risk.actionTaken}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
```

---

## 🚀 VS Code Extension Entry Point

```typescript
// src/extension.ts

import * as vscode from "vscode";
import { InvisibleGuardian } from "./core/invisible-guardian";
import { SnapBackClient } from "./extension/websocket-client";
import { AIDetector } from "./detection/ai-detector";

export async function activate(context: vscode.ExtensionContext) {
	console.log("SnapBack: Activating extension");

	// Initialize core components
	const guardian = new InvisibleGuardian(context);
	const wsClient = new SnapBackClient();
	const aiDetector = new AIDetector();

	// Connect to server
	const config = vscode.workspace.getConfiguration("snapback");
	const apiKey = await context.secrets.get("snapback-api-key");

	if (apiKey) {
		await wsClient.connect(getUserId(), apiKey);
	}

	// Register file watcher
	const fileWatcher = vscode.workspace.createFileSystemWatcher("**/*");

	fileWatcher.onDidChange(async (uri) => {
		const change = await aiDetector.detectChange(uri);
		if (change) {
			await guardian.processChange(change, getSessionContext());
		}
	});

	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand("snapback.scanWorkspace", () => {
			guardian.scanWorkspace();
		}),

		vscode.commands.registerCommand("snapback.viewHistory", () => {
			guardian.showSnapshotHistory();
		}),

		vscode.commands.registerCommand("snapback.restoreSnapshot", () => {
			guardian.showRestoreUI();
		})
	);

	// Status bar item
	const statusBar = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		100
	);
	statusBar.text = "$(shield) SnapBack";
	statusBar.tooltip = "SnapBack: AI Safety Active";
	statusBar.show();

	context.subscriptions.push(fileWatcher, statusBar);

	console.log("SnapBack: Extension activated successfully");
}

export function deactivate() {
	console.log("SnapBack: Deactivating extension");
}
```

---

## 📝 Implementation Checklist

### Phase 1: Core Detection (Week 1-2)

-   [ ] Set up VS Code extension boilerplate
-   [ ] Implement file system watcher
-   [ ] Create AI detection heuristics
-   [ ] Build fast-path risk analysis
-   [ ] Implement snapshot creation

### Phase 2: Backend Infrastructure (Week 2-3)

-   [ ] Set up Next.js 15 project
-   [ ] Configure Supabase database
-   [ ] Implement REST API endpoints
-   [ ] Set up WebSocket server
-   [ ] Create authentication flow

### Phase 3: Smart Features (Week 3-4)

-   [ ] Implement iteration tracker
-   [ ] Build deep analysis with LLM
-   [ ] Create one-click restore UI
-   [ ] Add real-time alerts
-   [ ] Implement over-correction loop detection

### Phase 4: DX & Polish (Week 4-5)

-   [ ] Build metrics dashboard
-   [ ] Add telemetry and analytics
-   [ ] Create onboarding flow
-   [ ] Optimize performance (<100ms)
-   [ ] Add error handling and retry logic

### Phase 5: Testing & Launch (Week 5-6)

-   [ ] Unit tests for all components
-   [ ] Integration tests
-   [ ] Load testing (WebSocket)
-   [ ] Beta user testing
-   [ ] Documentation and launch

---

## 🎯 Success Metrics

### Technical Metrics

-   **Fast analysis**: <100ms for 95% of checks
-   **Restore speed**: <100ms perceived latency
-   **WebSocket uptime**: >99.9%
-   **False positive rate**: <10%

### DX ROI Metrics

-   **Time saved**: >2 hours/week per developer
-   **Vulnerabilities prevented**: >5 per month
-   **Developer confidence**: >80% satisfaction score
-   **Adoption rate**: >50% of team using daily

---

## 🔒 Security & Privacy

1. **Data Minimization**: Store only diffs, not full file content
2. **Encryption**: All data encrypted in transit (TLS) and at rest
3. **Authentication**: JWT-based auth with API key rotation
4. **Row-Level Security**: Users can only access their own data
5. **Opt-out**: Users can disable features or delete all data

---

## 📚 Resources & References

1. AI Code Quality Research: 40% of AI-written code contains flaws
2. Iteration Impact Study: 37.6% vulnerability increase after 5 rounds
3. Developer Time Study: 17.3 hours/week on debugging
4. DX Best Practices: "Invisible tools are the best tools"
5. Duolingo AI Productivity: 25% speed increase with AI tools

---

## Conclusion

SnapBack represents a new category of developer tooling: **AI Safety-as-a-Service**. By staying invisible until critical moments and providing surgical interventions with one-click recovery, it maximizes Developer Experience ROI while minimizing friction.

The architecture is deliberately simple—one VS Code extension, one Next.js backend, one Supabase database—yet the impact is significant: preventing hours of debugging, catching security vulnerabilities, and building developer confidence in AI coding tools.

**Core Principle**: The best developer tools reduce friction without demanding attention. SnapBack is feasible to implement, and done right, it will feel like it's barely there—until it saves your hide.

---

**Built with ❤️ for developers who want to code fearlessly with AI**
