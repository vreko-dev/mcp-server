#!/usr/bin/env node
import { spawn } from "node:child_process";
import { once } from "node:events";

const cmd = process.argv[2] || "node";
const arg = process.argv[3] || "apps/mcp-server/dist/index.js";
const p = spawn(cmd, [arg], { stdio: ["pipe", "pipe", "pipe"] });
let out = "";
let err = "";
p.stdout.on("data", (d) => (out += d.toString()));
p.stderr.on("data", (d) => (err += d.toString()));
const req = (id, method, params = {}) => `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`;
setTimeout(() => {
	try {
		p.stdin.write(req(1, "initialize", { client: "qoder-selftest" }));
		p.stdin.write(req(2, "tools/list", {}));
	} catch {}
}, 30).unref();
setTimeout(() => {
	try {
		p.kill();
	} catch {}
	process.stdout.write(out);
	process.stderr.write(err);
}, 400).unref();
await once(p, "exit").catch(() => {});
