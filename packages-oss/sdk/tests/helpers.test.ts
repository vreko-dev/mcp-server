import { describe, expect, it } from "vitest";
import type { Envelope } from "../src/client";
import { ensureIdempotentRequestId } from "../src/helpers";

describe("SDK Helpers", () => {
	describe("ensureIdempotentRequestId", () => {
		it("should generate request_id if not provided", () => {
			const envelope: Partial<Envelope> = {
				session_id: "test-session",
				client: "vscode",
			};

			const result = ensureIdempotentRequestId(envelope as Envelope);

			expect(result.session_id).toBe("test-session");
			expect(result.client).toBe("vscode");
			expect(result.request_id).toBeDefined();
			expect(typeof result.request_id).toBe("string");
			expect(result.request_id.length).toBeGreaterThan(0);
		});

		it("should preserve existing request_id", () => {
			const envelope: Envelope = {
				session_id: "test-session",
				request_id: "existing-request-id",
				client: "vscode",
			};

			const result = ensureIdempotentRequestId(envelope);

			expect(result.request_id).toBe("existing-request-id");
		});

		it("should generate unique IDs for multiple calls", () => {
			const envelope1: Partial<Envelope> = {
				session_id: "session-1",
				client: "vscode",
			};
			const envelope2: Partial<Envelope> = {
				session_id: "session-2",
				client: "cli",
			};

			const result1 = ensureIdempotentRequestId(envelope1 as Envelope);
			const result2 = ensureIdempotentRequestId(envelope2 as Envelope);

			expect(result1.request_id).not.toBe(result2.request_id);
		});

		it("should preserve workspace_id when present", () => {
			const envelope: Partial<Envelope> = {
				session_id: "test-session",
				workspace_id: "workspace-123",
				client: "mcp",
			};

			const result = ensureIdempotentRequestId(envelope as Envelope);

			expect(result.workspace_id).toBe("workspace-123");
			expect(result.request_id).toBeDefined();
		});

		it("should work with all client surface types", () => {
			const surfaces = ["vscode", "mcp", "cli", "web"] as const;

			for (const surface of surfaces) {
				const envelope: Partial<Envelope> = {
					session_id: `session-${surface}`,
					client: surface,
				};

				const result = ensureIdempotentRequestId(envelope as Envelope);
				expect(result.client).toBe(surface);
				expect(result.request_id).toBeDefined();
			}
		});

		it("should not mutate original envelope", () => {
			const original: Partial<Envelope> = {
				session_id: "test-session",
				client: "vscode",
			};
			const originalCopy = { ...original };

			ensureIdempotentRequestId(original as Envelope);

			expect(original).toEqual(originalCopy);
		});
	});
});
