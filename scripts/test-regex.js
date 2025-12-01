const fs = require("node:fs");
const path = require("node:path");

// Test the regex pattern
const testContent = `export * from "./ai-detection";
export * from "./circuit-breaker";
export * from "./dependency-analyzer";`;

const importPattern = /(import\s+.*?from\s+["'])(\.[^"']*?)(["'])/g;
const exportPattern = /(export\s+\* from\s+["'])(\.[^"']*?)(["'])/g;

console.log("Testing import pattern:");
let match;
match = importPattern.exec(testContent);
while (match !== null) {
	console.log("Import match:", match);
	match = importPattern.exec(testContent);
}

console.log("\nTesting export pattern:");
match = exportPattern.exec(testContent);
while (match !== null) {
	console.log("Export match:", match);
	match = exportPattern.exec(testContent);
}

// Test on a real file
const filePath = path.resolve(__dirname, "../packages/core/src/index.ts");
const content = fs.readFileSync(filePath, "utf8");

console.log("\nTesting on real file:");
let found = false;
let exportMatch;
exportMatch = exportPattern.exec(content);
while (exportMatch !== null) {
	console.log("Real file export match:", exportMatch[2]);
	found = true;
	exportMatch = exportPattern.exec(content);
}

if (!found) {
	console.log("No matches found in real file");
}
