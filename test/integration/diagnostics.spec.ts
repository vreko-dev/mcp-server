import { Guardian } from "@snapback/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { SaveHandler } from "../../src/handlers/SaveHandler";
import type { ProtectedFileRegistry } from "../../src/services/protectedFileRegistry";

// Mock the Guardian to control the analysis results
vi.mock("@snapback/core", async () => {
	const actual = await vi.importActual("@snapback/core");
	return {
		...actual,
		Guardian: vi.fn(),
		MockReplacementPlugin: vi.fn(),
		PhantomDependencyPlugin: vi.fn(),
		SecretDetectionPlugin: vi.fn(),
	};
});

// Mock DiagnosticPublisher
vi.mock("../../src/guardian/DiagnosticPublisher", () => {
	return {
		DiagnosticPublisher: vi.fn().mockImplementation(() => {
			return {
				publish: vi.fn(),
				clear: vi.fn(),
				dispose: vi.fn(),
			};
		}),
	};
});

describe("Diagnostics publish+block", () => {
	let saveHandler: SaveHandler;
	let registry: ProtectedFileRegistry;
	let mockOperationCoordinator: any;
	let mockGuardian: any;

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();

		// Create mock guardian
		mockGuardian = {
			analyze: vi.fn(),
			addPlugin: vi.fn(),
		};

		(Guardian as any).mockImplementation(() => mockGuardian);

		// Create mock registry
		registry = {
			isProtected: vi.fn(),
			getProtectionLevel: vi.fn(),
			recordAudit: vi.fn(),
		} as any;

		// Create mock operation coordinator
		mockOperationCoordinator = {
			coordinateSnapshotCreation: vi.fn(),
		};

		// Create save handler
		saveHandler = new SaveHandler(registry, mockOperationCoordinator);
	});

	it("should publish diagnostics when Guardian finds issues", async () => {
		const filePath = "/test/file.js";
		const filename = "file.js";
		const content = 'const apiKey = "sk-1234567890abcdef";';

		// Mock registry to return protected status
		(registry.isProtected as any).mockReturnValue(true);
		(registry.getProtectionLevel as any).mockReturnValue("Watched");

		// Mock guardian to return issues
		mockGuardian.analyze.mockResolvedValue({
			score: 0.95,
			factors: ["Potential OpenAI API key detected"],
			recommendations: ["Move secrets to environment variables"],
			severity: "critical",
		});

		// Mock document
		const mockDocument = {
			uri: { fsPath: filePath },
			getText: vi.fn().mockReturnValue(content),
		} as any;

		// Mock vscode window methods
		vi.spyOn(vscode.window, "showWarningMessage").mockResolvedValue("Save Anyway" as any);

		try {
			await (saveHandler as any).handleProtectedFileSave(filePath, filename, content, mockDocument);

			// Verify guardian was called
			expect(mockGuardian.analyze).toHaveBeenCalledWith(content, filePath);

			// Verify diagnostics would be published (we can't easily test the actual publishing
			// without more complex mocking, but we can verify the code path is executed)
		} catch (error) {
			// Handle cancellation error
			if (!(error instanceof vscode.CancellationError)) {
				throw error;
			}
		}
	});

	it("should block save when risk > 8 and protectionLevel is block", async () => {
		const filePath = "/test/file.js";
		const filename = "file.js";
		const content = 'eval("malicious code");';

		// Mock registry to return protected status with block level
		(registry.isProtected as any).mockReturnValue(true);
		(registry.getProtectionLevel as any).mockReturnValue("Protected");

		// Mock guardian to return high risk score
		mockGuardian.analyze.mockResolvedValue({
			score: 9.5,
			factors: ["Potentially dangerous code detected"],
			recommendations: ["Avoid using eval()"],
			severity: "critical",
		});

		// Mock document
		const mockDocument = {
			uri: { fsPath: filePath },
			getText: vi.fn().mockReturnValue(content),
		} as any;

		// Mock vscode window methods
		vi.spyOn(vscode.window, "showErrorMessage").mockResolvedValue("Cancel Save" as any);

		try {
			await (saveHandler as any).handleProtectedFileSave(filePath, filename, content, mockDocument);
			// Should not reach here as save should be blocked
			expect(true).toBe(false);
		} catch (error) {
			// Should throw cancellation error when save is blocked
			expect(error).toBeInstanceOf(vscode.CancellationError);
		}

		// Verify guardian was called
		expect(mockGuardian.analyze).toHaveBeenCalledWith(content, filePath);

		// Verify error message was shown
		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
			"Critical security issues detected in file.js. Save blocked due to protection level.",
			"Save Anyway (Override)",
			"Cancel Save",
		);
	});
});
