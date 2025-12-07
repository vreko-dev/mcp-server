// e2e/utils/vscode-settings.ts
import * as fs from "fs";
import * as path from "path";

/**
 * Path to the test workspace settings.
 * Adjust the relative path if your monorepo structure shifts.
 */
const SETTINGS_PATH = path.resolve(__dirname, "../../apps/vscode/test-workspace/.vscode/settings.json");

/**
 * Toggles the 'snapback.testMode' setting OFF and then ON.
 * This forces the 'onDidChangeConfiguration' event to fire in the extension.
 */
export async function forceTestModeToggle(): Promise<void> {
	// Ensure directory exists
	const settingsDir = path.dirname(SETTINGS_PATH);
	if (!fs.existsSync(settingsDir)) {
		fs.mkdirSync(settingsDir, { recursive: true });
	}

	let settings: Record<string, unknown> = {};
	if (fs.existsSync(SETTINGS_PATH)) {
		const content = fs.readFileSync(SETTINGS_PATH, "utf-8");
		settings = JSON.parse(content);
	}

	// 1. Force OFF
	settings["snapback.testMode"] = false;
	fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));

	// Wait briefly for the file watcher to catch the 'false' state
	await new Promise((resolve) => setTimeout(resolve, 1000));

	// 2. Force ON
	settings["snapback.testMode"] = true;
	fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));

	console.log("🔄 Toggled snapback.testMode to trigger extension listener.");
}

/**
 * Ensures test mode is enabled in settings.
 */
export function ensureTestModeEnabled(): void {
	const settingsDir = path.dirname(SETTINGS_PATH);
	if (!fs.existsSync(settingsDir)) {
		fs.mkdirSync(settingsDir, { recursive: true });
	}

	let settings: Record<string, unknown> = {};
	if (fs.existsSync(SETTINGS_PATH)) {
		const content = fs.readFileSync(SETTINGS_PATH, "utf-8");
		settings = JSON.parse(content);
	}

	settings["snapback.testMode"] = true;
	fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

/**
 * Cleans up test mode setting after tests.
 */
export function disableTestMode(): void {
	if (!fs.existsSync(SETTINGS_PATH)) return;

	const content = fs.readFileSync(SETTINGS_PATH, "utf-8");
	const settings = JSON.parse(content);
	delete settings["snapback.testMode"];
	fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}
