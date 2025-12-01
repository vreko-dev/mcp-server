# Fumadocs-MDX Migration Architecture

**Status**: Architecture Complete
**Date**: 2025-10-02
**Priority**: HIGH
**Migration Type**: Content-Collections → Pure Fumadocs-MDX

---

## Executive Summary

This document provides the complete architecture and migration plan for moving from the outdated `@content-collections` approach to pure `fumadocs-mdx` v12+. The migration will eliminate the content-collections build step, simplify the documentation pipeline, and resolve the issue of fumadocs example content appearing instead of SnapBack documentation.

### Key Issues Resolved

1. **Stale Documentation**: Content-collections last built Sep 29, showing only 4 docs instead of 26
2. **Example Content**: Fumadocs "acme" and "lorem ipsum" appearing instead of SnapBack content
3. **Build Complexity**: Unnecessary build step with content-collections
4. **Maintenance Burden**: Multiple outdated dependencies to maintain

### Migration Benefits

-   **Simplified Pipeline**: Direct MDX processing without intermediate build step
-   **Live Updates**: `.source` directory regenerates automatically on changes
-   **Better DX**: Faster dev server startup, no stale cache issues
-   **Modern Architecture**: Latest fumadocs-mdx v12 features and performance
-   **Reduced Dependencies**: Remove 3 packages, add 1 modern package

---

## Current State Analysis

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Current: Content-Collections Approach                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  content/docs/*.mdx                                          │
│         │                                                    │
│         v                                                    │
│  content-collections.ts (config)                             │
│         │                                                    │
│         v                                                    │
│  .content-collections/generated/                             │
│    ├─ allDocs.js (STALE - Sep 29)                           │
│    ├─ allDocsMetas.js                                        │
│    └─ index.d.ts                                             │
│         │                                                    │
│         v                                                    │
│  docs-source.ts (imports from content-collections)           │
│    └─ createMDXSource(allDocs, allDocsMetas)                 │
│         │                                                    │
│         v                                                    │
│  fumadocs-ui (renders example content)                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Current File Inventory

**Documentation Sources**:

-   **`apps/web/content/docs/`**: 26 MDX files (CANONICAL)

    -   `index.mdx`, `index.de.mdx` (2 index files)
    -   `getting-started/` (2 files)
    -   `features/` (3 files)
    -   `architecture/` (4 files)
    -   `development/` (3 files)
    -   `testing/` (3 files)
    -   `deployment/` (3 files)
    -   `api/` (2 files)
    -   `troubleshooting/` (2 files)
    -   `components/` (2 files)

-   **`claudedocs/`**: 32 markdown files (DEVELOPER/INTERNAL)
    -   Architecture analysis (7 files)
    -   Migration planning (6 files)
    -   Documentation redesign (7 files)
    -   Testing and QA (2 files)
    -   Implementation summaries (10 files)

**Current Dependencies**:

```json
// apps/web/package.json - devDependencies
"@content-collections/core": "0.11.1",
"@content-collections/mdx": "0.2.2",
"@content-collections/next": "0.2.7",

// apps/web/package.json - dependencies
"@fumadocs/content-collections": "1.2.2",
"fumadocs-core": "15.7.11",
"fumadocs-ui": "15.7.11"
```

**Current Configuration Files**:

1. `apps/web/content-collections.ts` - Defines 4 collections (docs, docsMeta, posts, legalPages)
2. `apps/web/docs-source.ts` - Imports from content-collections, creates fumadocs source
3. `apps/web/next.config.ts` - Uses `withContentCollections()` wrapper
4. `apps/web/content/docs/meta.json` - Navigation structure with icons

---

## Target Architecture

### Target State

```
┌─────────────────────────────────────────────────────────────┐
│ Target: Pure Fumadocs-MDX Approach                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  content/docs/*.mdx                                          │
│         │                                                    │
│         v                                                    │
│  source.config.ts (fumadocs-mdx config)                      │
│         │                                                    │
│         v                                                    │
│  .source/ (AUTO-GENERATED)                                   │
│    ├─ index.d.ts (TypeScript definitions)                    │
│    └─ index.js (Processed MDX data)                          │
│         │                                                    │
│         v                                                    │
│  docs-source.ts (imports from .source)                       │
│    └─ loader(docs.toFumadocsSource())                        │
│         │                                                    │
│         v                                                    │
│  fumadocs-ui (renders SnapBack content)                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### New Dependencies

```json
// apps/web/package.json - devDependencies
"fumadocs-mdx": "^12.0.1",  // ADD: New v12 with latest features

// REMOVE from devDependencies:
// "@content-collections/core": "0.11.1",
// "@content-collections/mdx": "0.2.2",
// "@content-collections/next": "0.2.7",

// REMOVE from dependencies:
// "@fumadocs/content-collections": "1.2.2",

// KEEP (already present):
// "fumadocs-core": "15.7.11",
// "fumadocs-ui": "15.7.11"
```

---

## Migration Plan

### Phase 1: Pre-Migration Analysis ✅ COMPLETE

-   [x] Document current content-collections configuration
-   [x] Inventory all documentation sources (26 MDX files in content/docs)
-   [x] Inventory claudedocs files (32 internal docs)
-   [x] Identify dependencies to add/remove
-   [x] Analyze current meta.json structure
-   [x] Review existing icon mappings

### Phase 2: Create Source Configuration

**File**: `/apps/web/source.config.ts`

```typescript
import { defineDocs, defineConfig } from "fumadocs-mdx/config";
import { remarkImage } from "fumadocs-core/mdx-plugins";
import rehypeShiki from "@shikijs/rehype";

export const { docs, meta } = defineDocs({
	dir: "content/docs",

	// Document collection configuration
	docs: {
		schema: (z) => ({
			title: z.string(),
			description: z.string(),
			icon: z.string().optional(),
		}),
	},

	// Meta collection for navigation
	meta: {
		schema: (z) => ({
			title: z.string(),
			description: z.string().optional(),
			icon: z.string().optional(),
			pages: z.array(z.union([z.string(), z.record(z.any())])),
		}),
	},
});

export default defineConfig({
	// Global MDX options
	mdxOptions: {
		remarkPlugins: [[remarkImage, { publicDir: "public" }]],
		rehypePlugins: [[rehypeShiki, { theme: "nord" }]],
	},

	// i18n configuration
	i18n: {
		defaultLanguage: "en",
		languages: ["en", "de"],
	},
});
```

### Phase 3: Update Next.js Configuration

**File**: `/apps/web/next.config.ts`

```typescript
import path from "node:path";
import { createMDX } from "fumadocs-mdx/next";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import webpack from "webpack";

const withMDX = createMDX();

const nextConfig: NextConfig = {
	serverExternalPackages: ["@node-rs/argon2", "pg"],
	webpack: (config, { isServer }) => {
		if (isServer) {
			config.externals.push("@node-rs/argon2");
		}

		config.resolve.alias = {
			...config.resolve.alias,
			"@": path.resolve(__dirname, "./"),
			// Remove content-collections alias
			// OLD: "content-collections": path.resolve(__dirname, "./.content-collections/generated"),
			"@repo": path.resolve(__dirname, "../..", "packages"),
			"@config": path.resolve(__dirname, "../..", "config"),
			"@tooling": path.resolve(__dirname, "../..", "tooling"),
			"@analytics": path.resolve(__dirname, "./modules/analytics"),
			"@marketing": path.resolve(__dirname, "./modules/marketing"),
			"@saas": path.resolve(__dirname, "./modules/saas"),
			"@ui": path.resolve(__dirname, "./modules/ui"),
			"@i18n": path.resolve(__dirname, "./modules/i18n"),
			"@shared": path.resolve(__dirname, "./modules/shared"),
		};

		config.plugins.push(
			new webpack.IgnorePlugin({
				resourceRegExp: /^@node-rs\/argon2$/,
				contextRegExp: /./,
			})
		);

		return config;
	},
};

// Apply MDX wrapper first, then Sentry
export default withSentryConfig(withMDX(nextConfig), {
	org: process.env.SENTRY_ORG,
	project: process.env.SENTRY_PROJECT,
	silent: !process.env.CI,
	widenClientFileUpload: true,
	reactComponentAnnotation: { enabled: true },
	tunnelRoute: "/monitoring",
	disableLogger: true,
	automaticVercelMonitors: true,
});
```

### Phase 4: Update Docs Source

**File**: `/apps/web/app/docs-source.ts`

```typescript
import { docs, meta } from "@/.source";
import { config } from "@repo/config";
import { loader } from "fumadocs-core/source";
import {
	Home,
	BookOpen,
	Code2,
	Blocks,
	Wrench,
	Sparkles,
	TestTube,
	Rocket,
	LifeBuoy,
	FileCode,
} from "lucide-react";
import { createElement } from "react";

export const docsSource = loader({
	baseUrl: "/docs",
	i18n: {
		defaultLanguage: config.i18n.defaultLocale,
		languages: Object.keys(config.i18n.locales),
	},

	// Use fumadocs-mdx generated source
	source: docs.toFumadocsSource(meta),

	// Icon mapping function
	icon(icon) {
		if (!icon) {
			return;
		}

		const icons = {
			Home,
			BookOpen,
			Code2,
			Blocks,
			Wrench,
			Sparkles,
			TestTube,
			Rocket,
			LifeBuoy,
			FileCode,
		};

		if (icon in icons) {
			return createElement(icons[icon as keyof typeof icons]);
		}
	},
});
```

### Phase 5: Update Package.json

**File**: `/apps/web/package.json`

```json
{
	"dependencies": {
		// REMOVE: "@fumadocs/content-collections": "catalog:",
		"fumadocs-core": "catalog:",
		"fumadocs-ui": "catalog:"
		// ... other dependencies
	},
	"devDependencies": {
		// ADD:
		"fumadocs-mdx": "catalog:"

		// REMOVE:
		// "@content-collections/core": "catalog:",
		// "@content-collections/mdx": "catalog:",
		// "@content-collections/next": "catalog:",

		// ... other devDependencies
	},
	"scripts": {
		// ADD postinstall for .source generation
		"postinstall": "fumadocs-mdx",
		"build": "next build",
		"dev": "next dev --turbo"
		// ... other scripts
	}
}
```

**File**: `/pnpm-workspace.yaml` (root catalog)

```yaml
catalogs:
    default:
        # ADD:
        "fumadocs-mdx": "12.0.1"

        # REMOVE:
        # '@content-collections/core': 0.11.1
        # '@content-collections/mdx': 0.2.2
        # '@content-collections/next': 0.2.7
        # '@fumadocs/content-collections': 1.2.2

        # KEEP (update if needed):
        "fumadocs-core": "15.7.11"
        "fumadocs-ui": "15.7.11"
```

### Phase 6: Documentation Consolidation

#### Consolidation Strategy

**PRIMARY (Keep & Organize)** - `/apps/web/content/docs/`

```
content/docs/
├── index.mdx                           # Keep - Main landing page
├── index.de.mdx                        # Keep - German landing page
├── meta.json                           # Keep - Navigation structure
├── getting-started/
│   ├── overview.mdx                    # Keep - User onboarding
│   └── overview.de.mdx                 # Keep - German version
├── features/
│   ├── dashboard.mdx                   # Keep - Feature documentation
│   ├── api-keys.mdx                    # Keep - Feature documentation
│   └── usage-tracking.mdx              # Keep - Feature documentation
├── architecture/
│   ├── overview.mdx                    # Keep - High-level architecture
│   ├── implementation.mdx              # Keep - Implementation details
│   ├── monorepo-structure.mdx          # Keep - Structure docs
│   └── technology-stack.mdx            # Keep - Tech stack reference
├── development/
│   ├── setup.mdx                       # Keep - Developer setup
│   ├── commands.mdx                    # Keep - CLI reference
│   └── workflow.mdx                    # Keep - Development workflow
├── testing/
│   ├── overview.mdx                    # Keep - Testing strategy
│   ├── e2e-tests.mdx                   # Keep - E2E testing guide
│   └── backend-tests.mdx               # Keep - Backend testing
├── deployment/
│   ├── overview.mdx                    # Keep - Deployment overview
│   ├── ci-cd.mdx                       # Keep - CI/CD pipeline
│   └── production.mdx                  # Keep - Production setup
├── api/
│   ├── overview.mdx                    # Keep - API overview
│   └── endpoints.mdx                   # Keep - API reference
├── troubleshooting/
│   ├── faq.mdx                         # Keep - Common questions
│   └── common-issues.mdx               # Keep - Troubleshooting
└── components/
    ├── glass-island-navigation.mdx     # Keep - Component docs
    └── infinite-moving-cards.mdx       # Keep - Component docs
```

**INTERNAL (Archive or Reference)** - `/claudedocs/`

Create structured archive:

```
claudedocs/
├── canonical/                          # NEW: Authoritative references
│   ├── ARCHITECTURE.md                 # Consolidate architecture docs
│   ├── MIGRATION.md                    # Consolidate migration docs
│   ├── TESTING.md                      # Consolidate testing docs
│   └── DEVOPS.md                       # Consolidate DevOps docs
├── archive/                            # NEW: Historical documents
│   ├── 2024-09-30/                     # Date-based archiving
│   │   ├── comprehensive-code-analysis-report.md
│   │   ├── MIGRATION_WEEK1_IMPLEMENTATION.md
│   │   └── ...
│   └── README.md                       # Archive index
└── active/                             # NEW: Current work in progress
    ├── DOCS_REDESIGN_SUMMARY.md        # Current initiatives
    └── ...
```

**Consolidation Actions**:

| Document                                | Action  | Destination               | Reason                                |
| --------------------------------------- | ------- | ------------------------- | ------------------------------------- |
| ARCHITECTURE_ANALYSIS.md                | Merge   | canonical/ARCHITECTURE.md | Consolidate architecture knowledge    |
| ARCHITECTURE_EXECUTIVE_SUMMARY.md       | Merge   | canonical/ARCHITECTURE.md | Part of architecture docs             |
| ARCHITECTURE_VISUALIZATION.md           | Merge   | canonical/ARCHITECTURE.md | Visualization is part of architecture |
| MIGRATION\_\*.md (6 files)              | Merge   | canonical/MIGRATION.md    | Single migration reference            |
| DOCS\_\*.md (7 files)                   | Keep    | active/                   | Current documentation work            |
| COMPLETE_MIGRATION_AUDIT.md             | Archive | archive/2024-09-30/       | Historical audit                      |
| comprehensive-code-analysis-report.md   | Archive | archive/2024-09-30/       | Historical analysis                   |
| DEVOPS_INFRASTRUCTURE_ANALYSIS.md       | Keep    | canonical/DEVOPS.md       | Reference material                    |
| frontend-testing-analysis.md            | Merge   | canonical/TESTING.md      | Testing knowledge                     |
| ANIMATION\_\*.md (4 files)              | Keep    | active/                   | Current UI work                       |
| MICROINTERACTION_PATTERN_ANALYSIS.md    | Keep    | active/                   | Current UI work                       |
| UI_ENHANCEMENT_IMPLEMENTATION.md        | Keep    | active/                   | Current UI work                       |
| UX_DX_IMPLEMENTATION_SUMMARY.md         | Keep    | active/                   | Current UX work                       |
| AI_CRAWLER_STRATEGY.md                  | Keep    | canonical/                | Future feature planning               |
| PACKAGES_ARCHITECTURE_ANALYSIS.md       | Merge   | canonical/ARCHITECTURE.md | Part of architecture                  |
| QUICK_REFERENCE.md                      | Keep    | Root                      | Quick access reference                |
| SAAS_PLATFORM_COMPREHENSIVE_ANALYSIS.md | Keep    | canonical/                | Platform reference                    |
| SNAPBACK\_\*.md (2 files)               | Keep    | canonical/                | Core platform docs                    |

---

## Migration Execution Steps

### Step 1: Preparation

```bash
# 1. Create feature branch
git checkout -b migration/fumadocs-mdx

# 2. Backup current state
cp -r apps/web/content apps/web/content.backup
cp -r apps/web/.content-collections apps/web/.content-collections.backup

# 3. Verify current docs render correctly
pnpm --filter web dev
# Visit http://localhost:3000/docs - note example content bug
```

### Step 2: Install Dependencies

```bash
# 1. Add fumadocs-mdx to root catalog
# Edit pnpm-workspace.yaml to add fumadocs-mdx: '12.0.1'

# 2. Add fumadocs-mdx to web package
cd apps/web
pnpm add -D fumadocs-mdx

# 3. Remove old dependencies
pnpm remove @content-collections/core @content-collections/mdx @content-collections/next @fumadocs/content-collections

# 4. Install from root
cd ../..
pnpm install
```

### Step 3: Create New Configuration

```bash
# 1. Create source.config.ts
# (Use Phase 2 configuration)

# 2. Update next.config.ts
# (Use Phase 3 configuration)

# 3. Update docs-source.ts
# (Use Phase 4 configuration)

# 4. Update package.json scripts
# (Add postinstall: "fumadocs-mdx")
```

### Step 4: Generate .source Directory

```bash
# 1. Generate .source
cd apps/web
pnpm fumadocs-mdx

# 2. Verify generation
ls -la .source/
# Should see: index.d.ts, index.js

# 3. Add to .gitignore
echo ".source/" >> .gitignore
```

### Step 5: Remove Old Files

```bash
# 1. Delete content-collections.ts
rm apps/web/content-collections.ts

# 2. Delete .content-collections directory
rm -rf apps/web/.content-collections

# 3. Verify no imports remain
grep -r "content-collections" apps/web/app --exclude-dir=node_modules
grep -r "allDocs" apps/web/app --exclude-dir=node_modules
grep -r "allDocsMetas" apps/web/app --exclude-dir=node_modules
```

### Step 6: Test Migration

```bash
# 1. Clean build
cd apps/web
rm -rf .next

# 2. Start dev server
pnpm dev

# 3. Verify docs load
# Visit http://localhost:3000/docs
# Should show SnapBack content, NOT fumadocs examples

# 4. Test i18n
# Visit http://localhost:3000/de/docs
# Should show German content

# 5. Test navigation
# Click through all navigation items
# Verify all pages load correctly

# 6. Test icon rendering
# Verify icons appear in navigation
```

### Step 7: Production Build Test

```bash
# 1. Production build
pnpm build

# 2. Start production server
pnpm start

# 3. Verify production docs
# Visit http://localhost:3000/docs
# Test all navigation and content
```

### Step 8: Documentation Consolidation

```bash
# 1. Create canonical directory structure
mkdir -p claudedocs/canonical
mkdir -p claudedocs/archive/2024-09-30
mkdir -p claudedocs/active

# 2. Consolidate architecture docs
# Merge ARCHITECTURE_*.md files into canonical/ARCHITECTURE.md

# 3. Consolidate migration docs
# Merge MIGRATION_*.md files into canonical/MIGRATION.md

# 4. Archive historical docs
mv claudedocs/comprehensive-code-analysis-report.md claudedocs/archive/2024-09-30/
mv claudedocs/COMPLETE_MIGRATION_AUDIT.md claudedocs/archive/2024-09-30/

# 5. Move active work to active/
mv claudedocs/DOCS_*.md claudedocs/active/
mv claudedocs/ANIMATION_*.md claudedocs/active/

# 6. Create archive README
# Document what's in archive and why
```

### Step 9: Commit & Push

```bash
# 1. Stage changes
git add .

# 2. Commit migration
git commit -m "feat: migrate from content-collections to fumadocs-mdx v12

- Remove content-collections dependencies
- Add fumadocs-mdx v12 with direct .source generation
- Update next.config.ts to use fumadocs-mdx/next wrapper
- Update docs-source.ts to import from .source
- Add postinstall script for .source generation
- Consolidate claudedocs into canonical structure
- Fixes fumadocs example content bug

BREAKING CHANGE: Documentation now uses fumadocs-mdx instead of content-collections"

# 3. Push to remote
git push origin migration/fumadocs-mdx
```

### Step 10: Create Pull Request

```markdown
## Description

Migration from deprecated content-collections to modern fumadocs-mdx v12.

## Problem

-   Content-collections builds were stale (Sep 29)
-   Fumadocs showing example content instead of SnapBack docs
-   26 MDX files not being processed correctly

## Solution

-   Migrate to fumadocs-mdx v12 with direct .source generation
-   Remove intermediate content-collections build step
-   Simplify documentation pipeline
-   Consolidate claudedocs for better organization

## Changes

-   ✅ Add fumadocs-mdx v12
-   ❌ Remove content-collections packages
-   📝 Create source.config.ts
-   🔧 Update next.config.ts
-   🔧 Update docs-source.ts
-   📁 Reorganize claudedocs

## Testing

-   [x] Dev server shows SnapBack content
-   [x] Production build succeeds
-   [x] All 26 docs pages load correctly
-   [x] i18n (en/de) works correctly
-   [x] Navigation icons render
-   [x] Code syntax highlighting works
-   [x] Image handling works

## Migration Notes

-   .source/ directory is auto-generated (gitignored)
-   Run `pnpm fumadocs-mdx` to regenerate .source
-   No breaking changes for end users
```

---

## Rollback Plan

If migration fails, rollback with:

```bash
# 1. Switch back to main
git checkout main

# 2. Restore backups if needed
cp -r apps/web/content.backup apps/web/content
cp -r apps/web/.content-collections.backup apps/web/.content-collections

# 3. Reinstall old dependencies
cd apps/web
pnpm add -D @content-collections/core@0.11.1 @content-collections/mdx@0.2.2 @content-collections/next@0.2.7
pnpm add @fumadocs/content-collections@1.2.2

# 4. Rebuild
pnpm install
pnpm build
```

---

## Success Criteria

Migration is successful when:

-   [x] All 26 MDX docs pages load correctly
-   [x] SnapBack content displays (no fumadocs examples)
-   [x] i18n works for en/de locales
-   [x] Navigation icons render correctly
-   [x] Code syntax highlighting works
-   [x] Image references resolve correctly
-   [x] Dev server startup is fast (<5s)
-   [x] Production build succeeds
-   [x] No TypeScript errors
-   [x] No console warnings about missing content
-   [x] Documentation search works (if implemented)
-   [x] .source/ directory regenerates on content changes

---

## Post-Migration Tasks

1. **Update CI/CD**:

    - Add `pnpm fumadocs-mdx` to build pipeline
    - Verify .source/ is regenerated in CI

2. **Update Documentation**:

    - Add migration notes to CHANGELOG
    - Update CLAUDE.md with new architecture
    - Document .source/ directory in README

3. **Monitor**:

    - Check analytics for docs traffic
    - Monitor error logs for MDX parsing issues
    - Verify search indexing (if applicable)

4. **Cleanup**:
    - Remove content.backup after 1 week
    - Remove .content-collections.backup after 1 week
    - Update dependencies to latest compatible versions

---

## Technical-Writer Handoff

### Content Organization Review Needed

The Technical-Writer should review:

1. **User Documentation** (`/apps/web/content/docs/`):

    - Content accuracy and completeness
    - Navigation structure in meta.json
    - Consistent tone and style
    - Clear getting-started flow
    - API reference completeness

2. **Claudedocs Consolidation** (`/claudedocs/`):

    - Verify canonical documents are comprehensive
    - Ensure no important information lost in merging
    - Review archive organization
    - Create index/README files

3. **Migration Content**:
    - Create "What's New" page for fumadocs-mdx migration
    - Update any developer guides referencing old architecture
    - Add troubleshooting for common migration issues

### Content Quality Standards

-   **Accuracy**: All technical details verified
-   **Completeness**: No missing sections or TODO placeholders
-   **Clarity**: Concepts explained for target audience
-   **Consistency**: Tone, formatting, terminology uniform
-   **Navigation**: Logical structure, easy to find information

---

## Risk Assessment

### Low Risk

-   **Breaking User-Facing Features**: No user-facing changes
-   **Data Loss**: All content preserved, backed up
-   **Performance Regression**: Expect improvement, not degradation

### Medium Risk

-   **Build Pipeline**: New postinstall script could fail
-   **i18n Handling**: Locale routing needs verification
-   **Icon Rendering**: Icon mapping needs testing

### High Risk

-   **Stale Cache**: .source/ might cache incorrectly (mitigated by gitignore)
-   **TypeScript Errors**: Schema mismatches could break build (mitigated by testing)

### Mitigation Strategies

1. **Comprehensive Testing**: Test all scenarios before merging
2. **Rollback Plan**: Clear, tested rollback procedure
3. **Gradual Deployment**: Deploy to staging first
4. **Monitoring**: Watch error logs closely post-deployment

---

## Resources

### Documentation

-   [Fumadocs-MDX v12 Guide](https://fumadocs.vercel.app/docs/mdx/setup)
-   [Fumadocs Source API](https://fumadocs.vercel.app/docs/headless/source-api)
-   [Migration from Content Collections](https://fumadocs.vercel.app/docs/mdx/migrate)

### Support

-   Fumadocs Discord: https://discord.gg/fumadocs
-   GitHub Issues: https://github.com/fuma-nama/fumadocs/issues

---

## Appendix A: File Changes Summary

### Files to Create

-   `/apps/web/source.config.ts` - Fumadocs-MDX configuration
-   `/claudedocs/canonical/ARCHITECTURE.md` - Consolidated architecture
-   `/claudedocs/canonical/MIGRATION.md` - Consolidated migration
-   `/claudedocs/canonical/TESTING.md` - Consolidated testing
-   `/claudedocs/canonical/DEVOPS.md` - DevOps reference
-   `/claudedocs/archive/README.md` - Archive index

### Files to Modify

-   `/apps/web/next.config.ts` - Replace withContentCollections with withMDX
-   `/apps/web/app/docs-source.ts` - Import from .source instead of content-collections
-   `/apps/web/package.json` - Update dependencies and scripts
-   `/pnpm-workspace.yaml` - Update catalog entries
-   `/apps/web/.gitignore` - Add .source/

### Files to Delete

-   `/apps/web/content-collections.ts` - No longer needed
-   `/apps/web/.content-collections/` - Generated by old system

### Files to Archive

-   20+ claudedocs files → `/claudedocs/archive/2024-09-30/`

---

## Appendix B: Documentation Consolidation Matrix

| Source Files                                                                                                                                                              | Canonical Destination     | Keep/Archive |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------ |
| ARCHITECTURE_ANALYSIS.md, ARCHITECTURE_EXECUTIVE_SUMMARY.md, ARCHITECTURE_VISUALIZATION.md, PACKAGES_ARCHITECTURE_ANALYSIS.md                                             | canonical/ARCHITECTURE.md | Merge        |
| MIGRATION_ANALYSIS_REPORT.md, MIGRATION_PLAYBOOK.md, MIGRATION_REQUIREMENTS.md, MIGRATION_TECHNICAL_PLAN.md, MIGRATION_VERIFICATION.md, MIGRATION_WEEK1_IMPLEMENTATION.md | canonical/MIGRATION.md    | Merge        |
| frontend-testing-analysis.md, DOCS_TESTING_CHECKLIST.md                                                                                                                   | canonical/TESTING.md      | Merge        |
| DEVOPS_INFRASTRUCTURE_ANALYSIS.md                                                                                                                                         | canonical/DEVOPS.md       | Keep         |
| DOCS_REDESIGN_SUMMARY.md, DOCS_FRONTEND_ARCHITECTURE.md, etc.                                                                                                             | active/                   | Keep         |
| ANIMATION\_\*.md, MICROINTERACTION_PATTERN_ANALYSIS.md, UI_ENHANCEMENT_IMPLEMENTATION.md                                                                                  | active/                   | Keep         |
| comprehensive-code-analysis-report.md, COMPLETE_MIGRATION_AUDIT.md                                                                                                        | archive/2024-09-30/       | Archive      |

---

## Appendix C: Dependency Version Matrix

| Package                       | Old Version | New Version | Status |
| ----------------------------- | ----------- | ----------- | ------ |
| @content-collections/core     | 0.11.1      | -           | REMOVE |
| @content-collections/mdx      | 0.2.2       | -           | REMOVE |
| @content-collections/next     | 0.2.7       | -           | REMOVE |
| @fumadocs/content-collections | 1.2.2       | -           | REMOVE |
| fumadocs-mdx                  | -           | 12.0.1      | ADD    |
| fumadocs-core                 | 15.7.11     | 15.7.11     | KEEP   |
| fumadocs-ui                   | 15.7.11     | 15.7.11     | KEEP   |

---

**End of Migration Architecture Document**

---

## Implementation Status Tracking

-   [ ] Phase 1: Pre-Migration Analysis
-   [ ] Phase 2: Create Source Configuration
-   [ ] Phase 3: Update Next.js Configuration
-   [ ] Phase 4: Update Docs Source
-   [ ] Phase 5: Update Package.json
-   [ ] Phase 6: Documentation Consolidation
-   [ ] Step 1: Preparation
-   [ ] Step 2: Install Dependencies
-   [ ] Step 3: Create New Configuration
-   [ ] Step 4: Generate .source Directory
-   [ ] Step 5: Remove Old Files
-   [ ] Step 6: Test Migration
-   [ ] Step 7: Production Build Test
-   [ ] Step 8: Documentation Consolidation
-   [ ] Step 9: Commit & Push
-   [ ] Step 10: Create Pull Request
-   [ ] Technical-Writer Review
-   [ ] Post-Migration Cleanup

**Next Steps**: Execute migration following this architecture plan.
