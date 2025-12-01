import type { Page } from "@playwright/test";

// Check if page has no accessibility violations
export async function checkAccessibility(page: Page): Promise<void> {
	// This would typically integrate with an accessibility testing library
	// For now, we'll just check for basic accessibility issues

	// Check for images without alt text
	const imagesWithoutAlt = await page.locator("img:not([alt])").count();
	if (imagesWithoutAlt > 0) {
		console.warn(`Found ${imagesWithoutAlt} images without alt attributes`);
	}

	// Check for links without discernible text
	const linksWithoutText = await page
		.locator("a:empty, a:not(:has-text(*))")
		.count();
	if (linksWithoutText > 0) {
		console.warn(`Found ${linksWithoutText} links without discernible text`);
	}

	// Check for buttons without discernible text
	const buttonsWithoutText = await page
		.locator("button:empty, button:not(:has-text(*))")
		.count();
	if (buttonsWithoutText > 0) {
		console.warn(`Found ${buttonsWithoutText} buttons without discernible text`);
	}
}

// Check color contrast for accessibility
export async function checkColorContrast(_page: Page): Promise<void> {
	// This would typically integrate with a color contrast checking library
	// For now, we'll just log that this check should be performed
	console.log(
		"Color contrast check should be performed with axe or similar tool",
	);
}

// Check for proper heading structure
export async function checkHeadingStructure(page: Page): Promise<void> {
	// Get all headings in order
	const headings = await page.locator("h1, h2, h3, h4, h5, h6").all();

	let lastLevel = 0;
	for (const heading of headings) {
		const tagName = await heading.evaluate((el: any) => el.tagName);
		const level = Number.parseInt(tagName.charAt(1), 10);

		// Check for improper heading level jumps (e.g., h1 -> h3)
		if (lastLevel > 0 && level - lastLevel > 1) {
			console.warn(
				`Potential heading structure issue: ${tagName} follows h${lastLevel}`,
			);
		}

		lastLevel = level;
	}
}
