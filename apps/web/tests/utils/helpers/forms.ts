import { expect, type Page } from "@playwright/test";

// Fill form fields
export async function fillForm(
	page: Page,
	formData: Record<string, string>,
): Promise<void> {
	for (const [fieldName, value] of Object.entries(formData)) {
		await page.getByLabel(fieldName).fill(value);
	}
}

// Submit form
export async function submitForm(
	page: Page,
	submitButtonSelector: string,
): Promise<void> {
	await page.click(submitButtonSelector);
}

// Check form validation errors
export async function expectFormErrors(
	page: Page,
	errors: Record<string, string>,
): Promise<void> {
	for (const [fieldName, errorMessage] of Object.entries(errors)) {
		const errorElement = page.getByTestId(`error-${fieldName}`);
		await expect(errorElement).toBeVisible();
		await expect(errorElement).toContainText(errorMessage);
	}
}

// Check that form has no validation errors
export async function expectNoFormErrors(
	page: Page,
	fieldNames: string[],
): Promise<void> {
	for (const fieldName of fieldNames) {
		const errorElement = page.getByTestId(`error-${fieldName}`);
		await expect(errorElement).not.toBeVisible();
	}
}

// Fill and submit form with validation
export async function fillAndSubmitForm(
	page: Page,
	formData: Record<string, string>,
	submitButtonSelector: string,
): Promise<void> {
	await fillForm(page, formData);
	await submitForm(page, submitButtonSelector);
}

// Test form field validation
export async function testFormFieldValidation(
	page: Page,
	fieldName: string,
	invalidValue: string,
	expectedError: string,
): Promise<void> {
	// Fill field with invalid value
	await page.getByLabel(fieldName).fill(invalidValue);

	// Trigger validation (blur or submit)
	await page.getByLabel(fieldName).blur();

	// Check for error message
	const errorElement = page.getByTestId(`error-${fieldName}`);
	await expect(errorElement).toBeVisible();
	await expect(errorElement).toContainText(expectedError);
}

// Test required field validation
export async function testRequiredField(
	page: Page,
	fieldName: string,
): Promise<void> {
	// Focus and blur the field to trigger validation
	await page.getByLabel(fieldName).focus();
	await page.getByLabel(fieldName).blur();

	// Check for required error message
	const errorElement = page.getByTestId(`error-${fieldName}`);
	await expect(errorElement).toBeVisible();
	await expect(errorElement).toContainText("This field is required");
}

// Test form submission with valid data
export async function submitValidForm(
	page: Page,
	formData: Record<string, string>,
	submitButtonSelector: string,
	successSelector: string,
): Promise<void> {
	// Fill form with valid data
	await fillForm(page, formData);

	// Submit form
	await submitForm(page, submitButtonSelector);

	// Wait for success indicator
	await page.waitForSelector(successSelector);

	// Verify success
	await expect(page.locator(successSelector)).toBeVisible();
}
