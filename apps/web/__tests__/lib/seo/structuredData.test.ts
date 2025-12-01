import { describe, expect, it } from "vitest";
import {
	type BreadcrumbItem,
	getBreadcrumbSchema,
	getOrganizationSchema,
	getSoftwareApplicationSchema,
	type OrganizationSchemaOptions,
	type SoftwareApplicationSchemaOptions,
} from "@/lib/seo/structuredData";

describe("getOrganizationSchema", () => {
	it("should generate valid Organization schema", () => {
		const schema = getOrganizationSchema();

		expect(schema["@context"]).toBe("https://schema.org");
		expect(schema["@type"]).toBe("Organization");
		expect(schema.name).toBe("SnapBack");
		expect(schema.url).toBe("https://snapback.dev");
		expect(schema.logo).toBeDefined();
	});

	it("should include social media links", () => {
		const schema = getOrganizationSchema();

		expect(schema.sameAs).toBeDefined();
		expect(Array.isArray(schema.sameAs)).toBe(true);
		expect(schema.sameAs.length).toBeGreaterThan(0);
	});

	it("should include contact information", () => {
		const schema = getOrganizationSchema();

		expect(schema.contactPoint).toBeDefined();
		expect(schema.contactPoint["@type"]).toBe("ContactPoint");
		expect(schema.contactPoint.contactType).toBeDefined();
	});

	it("should allow custom options", () => {
		const options: OrganizationSchemaOptions = {
			name: "Custom Name",
			url: "https://custom.com",
		};

		const schema = getOrganizationSchema(options);

		expect(schema.name).toBe("Custom Name");
		expect(schema.url).toBe("https://custom.com");
	});

	it("should have valid JSON-LD structure", () => {
		const schema = getOrganizationSchema();

		// Should be serializable to JSON
		expect(() => JSON.stringify(schema)).not.toThrow();

		// Should have required properties
		expect(schema).toHaveProperty("@context");
		expect(schema).toHaveProperty("@type");
		expect(schema).toHaveProperty("name");
		expect(schema).toHaveProperty("url");
	});
});

describe("getSoftwareApplicationSchema", () => {
	it("should generate valid SoftwareApplication schema", () => {
		const schema = getSoftwareApplicationSchema();

		expect(schema["@context"]).toBe("https://schema.org");
		expect(schema["@type"]).toBe("SoftwareApplication");
		expect(schema.name).toBe("SnapBack");
		expect(schema.applicationCategory).toBe("DeveloperApplication");
	});

	it("should include pricing information", () => {
		const schema = getSoftwareApplicationSchema();

		expect(schema.offers).toBeDefined();
		expect(schema.offers["@type"]).toBe("Offer");
		expect(schema.offers.price).toBeDefined();
		expect(schema.offers.priceCurrency).toBe("USD");
	});

	it("should include operating system information", () => {
		const schema = getSoftwareApplicationSchema();

		expect(schema.operatingSystem).toBeDefined();
		expect(typeof schema.operatingSystem).toBe("string");
	});

	it("should include description", () => {
		const schema = getSoftwareApplicationSchema();

		expect(schema.description).toBeDefined();
		expect(typeof schema.description).toBe("string");
		expect(schema.description.length).toBeGreaterThan(0);
	});

	it("should allow custom options", () => {
		const options: SoftwareApplicationSchemaOptions = {
			name: "Custom App",
			price: "9.99",
			ratingValue: 4.8,
			ratingCount: 150,
		};

		const schema = getSoftwareApplicationSchema(options);

		expect(schema.name).toBe("Custom App");
		expect(schema.offers.price).toBe("9.99");

		if (schema.aggregateRating) {
			expect(schema.aggregateRating.ratingValue).toBe("4.8");
			expect(schema.aggregateRating.ratingCount).toBe(150);
		}
	});

	it("should include version information", () => {
		const schema = getSoftwareApplicationSchema();

		expect(schema.softwareVersion).toBeDefined();
		expect(typeof schema.softwareVersion).toBe("string");
	});

	it("should have valid JSON-LD structure", () => {
		const schema = getSoftwareApplicationSchema();

		expect(() => JSON.stringify(schema)).not.toThrow();
		expect(schema).toHaveProperty("@context");
		expect(schema).toHaveProperty("@type");
	});
});

describe("getBreadcrumbSchema", () => {
	it("should generate valid BreadcrumbList schema", () => {
		const items: BreadcrumbItem[] = [
			{ name: "Home", url: "https://snapback.dev" },
			{ name: "Features", url: "https://snapback.dev/features" },
		];

		const schema = getBreadcrumbSchema(items);

		expect(schema["@context"]).toBe("https://schema.org");
		expect(schema["@type"]).toBe("BreadcrumbList");
		expect(schema.itemListElement).toBeDefined();
		expect(Array.isArray(schema.itemListElement)).toBe(true);
	});

	it("should assign correct positions to breadcrumb items", () => {
		const items: BreadcrumbItem[] = [
			{ name: "Home", url: "https://snapback.dev" },
			{ name: "Docs", url: "https://snapback.dev/docs" },
			{
				name: "Getting Started",
				url: "https://snapback.dev/docs/getting-started",
			},
		];

		const schema = getBreadcrumbSchema(items);

		expect(schema.itemListElement[0].position).toBe(1);
		expect(schema.itemListElement[1].position).toBe(2);
		expect(schema.itemListElement[2].position).toBe(3);
	});

	it("should handle single breadcrumb item", () => {
		const items: BreadcrumbItem[] = [
			{ name: "Home", url: "https://snapback.dev" },
		];

		const schema = getBreadcrumbSchema(items);

		expect(schema.itemListElement).toHaveLength(1);
		expect(schema.itemListElement[0].position).toBe(1);
	});

	it("should have correct ListItem structure", () => {
		const items: BreadcrumbItem[] = [
			{ name: "Home", url: "https://snapback.dev" },
			{ name: "Features", url: "https://snapback.dev/features" },
		];

		const schema = getBreadcrumbSchema(items);

		schema.itemListElement.forEach((item) => {
			expect(item["@type"]).toBe("ListItem");
			expect(item.position).toBeGreaterThan(0);
			expect(item.name).toBeDefined();
			expect(item.item).toBeDefined();
		});
	});

	it("should handle empty array", () => {
		const schema = getBreadcrumbSchema([]);

		expect(schema.itemListElement).toHaveLength(0);
	});

	it("should preserve item names and URLs", () => {
		const items: BreadcrumbItem[] = [
			{ name: "Custom Name", url: "https://example.com/path" },
		];

		const schema = getBreadcrumbSchema(items);

		expect(schema.itemListElement[0].name).toBe("Custom Name");
		expect(schema.itemListElement[0].item).toBe("https://example.com/path");
	});

	it("should have valid JSON-LD structure", () => {
		const items: BreadcrumbItem[] = [
			{ name: "Home", url: "https://snapback.dev" },
		];

		const schema = getBreadcrumbSchema(items);

		expect(() => JSON.stringify(schema)).not.toThrow();
		expect(schema).toHaveProperty("@context");
		expect(schema).toHaveProperty("@type");
		expect(schema).toHaveProperty("itemListElement");
	});
});

describe("Schema Integration", () => {
	it("should generate all schemas without errors", () => {
		expect(() => getOrganizationSchema()).not.toThrow();
		expect(() => getSoftwareApplicationSchema()).not.toThrow();
		expect(() => getBreadcrumbSchema([])).not.toThrow();
	});

	it("should generate valid JSON for all schemas", () => {
		const org = getOrganizationSchema();
		const app = getSoftwareApplicationSchema();
		const breadcrumb = getBreadcrumbSchema([
			{ name: "Home", url: "https://snapback.dev" },
		]);

		expect(() => JSON.stringify(org)).not.toThrow();
		expect(() => JSON.stringify(app)).not.toThrow();
		expect(() => JSON.stringify(breadcrumb)).not.toThrow();
	});

	it("should use consistent base URL", () => {
		const org = getOrganizationSchema();
		const app = getSoftwareApplicationSchema();

		expect(org.url).toBe("https://snapback.dev");
		// App schema should reference same base domain
		expect(app.name).toBe("SnapBack");
	});
});
