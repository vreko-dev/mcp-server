import { browserLibraryPreset } from "../../tooling/tsup-config";

// Browser library with custom entries
export default browserLibraryPreset({
	entry: ["src/index.ts", "src/subscription-config.ts", "src/utils/*.ts"],
});
