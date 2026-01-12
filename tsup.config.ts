import { bundledServerAppPreset } from "../../tooling/tsup-config";

export default bundledServerAppPreset({
	esbuildOptions(options) {
		options.banner = {
			js: "// SnapBack MCP Server - Bundled for Fly.io deployment",
		};
	},
});
