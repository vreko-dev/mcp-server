/**
 * E2E Tests - Documentation Search
 * Tests documentation search functionality and navigation
 */

import { expect, test } from "@playwright/test";

test.describe("Documentation Search", () => {
	test.describe("Search Functionality (Cmd+K)", () => {
		test("user can open search with Cmd+K shortcut", async ({ page }) => {
			await page.goto("http://docs.snapback.dev");

			// Press Cmd+K (or Ctrl+K on Windows/Linux)
			if (process.platform === "darwin") {
				await page.keyboard.press("Meta+K");
			} else {
				await page.keyboard.press("Control+K");
			}

			// Search modal should appear
			await expect(page.locator('[data-testid="search-modal"]')).toBeVisible();
			await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
		});

		test("user can type search query and see results", async ({ page }) => {
			await page.goto("http://docs.snapback.dev");

			// Open search
			if (process.platform === "darwin") {
				await page.keyboard.press("Meta+K");
			} else {
				await page.keyboard.press("Control+K");
			}

			// Type search query
			await page.locator('[data-testid="search-input"]').fill("authentication");

			// Should show search results
			await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

			// Results should contain items
			const resultItems = page.locator('[data-testid="search-result-item"]');
			const count = await resultItems.count();
			expect(count).toBeGreaterThan(0);
		});

		test("search shows no results for non-existent terms", async ({ page }) => {
			await page.goto("http://docs.snapback.dev");

			// Open search
			if (process.platform === "darwin") {
				await page.keyboard.press("Meta+K");
			} else {
				await page.keyboard.press("Control+K");
			}

			// Type non-existent search query
			await page.locator('[data-testid="search-input"]').fill("nonexistentterm12345");

			// Should show no results message
			await expect(page.locator('[data-testid="no-results"]')).toBeVisible();
			await expect(page.locator('[data-testid="no-results"]')).toContainText("No results found");
		});

		test("search filters results by category", async ({ page }) => {
			await page.goto("http://docs.snapback.dev");

			// Open search
			if (process.platform === "darwin") {
				await page.keyboard.press("Meta+K");
			} else {
				await page.keyboard.press("Control+K");
			}

			// Type search query
			await page.locator('[data-testid="search-input"]').fill("api");

			// Should show category filters
			await expect(page.locator('[data-testid="category-filters"]')).toBeVisible();

			// Click on a category filter
			await page.locator('[data-testid="category-filter-api"]').click();

			// All results should be related to API
			const resultItems = page.locator('[data-testid="search-result-item"]');
			const count = await resultItems.count();

			for (let i = 0; i < Math.min(count, 3); i++) {
				const itemText = await resultItems.nth(i).textContent();
				expect(itemText?.toLowerCase()).toContain("api");
			}
		});
	});

	test.describe("Search Results Display", () => {
		test("search results show proper metadata", async ({ page }) => {
			await page.goto("http://docs.snapback.dev");

			// Open search
			if (process.platform === "darwin") {
				await page.keyboard.press("Meta+K");
			} else {
				await page.keyboard.press("Control+K");
			}

			// Type search query
			await page.locator('[data-testid="search-input"]').fill("getting started");

			// Check that results show proper metadata
			const firstResult = page.locator('[data-testid="search-result-item"]').first();
			await expect(firstResult).toBeVisible();

			// Should have title
			await expect(firstResult.locator('[data-testid="result-title"]')).toBeVisible();

			// Should have snippet/preview
			await expect(firstResult.locator('[data-testid="result-snippet"]')).toBeVisible();

			// Should have category/tag
			await expect(firstResult.locator('[data-testid="result-category"]')).toBeVisible();
		});

		test("search results are properly ranked", async ({ page }) => {
			await page.goto("http://docs.snapback.dev");

			// Open search
			if (process.platform === "darwin") {
				await page.keyboard.press("Meta+K");
			} else {
				await page.keyboard.press("Control+K");
			}

			// Type search query
			await page.locator('[data-testid="search-input"]').fill("authentication");

			// Get first few results
			const resultItems = page.locator('[data-testid="search-result-item"]');
			const count = await resultItems.count();

			// Verify that results are relevant (this is a basic check)
			// In a real implementation, we would check the ranking algorithm
			expect(count).toBeGreaterThan(0);

			// First result should be most relevant
			const firstResultTitle = await resultItems.first().locator('[data-testid="result-title"]').textContent();
			expect(firstResultTitle?.toLowerCase()).toContain("authentication");
		});

		test("search results highlight search terms", async ({ page }) => {
			await page.goto("http://docs.snapback.dev");

			// Open search
			if (process.platform === "darwin") {
				await page.keyboard.press("Meta+K");
			} else {
				await page.keyboard.press("Control+K");
			}

			// Type search query
			const searchTerm = "snapshot";
			await page.locator('[data-testid="search-input"]').fill(searchTerm);

			// Check that search terms are highlighted in results
			const firstResultSnippet = page
				.locator('[data-testid="search-result-item"]')
				.first()
				.locator('[data-testid="result-snippet"]');

			await expect(firstResultSnippet).toBeVisible();

			// Check for highlighted terms (usually wrapped in <mark> or similar)
			const highlightedTerms = firstResultSnippet.locator("mark, [data-highlight]");
			const highlightCount = await highlightedTerms.count();

			expect(highlightCount).toBeGreaterThan(0);
		});
	});

	test.describe("Navigate to Search Result", () => {
		test("user can click search result to navigate to page", async ({ page }) => {
			await page.goto("http://docs.snapback.dev");

			// Open search
			if (process.platform === "darwin") {
				await page.keyboard.press("Meta+K");
			} else {
				await page.keyboard.press("Control+K");
			}

			// Type search query
			await page.locator('[data-testid="search-input"]').fill("installation");

			// Click first result
			const firstResult = page.locator('[data-testid="search-result-item"]').first();
			const expectedUrl = await firstResult.getAttribute("href");

			await firstResult.click();

			// Should navigate to the result page
			await page.waitForURL(expectedUrl || "**");

			// Page should have loaded
			await expect(page).not.toHaveURL("http://docs.snapback.dev");
		});

		test("navigation preserves search context", async ({ page }) => {
			await page.goto("http://docs.snapback.dev");

			// Open search
			if (process.platform === "darwin") {
				await page.keyboard.press("Meta+K");
			} else {
				await page.keyboard.press("Control+K");
			}

			// Type search query
			await page.locator('[data-testid="search-input"]').fill("configuration");

			// Click first result
			await page.locator('[data-testid="search-result-item"]').first().click();

			// Page should have loaded
			await page.waitForLoadState("networkidle");

			// Page content should be related to search term
			const pageContent = await page.textContent("body");
			expect(pageContent?.toLowerCase()).toContain("configuration");
		});

		test("user can navigate back to search results", async ({ page }) => {
			await page.goto("http://docs.snapback.dev");

			// Open search
			if (process.platform === "darwin") {
				await page.keyboard.press("Meta+K");
			} else {
				await page.keyboard.press("Control+K");
			}

			// Type search query
			await page.locator('[data-testid="search-input"]').fill("api");

			// Store initial search results count
			const initialResultCount = await page.locator('[data-testid="search-result-item"]').count();

			// Click first result
			await page.locator('[data-testid="search-result-item"]').first().click();

			// Navigate back
			await page.goBack();

			// Should be back on docs page with search still open
			await expect(page.locator('[data-testid="search-modal"]')).toBeVisible();

			// Search results should still be visible
			const currentResultCount = await page.locator('[data-testid="search-result-item"]').count();
			expect(currentResultCount).toBe(initialResultCount);
		});
	});

	test.describe("Docs Navigation", () => {
		test("sidebar navigation works correctly", async ({ page }) => {
			await page.goto("http://docs.snapback.dev");

			// Click on a sidebar item
			await page.locator('[data-testid="sidebar-item-getting-started"]').click();

			// Should navigate to the correct page
			await expect(page).toHaveURL(/.*getting-started/);

			// Page content should be visible
			await expect(page.locator("h1")).toBeVisible();
		});

		test("breadcrumb navigation works", async ({ page }) => {
			await page.goto("http://docs.snapback.dev/getting-started/installation");

			// Click on breadcrumb
			await page.locator('[data-testid="breadcrumb-item-getting-started"]').click();

			// Should navigate to parent page
			await expect(page).toHaveURL(/.*getting-started/);
		});

		test("table of contents navigation works", async ({ page }) => {
			await page.goto("http://docs.snapback.dev/guides/authentication");

			// Click on a TOC link
			await page.locator('[data-testid="toc-link-api-keys"]').click();

			// Should scroll to the correct section
			const apiKeysSection = page.locator('[data-testid="section-api-keys"]');
			await expect(apiKeysSection).toBeVisible();

			// Section should be in viewport
			await expect(apiKeysSection).toBeInViewport();
		});

		test("next/previous page navigation works", async ({ page }) => {
			await page.goto("http://docs.snapback.dev/getting-started/installation");

			// Click next page button
			await page.locator('[data-testid="next-page-button"]').click();

			// Should navigate to next page
			await expect(page).not.toHaveURL(/.*installation/);

			// Click previous page button
			await page.locator('[data-testid="prev-page-button"]').click();

			// Should navigate back to installation page
			await expect(page).toHaveURL(/.*installation/);
		});
	});
});
