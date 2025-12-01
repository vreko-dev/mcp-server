import { describe, expect, it } from "vitest";
import { getFooterRoutes, getRouteByPath, siteMap } from "@/lib/routes/siteMap";

describe("siteMap", () => {
	describe("Structure and Type Safety", () => {
		it("should export siteMap as an array of route groups", () => {
			expect(Array.isArray(siteMap)).toBe(true);
			expect(siteMap.length).toBeGreaterThan(0);
		});

		it("should have valid route group structure", () => {
			siteMap.forEach((group) => {
				expect(group).toHaveProperty("category");
				expect(group).toHaveProperty("routes");
				expect(typeof group.category).toBe("string");
				expect(Array.isArray(group.routes)).toBe(true);
			});
		});

		it("should have valid route structure in each group", () => {
			siteMap.forEach((group) => {
				group.routes.forEach((route) => {
					expect(route).toHaveProperty("path");
					expect(route).toHaveProperty("label");
					expect(route).toHaveProperty("inFooter");
					expect(typeof route.path).toBe("string");
					expect(typeof route.label).toBe("string");
					expect(typeof route.inFooter).toBe("boolean");

					// Optional properties
					if (route.description) {
						expect(typeof route.description).toBe("string");
					}
					if (route.external !== undefined) {
						expect(typeof route.external).toBe("boolean");
					}
				});
			});
		});
	});

	describe("Required Routes", () => {
		const requiredPaths = [
			"/",
			"/features",
			"/pricing",
			"/integrations",
			"/about",
			"/blog",
			"/careers",
			"/community",
			"/support",
			"/docs",
		];

		it("should include all required public routes", () => {
			const allPaths = siteMap.flatMap((group) =>
				group.routes.map((route) => route.path),
			);

			requiredPaths.forEach((path) => {
				expect(allPaths).toContain(path);
			});
		});

		it("should include /handbook route", () => {
			const allPaths = siteMap.flatMap((group) =>
				group.routes.map((route) => route.path),
			);

			expect(allPaths).toContain("/handbook");
		});

		it("should exclude /handbook from footer", () => {
			const handbookRoute = siteMap
				.flatMap((group) => group.routes)
				.find((route) => route.path === "/handbook");

			expect(handbookRoute).toBeDefined();
			expect(handbookRoute?.inFooter).toBe(false);
		});
	});

	describe("Route Categories", () => {
		it("should have Product category", () => {
			const productGroup = siteMap.find(
				(group) => group.category === "Product",
			);
			expect(productGroup).toBeDefined();
			expect(productGroup?.routes.length).toBeGreaterThan(0);
		});

		it("should have Company category", () => {
			const companyGroup = siteMap.find(
				(group) => group.category === "Company",
			);
			expect(companyGroup).toBeDefined();
			expect(companyGroup?.routes.length).toBeGreaterThan(0);
		});

		it("should have Resources category", () => {
			const resourcesGroup = siteMap.find(
				(group) => group.category === "Resources",
			);
			expect(resourcesGroup).toBeDefined();
			expect(resourcesGroup?.routes.length).toBeGreaterThan(0);
		});

		it("should have Legal category", () => {
			const legalGroup = siteMap.find((group) => group.category === "Legal");
			expect(legalGroup).toBeDefined();
			expect(legalGroup?.routes.length).toBeGreaterThan(0);
		});
	});

	describe("Path Validation", () => {
		it("should have valid paths (start with /)", () => {
			siteMap.forEach((group) => {
				group.routes.forEach((route) => {
					if (!route.external) {
						expect(route.path).toMatch(/^\//);
					}
				});
			});
		});

		it("should not have duplicate paths", () => {
			const allPaths = siteMap.flatMap((group) =>
				group.routes.map((route) => route.path),
			);

			const uniquePaths = new Set(allPaths);
			expect(uniquePaths.size).toBe(allPaths.length);
		});

		it("should mark external links appropriately", () => {
			siteMap.forEach((group) => {
				group.routes.forEach((route) => {
					if (route.external) {
						// External links should start with http:// or https://
						expect(route.path).toMatch(/^https?:\/\//);
					}
				});
			});
		});
	});
});

describe("getFooterRoutes", () => {
	it("should return only routes where inFooter is true", () => {
		const footerRoutes = getFooterRoutes();

		footerRoutes.forEach((group) => {
			group.routes.forEach((route) => {
				expect(route.inFooter).toBe(true);
			});
		});
	});

	it("should exclude /handbook from footer routes", () => {
		const footerRoutes = getFooterRoutes();
		const allFooterPaths = footerRoutes.flatMap((group) =>
			group.routes.map((route) => route.path),
		);

		expect(allFooterPaths).not.toContain("/handbook");
	});

	it("should maintain category grouping structure", () => {
		const footerRoutes = getFooterRoutes();

		expect(Array.isArray(footerRoutes)).toBe(true);
		footerRoutes.forEach((group) => {
			expect(group).toHaveProperty("category");
			expect(group).toHaveProperty("routes");
			expect(Array.isArray(group.routes)).toBe(true);
		});
	});

	it("should remove empty categories after filtering", () => {
		const footerRoutes = getFooterRoutes();

		footerRoutes.forEach((group) => {
			expect(group.routes.length).toBeGreaterThan(0);
		});
	});

	it("should include all required footer routes", () => {
		const footerRoutes = getFooterRoutes();
		const allFooterPaths = footerRoutes.flatMap((group) =>
			group.routes.map((route) => route.path),
		);

		const requiredFooterPaths = [
			"/",
			"/features",
			"/pricing",
			"/docs",
			"/blog",
			"/about",
		];

		requiredFooterPaths.forEach((path) => {
			expect(allFooterPaths).toContain(path);
		});
	});
});

describe("getRouteByPath", () => {
	it("should find route by exact path match", () => {
		const route = getRouteByPath("/features");

		expect(route).toBeDefined();
		expect(route?.path).toBe("/features");
		expect(route?.label).toBeDefined();
	});

	it("should return undefined for non-existent path", () => {
		const route = getRouteByPath("/non-existent-path");

		expect(route).toBeUndefined();
	});

	it("should find home route", () => {
		const route = getRouteByPath("/");

		expect(route).toBeDefined();
		expect(route?.path).toBe("/");
	});

	it("should handle external routes", () => {
		// Assuming there's an external route in the siteMap
		const allRoutes = siteMap.flatMap((group) => group.routes);
		const externalRoute = allRoutes.find((r) => r.external);

		if (externalRoute) {
			const foundRoute = getRouteByPath(externalRoute.path);
			expect(foundRoute).toBeDefined();
			expect(foundRoute?.external).toBe(true);
		}
	});

	it("should be case-sensitive", () => {
		const route = getRouteByPath("/Features"); // Wrong case

		// Depends on implementation - typically should be case-sensitive
		expect(route).toBeUndefined();
	});
});
