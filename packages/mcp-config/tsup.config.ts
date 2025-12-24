import { serverLibraryPreset } from "../../tooling/tsup-config";

// Node.js library for AI client detection and MCP configuration
// Used by CLI and VS Code extension
export default serverLibraryPreset({
	entry: ["src/index.ts"],
});
