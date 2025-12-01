import fs from "node:fs";
import path from "node:path";

export interface LegalPage {
	path: string;
	locale: string;
	title: string;
	body: string;
}

const contentDirectory = path.join(process.cwd(), "content/legal");

/**
 * Simple frontmatter parser without external dependencies
 * Parses YAML frontmatter from markdown files
 */
function parseFrontmatter(content: string): {
	data: Record<string, any>;
	content: string;
} {
	const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
	const match = content.match(frontmatterRegex);

	if (!match) {
		return { data: {}, content };
	}

	const [, frontmatterText, bodyContent] = match;
	const data: Record<string, any> = {};

	// Parse simple YAML key-value pairs
	const lines = (frontmatterText || "").split("\n");
	for (const line of lines) {
		const colonIndex = line.indexOf(":");
		if (colonIndex > 0) {
			const key = line.substring(0, colonIndex).trim();
			const value = line.substring(colonIndex + 1).trim();
			data[key] = value;
		}
	}

	return { data, content: bodyContent || "" };
}

export function getAllLegalPages(): LegalPage[] {
	if (!fs.existsSync(contentDirectory)) {
		return [];
	}

	const fileNames = fs.readdirSync(contentDirectory);
	const allPages = fileNames
		.filter((fileName) => fileName.endsWith(".md") || fileName.endsWith(".mdx"))
		.map((fileName) => {
			// Extract locale from filename (e.g., "terms.de.md" -> "de", "terms.md" -> "en")
			const match = fileName.match(/^(.+?)(?:\.([a-z]{2}))?\.mdx?$/);
			if (!match) {
				return null;
			}

			const [, baseName, locale] = match;
			const pagePath = baseName || "";
			const pageLocale = locale || "en";

			const fullPath = path.join(contentDirectory, fileName);
			const fileContents = fs.readFileSync(fullPath, "utf8");
			const { data, content } = parseFrontmatter(fileContents);

			return {
				path: pagePath,
				locale: pageLocale,
				title: (data.title as string) || baseName || "",
				body: content,
			};
		})
		.filter(Boolean) as LegalPage[];

	return allPages;
}

export function getLegalPage(
	pagePath: string,
	locale = "en",
): LegalPage | undefined {
	const allPages = getAllLegalPages();
	return allPages.find(
		(page) => page.path === pagePath && page.locale === locale,
	);
}
