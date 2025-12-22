import { loader } from "fumadocs-core/source";
import { blog, docs } from "../.source/server";

// Fumadocs-mdx v14 pattern - use .toFumadocsSource() method
// https://fumadocs.dev/docs/mdx/next
//
// Routing architecture (turborepo: apps/docs):
// - URL: docs.snapback.dev/quick-start
// - Filesystem: apps/docs/app/[[...slug]]/page.tsx
// - baseUrl "/" because docs subdomain root = docs homepage

// Type assertion needed due to .source/server.ts having @ts-nocheck
// which causes TypeScript to infer exports as 'never'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const docsSource = docs as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const blogSource_ = blog as any;

export const source = loader({
	baseUrl: "/",
	source: docsSource.toFumadocsSource(),
});

// Blog source at /blog
export const blogSource = loader({
	baseUrl: "/blog",
	source: blogSource_.toFumadocsSource(),
});
