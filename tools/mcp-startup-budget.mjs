#!/usr/bin/env node
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";

const [, , entry = "apps/mcp-server/dist/index.js", budgetMs = "1500", budgetMb = "200"] = process.argv;
const start = performance.now();
const p = spawn("node", [entry], {
	env: { ...process.env, SNAPBACK_MCP_SELFTEST: "1" },
	stdio: ["ignore", "pipe", "pipe"],
});
let stderr = "";
p.stderr.on("data", (d) => {
	stderr += d.toString();
});
p.on("exit", () => {
	const dur = performance.now() - start;
	const m = stderr.match(/rssMB=(\d+)/);
	const rss = m ? Number(m[1]) : Number.NaN;
	const okTime = dur <= Number(budgetMs);
	const okMem = !Number.isNaN(rss) && rss <= Number(budgetMb);
	if (!okTime || !okMem) {
		console.error(`[budget] FAIL dur=${Math.round(dur)}ms<=${budgetMs}ms mem=${rss}MB<=${budgetMb}MB`);
		process.exit(2);
	}
	console.log(`[budget] OK dur=${Math.round(dur)}ms mem=${rss}MB`);
});
