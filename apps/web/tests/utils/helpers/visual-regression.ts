import { expect, type Page } from "@playwright/test";

// Take screenshot and compare with baseline
export async function compareScreenshot(
	page: Page,
	name: string,
	options: {
		fullPage?: boolean;
		threshold?: number;
		animations?: "disabled" | "allow";
		mask?: Array<{ selector: string }>;
	} = {},
): Promise<void> {
	const screenshotOptions = {
		fullPage: options.fullPage ?? false,
		threshold: options.threshold ?? 0.1,
		animations: options.animations ?? "disabled",
		mask: options.mask?.map((mask) => page.locator(mask.selector)) || [],
	};

	await expect(page).toHaveScreenshot(`${name}.png`, screenshotOptions);
}

// Take screenshot of specific element
export async function compareElementScreenshot(
	page: Page,
	elementSelector: string,
	name: string,
	options: {
		threshold?: number;
		animations?: "disabled" | "allow";
		mask?: Array<{ selector: string }>;
	} = {},
): Promise<void> {
	const element = page.locator(elementSelector);
	const screenshotOptions = {
		threshold: options.threshold ?? 0.1,
		animations: options.animations ?? "disabled",
		mask: options.mask?.map((mask) => page.locator(mask.selector)) || [],
	};

	await expect(element).toHaveScreenshot(`${name}.png`, screenshotOptions);
}

// Take screenshot with different viewport sizes for responsive testing
export async function compareResponsiveScreenshots(
	page: Page,
	name: string,
	viewports: Array<{ width: number; height: number; name: string }>,
): Promise<void> {
	for (const viewport of viewports) {
		await page.setViewportSize({
			width: viewport.width,
			height: viewport.height,
		});
		await page.waitForLoadState("networkidle");

		await expect(page).toHaveScreenshot(`${name}-${viewport.name}.png`, {
			fullPage: true,
			threshold: 0.1,
			animations: "disabled",
		});
	}
}

// Mask dynamic content before taking screenshot
export async function maskDynamicContent(
	_page: Page,
	selectors: string[],
): Promise<void> {
	// This function would typically be used in conjunction with screenshot comparison
	// The masking is handled in the toHaveScreenshot options
	console.log(
		`Masking dynamic content with selectors: ${selectors.join(", ")}`,
	);
}

// Wait for animations to complete before taking screenshot
export async function waitForAnimations(
	page: Page,
	timeout = 1000,
): Promise<void> {
	// Wait for common animation durations
	await page.waitForTimeout(timeout);

	// Wait for CSS animations to complete
	await page.evaluate(() => {
		return new Promise((resolve) => {
			const animations = document.getAnimations();
			if (animations.length === 0) {
				resolve(null);
				return;
			}

			Promise.all(animations.map((anim) => anim.finished)).then(() =>
				resolve(null),
			);
		});
	});
}
