#!/usr/bin/env node
// tools/pin-catalog-from-lock.mjs (no external deps; offline-safe)
import fs from "node:fs";

const libs = new Set(process.argv.slice(2));
const lock = fs.readFileSync("pnpm-lock.yaml", "utf8");
const wsPath = "pnpm-workspace.yaml";
const ws = fs.readFileSync(wsPath, "utf8");
function pinFromLock(name) {
	const re = new RegExp(`/${name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}/([^:\\n]+):`, "g");
	let m;
	let last;
	while ((m = re.exec(lock))) {
		last = m[1];
	}
	return last;
}
let out = ws;
if (!/^catalog:\\s*$/m.test(out)) {
	out += `${out.endsWith("\n") ? "" : "\n"}catalog:\n`;
}
for (const name of libs) {
	const v = pinFromLock(name);
	if (!v) {
		continue;
	}
	const lineRe = new RegExp(`^\\s{2}${name}:\\s*".*"$`, "m");
	const line = `  ${name}: "${v}"`;
	out = lineRe.test(out) ? out.replace(lineRe, line) : out.replace(/^catalog:\\s*$/m, `catalog:\n${line}`);
}
fs.writeFileSync(wsPath, out);
console.log("Pinned catalog (no-deps):", [...libs].join(", "));
