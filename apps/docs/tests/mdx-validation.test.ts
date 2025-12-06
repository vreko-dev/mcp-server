import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";

const DOCS_DIR = join(process.cwd(), "content/docs");

/**
 * TDD Test Suite for SEO Implementation
 * Tests MDX file structure, frontmatter, and content requirements
 */
describe("SEO Documentation Pages - MDX Validation", () => {
	describe("why-snapback.mdx", () => {
		const filePath = join(DOCS_DIR, "why-snapback.mdx");

		it("should exist", () => {
			expect(existsSync(filePath)).toBe(true);
		});

		it("should have valid frontmatter with title and description", () => {
			const content = readFileSync(filePath, "utf-8");
			const { data } = matter(content);

			expect(data.title).toBe("Why SnapBack? Comparison Guide");
			expect(data.description).toContain("Git");
			expect(data.description).toContain("VS Code Local History");
		});

		it("should contain comparison sections", () => {
			const content = readFileSync(filePath, "utf-8");

			expect(content).toContain("SnapBack vs Git");
			expect(content).toContain("SnapBack vs VS Code Local History");
			expect(content).toContain("SnapBack vs Manual Backups");
		});

		it("should have comparison tables", () => {
			const content = readFileSync(filePath, "utf-8");

			// Tables use pipe characters
			expect(content).toMatch(/\|.*Scenario.*\|.*Git.*\|.*SnapBack.*\|/);
		});

		it("should include CTAs to marketing site", () => {
			const content = readFileSync(filePath, "utf-8");

			expect(content).toContain("snapback.dev");
			expect(content).toContain("Install SnapBack");
		});
	});

	describe("getting-started/first-restore.mdx", () => {
		const filePath = join(DOCS_DIR, "getting-started", "first-restore.mdx");

		it("should exist", () => {
			expect(existsSync(filePath)).toBe(true);
		});

		it("should have valid frontmatter", () => {
			const content = readFileSync(filePath, "utf-8");
			const { data } = matter(content);

			expect(data.title).toBe("Your First Restore - Step-by-Step Guide");
			expect(data.description).toContain("recover");
			expect(data.description).toContain("AI code change");
		});

		it("should use Steps component", () => {
			const content = readFileSync(filePath, "utf-8");

			expect(content).toContain("import { Step, Steps }");
			expect(content).toContain("<Steps>");
			expect(content).toContain("<Step>");
		});

		it("should have code examples", () => {
			const content = readFileSync(filePath, "utf-8");

			expect(content).toContain("```javascript");
			expect(content).toContain("calculateTotal");
		});

		it("should include keyboard shortcuts table", () => {
			const content = readFileSync(filePath, "utf-8");

			expect(content).toMatch(/\|.*Action.*\|.*Mac.*\|.*Windows/);
		});
	});

	describe("integrations/copilot.mdx", () => {
		const filePath = join(DOCS_DIR, "integrations", "copilot.mdx");

		it("should exist", () => {
			expect(existsSync(filePath)).toBe(true);
		});

		it("should have valid frontmatter", () => {
			const content = readFileSync(filePath, "utf-8");
			const { data } = matter(content);

			expect(data.title).toContain("Copilot");
			expect(data.description).toContain("GitHub Copilot");
		});

		it("should use Callout components", () => {
			const content = readFileSync(filePath, "utf-8");

			expect(content).toContain("import { Callout }");
			expect(content).toContain("<Callout");
		});

		it("should have installation steps", () => {
			const content = readFileSync(filePath, "utf-8");

			expect(content).toContain("Install Both Extensions");
			expect(content).toContain("VS Code");
		});

		it("should include real scenarios", () => {
			const content = readFileSync(filePath, "utf-8");

			expect(content).toContain("Scenario");
			expect(content).toMatch(/```typescript/);
		});
	});

	describe("faq.mdx", () => {
		const filePath = join(DOCS_DIR, "faq.mdx");

		it("should exist", () => {
			expect(existsSync(filePath)).toBe(true);
		});

		it("should have valid frontmatter", () => {
			const content = readFileSync(filePath, "utf-8");
			const { data } = matter(content);

			expect(data.title).toContain("FAQ");
			expect(data.description).toContain("Frequently asked questions");
		});

		it("should use Accordion components", () => {
			const content = readFileSync(filePath, "utf-8");

			expect(content).toContain("import { Accordion, Accordions }");
			expect(content).toContain("<Accordions>");
			expect(content).toContain("<Accordion");
		});

		it("should have multiple FAQ sections", () => {
			const content = readFileSync(filePath, "utf-8");

			expect(content).toContain("Getting Started");
			expect(content).toContain("Features & Functionality");
			expect(content).toContain("Privacy & Security");
			expect(content).toContain("Troubleshooting");
		});

		it("should have structured Q&A format", () => {
			const content = readFileSync(filePath, "utf-8");

			expect(content).toContain('title="What is SnapBack?"');
			expect(content).toContain('title="How do I install SnapBack?"');
		});
	});

	describe("Navigation meta.json", () => {
		const metaPath = join(DOCS_DIR, "meta.json");

		it("should exist", () => {
			expect(existsSync(metaPath)).toBe(true);
		});

		it("should include new pages in correct order", () => {
			const content = readFileSync(metaPath, "utf-8");
			const meta = JSON.parse(content);

			expect(meta.pages).toContain("why-snapback");
			expect(meta.pages).toContain("getting-started/first-restore");
			expect(meta.pages).toContain("integrations/copilot");
			expect(meta.pages).toContain("faq");
		});

		it("should have proper section separators", () => {
			const content = readFileSync(metaPath, "utf-8");
			const meta = JSON.parse(content);

			const separators = meta.pages.filter((p: string) => p.startsWith("---"));
			expect(separators.length).toBeGreaterThan(0);
		});
	});

	describe("Content Quality", () => {
		const allNewFiles = [
			"why-snapback.mdx",
			"getting-started/first-restore.mdx",
			"integrations/copilot.mdx",
			"faq.mdx",
		];

		it.each(allNewFiles)("%s should not have broken internal links", (file) => {
			const filePath = join(DOCS_DIR, file);
			if (!existsSync(filePath)) {
				return;
			}

			const content = readFileSync(filePath, "utf-8");

			// Check for markdown links
			const links = content.match(/\[.*?\]\((.*?)\)/g) || [];

			for (const link of links) {
				const url = link.match(/\((.*?)\)/)?.[1];
				if (!url) {
					continue;
				}

				// Internal links should start with / or #
				if (!url.startsWith("http") && !url.startsWith("mailto:")) {
					expect(url.startsWith("/") || url.startsWith("#")).toBe(true);
				}
			}
		});

		it.each(allNewFiles)("%s should have proper heading hierarchy", (file) => {
			const filePath = join(DOCS_DIR, file);
			if (!existsSync(filePath)) {
				return;
			}

			const content = readFileSync(filePath, "utf-8");
			const { content: bodyContent } = matter(content);

			// Check for headings
			const headings = bodyContent.match(/^#{1,6}\s/gm) || [];

			// Should have at least one H1
			const h1Count = headings.filter((h: string) => h.startsWith("# ")).length;
			expect(h1Count).toBeGreaterThanOrEqual(1);

			// Should not skip heading levels (no h1 -> h3)
			let prevLevel = 0;
			for (const heading of headings) {
				const level = heading.match(/^(#{1,6})/)?.[1].length || 0;
				if (prevLevel > 0) {
					expect(level - prevLevel).toBeLessThanOrEqual(1);
				}
				prevLevel = level;
			}
		});
	});

	describe("SEO Requirements", () => {
		const seoFiles = [
			"why-snapback.mdx",
			"getting-started/first-restore.mdx",
			"integrations/copilot.mdx",
			"faq.mdx",
		];

		it.each(seoFiles)("%s should have description under 160 characters", (file) => {
			const filePath = join(DOCS_DIR, file);
			if (!existsSync(filePath)) {
				return;
			}

			const content = readFileSync(filePath, "utf-8");
			const { data } = matter(content);

			expect(data.description).toBeDefined();
			expect(data.description.length).toBeLessThanOrEqual(160);
		});

		it.each(seoFiles)("%s should have title under 60 characters", (file) => {
			const filePath = join(DOCS_DIR, file);
			if (!existsSync(filePath)) {
				return;
			}

			const content = readFileSync(filePath, "utf-8");
			const { data } = matter(content);

			expect(data.title).toBeDefined();
			expect(data.title.length).toBeLessThanOrEqual(60);
		});
	});
});
