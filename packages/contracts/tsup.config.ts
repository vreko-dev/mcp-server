import { browserLibraryPreset } from "../../tooling/tsup-config";

// Browser library with external server packages marked
// Prevents bundling of @snapback/infrastructure in client bundles
export default browserLibraryPreset();
