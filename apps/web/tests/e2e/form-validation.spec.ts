import { expect } from "@playwright/test";
import { test } from "../utils/fixtures/auth";
import {
	expectFormErrors,
	expectNoFormErrors,
	fillForm,
	submitForm,
	submitValidForm,
} from "../utils/helpers/forms";

test.describe("Form Validation", () => {
	test("shows validation errors for required fields", async ({
		authenticatedPage,
	}) => {
		// Navigate to form page
		await authenticatedPage.goto("/app/settings/profile");

		// Try to submit empty form
		await submitForm(authenticatedPage, "[data-testid='save-profile']");

		// Check for required field errors
		await expectRequiredField(authenticatedPage, "Name");
		await expectRequiredField(authenticatedPage, "Email");
	});

	test("shows validation errors for invalid email", async ({
		authenticatedPage,
	}) => {
		// Navigate to form page
		await authenticatedPage.goto("/app/settings/profile");

		// Fill form with invalid email
		await fillForm(authenticatedPage, {
			Name: "Test User",
			Email: "invalid-email",
		});

		// Submit form
		await submitForm(authenticatedPage, "[data-testid='save-profile']");

		// Check for email validation error
		await expectFormErrors(authenticatedPage, {
			Email: "Please enter a valid email address",
		});
	});

	test("shows no errors for valid form data", async ({ authenticatedPage }) => {
		// Navigate to form page
		await authenticatedPage.goto("/app/settings/profile");

		// Fill form with valid data
		await fillForm(authenticatedPage, {
			Name: "Test User",
			Email: "test@example.com",
		});

		// Check that no validation errors are present
		await expectNoFormErrors(authenticatedPage, ["Name", "Email"]);
	});

	test("successfully submits valid form", async ({ authenticatedPage }) => {
		// Navigate to form page
		await authenticatedPage.goto("/app/settings/profile");

		// Submit valid form
		await submitValidForm(
			authenticatedPage,
			{
				Name: "Test User",
				Email: "test@example.com",
			},
			"[data-testid='save-profile']",
			"[data-testid='profile-saved-success']",
		);

		// Verify success message
		await expect(
			authenticatedPage.getByTestId("profile-saved-success"),
		).toBeVisible();
	});

	test("validates password confirmation", async ({ authenticatedPage }) => {
		// Navigate to change password page
		await authenticatedPage.goto("/app/settings/password");

		// Fill form with mismatched passwords
		await fillForm(authenticatedPage, {
			"Current Password": "current123",
			"New Password": "newpassword123",
			"Confirm New Password": "differentpassword123",
		});

		// Submit form
		await submitForm(authenticatedPage, "[data-testid='change-password']");

		// Check for password confirmation error
		await expectFormErrors(authenticatedPage, {
			"Confirm New Password": "Passwords do not match",
		});
	});

	test("validates password strength", async ({ authenticatedPage }) => {
		// Navigate to change password page
		await authenticatedPage.goto("/app/settings/password");

		// Fill form with weak password
		await fillForm(authenticatedPage, {
			"Current Password": "current123",
			"New Password": "123",
			"Confirm New Password": "123",
		});

		// Submit form
		await submitForm(authenticatedPage, "[data-testid='change-password']");

		// Check for password strength error
		await expectFormErrors(authenticatedPage, {
			"New Password": "Password must be at least 8 characters long",
		});
	});
});

// Helper function to check required field errors
async function expectRequiredField(page: any, fieldName: string) {
	const errorElement = page.getByTestId(`error-${fieldName}`);
	await expect(errorElement).toBeVisible();
	await expect(errorElement).toContainText("This field is required");
}
