import { createSearchAPI } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

export const { GET } = createSearchAPI("advanced", {
	indexes: source
		.getPages()
		.filter((page) => page.data.title)
		.map((page) => ({
			title: page.data.title ?? "",
			description: page.data.description ?? "",
			url: page.url,
			id: page.url,
			structuredData: {
				headings: [],
				contents: [],
			},
		})),
});
