import type { Page } from "@playwright/test";

// Format date for input fields
export function formatDateForInput(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

// Format datetime for input fields
export function formatDateTimeForInput(date: Date): string {
	const datePart = formatDateForInput(date);
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	return `${datePart}T${hours}:${minutes}`;
}

// Get date in the future
export function getDateInFuture(days: number): Date {
	const futureDate = new Date();
	futureDate.setDate(futureDate.getDate() + days);
	return futureDate;
}

// Get date in the past
export function getDateInPast(days: number): Date {
	const pastDate = new Date();
	pastDate.setDate(pastDate.getDate() - days);
	return pastDate;
}

// Fill date input field
export async function fillDateInput(
	page: Page,
	selector: string,
	date: Date,
): Promise<void> {
	const formattedDate = formatDateForInput(date);
	await page.fill(selector, formattedDate);
}

// Fill datetime input field
export async function fillDateTimeInput(
	page: Page,
	selector: string,
	date: Date,
): Promise<void> {
	const formattedDateTime = formatDateTimeForInput(date);
	await page.fill(selector, formattedDateTime);
}

// Select date from date picker
export async function selectDateFromPicker(
	page: Page,
	datePickerSelector: string,
	date: Date,
): Promise<void> {
	// Click the date picker to open it
	await page.click(datePickerSelector);

	// Wait for the date picker to be visible
	await page.waitForSelector("[data-testid='date-picker']");

	// Navigate to the correct month/year if needed
	// const _targetMonth = date.getMonth(); // TODO: Re-enable when date picker month navigation is implemented
	// const _targetYear = date.getFullYear(); // TODO: Re-enable when date picker year navigation is implemented

	// This would depend on the specific date picker implementation
	// For now, we'll assume a simple approach

	// Click the target date
	const day = date.getDate();
	await page.click(`[data-testid='day-${day}']`);
}

// Assert date is displayed correctly
export async function expectDateDisplayed(
	page: Page,
	selector: string,
	expectedDate: Date,
	format: "short" | "long" | "relative" = "short",
): Promise<void> {
	const displayedText = await page.locator(selector).textContent();

	// Format the expected date based on the format option
	let expectedText: string;
	switch (format) {
		case "short":
			expectedText = expectedDate.toLocaleDateString();
			break;
		case "long":
			expectedText = expectedDate.toLocaleDateString(undefined, {
				weekday: "long",
				year: "numeric",
				month: "long",
				day: "numeric",
			});
			break;
		case "relative": {
			// Calculate relative time (e.g., "2 days ago")
			const now = new Date();
			const diffTime = Math.abs(now.getTime() - expectedDate.getTime());
			const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

			if (diffDays === 0) {
				expectedText = "Today";
			} else if (diffDays === 1) {
				expectedText = expectedDate > now ? "Tomorrow" : "Yesterday";
			} else {
				expectedText = `${diffDays} days ${
					expectedDate > now ? "from now" : "ago"
				}`;
			}
			break;
		}
		default:
			expectedText = expectedDate.toLocaleDateString();
	}

	// This is a simplified check - in practice, you might need more sophisticated matching
	// depending on how dates are formatted in your application
	if (!displayedText?.includes(expectedText)) {
		throw new Error(
			`Expected date "${expectedText}" not found in displayed text "${displayedText}"`,
		);
	}
}
