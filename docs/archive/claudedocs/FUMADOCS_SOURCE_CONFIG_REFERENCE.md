# Fumadocs Source Configuration Reference

**Purpose**: Complete source.config.ts reference for fumadocs-mdx migration
**Location**: `/apps/web/source.config.ts` (to be created)
**Version**: fumadocs-mdx v12+

---

## Complete source.config.ts

```typescript
import { defineDocs, defineConfig } from "fumadocs-mdx/config";
import { remarkImage } from "fumadocs-core/mdx-plugins";
import rehypeShiki from "@shikijs/rehype";

/**
 * Define documentation collections
 * Replaces content-collections.ts docs and docsMeta collections
 */
export const { docs, meta } = defineDocs({
	// Source directory for documentation
	dir: "content/docs",

	/**
	 * Document collection schema
	 * Matches existing frontmatter in MDX files
	 */
	docs: {
		schema: (z) => ({
			// Required fields
			title: z.string(),
			description: z.string(),

			// Optional fields
			icon: z.string().optional(),

			// Fumadocs fields (automatically handled)
			// - slug: Generated from file path
			// - url: Generated from slug
			// - locale: Detected from .{locale}.mdx pattern
		}),

		// Custom transformations (if needed)
		transform: (doc) => {
			// Example: Add custom fields or transformations
			return {
				...doc,
				// Custom field example:
				// breadcrumb: generateBreadcrumb(doc.url),
			};
		},
	},

	/**
	 * Meta collection schema
	 * Handles meta.json files for navigation structure
	 */
	meta: {
		schema: (z) => ({
			// Navigation metadata
			title: z.string(),
			description: z.string().optional(),
			icon: z.string().optional(),

			// Pages array: can be strings (page slugs) or objects (nested structure)
			pages: z.array(
				z.union([
					z.string(), // Simple page reference: "getting-started/overview"
					z.object({
						title: z.string(),
						icon: z.string().optional(),
						pages: z.array(z.string()), // Nested pages
					}),
				])
			),
		}),
	},
});

/**
 * Global MDX configuration
 * Replaces content-collections.ts transform options
 */
export default defineConfig({
	/**
	 * MDX processing options
	 */
	mdxOptions: {
		/**
		 * Remark plugins (Markdown AST transformations)
		 */
		remarkPlugins: [
			// Image optimization and path handling
			[
				remarkImage,
				{
					publicDir: "public",
					// Automatically optimize images and fix paths
				},
			],
		],

		/**
		 * Rehype plugins (HTML AST transformations)
		 */
		rehypePlugins: [
			// Syntax highlighting with Shiki
			[
				rehypeShiki,
				{
					theme: "nord", // Matches existing theme
					// Additional options:
					// themes: { light: 'github-light', dark: 'nord' },
					// defaultColor: false,
				},
			],
		],

		/**
		 * Additional MDX options
		 */
		// jsx: true, // Enable JSX runtime
		// development: process.env.NODE_ENV === 'development',
	},

	/**
	 * i18n configuration
	 * Matches config.i18n from @repo/config
	 */
	i18n: {
		defaultLanguage: "en",
		languages: ["en", "de"],

		// Locale detection from file extensions
		// Example: overview.de.mdx → German locale
		// Example: overview.mdx → Default locale (en)
	},

	/**
	 * Additional configuration options
	 */

	// Generate TypeScript definitions
	// generateTypeScript: true, // Default: true

	// Output directory for generated files
	// outputDir: '.source', // Default: '.source'

	// Watch mode for development
	// watch: process.env.NODE_ENV === 'development',
});
```

---

## Configuration Explanation

### 1. Document Collection (`docs`)

**Purpose**: Process all `.mdx` files in `content/docs/`

**File Pattern Matching**:

```
content/docs/
├── index.mdx                     → slug: ""        locale: "en"
├── index.de.mdx                  → slug: ""        locale: "de"
├── getting-started/
│   ├── overview.mdx              → slug: "getting-started/overview"
│   └── overview.de.mdx           → slug: "getting-started/overview" locale: "de"
└── features/
    └── dashboard.mdx             → slug: "features/dashboard"
```

**Schema Fields**:

-   `title`: Page title (from frontmatter)
-   `description`: Page description (from frontmatter)
-   `icon`: Optional icon name (used in navigation)

**Auto-Generated Fields**:

-   `slug`: File path without extension
-   `url`: Full URL path
-   `locale`: Detected from `.{locale}.mdx` pattern
-   `body`: Compiled MDX content
-   `toc`: Table of contents
-   `structuredData`: Structured data for SEO

### 2. Meta Collection (`meta`)

**Purpose**: Process `meta.json` files for navigation structure

**File Pattern**:

```
content/docs/meta.json → Root navigation
```

**Schema Structure**:

```json
{
	"title": "SnapBack Documentation",
	"description": "AI-aware code protection system documentation",
	"icon": "Home",
	"pages": [
		"index",
		{
			"title": "Getting Started",
			"icon": "BookOpen",
			"pages": ["getting-started/overview"]
		}
	]
}
```

### 3. MDX Options

**Remark Plugins** (Markdown Processing):

-   `remarkImage`: Optimizes images, fixes paths to public directory

**Rehype Plugins** (HTML Processing):

-   `rehypeShiki`: Syntax highlighting with Nord theme

### 4. i18n Configuration

**Locale Detection**:

-   Default locale: `en` (from `overview.mdx`)
-   Localized files: `{locale}` from `overview.de.mdx`

**URL Structure**:

-   English: `/docs/getting-started/overview`
-   German: `/de/docs/getting-started/overview`

---

## Generated .source Directory

After running `pnpm fumadocs-mdx`, the following is generated:

```
apps/web/.source/
├── index.d.ts          # TypeScript definitions
└── index.js            # Processed MDX data
```

**index.d.ts** (Type Definitions):

```typescript
export declare const docs: {
	slug: string;
	url: string;
	locale: string;
	title: string;
	description: string;
	icon?: string;
	body: MDXContent;
	toc: TableOfContents;
	// ... other fields
}[];

export declare const meta: {
	title: string;
	description?: string;
	icon?: string;
	pages: (string | { title: string; icon?: string; pages: string[] })[];
}[];
```

**index.js** (Processed Data):

```javascript
export const docs = [
  {
    slug: "",
    url: "/docs",
    locale: "en",
    title: "Introduction",
    description: "Welcome to SnapBack documentation",
    body: /* Compiled MDX */,
    toc: /* Table of contents */,
  },
  // ... all other docs
];

export const meta = [
  {
    title: "SnapBack Documentation",
    icon: "Home",
    pages: [/* navigation structure */],
  },
];
```

---

## Usage in docs-source.ts

```typescript
import { docs, meta } from "@/.source";
import { loader } from "fumadocs-core/source";

export const docsSource = loader({
	baseUrl: "/docs",

	// Use fumadocs-mdx generated source
	source: docs.toFumadocsSource(meta),

	// or manually create source:
	// source: createMDXSource(docs, meta),
});
```

---

## Migration from content-collections.ts

### Old Configuration (content-collections.ts)

```typescript
const docs = defineCollection({
	name: "docs",
	directory: "content/docs",
	include: "**/*.mdx",
	schema: z.object(createDocSchema(z)),
	transform: async (document, context) =>
		transformMDX(document, context, {
			remarkPlugins: [[remarkImage, { publicDir: "public" }]],
		}),
});
```

### New Configuration (source.config.ts)

```typescript
export const { docs, meta } = defineDocs({
	dir: "content/docs",
	docs: {
		schema: (z) => ({
			title: z.string(),
			description: z.string(),
			icon: z.string().optional(),
		}),
	},
});

export default defineConfig({
	mdxOptions: {
		remarkPlugins: [[remarkImage, { publicDir: "public" }]],
	},
});
```

**Key Differences**:

1. ✅ Simpler API with `defineDocs()` instead of `defineCollection()`
2. ✅ Global MDX options in `defineConfig()` instead of per-collection
3. ✅ Automatic schema creation vs manual `createDocSchema()`
4. ✅ Built-in i18n support vs custom locale handling
5. ✅ Automatic `.source` generation vs `.content-collections` build

---

## Advanced Configuration Examples

### Custom Frontmatter Fields

```typescript
docs: {
  schema: (z) => ({
    title: z.string(),
    description: z.string(),
    icon: z.string().optional(),

    // Custom fields
    author: z.string().optional(),
    publishedAt: z.date().optional(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
}
```

### Custom Transformations

```typescript
docs: {
  transform: (doc) => {
    // Filter out draft documents in production
    if (process.env.NODE_ENV === 'production' && doc.draft) {
      return null;
    }

    // Add computed fields
    return {
      ...doc,
      readingTime: calculateReadingTime(doc.body),
      breadcrumb: generateBreadcrumb(doc.url),
    };
  },
}
```

### Multiple Themes for Syntax Highlighting

```typescript
mdxOptions: {
  rehypePlugins: [
    [
      rehypeShiki,
      {
        themes: {
          light: 'github-light',
          dark: 'nord',
        },
        defaultColor: false,
      },
    ],
  ],
}
```

### Additional Remark Plugins

```typescript
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

mdxOptions: {
  remarkPlugins: [
    [remarkImage, { publicDir: 'public' }],
    remarkGfm,      // GitHub Flavored Markdown
    remarkMath,     // Math equations
  ],
}
```

---

## Troubleshooting

### Issue: .source not generating

**Solution**:

```bash
# Manually trigger generation
pnpm fumadocs-mdx

# Check for errors in source.config.ts
# Verify dir path is correct
```

### Issue: TypeScript errors importing from .source

**Solution**:

```typescript
// Add to tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/.source": ["./apps/web/.source"]
    }
  }
}
```

### Issue: Icons not rendering

**Solution**:

```typescript
// Verify icon names match Lucide React icons
// Check icon mapping in docs-source.ts
const icons = {
  Home,        // ✅ Correct
  BookOpen,    // ✅ Correct
  book-open,   // ❌ Wrong - use PascalCase
};
```

### Issue: i18n not working

**Solution**:

```typescript
// Verify file naming: {slug}.{locale}.mdx
overview.de.mdx; // ✅ Correct
overview - de.mdx; // ❌ Wrong - use dot separator
```

### Issue: Syntax highlighting not working

**Solution**:

```typescript
// Verify @shikijs/rehype is installed
pnpm add -D @shikijs/rehype

// Check theme name is valid
theme: 'nord'              // ✅ Valid
theme: 'my-custom-theme'   // ❌ Invalid - theme doesn't exist
```

---

## Testing Configuration

### Test .source Generation

```bash
# 1. Generate .source
pnpm fumadocs-mdx

# 2. Verify files exist
ls -la apps/web/.source/
# Should show: index.d.ts, index.js

# 3. Check TypeScript types
pnpm --filter web type-check

# 4. Verify imports work
node -e "const { docs } = require('./apps/web/.source'); console.log(docs.length);"
# Should output: 26 (number of docs)
```

### Test MDX Processing

````bash
# 1. Create test MDX file
cat > apps/web/content/docs/test.mdx << 'EOF'
---
title: Test Page
description: Testing MDX processing
---

# Test Page

This is a test.

```typescript
console.log('Code highlighting test');
````

EOF

# 2. Regenerate .source

pnpm fumadocs-mdx

# 3. Verify test page appears

grep -r "Test Page" apps/web/.source/

````

### Test i18n

```bash
# 1. Create localized test file
cat > apps/web/content/docs/test.de.mdx << 'EOF'
---
title: Testseite
description: MDX-Verarbeitung testen
---

# Testseite

Dies ist ein Test.
EOF

# 2. Regenerate .source
pnpm fumadocs-mdx

# 3. Verify German version exists
grep -r "Testseite" apps/web/.source/
````

---

## Best Practices

### 1. Keep MDX Files Simple

```markdown
❌ Avoid:

-   Complex React components in MDX
-   Heavy client-side logic
-   Large inline data

✅ Prefer:

-   Standard Markdown syntax
-   Simple component imports
-   External data sources
```

### 2. Use Consistent Frontmatter

```yaml
✅ Every MDX file should have:
---
title: Clear, Descriptive Title
description: Concise description (150-160 chars for SEO)
---
```

### 3. Organize Meta Files

```
✅ One meta.json per directory level
content/docs/meta.json              # Root navigation
content/docs/features/meta.json     # Features navigation (if needed)

❌ Avoid multiple meta files in same directory
```

### 4. Test Before Committing

```bash
# Always test before committing
pnpm fumadocs-mdx        # Regenerate
pnpm build               # Test production build
pnpm --filter web dev    # Test dev server
```

### 5. Gitignore .source

```gitignore
# .gitignore
.source/
```

**Reason**: Generated files should not be committed. They regenerate on:

-   `pnpm install` (postinstall script)
-   `pnpm fumadocs-mdx` (manual)
-   Dev server start (watch mode)

---

## Performance Optimization

### 1. Minimize Transformations

```typescript
// ❌ Slow: Heavy transformation in every build
transform: (doc) => {
	return {
		...doc,
		expensiveComputation: performHeavyWork(doc.body),
	};
};

// ✅ Fast: Cache results or compute at runtime
transform: (doc) => {
	return {
		...doc,
		// Compute on-demand in components instead
	};
};
```

### 2. Use Selective Rehype Plugins

```typescript
// ❌ Too many plugins slow down build
rehypePlugins: [
	rehypeShiki,
	rehypeSlug,
	rehypeAutolinkHeadings,
	rehypeToc,
	// ... 10 more plugins
];

// ✅ Only essential plugins
rehypePlugins: [
	rehypeShiki, // Syntax highlighting (essential)
	// Other features can be handled at runtime
];
```

### 3. Optimize Images Early

```typescript
// ✅ Use remarkImage to optimize at build time
remarkPlugins: [
	[
		remarkImage,
		{
			publicDir: "public",
			// Images optimized once, served fast
		},
	],
];
```

---

## Migration Checklist

-   [ ] Create `apps/web/source.config.ts`
-   [ ] Update `apps/web/next.config.ts`
-   [ ] Update `apps/web/app/docs-source.ts`
-   [ ] Add `fumadocs-mdx` to package.json
-   [ ] Remove content-collections dependencies
-   [ ] Add postinstall script
-   [ ] Test .source generation
-   [ ] Verify all docs load
-   [ ] Test i18n (en/de)
-   [ ] Test icon rendering
-   [ ] Test syntax highlighting
-   [ ] Test production build
-   [ ] Add .source to .gitignore
-   [ ] Update documentation
-   [ ] Deploy to staging
-   [ ] Verify in production

---

**End of Source Configuration Reference**
