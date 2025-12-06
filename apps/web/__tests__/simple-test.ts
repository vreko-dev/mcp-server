import { matchResource, R } from "../lib/resource";

// Simple test to verify the resource pattern is working
const resource = R.ready("test");
const result = matchResource(resource, {
	loading: () => "loading",
	empty: () => "empty",
	error: () => "error",
	ready: (data) => `ready: ${data}`,
});

console.log(result); // Should output: "ready: test"
