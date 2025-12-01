import os from "node:os";
import chokidar from "chokidar";

// import { snapbackDefaults } from '@snapback/config';
// Using hardcoded values for now to avoid import issues
const snapbackDefaults = {
	watcher: {
		debounceMs: 120,
		awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
		ignored: ["**/{node_modules,.git,.vscode,dist,.next,.nuxt,coverage}/**"],
	},
} as const;

export function makeWatcher(root: string) {
	const _isMac = os.platform() === "darwin";

	return chokidar.watch(root, {
		ignoreInitial: true,
		ignored: [...snapbackDefaults.watcher.ignored],
		awaitWriteFinish: snapbackDefaults.watcher.awaitWriteFinish,
		// useFsEvents: isMac, // This option might not be available in the current version
		ignorePermissionErrors: true,
		depth: 10,
	});
}
