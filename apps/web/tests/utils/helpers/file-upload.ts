import * as fs from "node:fs";
import * as path from "node:path";
import type { Page } from "@playwright/test";

// Create a temporary test file
export function createTestFile(
	filename: string,
	content = "test content",
	extension = ".txt",
): string {
	const filePath = path.join(
		__dirname,
		"..",
		"..",
		"test-files",
		`${filename}${extension}`,
	);

	// Ensure the directory exists
	const dir = path.dirname(filePath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	// Write the file
	fs.writeFileSync(filePath, content);

	return filePath;
}

// Delete a test file
export function deleteTestFile(filePath: string): void {
	if (fs.existsSync(filePath)) {
		fs.unlinkSync(filePath);
	}
}

// Upload a file using Playwright
export async function uploadFile(
	page: Page,
	fileInputSelector: string,
	filePath: string,
): Promise<void> {
	// Wait for the file input to be visible
	await page.waitForSelector(fileInputSelector);

	// Upload the file
	await page.setInputFiles(fileInputSelector, filePath);
}

// Upload multiple files
export async function uploadMultipleFiles(
	page: Page,
	fileInputSelector: string,
	filePaths: string[],
): Promise<void> {
	// Wait for the file input to be visible
	await page.waitForSelector(fileInputSelector);

	// Upload the files
	await page.setInputFiles(fileInputSelector, filePaths);
}

// Wait for file upload to complete
export async function waitForFileUpload(
	page: Page,
	successSelector: string,
	timeout = 10000,
): Promise<void> {
	await page.waitForSelector(successSelector, { timeout });
}
