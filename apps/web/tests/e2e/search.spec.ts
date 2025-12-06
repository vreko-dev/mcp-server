import { expect } from "@playwright/test";
import { test } from "../utils/fixtures/auth";
import {
	clearSearch,
	expectNoSearchResults,
	expectSearchResultsContain,
	expectSearchResultsCount,
	expectSearchSuggestions,
	performSearch,
	selectSearchSuggestion,
} from "../utils/helpers/search";

test.describe("Search Functionality", () => {
	test("can search for API keys", async ({ authenticatedPage }) => {
		// Navigate to API keys page
		await authenticatedPage.goto("/app/api-keys");

		// Perform search
		await performSearch(
			authenticatedPage,
			"#api-key-search",
			"production",
			"[data-testid='api-key-list-item']",
		);

		// Verify search results
		await expectSearchResultsCount(
			authenticatedPage,
			"[data-testid='api-key-list-item']",
			2,
		);
		await expectSearchResultsContain(
			authenticatedPage,
			"[data-testid='api-key-list-item']",
			"Production",
		);
	});

	test("shows no results for non-existent search term", async ({
		authenticatedPage,
	}) => {
		// Navigate to API keys page
		await authenticatedPage.goto("/app/api-keys");

		// Search for non-existent term
		await expectNoSearchResults(
			authenticatedPage,
			"#api-key-search",
			"nonexistentkey",
			"[data-testid='no-results-message']",
		);
	});

	test("can clear search and see all results", async ({
		authenticatedPage,
	}) => {
		// Navigate to API keys page
		await authenticatedPage.goto("/app/api-keys");

		// Perform search
		await performSearch(
			authenticatedPage,
			"#api-key-search",
			"test",
			"[data-testid='api-key-list-item']",
		);

		// Verify filtered results
		const filteredCount = await authenticatedPage
			.locator("[data-testid='api-key-list-item']")
			.count();

		// Clear search
		await clearSearch(authenticatedPage, "#api-key-search");

		// Wait for all results to load
		await authenticatedPage.waitForSelector(
			"[data-testid='api-key-list-item']",
		);

		// Verify all results are shown
		const allCount = await authenticatedPage
			.locator("[data-testid='api-key-list-item']")
			.count();
		expect(allCount).toBeGreaterThan(filteredCount);
	});

	test("shows search suggestions", async ({ authenticatedPage }) => {
		// Navigate to API keys page
		await authenticatedPage.goto("/app/api-keys");

		// Type to trigger suggestions
		await expectSearchSuggestions(
			authenticatedPage,
			"#api-key-search",
			"prod",
			"[data-testid='search-suggestions']",
		);

		// Select first suggestion
		await selectSearchSuggestion(
			authenticatedPage,
			"[data-testid='search-suggestions']",
			0,
		);

		// Verify search was performed with suggestion
		await expectSearchResultsContain(
			authenticatedPage,
			"[data-testid='api-key-list-item']",
			"Production",
		);
	});

	test("search is case insensitive", async ({ authenticatedPage }) => {
		// Navigate to API keys page
		await authenticatedPage.goto("/app/api-keys");

		// Search with uppercase
		await performSearch(
			authenticatedPage,
			"#api-key-search",
			"PRODUCTION",
			"[data-testid='api-key-list-item']",
		);

		// Verify results are found (case insensitive search)
		await expectSearchResultsCount(
			authenticatedPage,
			"[data-testid='api-key-list-item']",
			2,
		);
		await expectSearchResultsContain(
			authenticatedPage,
			"[data-testid='api-key-list-item']",
			"Production",
		);
	});

	test("can search with special characters", async ({ authenticatedPage }) => {
		// Navigate to API keys page
		await authenticatedPage.goto("/app/api-keys");

		// Search with special characters
		await performSearch(
			authenticatedPage,
			"#api-key-search",
			"test-key_123",
			"[data-testid='api-key-list-item']",
		);

		// Verify results
		await expectSearchResultsContain(
			authenticatedPage,
			"[data-testid='api-key-list-item']",
			"test-key_123",
		);
	});
});
