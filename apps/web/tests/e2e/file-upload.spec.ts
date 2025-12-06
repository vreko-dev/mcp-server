import { expect } from "@playwright/test";
import { test } from "../utils/fixtures/auth";
import {
	createTestFile,
	deleteTestFile,
	uploadFile,
	waitForFileUpload,
} from "../utils/helpers/file-upload";

test.describe("File Upload", () => {
	let testFilePath: string;

	test.beforeEach(() => {
		// Create a test file before each test
		testFilePath = createTestFile(
			"test-upload",
			"This is a test file for upload testing",
		);
	});

	test.afterEach(() => {
		// Clean up the test file after each test
		deleteTestFile(testFilePath);
	});

	test("can upload a file successfully", async ({ authenticatedPage }) => {
		// Navigate to the file upload page
		await authenticatedPage.goto("/app/uploads");

		// Upload the file
		await uploadFile(authenticatedPage, "#file-input", testFilePath);

		// Wait for upload to complete
		await waitForFileUpload(
			authenticatedPage,
			"[data-testid='upload-success']",
		);

		// Verify upload was successful
		await expect(authenticatedPage.getByTestId("upload-success")).toBeVisible();
		await expect(authenticatedPage.getByText("test-upload.txt")).toBeVisible();
	});

	test("shows error for invalid file type", async ({ authenticatedPage }) => {
		// Create a test file with invalid extension
		const invalidFile = createTestFile(
			"invalid-file",
			"This is an invalid file",
			".exe",
		);

		// Navigate to the file upload page
		await authenticatedPage.goto("/app/uploads");

		// Try to upload the invalid file
		await uploadFile(authenticatedPage, "#file-input", invalidFile);

		// Wait for error message
		await authenticatedPage.waitForSelector("[data-testid='upload-error']");

		// Verify error message is shown
		await expect(authenticatedPage.getByTestId("upload-error")).toBeVisible();
		await expect(
			authenticatedPage.getByText("Invalid file type"),
		).toBeVisible();

		// Clean up
		deleteTestFile(invalidFile);
	});

	test("shows progress during upload", async ({ authenticatedPage }) => {
		// Create a larger test file to simulate longer upload
		const largeFile = createTestFile(
			"large-file",
			"A".repeat(1000000), // 1MB file
			".txt",
		);

		// Navigate to the file upload page
		await authenticatedPage.goto("/app/uploads");

		// Upload the file
		await uploadFile(authenticatedPage, "#file-input", largeFile);

		// Check that progress indicator is visible
		await expect(
			authenticatedPage.getByTestId("upload-progress"),
		).toBeVisible();

		// Wait for upload to complete
		await waitForFileUpload(
			authenticatedPage,
			"[data-testid='upload-success']",
		);

		// Verify upload was successful
		await expect(authenticatedPage.getByTestId("upload-success")).toBeVisible();

		// Clean up
		deleteTestFile(largeFile);
	});
});
