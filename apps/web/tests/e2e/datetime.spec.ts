import { expect } from "@playwright/test";
import { test } from "../utils/fixtures/auth";
import {
	expectDateDisplayed,
	fillDateInput,
	getDateInFuture,
	getDateInPast,
} from "../utils/helpers/datetime";

test.describe("Date and Time Functionality", () => {
	test("can select future date for scheduling", async ({
		authenticatedPage,
	}) => {
		// Navigate to scheduling page
		await authenticatedPage.goto("/app/schedule");

		// Get a date 7 days in the future
		const futureDate = getDateInFuture(7);

		// Fill the date input
		await fillDateInput(authenticatedPage, "#schedule-date", futureDate);

		// Submit the form
		await authenticatedPage.click("[data-testid='schedule-button']");

		// Verify the date is displayed correctly
		await expectDateDisplayed(
			authenticatedPage,
			"[data-testid='scheduled-date-display']",
			futureDate,
		);
	});

	test("can select past date for reporting", async ({ authenticatedPage }) => {
		// Navigate to reports page
		await authenticatedPage.goto("/app/reports");

		// Get a date 30 days in the past
		const pastDate = getDateInPast(30);

		// Fill the date input
		await fillDateInput(authenticatedPage, "#report-start-date", pastDate);

		// Fill end date as today
		const today = new Date();
		await fillDateInput(authenticatedPage, "#report-end-date", today);

		// Generate report
		await authenticatedPage.click("[data-testid='generate-report']");

		// Verify the dates are displayed correctly
		await expectDateDisplayed(
			authenticatedPage,
			"[data-testid='report-start-date-display']",
			pastDate,
		);

		await expectDateDisplayed(
			authenticatedPage,
			"[data-testid='report-end-date-display']",
			today,
		);
	});

	test("shows validation error for invalid date range", async ({
		authenticatedPage,
	}) => {
		// Navigate to reports page
		await authenticatedPage.goto("/app/reports");

		// Fill start date as tomorrow
		const tomorrow = getDateInFuture(1);
		await fillDateInput(authenticatedPage, "#report-start-date", tomorrow);

		// Fill end date as today (before start date)
		const today = new Date();
		await fillDateInput(authenticatedPage, "#report-end-date", today);

		// Try to generate report
		await authenticatedPage.click("[data-testid='generate-report']");

		// Check for validation error
		await expect(
			authenticatedPage.getByTestId("date-range-error"),
		).toBeVisible();
		await expect(
			authenticatedPage.getByText("End date must be after start date"),
		).toBeVisible();
	});

	test("formats dates correctly for different locales", async ({
		authenticatedPage,
	}) => {
		// Navigate to settings page
		await authenticatedPage.goto("/app/settings");

		// Get a specific date
		const testDate = new Date(2023, 5, 15); // June 15, 2023

		// Fill a date input
		await fillDateInput(authenticatedPage, "#profile-birthday", testDate);

		// Save settings
		await authenticatedPage.click("[data-testid='save-settings']");

		// Verify the date is displayed correctly
		await expectDateDisplayed(
			authenticatedPage,
			"[data-testid='birthday-display']",
			testDate,
			"long",
		);
	});
});
