#!/usr/bin/env node
import { executeCleanup, type OrchestratorOptions, updateRefactorState, validateRefactorState } from "../migrations";

const args = process.argv.slice(2);
const command = args[0]; // 'update', 'validate', 'cleanup'

async function main() {
	try {
		if (command === "validate") {
			const success = validateRefactorState();
			process.exit(success ? 0 : 1);
		} else if (command === "cleanup") {
			const force = args.includes("--force");
			await executeCleanup(force);
		} else if (command === "update") {
			// Parse flags like --phase=discovery --pass=SYS_DET
			const options: any = {};
			for (const arg of args.slice(1)) {
				if (arg.startsWith("--")) {
					const [key, value] = arg.slice(2).split("=");
					if (key && value) {
						options[key] = value;
					} else if (key) {
						// Handle boolean flags or value-less flags if needed,
						// but logic expects key=value mostly
						// Check if next arg is value
						// For simplicity, we stick to --key=value as per original .mjs usage
						// "node script --phase discovery" was the usage.
						// My parser above expects --phase=discovery.
						// Let's support space separation too.
					}
				}
			}

			// Better parser for space-separated args like --phase discovery
			for (let i = 1; i < args.length; i++) {
				if (args[i].startsWith("--")) {
					const key = args[i].slice(2);
					if (args[i + 1] && !args[i + 1].startsWith("--")) {
						options[key] = args[i + 1];
						i++;
					} else {
						options[key] = true;
					}
				}
			}

			updateRefactorState(options as OrchestratorOptions);
		} else {
			console.log("Usage: snapback-migrate <command> [options]");
			console.log("Commands: update, validate, cleanup");
		}
	} catch (e: any) {
		console.error("Error:", e.message);
		process.exit(1);
	}
}

main();
