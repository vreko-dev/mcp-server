#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = JSON.parse(fs.readFileSync("package.json", "utf8"));
const catalog = root.catalog || {};
const pkgs = [];
function walk(dir) {
	for (const name of fs.readdirSync(dir)) {
		const p = path.join(dir, name);
		if (name === "node_modules" || name === ".vscode-test") {
			continue;
		}
		const s = fs.statSync(p);
		if (s.isDirectory()) {
			walk(p);
		} else if (name === "package.json") {
			pkgs.push(p);
		}
	}
}
for (const base of ["apps", "packages"]) {
	if (fs.existsSync(base)) {
		walk(base);
	}
}
const fields = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
let changed = 0;
for (const pjPath of pkgs) {
	const obj = JSON.parse(fs.readFileSync(pjPath, "utf8"));
	for (const f of fields) {
		const bag = obj[f];
		if (!bag) {
			continue;
		}
		for (const name of Object.keys(bag)) {
			if (!catalog[name]) {
				continue;
			}
			if (!String(bag[name]).startsWith("catalog:")) {
				bag[name] = `catalog:${name}`;
				changed++;
			}
		}
	}
	fs.writeFileSync(pjPath, `${JSON.stringify(obj, null, 2)}\n`);
}
console.error(`[catalogify] updated ${changed} ranges to catalog:*`);
process.exit(0);
