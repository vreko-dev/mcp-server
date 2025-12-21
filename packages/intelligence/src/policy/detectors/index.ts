/**
 * Detector exports
 */

export { type MockDetectionResult, MockDetector, type MockFinding } from "./MockDetector.js";
export {
	PhantomDependencyDetector,
	type PhantomDependencyFinding,
	type PhantomDependencyResult,
} from "./PhantomDependencyDetector.js";
export { type SecretDetectionResult, SecretDetector, type SecretFinding } from "./SecretDetector.js";
