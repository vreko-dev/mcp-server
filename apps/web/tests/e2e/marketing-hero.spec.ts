import { expect, test } from "@playwright/test";

test.describe("Marketing Hero Section", () => {
	test("should display hero section with video background", async ({
		page,
	}) => {
		// Navigate to the home page
		await page.goto("/");

		// Check for video element
		const video = page.locator("video");
		await expect(video).toBeVisible();
		await expect(video).toHaveAttribute("autoplay", "");
		await expect(video).toHaveAttribute("loop", "");
		await expect(video).toHaveAttribute("muted", "");
		await expect(video).toHaveAttribute("playsinline", "");

		// Check for video sources
		await expect(video.locator('source[type="video/webm"]')).toHaveAttribute(
			"src",
			"/assets/SnapBack-Hero.webm",
		);
		await expect(video.locator('source[type="video/mp4"]')).toHaveAttribute(
			"src",
			"/assets/SnapBack-Hero.mp4",
		);
	});

	test("should display correct headline and CTA", async ({ page }) => {
		await page.goto("/");

		// Check headline
		await expect(page.getByText("AI broke production.")).toBeVisible();
		await expect(page.getByText("SnapBack fixed it in 0.8s.")).toBeVisible();

		// Check CTA
		const cta = page.getByRole("link", {
			name: "Install for VS Code — Free Forever",
		});
		await expect(cta).toBeVisible();
		await expect(cta).toHaveAttribute("href", "/install"); // Assuming this is the link from config
	});

	test("should display trust signals", async ({ page }) => {
		await page.goto("/");

		await expect(page.getByText("Local-first")).toBeVisible();
		await expect(page.getByText("2,847 devs protected")).toBeVisible();
		await expect(page.getByText("4.5k GitHub")).toBeVisible();
		await expect(page.getByText("YC W25")).toBeVisible();
	});

	test("should have scroll indicator", async ({ page }) => {
		await page.goto("/");

		// Check for scroll indicator (svg)
		const scrollIndicator = page.locator(".animate-bounce svg");
		await expect(scrollIndicator).toBeVisible();
	});
});
