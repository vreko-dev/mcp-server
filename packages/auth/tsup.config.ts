import { clientLibraryPreset } from "../../tooling/tsup-config";

// Client library with multiple entry points
// Uses clientLibraryPreset to preserve "use client" directive in client.ts
// DTS disabled due to complex Session export issues
export default clientLibraryPreset({
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
