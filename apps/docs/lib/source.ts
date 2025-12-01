import { loader } from "fumadocs-core/source";
import { createMDXSource } from "fumadocs-mdx/runtime/next";
import { docs } from "../.source";

// Official fumadocs-mdx pattern from https://fumadocs.dev/docs/mdx/next
// Use createMDXSource() instead of toFumadocsSource() to avoid type issues
//
// Routing architecture:
// - User visits: docs.snapback.dev/quick-start
// - Middleware rewrites to: /docs/quick-start
// - Next.js routes to: app/docs/[[...slug]]/page.tsx
// - baseUrl "/" because from docs subdomain perspective, root = docs homepage

// Type assertion needed due to fumadocs-mdx v13.0.7 type inference issue
// The generated .source/index.ts has @ts-nocheck, and the runtime value is correct
// even though TypeScript infers the type as 'never'
const docsData = docs as any;

export const source = loader({
	baseUrl: "/",
	source: createMDXSource(docsData.docs, docsData.meta),
});
