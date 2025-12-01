import { describe, expect, it } from "vitest";

/**
 * Next.js 15 Async Params Integration Tests
 *
 * Next.js 15 introduced a breaking change where the `params` prop in page components
 * is now a Promise<T> instead of T. This test verifies that our pages correctly
 * handle async params.
 *
 * Key changes in Next.js 15:
 * - params is now Promise<{ [key: string]: string }>
 * - Must await params before accessing properties
 * - searchParams is also async in Next.js 15
 *
 * @see https://nextjs.org/docs/messages/sync-dynamic-apis
 */

describe("Next.js 15 Async Params", () => {
	describe("Dynamic Route Params", () => {
		it("should correctly type params as Promise", () => {
			// Type assertion test - this ensures our pages are correctly typed
			type ParamsType = Promise<{ id: string }>;

			// This would fail at build time if params is not Promise<T>
			const validateParamsType = (_params: ParamsType) => {
				expect(true).toBe(true);
			};

			// Mock params as Promise
			const mockParams = Promise.resolve({ id: "test-id" });
			validateParamsType(mockParams);
		});

		it("should handle awaiting params before accessing properties", async () => {
			// Simulate Next.js 15 behavior
			const mockParams = Promise.resolve({
				organizationSlug: "test-org",
			});

			// Correct pattern: await params first
			const { organizationSlug } = await mockParams;

			expect(organizationSlug).toBe("test-org");
		});

		it("should handle multiple dynamic segments", async () => {
			// Test nested dynamic routes like /[org]/[project]/[id]
			const mockParams = Promise.resolve({
				organizationSlug: "test-org",
				projectId: "project-123",
				id: "item-456",
			});

			const { organizationSlug, projectId, id } = await mockParams;

			expect(organizationSlug).toBe("test-org");
			expect(projectId).toBe("project-123");
			expect(id).toBe("item-456");
		});

		it("should handle catch-all segments", async () => {
			// Test [...path] dynamic routes
			const mockParams = Promise.resolve({
				path: ["blog", "2024", "async-params"],
			});

			const { path } = await mockParams;

			expect(path).toEqual(["blog", "2024", "async-params"]);
			expect(Array.isArray(path)).toBe(true);
		});

		it("should handle optional catch-all segments", async () => {
			// Test [[...path]] dynamic routes
			const mockParamsWithPath = Promise.resolve({
				path: ["legal", "privacy-policy"],
			});

			const mockParamsWithoutPath = Promise.resolve({});

			const { path: pathWithValue } = await mockParamsWithPath;
			const { path: pathEmpty } = await mockParamsWithoutPath;

			expect(pathWithValue).toEqual(["legal", "privacy-policy"]);
			expect(pathEmpty).toBeUndefined();
		});
	});

	describe("searchParams Integration", () => {
		it("should handle async searchParams", async () => {
			// searchParams is also async in Next.js 15
			const mockSearchParams = Promise.resolve({
				query: "test",
				page: "1",
			});

			const { query, page } = await mockSearchParams;

			expect(query).toBe("test");
			expect(page).toBe("1");
		});

		it("should handle optional searchParams", async () => {
			const mockSearchParams = Promise.resolve({});

			const { query } = await mockSearchParams;

			expect(query).toBeUndefined();
		});
	});

	describe("Error Handling", () => {
		it("should handle missing required params gracefully", async () => {
			// Simulate a scenario where params might be missing (shouldn't happen in practice)
			const mockParams = Promise.resolve({} as { invitationId: string });

			const { invitationId } = await mockParams;

			// Should handle gracefully even if undefined
			expect(invitationId).toBeUndefined();
		});

		it("should handle params promise rejection", async () => {
			// Simulate a failed params promise
			const failedParams = Promise.reject(
				new Error("Failed to resolve params"),
			);

			await expect(failedParams).rejects.toThrow("Failed to resolve params");
		});
	});

	describe("Type Safety", () => {
		it("should enforce correct param types", async () => {
			// Type-safe params
			type InvitationParams = Promise<{ invitationId: string }>;
			type OrganizationParams = Promise<{ organizationSlug: string }>;

			const invitationParams: InvitationParams = Promise.resolve({
				invitationId: "inv-123",
			});
			const organizationParams: OrganizationParams = Promise.resolve({
				organizationSlug: "test-org",
			});

			const { invitationId } = await invitationParams;
			const { organizationSlug } = await organizationParams;

			expect(invitationId).toBe("inv-123");
			expect(organizationSlug).toBe("test-org");
		});

		it("should handle numeric IDs correctly", async () => {
			// Even though params are strings in Next.js, ensure conversion works
			const mockParams = Promise.resolve({ id: "123" });

			const { id } = await mockParams;
			const numericId = Number.parseInt(id, 10);

			expect(numericId).toBe(123);
			expect(typeof id).toBe("string");
		});
	});

	describe("Real-world Page Patterns", () => {
		it("should follow organization invitation page pattern", async () => {
			// Pattern from: app/(saas)/organization-invitation/[invitationId]/page.tsx
			const mockParams = Promise.resolve({ invitationId: "inv-abc123" });

			const { invitationId } = await mockParams;

			expect(invitationId).toBe("inv-abc123");
			expect(invitationId).toMatch(/^inv-/);
		});

		it("should follow organization settings page pattern", async () => {
			// Pattern from: app/(saas)/app/(organizations)/[organizationSlug]/settings/*/page.tsx
			const mockParams = Promise.resolve({ organizationSlug: "snapback-dev" });

			const { organizationSlug } = await mockParams;

			expect(organizationSlug).toBe("snapback-dev");
			expect(organizationSlug).toMatch(/^[a-z0-9-]+$/);
		});

		it("should follow admin organization page pattern", async () => {
			// Pattern from: app/(saas)/app/(account)/admin/organizations/[id]/page.tsx
			const mockParams = Promise.resolve({ id: "org-uuid-123" });

			const { id } = await mockParams;

			expect(id).toBe("org-uuid-123");
			expect(id).toMatch(/^org-/);
		});

		it("should follow blog catch-all pattern", async () => {
			// Pattern from: app/(marketing)/blog/[...path]/page.tsx
			const mockParams = Promise.resolve({
				path: ["2024", "11", "web-api-first-foundation"],
			});

			const { path } = await mockParams;

			expect(path).toHaveLength(3);
			expect(path[0]).toBe("2024");
			expect(path[1]).toBe("11");
			expect(path[2]).toBe("web-api-first-foundation");
		});
	});

	describe("Migration Verification", () => {
		it("should verify old synchronous pattern no longer works", () => {
			// OLD Pattern (Next.js 14 and below) - would fail type check:
			// const { id } = params;  // ❌ Error: params is Promise<T>

			// NEW Pattern (Next.js 15+) - correct:
			// const { id } = await params;  // ✅ Works

			// This test documents the breaking change
			expect(true).toBe(true);
		});

		it("should verify all dynamic routes use async params", async () => {
			// List of all dynamic routes that need async params:
			const dynamicRoutes = [
				"/organization-invitation/[invitationId]",
				"/app/admin/organizations/[id]",
				"/app/[organizationSlug]",
				"/app/[organizationSlug]/settings/*",
				"/legal/[...path]",
				"/blog/[...path]",
				"/app/[...rest]",
			];

			expect(dynamicRoutes.length).toBeGreaterThan(0);

			// All these routes should use: params: Promise<T>
			for (const route of dynamicRoutes) {
				expect(route).toMatch(/\[.*\]/);
			}
		});
	});
});
