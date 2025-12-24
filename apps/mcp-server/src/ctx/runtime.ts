/**
 * Context Runtime - Parses and manages .ctx and context.json
 *
 * Embedded in MCP package, runs in user workspace.
 * Provides type-safe access to project constraints and decisions.
 *
 * @module ctx/runtime
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

// Use createRequire for JSON import - works consistently in ESM across Node.js versions
// and doesn't depend on bundler preserving import attributes
const require = createRequire(import.meta.url);
const defaultContext = require("./defaults.json") as ContextSchema;

// Types
export interface Constraint {
	max: number;
	unit: string;
	key: string;
	current?: number;
}

export interface Blocker {
	key: string;
	label: string;
	current: number | string;
	target: number | string;
}

export interface ContextSchema {
	version: string;
	meta: {
		id: string;
		type: "code-protection" | "library" | "application" | "cli" | "unknown";
		phase: "sprint" | "development" | "production" | "maintenance";
		priority: string;
	};
	constraints: Record<string, Record<string, Constraint>>;
	blockers: Blocker[];
	architecture: {
		privacy: string;
		zeroShortcuts: boolean;
		typeStrict: boolean;
	};
	decisions: {
		priority: string[];
		made: Record<string, unknown>;
	};
	stack: Record<string, string | string[]>;
	quality: {
		typescript: { errors: number };
		coverage: { min: number };
		perfBudgets: boolean;
		bundleValidation: boolean;
		consoleErrors: number;
	};
	workflows: Record<string, string[]>;
	protocol: {
		options: string;
		references: string;
		risks: string;
		sizing: string;
	};
	refs: {
		audits: string;
		specs: string;
		files: Record<string, string>;
	};
}

export interface ValidationResult {
	valid: boolean;
	reason?: string;
	hash?: string;
}

/**
 * Context Runtime - manages context for a workspace
 */
export class ContextRuntime {
	private workspaceRoot: string;
	private ctxDir: string;
	private context: ContextSchema | null = null;

	constructor(workspaceRoot: string) {
		this.workspaceRoot = workspaceRoot;
		this.ctxDir = join(workspaceRoot, ".snapback", "ctx");
	}

	/**
	 * Initialize context system in workspace
	 * Called on first MCP connection or explicit init
	 */
	async init(options: { force?: boolean } = {}): Promise<{ success: boolean; path: string }> {
		const contextPath = join(this.ctxDir, "context.json");

		if (!existsSync(this.ctxDir)) {
			mkdirSync(this.ctxDir, { recursive: true });
		}

		if (!existsSync(contextPath) || options.force) {
			// Create default context.json
			const template = this.createDefaultContext();
			writeFileSync(contextPath, JSON.stringify(template, null, "\t"));
		}

		// Generate .ctx
		await this.build();

		return { success: true, path: contextPath };
	}

	/**
	 * Load context.json (source of truth)
	 * Merges with defaults to ensure all required fields are present
	 */
	load(): ContextSchema {
		if (this.context) return this.context;

		const contextPath = join(this.ctxDir, "context.json");
		const defaults = defaultContext as unknown as ContextSchema;

		if (!existsSync(contextPath)) {
			// Return defaults without persisting
			return defaults;
		}

		const raw = readFileSync(contextPath, "utf8");
		const loaded = JSON.parse(raw) as Partial<ContextSchema>;

		// Deep merge with defaults to ensure all fields exist
		this.context = {
			...defaults,
			...loaded,
			meta: { ...defaults.meta, ...loaded.meta },
			constraints: { ...defaults.constraints, ...loaded.constraints },
			blockers: loaded.blockers ?? defaults.blockers,
			architecture: { ...defaults.architecture, ...loaded.architecture },
			decisions: {
				priority: loaded.decisions?.priority ?? defaults.decisions.priority,
				made: { ...defaults.decisions.made, ...loaded.decisions?.made },
			},
			stack: { ...defaults.stack, ...loaded.stack },
			quality: {
				...defaults.quality,
				...loaded.quality,
				typescript: { ...defaults.quality.typescript, ...loaded.quality?.typescript },
				coverage: { ...defaults.quality.coverage, ...loaded.quality?.coverage },
			},
			workflows: { ...defaults.workflows, ...loaded.workflows },
			protocol: { ...defaults.protocol, ...loaded.protocol },
			refs: {
				...defaults.refs,
				...loaded.refs,
				files: { ...defaults.refs.files, ...loaded.refs?.files },
			},
		} as ContextSchema;

		return this.context;
	}

	/**
	 * Build .ctx from context.json
	 * Creates context.json with defaults if it doesn't exist
	 */
	async build(): Promise<{ success: boolean; size: number; hash: string }> {
		const contextPath = join(this.ctxDir, "context.json");

		// Ensure ctx directory exists
		if (!existsSync(this.ctxDir)) {
			mkdirSync(this.ctxDir, { recursive: true });
		}

		// Create context.json if missing (needed for hash computation)
		if (!existsSync(contextPath)) {
			const template = this.createDefaultContext();
			writeFileSync(contextPath, JSON.stringify(template, null, "\t"));
		}

		const context = this.load();
		const ctx = this.generateCtx(context);

		const ctxPath = join(this.ctxDir, ".ctx");
		writeFileSync(ctxPath, ctx);

		// Optionally create symlink at workspace root
		const rootCtxPath = join(this.workspaceRoot, ".ctx");
		if (!existsSync(rootCtxPath)) {
			try {
				symlinkSync(ctxPath, rootCtxPath);
			} catch {
				// Symlink failed (Windows?), copy instead
				writeFileSync(rootCtxPath, ctx);
			}
		}

		const hash = createHash("sha256").update(ctx).digest("hex").substring(0, 16);
		return { success: true, size: ctx.length, hash };
	}

	/**
	 * Validate .ctx is fresh
	 */
	validate(): ValidationResult {
		const contextPath = join(this.ctxDir, "context.json");
		const ctxPath = join(this.ctxDir, ".ctx");

		if (!existsSync(contextPath)) {
			return { valid: false, reason: "context.json missing" };
		}

		if (!existsSync(ctxPath)) {
			return { valid: false, reason: ".ctx missing (run: snapback ctx build)" };
		}

		// Check embedded hash
		const ctxContent = readFileSync(ctxPath, "utf8");
		const embeddedHash = this.extractCtxHash(ctxContent);
		const expectedHash = this.computeContextHash();

		if (embeddedHash !== expectedHash) {
			return { valid: false, reason: ".ctx hash mismatch (context.json modified)" };
		}

		// Check modification times
		const contextMtime = statSync(contextPath).mtimeMs;
		const ctxMtime = statSync(ctxPath).mtimeMs;

		if (contextMtime > ctxMtime) {
			return { valid: false, reason: ".ctx stale (context.json newer)" };
		}

		return { valid: true, hash: expectedHash };
	}

	/**
	 * Get constraint value for runtime checks
	 */
	getConstraint(domain: string, name: string): Constraint | undefined {
		const context = this.load();
		return context.constraints[domain]?.[name];
	}

	/**
	 * Get all blockers
	 */
	getBlockers(): Blocker[] {
		return this.load().blockers;
	}

	/**
	 * Get decision value
	 */
	getDecision(key: string): unknown {
		return this.load().decisions.made[key];
	}

	/**
	 * Get constraint threshold in base units (bytes, ms)
	 */
	getThreshold(domain: string, name: string): number | undefined {
		const constraint = this.getConstraint(domain, name);
		if (!constraint) return undefined;

		// Convert to base units
		const multipliers: Record<string, number> = {
			MB: 1_000_000,
			KB: 1_000,
			ms: 1,
			s: 1_000,
		};

		const multiplier = multipliers[constraint.unit] || 1;
		return constraint.max * multiplier;
	}

	/**
	 * Check if a value exceeds constraint
	 */
	checkConstraint(
		domain: string,
		name: string,
		value: number,
	): {
		pass: boolean;
		ratio: number;
		threshold: number;
		severity: "ok" | "warning" | "critical";
	} {
		const threshold = this.getThreshold(domain, name);
		if (!threshold) {
			return { pass: true, ratio: 0, threshold: 0, severity: "ok" };
		}

		const ratio = value / threshold;
		return {
			pass: ratio <= 1.0,
			ratio,
			threshold,
			severity: ratio > 1.5 ? "critical" : ratio > 1.0 ? "warning" : "ok",
		};
	}

	// --- Private ---

	private createDefaultContext(): ContextSchema {
		return {
			...defaultContext,
			meta: {
				...defaultContext.meta,
				id: this.detectProjectName(),
				type: "unknown",
				phase: "development",
			},
		} as ContextSchema;
	}

	private detectProjectName(): string {
		try {
			const pkgPath = join(this.workspaceRoot, "package.json");
			if (existsSync(pkgPath)) {
				const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
				return pkg.name || "project";
			}
		} catch {
			// Ignore
		}
		return "project";
	}

	private computeContextHash(): string {
		const contextPath = join(this.ctxDir, "context.json");
		const content = readFileSync(contextPath, "utf8");
		return createHash("sha256").update(content).digest("hex").substring(0, 16);
	}

	private extractCtxHash(ctxContent: string): string | null {
		const match = ctxContent.match(/^# hash:([a-f0-9]+)/m);
		return match ? match[1] : null;
	}

	private generateCtx(context: ContextSchema): string {
		const hash = this.computeContextHash();
		const lines: string[] = ["# .ctx v1", `# hash:${hash}`, ""];

		// [id]
		lines.push("[id]");
		lines.push(`t=${context.meta.type}`);
		lines.push(`p=${context.meta.phase}`);
		lines.push(`d=${context.meta.priority}`);
		lines.push("");

		// [lim]
		lines.push("[lim]");
		for (const [, constraints] of Object.entries(context.constraints)) {
			for (const [, def] of Object.entries(constraints)) {
				const val = def.current !== undefined ? `=${def.current}` : `<${def.max}`;
				lines.push(`${def.key}${val}${def.unit?.[0] || ""}`);
			}
		}
		lines.push("");

		// [arc]
		lines.push("[arc]");
		lines.push(`_pr=${context.architecture.privacy}`);
		lines.push(`_zs=${context.architecture.zeroShortcuts ? 1 : 0}`);
		lines.push(`_ts=${context.architecture.typeStrict ? "strict" : "loose"}`);
		lines.push("");

		// [blk]
		lines.push("[blk]");
		for (const b of context.blockers) {
			lines.push(`!${b.key}:${b.current}>${b.target}`);
		}
		lines.push("");

		// [dec]
		lines.push("[dec]");
		for (const p of context.decisions.priority) {
			lines.push(`>${p}`);
		}
		lines.push("");

		// [kdec]
		lines.push("[kdec]");
		const made = context.decisions.made;
		for (const [k, v] of Object.entries(made)) {
			if (typeof v === "object" && v !== null) {
				const parts = Object.entries(v as Record<string, string>)
					.map(([sk, sv]) => `${sv}:${sk}`)
					.join(",");
				lines.push(`_${k.substring(0, 2)}=${parts}`);
			} else {
				lines.push(`_${k.substring(0, 2)}=${v}`);
			}
		}
		lines.push("");

		// [qg]
		lines.push("[qg]");
		const qg = context.quality;
		lines.push(`_ts=${qg.typescript.errors}|cov>${qg.coverage.min}|con=${qg.consoleErrors}`);
		lines.push("");

		// [ref]
		lines.push("[ref]");
		lines.push(`@a=${context.refs.audits}`);
		lines.push(`@s=${context.refs.specs}`);
		lines.push("");

		// [wf]
		lines.push("[wf]");
		for (const [name, steps] of Object.entries(context.workflows)) {
			lines.push(`${name}=${steps.join(">")}`);
		}
		lines.push("");

		lines.push("#EOF");
		return lines.join("\n");
	}
}

// Singleton cache per workspace
const instances = new Map<string, ContextRuntime>();

/**
 * Get context runtime for a workspace (singleton per workspace)
 */
export function getContextRuntime(workspaceRoot: string): ContextRuntime {
	if (!instances.has(workspaceRoot)) {
		instances.set(workspaceRoot, new ContextRuntime(workspaceRoot));
	}
	return instances.get(workspaceRoot)!;
}

/**
 * Clear cached instance (for testing)
 */
export function clearContextRuntime(workspaceRoot: string): void {
	instances.delete(workspaceRoot);
}
