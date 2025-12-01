// biome lint rule to prevent direct version numbers in package.json dependencies
// All dependencies should use "catalog:" unless explicitly pinned for a reason

/**
 * @typedef {import("@biomejs/biome").RuleModule} RuleModule
 */

/**
 * @type {RuleModule}
 */
module.exports = {
	name: "no-direct-package-versions",
	category: "lint",
	recommended: true,
	description: "Prevent direct version numbers in package.json dependencies. Use 'catalog:' instead.",
	examples: [
		{
			description: "Invalid: Direct version number",
			code: `"@biomejs/biome": "^2.2.4"`,
			errors: [
				{
					message: "Use 'catalog:' instead of direct version numbers in package.json dependencies",
				},
			],
		},
		{
			description: "Valid: Using catalog reference",
			code: `"@biomejs/biome": "catalog:"`,
			errors: [],
		},
		{
			description: "Valid: Using workspace protocol",
			code: `"@snapback/core": "workspace:*"`,
			errors: [],
		},
	],
	entry: (node, context) => {
		// Only check package.json files
		if (!context.filename.endsWith("package.json")) {
			return;
		}

		// Check dependencies and devDependencies objects
		if (
			(node.type === "ObjectProperty" &&
				(node.key.value === "dependencies" || node.key.value === "devDependencies")) ||
			(node.type === "ObjectProperty" &&
				node.parent &&
				(node.parent.parent?.key?.value === "dependencies" ||
					node.parent.parent?.key?.value === "devDependencies"))
		) {
			// Check if the value is a string that looks like a version number
			if (node.value?.type === "StringLiteral") {
				const version = node.value.value;

				// Allow workspace protocol, catalog references, and local file references
				if (
					version.startsWith("workspace:") ||
					version === "catalog:" ||
					version.startsWith("file:") ||
					version.startsWith("link:")
				) {
					return;
				}

				// Check if it looks like a version number (contains numbers and dots, or starts with ^/~)
				if (
					/^[\^~]?(\d+\.)*\d+/.test(version) ||
					/^\d+\.\d+\.\d+/.test(version) ||
					version.includes("beta") ||
					version.includes("alpha") ||
					version.includes("rc")
				) {
					context.report({
						node,
						message: `Use 'catalog:' instead of direct version numbers in package.json dependencies. Found: ${version}`,
					});
				}
			}
		}
	},
};
