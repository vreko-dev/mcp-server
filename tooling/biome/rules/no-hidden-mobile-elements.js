/**
 * Custom Biome lint rule to prevent hidden mobile elements
 * Detects elements that might be hidden on mobile due to opacity/transform issues
 */

module.exports = {
	name: "no-hidden-mobile-elements",
	category: "Possible Issues",
	description: "Prevent elements from being hidden on mobile due to opacity/transform issues",
	examples: {
		incorrect: [
			`<div style="opacity: 0; transform: rotate(-90deg);">
        <svg>...</svg>
      </div>`,
		],
		correct: [
			`<button>
        <svg>...</svg>
      </button>`,
		],
	},
	create(context) {
		return {
			JSXElement(node) {
				// Check for div wrappers with opacity/transform styles around SVG elements
				if (node.openingElement.name.name === "div") {
					const styleAttr = node.openingElement.attributes.find(
						(attr) => attr.name && attr.name.name === "style",
					);

					if (styleAttr?.value) {
						const styleText = context.getSourceCode().getText(styleAttr.value);

						// Check for problematic opacity/transform patterns
						if (
							(styleText.includes("opacity: 0") || styleText.includes("opacity:0")) &&
							styleText.includes("transform:") &&
							styleText.includes("rotate")
						) {
							context.report({
								node,
								message:
									"Element may be hidden on mobile due to opacity/transform issues. Consider simplifying the component structure.",
							});
						}
					}
				}
			},
		};
	},
};
