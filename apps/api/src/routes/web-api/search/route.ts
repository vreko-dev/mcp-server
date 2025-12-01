import { createSearchAPI } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

export const { GET } = createSearchAPI("simple", {
	indexes: source.getPages().map((page) => ({
		title: page.data.title ?? "Untitled",
		description: page.data.description || "",
		content: "", // Required for simple search
		url: page.url,
	})),
});
