import { browserLibraryPreset } from "../../tooling/tsup-config";

// Browser library with multiple entry points
// DTS disabled due to complex Session export issues
export default browserLibraryPreset({
	entry: [
		"src/index.ts",
		"src/client.ts",
		"src/auth.ts",
		"src/lib/audit.ts",
		"src/lib/helper.ts",
		"src/lib/organization.ts",
	],
	dts: false, // DTS disabled - complex internal structure with Session export issues
});
