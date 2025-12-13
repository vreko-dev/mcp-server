import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const stateDir = join(__dirname, "../../refactor-state");

function readJSON(filename: string): any {
	const filepath = join(stateDir, filename);
	return JSON.parse(readFileSync(filepath, "utf8"));
}

function writeJSON(filename: string, data: any) {
	const filepath = join(stateDir, filename);
	writeFileSync(filepath, `${JSON.stringify(data, null, 2)}\n`);
}

export interface OrchestratorOptions {
	phase: "discovery" | "migrate" | "cleanup";
	pass?: string;
	findings?: string;
	file?: string;
	line?: string;
	usage?: string;
	context?: string;
	opportunity?: string;
	status?: string;
	blocker?: string;
	component?: string;
	coverage?: string;
	validation?: string;
	result?: string;
	item?: string;
}

export function updateRefactorState(options: OrchestratorOptions) {
	switch (options.phase) {
		case "discovery": {
			const state = readJSON("discovery-state.json");
			if (options.pass && !state.passes_completed.includes(options.pass)) {
				state.passes_completed.push(options.pass);
				console.log(`✅ Added pass: ${options.pass}`);
			}
			if (options.findings && options.file && options.line) {
				if (!state.findings[options.findings]) {
					state.findings[options.findings] = [];
				}
				state.findings[options.findings].push({
					file: options.file,
					line: Number.parseInt(options.line, 10),
					usage: options.usage || "unknown",
					context: options.context || "",
				});
				console.log(`✅ Added finding: ${options.findings} in ${options.file}:${options.line}`);
			}
			writeJSON("discovery-state.json", state);
			break;
		}

		case "migrate": {
			const state = readJSON("migration-state.json");
			if (options.opportunity && options.status) {
				const op = options.opportunity;
				switch (options.status) {
					case "in_progress":
						if (!state.opportunities_in_progress.includes(op)) {
							state.opportunities_in_progress.push(op);
						}
						break;
					case "completed":
						state.opportunities_in_progress = state.opportunities_in_progress.filter(
							(o: string) => o !== op,
						);
						if (!state.opportunities_completed.includes(op)) {
							state.opportunities_completed.push(op);
						}
						break;
					case "blocked":
						if (options.blocker) {
							state.opportunities_blocked.push({
								id: op,
								blocker: options.blocker,
							});
						}
						break;
				}
				console.log(`✅ Updated opportunity: ${op} → ${options.status}`);
			}
			if (options.component && options.coverage) {
				state.test_coverage[options.component] = Number.parseFloat(options.coverage);
				console.log(`✅ Updated test coverage: ${options.component} → ${options.coverage}%`);
			}
			if (options.validation && options.result) {
				state.validation_results[options.validation] = options.result;
				console.log(`✅ Updated validation: ${options.validation} → ${options.result}`);
			}
			writeJSON("migration-state.json", state);
			break;
		}

		case "cleanup": {
			const state = readJSON("cleanup-queue.json");
			if (options.item && options.status) {
				const item = state.items.find((i: any) => i.id === options.item);
				if (item) {
					item.status = options.status;
					if (options.status === "COMPLETE") {
						item.completed_at = new Date().toISOString();
					}
					console.log(`✅ Updated cleanup item: ${options.item} → ${options.status}`);
				} else {
					throw new Error(`Cleanup item not found: ${options.item}`);
				}
			}
			writeJSON("cleanup-queue.json", state);
			break;
		}

		default:
			throw new Error(`Unknown phase: ${options.phase}`);
	}
}
