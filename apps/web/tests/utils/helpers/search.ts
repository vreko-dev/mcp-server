import { expect, type Page } from "@playwright/test";

// Fill search input and wait for results
export async function performSearch(
	page: Page,
	searchInputSelector: string,
	searchTerm: string,
	resultsSelector: string,
): Promise<void> {
	// Fill the search input
	await page.fill(searchInputSelector, searchTerm);

	// Wait for search results to load
	await page.waitForSelector(resultsSelector);
}

// Assert search results count
export async function expectSearchResultsCount(
	page: Page,
	resultsSelector: string,
	expectedCount: number,
): Promise<void> {
	const resultsCount = await page.locator(resultsSelector).count();
	expect(resultsCount).toBe(expectedCount);
}

// Assert search results contain specific text
export async function expectSearchResultsContain(
	page: Page,
	resultsSelector: string,
	expectedText: string,
): Promise<void> {
	const results = page.locator(resultsSelector);
	const count = await results.count();

	let found = false;
	for (let i = 0; i < count; i++) {
		const text = await results.nth(i).textContent();
		if (text?.includes(expectedText)) {
			found = true;
			break;
		}
	}

	if (!found) {
		throw new Error(
			`Expected to find text "${expectedText}" in search results`,
		);
	}
}

// Assert search results do not contain specific text
export async function expectSearchResultsNotContain(
	page: Page,
	resultsSelector: string,
	unexpectedText: string,
): Promise<void> {
	const results = page.locator(resultsSelector);
	const count = await results.count();

	for (let i = 0; i < count; i++) {
		const text = await results.nth(i).textContent();
		if (text?.includes(unexpectedText)) {
			throw new Error(
				`Did not expect to find text "${unexpectedText}" in search results`,
			);
		}
	}
}

// Clear search input
export async function clearSearch(
	page: Page,
	searchInputSelector: string,
): Promise<void> {
	await page.fill(searchInputSelector, "");
}

// Test search with no results
export async function expectNoSearchResults(
	page: Page,
	searchInputSelector: string,
	searchTerm: string,
	noResultsSelector: string,
): Promise<void> {
	// Perform search
	await performSearch(page, searchInputSelector, searchTerm, noResultsSelector);

	// Verify no results message is displayed
	await expect(page.locator(noResultsSelector)).toBeVisible();
}

// Test search suggestions
export async function expectSearchSuggestions(
	page: Page,
	searchInputSelector: string,
	searchTerm: string,
	suggestionsSelector: string,
): Promise<void> {
	// Fill the search input
	await page.fill(searchInputSelector, searchTerm);

	// Wait for suggestions to appear
	await page.waitForSelector(suggestionsSelector);

	// Verify suggestions are visible
	await expect(page.locator(suggestionsSelector)).toBeVisible();
}

// Select search suggestion
export async function selectSearchSuggestion(
	page: Page,
	suggestionsSelector: string,
	suggestionIndex: number,
): Promise<void> {
	await page.click(`${suggestionsSelector} >> nth=${suggestionIndex}`);
}

// Test search pagination
export async function testSearchPagination(
	page: Page,
	searchInputSelector: string,
	searchTerm: string,
	resultsSelector: string,
	paginationSelector: string,
	expectedPages: number,
): Promise<void> {
	// Perform search
	await performSearch(page, searchInputSelector, searchTerm, resultsSelector);

	// Check pagination
	const pageCount = await page.locator(`${paginationSelector} .page`).count();
	expect(pageCount).toBe(expectedPages);
}

// Test search filters
export async function applySearchFilter(
	page: Page,
	filterSelector: string,
	filterValue: string,
): Promise<void> {
	await page.selectOption(filterSelector, filterValue);
}

// Test search sorting
export async function applySearchSorting(
	page: Page,
	sortSelector: string,
	sortValue: string,
): Promise<void> {
	await page.selectOption(sortSelector, sortValue);
}
