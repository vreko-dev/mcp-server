#!/usr/bin/env node
/**
 * context-build.mjs
 *
 * Generates obfuscated .ctx file from .snapback/ctx/context.json
 * Part of the unified configuration & context system.
 *
 * This follows the same directory structure used in user workspaces,
 * enabling dogfooding and consistent MCP runtime behavior.
 *
 * Usage:
 *   node tooling/scripts/context-build.mjs
 *   node tooling/scripts/context-build.mjs --with-map  # Also generate .ctx.map
 *   node tooling/scripts/context-build.mjs --quiet     # Suppress output
 *
 * @see .snapback/ctx/context.json
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "../..");

const CONTEXT_PATH = join(ROOT, ".snapback", "ctx", "context.json");
const CTX_PATH = join(ROOT, ".snapback", "ctx", ".ctx");
const CTX_MAP_PATH = join(ROOT, ".snapback", "ctx", ".ctx.map");

// Parse CLI args
const args = process.argv.slice(2);
const WITH_MAP = args.includes("--with-map");
const QUIET = args.includes("--quiet");

function log(message) {
	if (!QUIET) {
		console.log(message);
	}
}

function loadContext() {
	const raw = readFileSync(CONTEXT_PATH, "utf8");
	return JSON.parse(raw);
}

/**
 * Generate obfuscated .ctx from context.json
 * Format is compact, machine-readable, and IP-protected
 */
function buildCtx(context) {
	const lines = ["# .ctx v1", `# hash:${computeContextHash()}`, ""];

	// [id] section - identity
	lines.push("[id]");
	lines.push(`t=${context.meta.type}`);
	lines.push(`p=${context.meta.phase}`);
	lines.push(`d=${context.meta.priority}`);
	lines.push("");

	// [lim] section - constraints/limits
	lines.push("[lim]");
	for (const [, constraints] of Object.entries(context.constraints)) {
		for (const [, def] of Object.entries(constraints)) {
			const op = def.current !== undefined ? `=${def.current}` : `<${def.max}`;
			lines.push(`${def.key}${op}${def.unit?.[0] || ""}`);
		}
	}
	lines.push("");

	// [arc] section - architecture
	lines.push("[arc]");
	lines.push(`_pr=${context.architecture.privacy}`);
	lines.push(`_zs=${context.architecture.zeroShortcuts ? 1 : 0}`);
	lines.push(`_ts=${context.architecture.typeStrict ? "strict" : "loose"}`);
	lines.push("");

	// [blk] section - blockers
	lines.push("[blk]");
	for (const blocker of context.blockers) {
		lines.push(`!${blocker.key}:${blocker.current}>${blocker.target}`);
	}
	lines.push("");

	// [dec] section - decision priorities
	lines.push("[dec]");
	for (const priority of context.decisions.priority) {
		lines.push(`>${priority}`);
	}
	lines.push("");

	// [kdec] section - key decisions made
	lines.push("[kdec]");
	const made = context.decisions.made;
	lines.push(`_cl=${made.clustering}`);
	if (typeof made.diff === "object") {
		lines.push(`_df=${made.diff.small}:sm,${made.diff.large}:lg`);
	}
	lines.push(`_an=${made.analytics}`);
	lines.push(`_gd=${made.gdpr}`);
	lines.push("");

	// [stk] section - stack (compressed codes)
	lines.push("[stk]");
	const stackCodes = {
		turborepo: "tr",
		pnpm: "pn",
		next14: "nx14",
		"vscode-1.99": "vsc99",
		drizzle: "dz",
		postgres: "pg",
		posthog: "ph",
		orpc: "or",
		vitest: "vi",
		playwright: "pw",
	};
	const stackParts = Object.values(context.stack)
		.flat()
		.map((v) => stackCodes[v] || v);
	lines.push(stackParts.join("|"));
	lines.push("");

	// [qg] section - quality gates
	lines.push("[qg]");
	const qg = context.quality;
	lines.push(`_ts=${qg.typescript.errors}|cov>${qg.coverage.min}|perf|bun|con=${qg.consoleErrors}`);
	lines.push("");

	// [ref] section - references
	lines.push("[ref]");
	lines.push(`@a=${context.refs.audits}`);
	lines.push(`@s=${context.refs.specs}`);
	lines.push("");

	// [wf] section - workflows
	lines.push("[wf]");
	for (const [name, steps] of Object.entries(context.workflows)) {
		lines.push(`${name}=${steps.join(">")}`);
	}
	lines.push("");

	// [proto] section - response protocol
	lines.push("[proto]");
	lines.push(`opt=${context.protocol.options}`);
	lines.push(`ref=${context.protocol.references}`);
	lines.push(`risk=${context.protocol.risks}`);
	lines.push(`size=${context.protocol.sizing.toLowerCase().replace(/\//g, "")}`);
	lines.push("");

	lines.push("#EOF");

	return lines.join("\n");
}

/**
 * Generate human-readable .ctx.map for debugging
 */
function buildCtxMap(context) {
	const lines = [
		"# .ctx Field Reference (Human Debugging Only)",
		"# Auto-generated - do not edit",
		"",
		"## Sections",
		"[id]=identity [lim]=limits [arc]=architecture [blk]=blockers",
		"[dec]=decisions [kdec]=key-decisions [stk]=stack [qg]=quality",
		"[ref]=references [wf]=workflow [proto]=protocol",
		"",
		"## Constraint Keys",
	];

	for (const [domain, constraints] of Object.entries(context.constraints)) {
		for (const [name, def] of Object.entries(constraints)) {
			lines.push(`${def.key}=${domain}-${name}(${def.unit})`);
		}
	}

	lines.push("");
	lines.push("## Blocker Keys");
	for (const blocker of context.blockers) {
		lines.push(`${blocker.key}=${blocker.label}`);
	}

	lines.push("");
	lines.push("## Stack Codes");
	lines.push("tr=turborepo pn=pnpm nx14=next14 vsc99=vscode-1.99");
	lines.push("dz=drizzle pg=postgres ph=posthog or=orpc vi=vitest pw=playwright");

	lines.push("");
	lines.push("## Symbols");
	lines.push("!=blocker >=priority @=reference <>=threshold |=separator :=value");

	return lines.join("\n");
}

/**
 * Compute hash of context.json for staleness detection
 */
function computeContextHash() {
	const content = readFileSync(CONTEXT_PATH, "utf8");
	return createHash("sha256").update(content).digest("hex").substring(0, 16);
}

// Main execution
try {
	const context = loadContext();
	const ctx = buildCtx(context);
	writeFileSync(CTX_PATH, ctx);
	log(`Generated ${CTX_PATH} (${ctx.length} bytes)`);

	if (WITH_MAP) {
		const ctxMap = buildCtxMap(context);
		writeFileSync(CTX_MAP_PATH, ctxMap);
		log(`Generated ${CTX_MAP_PATH} (${ctxMap.length} bytes)`);
	}

	// Output hash for manifest integration
	const ctxHash = createHash("sha256").update(ctx).digest("hex");
	log(`.ctx hash: sha256:${ctxHash.substring(0, 16)}...`);
} catch (error) {
	console.error(`Failed to build context: ${error.message}`);
	process.exit(1);
}
