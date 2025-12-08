import type { DemoNode } from "./types";

export const DEMO_NODES: DemoNode[] = [
	{
		id: "safe",
		label: "config.ts",
		sublabel: "working",
		icon: "✓",
		code: `export const db = {
  host: "localhost",
  credentials: process.env.DB_CREDS
}`,
		trustDelta: null,
		terminal: [{ text: "Starting dev server...", type: "dim" }],
	},
	{
		id: "ai_edit",
		label: "Cursor",
		sublabel: "editing...",
		icon: "🤖",
		code: `export const db = {
  host: "localhost",
  credentials: "simplified" // AI: cleaned up
}`,
		trustDelta: null,
		terminal: [{ text: "AI generating changes...", type: "info" }],
	},
	{
		id: "break",
		label: "BREAK",
		sublabel: "creds gone",
		icon: "🔴",
		code: `// ❌ Build failed: DB_CREDS undefined
export const db = {
  host: "localhost",
  credentials: "simplified"
}`,
		trustDelta: -0.03, // Trust drops
		terminal: [
			{ text: "Fatal Error: Production DB credentials exposed in plain text", type: "error" },
			{ text: "Build failed (exit code 1)", type: "error" },
			{ text: "Database connection refused at 127.0.0.1:5432", type: "error" },
		],
	},
	{
		id: "restored",
		code: `// ✅ Restored via SnapBack
export const db = {
  host: "localhost",
  credentials: process.env.DB_CREDS
}`,
		// Add missing fields for type safety
		label: "Restored",
		sublabel: "safe state",
		icon: "✓",
		trustDelta: null,
		terminal: [
			// We simulate a "rewind" effect. These will be typed out.
			{ text: "Detected anomaly: Credential leak in config.ts", type: "error" },
			{ text: "Restoring safe state from checkpoint...", type: "info" },
			{ text: "Done (47ms). Threat neutralized.", type: "success" },
		],
	},
];
