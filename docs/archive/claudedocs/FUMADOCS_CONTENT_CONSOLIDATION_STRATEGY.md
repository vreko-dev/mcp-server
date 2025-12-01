# SnapBack Documentation Consolidation Strategy

## Fumadocs-MDX Migration Content Plan

**Date:** 2025-10-02
**Author:** Technical Writer
**Status:** Planning Phase
**Migration Context:** content-collections → fumadocs-mdx

---

## Executive Summary

This strategy consolidates SnapBack documentation from multiple sources into a unified, high-quality fumadocs-based documentation system. The migration eliminates fumadocs example content ("acme", "lorem ipsum") and replaces it with actual SnapBack documentation.

**Current State:**

-   26 MDX files in `/apps/web/content/docs/` (actual SnapBack content)
-   31+ implementation docs in `/claudedocs/` (technical summaries)
-   Multiple READMEs across packages
-   Documentation showing fumadocs example content instead of SnapBack content

**Target State:**

-   Comprehensive fumadocs-mdx documentation structure
-   Consolidated, non-duplicate content
-   Enhanced with fumadocs-specific components
-   Clear separation of user docs vs developer/canonical docs
-   Terminal aesthetic language throughout

---

## 1. CONTENT INVENTORY & AUDIT

### 1.1 Primary User Documentation (KEEP & ENHANCE)

**Location:** `/apps/web/content/docs/`
**Count:** 26 files
**Status:** ✅ Real SnapBack content, needs organization

| File                                     | Classification | Priority | Action                                      |
| ---------------------------------------- | -------------- | -------- | ------------------------------------------- |
| `index.mdx`                              | KEEP           | P1       | Enhance with fumadocs components            |
| `getting-started/overview.mdx`           | MERGE          | P1       | Merge with setup guide, add quick start     |
| `architecture/overview.mdx`              | KEEP           | P2       | Good structure, needs fumadocs enhancements |
| `architecture/monorepo-structure.mdx`    | KEEP           | P2       | Add Files component for structure           |
| `architecture/technology-stack.mdx`      | KEEP           | P2       | Add Tabs for package manager examples       |
| `architecture/implementation.mdx`        | REVIEW         | P3       | May be too technical for user docs          |
| `development/setup.mdx`                  | MERGE          | P1       | Merge with getting-started                  |
| `development/commands.mdx`               | KEEP           | P1       | Add Tabs for different package managers     |
| `development/workflow.mdx`               | KEEP           | P2       | Add Steps component                         |
| `features/dashboard.mdx`                 | KEEP           | P1       | Core user feature                           |
| `features/api-keys.mdx`                  | KEEP           | P1       | Core user feature                           |
| `features/usage-tracking.mdx`            | KEEP           | P1       | Core user feature                           |
| `testing/overview.mdx`                   | KEEP           | P2       | Developer-focused                           |
| `testing/e2e-tests.mdx`                  | KEEP           | P2       | Developer-focused                           |
| `testing/backend-tests.mdx`              | KEEP           | P2       | Developer-focused                           |
| `deployment/overview.mdx`                | KEEP           | P2       | Operations-focused                          |
| `deployment/ci-cd.mdx`                   | KEEP           | P2       | Operations-focused                          |
| `deployment/production.mdx`              | KEEP           | P2       | Operations-focused                          |
| `api/overview.mdx`                       | KEEP           | P1       | API reference                               |
| `api/endpoints.mdx`                      | KEEP           | P1       | API reference                               |
| `troubleshooting/faq.mdx`                | KEEP           | P1       | Essential user support                      |
| `troubleshooting/common-issues.mdx`      | KEEP           | P1       | Essential user support                      |
| `components/glass-island-navigation.mdx` | MOVE           | P3       | Move to reference section                   |
| `components/infinite-moving-cards.mdx`   | MOVE           | P3       | Move to reference section                   |

**Internationalization Files:**

-   `index.de.mdx` - KEEP (German translation)
-   `getting-started/overview.de.mdx` - KEEP (German translation)

### 1.2 Implementation Documentation (ARCHIVE)

**Location:** `/claudedocs/`
**Count:** 31 files
**Status:** ⚠️ Temporary implementation notes, need classification

| File                                    | Classification | Action                    | Destination                              |
| --------------------------------------- | -------------- | ------------------------- | ---------------------------------------- |
| `DOCS_CONTENT_GUIDE.md`                 | CANONICAL      | Extract best practices    | `/claudedocs/canonical/`                 |
| `DOCS_FRONTEND_ARCHITECTURE.md`         | CANONICAL      | Keep as reference         | `/claudedocs/canonical/`                 |
| `DOCS_IMPLEMENTATION_SUMMARY.md`        | ARCHIVE        | Move to archive           | `/claudedocs/archive/2024-10/`           |
| `DOCS_REDESIGN_README.md`               | ARCHIVE        | Move to archive           | `/claudedocs/archive/2024-10/`           |
| `DOCS_REDESIGN_SUMMARY.md`              | ARCHIVE        | Move to archive           | `/claudedocs/archive/2024-10/`           |
| `DOCS_TESTING_CHECKLIST.md`             | CANONICAL      | Extract to testing guide  | `/claudedocs/canonical/`                 |
| `ARCHITECTURE_ANALYSIS.md`              | ARCHIVE        | Historical context        | `/claudedocs/archive/2024-10/`           |
| `ARCHITECTURE_EXECUTIVE_SUMMARY.md`     | ARCHIVE        | Historical context        | `/claudedocs/archive/2024-10/`           |
| `MIGRATION_*` (7 files)                 | ARCHIVE        | Historical migration docs | `/claudedocs/archive/2024-10/migration/` |
| `ANIMATION_*` (3 files)                 | ARCHIVE        | Historical implementation | `/claudedocs/archive/2024-10/`           |
| `comprehensive-code-analysis-report.md` | ARCHIVE        | Historical analysis       | `/claudedocs/archive/2024-10/`           |
| `frontend-testing-analysis.md`          | ARCHIVE        | Historical analysis       | `/claudedocs/archive/2024-10/`           |
| Others                                  | REVIEW         | Evaluate individually     | TBD                                      |

### 1.3 Package-Level Documentation (KEEP IN PLACE)

**Location:** Various `/packages/*/README.md`
**Count:** ~10 files
**Status:** ✅ Keep in packages, reference from main docs

-   `packages/database/README.md` - Keep, reference from architecture docs
-   `packages/database/DRIZZLE_SUPABASE_INTEGRATION.md` - Keep, technical reference
-   `packages/database/INTEGRATION_GUIDE.md` - Keep, developer guide
-   Root `README.md` - Update with better intro

### 1.4 Missing/Needed Documentation (CREATE)

**New essential documents to write:**

1. **Quick Start Guide** - 5-minute first checkpoint
2. **Core Concepts** - What are AI-aware checkpoints?
3. **Installation Guide** - Separate from getting started
4. **Configuration Reference** - Comprehensive config options
5. **CLI Commands Reference** - Complete CLI documentation
6. **Webhooks Guide** - API webhooks documentation
7. **Security Best Practices** - Security-focused guide
8. **Migration from content-collections** - Document this migration
9. **Glossary** - Technical terms and definitions
10. **Contributing Guide** - For open source contributors

---

## 2. PROPOSED CONTENT STRUCTURE

### 2.1 New Directory Organization

```
/apps/web/content/docs/
│
├── index.mdx                          # Main introduction
│
├── essentials/                        # NEW - Quick start essentials
│   ├── quick-start.mdx               # NEW - 5-minute guide
│   ├── core-concepts.mdx             # NEW - AI protection concepts
│   ├── installation.mdx              # NEW - From getting-started
│   └── first-checkpoint.mdx          # NEW - Tutorial
│
├── guides/                            # NEW - Task-based guides
│   ├── getting-started.mdx           # MERGED from overview + setup
│   ├── configuration.mdx             # NEW - Config guide
│   ├── dashboard-tour.mdx            # NEW - Dashboard walkthrough
│   └── recovery-workflow.mdx         # NEW - Recovery process
│
├── features/                          # EXISTING - Feature documentation
│   ├── ai-detection.mdx              # NEW - Core feature
│   ├── checkpoints.mdx               # NEW - Checkpoint system
│   ├── recovery.mdx                  # NEW - Recovery system
│   ├── dashboard.mdx                 # KEEP - Enhanced
│   ├── api-keys.mdx                  # KEEP - Enhanced
│   └── usage-tracking.mdx            # KEEP - Enhanced
│
├── development/                       # EXISTING - Developer docs
│   ├── overview.mdx                  # NEW - Dev overview
│   ├── architecture.mdx              # MERGED from architecture/*
│   ├── local-setup.mdx               # KEEP - Enhanced
│   ├── commands.mdx                  # KEEP - With Tabs
│   ├── workflow.mdx                  # KEEP - With Steps
│   ├── contributing.mdx              # NEW - Contribution guide
│   └── migration-guide.mdx           # NEW - Document this migration
│
├── api/                               # EXISTING - API documentation
│   ├── overview.mdx                  # KEEP - Enhanced
│   ├── authentication.mdx            # NEW - Auth details
│   ├── endpoints.mdx                 # KEEP - Enhanced
│   ├── webhooks.mdx                  # NEW - Webhook docs
│   └── rate-limits.mdx               # NEW - Rate limit docs
│
├── deployment/                        # EXISTING - Deployment docs
│   ├── overview.mdx                  # KEEP - Enhanced
│   ├── environment.mdx               # NEW - Environment setup
│   ├── ci-cd.mdx                     # KEEP - Enhanced
│   ├── production.mdx                # KEEP - Enhanced
│   └── monitoring.mdx                # NEW - Monitoring guide
│
├── testing/                           # EXISTING - Testing docs
│   ├── overview.mdx                  # KEEP - Enhanced
│   ├── unit-tests.mdx                # NEW - Unit testing
│   ├── e2e-tests.mdx                 # KEEP - Enhanced
│   └── backend-tests.mdx             # KEEP - Enhanced
│
├── troubleshooting/                   # EXISTING - Support docs
│   ├── faq.mdx                       # KEEP - Enhanced
│   ├── common-issues.mdx             # KEEP - Enhanced
│   ├── error-codes.mdx               # NEW - Error reference
│   └── debugging.mdx                 # NEW - Debug guide
│
└── reference/                         # NEW - Technical reference
    ├── components.mdx                # CONSOLIDATED from components/*
    ├── cli-commands.mdx              # NEW - CLI reference
    ├── configuration-options.mdx     # NEW - Config reference
    ├── architecture-diagram.mdx      # NEW - Visual architecture
    └── glossary.mdx                  # NEW - Terms & definitions
```

### 2.2 Updated meta.json Structure

```json
{
	"title": "SnapBack Documentation",
	"description": "AI-aware code protection system documentation",
	"icon": "Home",
	"pages": [
		"index",
		{
			"title": "Essentials",
			"icon": "Zap",
			"description": "Get started quickly",
			"pages": [
				"essentials/quick-start",
				"essentials/core-concepts",
				"essentials/installation",
				"essentials/first-checkpoint"
			]
		},
		{
			"title": "Guides",
			"icon": "BookOpen",
			"description": "Step-by-step guides",
			"pages": [
				"guides/getting-started",
				"guides/configuration",
				"guides/dashboard-tour",
				"guides/recovery-workflow"
			]
		},
		{
			"title": "Features",
			"icon": "Sparkles",
			"description": "Core capabilities",
			"pages": [
				"features/ai-detection",
				"features/checkpoints",
				"features/recovery",
				"features/dashboard",
				"features/api-keys",
				"features/usage-tracking"
			]
		},
		{
			"title": "Development",
			"icon": "Code2",
			"description": "Developer documentation",
			"pages": [
				"development/overview",
				"development/architecture",
				"development/local-setup",
				"development/commands",
				"development/workflow",
				"development/contributing",
				"development/migration-guide"
			]
		},
		{
			"title": "API Reference",
			"icon": "FileCode",
			"description": "API documentation",
			"pages": [
				"api/overview",
				"api/authentication",
				"api/endpoints",
				"api/webhooks",
				"api/rate-limits"
			]
		},
		{
			"title": "Deployment",
			"icon": "Rocket",
			"description": "Production deployment",
			"pages": [
				"deployment/overview",
				"deployment/environment",
				"deployment/ci-cd",
				"deployment/production",
				"deployment/monitoring"
			]
		},
		{
			"title": "Testing",
			"icon": "TestTube",
			"description": "Testing strategies",
			"pages": [
				"testing/overview",
				"testing/unit-tests",
				"testing/e2e-tests",
				"testing/backend-tests"
			]
		},
		{
			"title": "Troubleshooting",
			"icon": "LifeBuoy",
			"description": "Get help",
			"pages": [
				"troubleshooting/faq",
				"troubleshooting/common-issues",
				"troubleshooting/error-codes",
				"troubleshooting/debugging"
			]
		},
		{
			"title": "Reference",
			"icon": "Library",
			"description": "Technical reference",
			"pages": [
				"reference/components",
				"reference/cli-commands",
				"reference/configuration-options",
				"reference/architecture-diagram",
				"reference/glossary"
			]
		}
	]
}
```

### 2.3 Canonical Documentation Organization

**Location:** `/claudedocs/canonical/`
**Purpose:** Long-term architectural and design decisions

```
/claudedocs/canonical/
├── ARCHITECTURE_DECISIONS.md        # Key architectural choices
├── DESIGN_PATTERNS.md               # Established patterns
├── BEST_PRACTICES.md                # Coding standards
├── TESTING_STRATEGY.md              # Testing approach
├── CONTENT_GUIDELINES.md            # Doc writing standards
└── MIGRATION_HISTORY.md             # Major migrations log
```

### 2.4 Archive Organization

**Location:** `/claudedocs/archive/`
**Purpose:** Historical documentation by date

```
/claudedocs/archive/
├── 2024-10/
│   ├── implementation-summaries/
│   │   ├── DOCS_IMPLEMENTATION_SUMMARY.md
│   │   ├── UI_ENHANCEMENT_IMPLEMENTATION.md
│   │   └── ...
│   ├── migration-notes/
│   │   ├── MIGRATION_PLAYBOOK.md
│   │   ├── MIGRATION_TECHNICAL_PLAN.md
│   │   └── ...
│   ├── analysis-reports/
│   │   ├── ARCHITECTURE_ANALYSIS.md
│   │   ├── comprehensive-code-analysis-report.md
│   │   └── ...
│   └── README.md                     # Archive index
└── README.md                         # Archive organization
```

---

## 3. CONTENT CONSOLIDATION PLAN

### 3.1 Phase 1: Audit & Classification (Day 1)

**Tasks:**

1. ✅ Complete content inventory (DONE - this document)
2. Read all existing docs to identify duplicates
3. Create detailed content merge map
4. Identify gaps requiring new content
5. Prioritize all actions (P1-P3)

**Deliverable:** Content audit spreadsheet with all files classified

### 3.2 Phase 2: Content Merging (Days 2-3)

**Priority 1 Merges:**

1. **Getting Started Guide** - Merge:

    - `/content/docs/getting-started/overview.mdx`
    - `/content/docs/development/setup.mdx`
    - Create unified `/guides/getting-started.mdx`

2. **Architecture Documentation** - Merge:

    - `/content/docs/architecture/overview.mdx`
    - `/content/docs/architecture/monorepo-structure.mdx`
    - `/content/docs/architecture/technology-stack.mdx`
    - Create comprehensive `/development/architecture.mdx`

3. **Component Documentation** - Consolidate:
    - `/content/docs/components/glass-island-navigation.mdx`
    - `/content/docs/components/infinite-moving-cards.mdx`
    - Create unified `/reference/components.mdx`

**Priority 2 Merges:**

-   Extract best practices from `/claudedocs/DOCS_CONTENT_GUIDE.md` → `/claudedocs/canonical/CONTENT_GUIDELINES.md`
-   Consolidate testing info from multiple sources → enhanced testing docs

### 3.3 Phase 3: New Content Creation (Days 4-6)

**Essential New Documents (Terminal Aesthetic Voice):**

1. **`essentials/quick-start.mdx`**

    - 5-minute "zero to first checkpoint" guide
    - Copy-paste commands
    - Immediate value demonstration
    - Terminal-style presentation

2. **`essentials/core-concepts.mdx`**

    - What are AI-aware checkpoints?
    - How does AI detection work?
    - When to use SnapBack?
    - Recovery mechanics explained

3. **`essentials/installation.mdx`**

    - CLI installation
    - IDE extensions
    - Configuration setup
    - Verification steps

4. **`essentials/first-checkpoint.mdx`**

    - Interactive tutorial
    - Step-by-step with code examples
    - Common patterns
    - Next steps

5. **`api/authentication.mdx`**

    - API key authentication
    - Security best practices
    - Token management
    - OAuth flow (if applicable)

6. **`api/webhooks.mdx`**

    - Webhook endpoints
    - Event types
    - Security verification
    - Example payloads

7. **`development/migration-guide.mdx`**

    - Document this content-collections → fumadocs migration
    - Help future developers/forks
    - Lessons learned
    - Best practices

8. **`reference/cli-commands.mdx`**

    - Complete CLI reference
    - Command syntax
    - Options and flags
    - Examples

9. **`reference/glossary.mdx`**

    - Technical terms
    - Acronyms
    - Concepts defined
    - Cross-referenced

10. **`troubleshooting/error-codes.mdx`**
    - Error code reference
    - Causes
    - Solutions
    - Prevention

### 3.4 Phase 4: Archive Organization (Day 7)

**Archival Process:**

1. Create archive directory structure
2. Move implementation summaries to `/archive/2024-10/implementation-summaries/`
3. Move migration docs to `/archive/2024-10/migration-notes/`
4. Move analysis reports to `/archive/2024-10/analysis-reports/`
5. Create archive README with index
6. Update references to archived docs

**Archive Index Template:**

```markdown
# Documentation Archive - October 2024

## Implementation Summaries

-   [Docs Implementation](./implementation-summaries/DOCS_IMPLEMENTATION_SUMMARY.md)
-   [UI Enhancement](./implementation-summaries/UI_ENHANCEMENT_IMPLEMENTATION.md)
-   ...

## Migration Notes

-   [Migration Playbook](./migration-notes/MIGRATION_PLAYBOOK.md)
-   [Technical Plan](./migration-notes/MIGRATION_TECHNICAL_PLAN.md)
-   ...

## Analysis Reports

-   [Architecture Analysis](./analysis-reports/ARCHITECTURE_ANALYSIS.md)
-   ...
```

### 3.5 Phase 5: Canonical Extraction (Day 8)

**Extract to Canonical Docs:**

1. **ARCHITECTURE_DECISIONS.md**

    - Extract key decisions from various architecture docs
    - Document rationale for technology choices
    - Include trade-offs considered
    - Future-proof reasoning

2. **DESIGN_PATTERNS.md**

    - Extract established patterns from implementation docs
    - Component patterns
    - API patterns
    - Database patterns
    - Testing patterns

3. **BEST_PRACTICES.md**

    - Coding standards
    - Documentation standards
    - Testing standards
    - Security practices

4. **TESTING_STRATEGY.md**

    - Overall testing approach
    - Unit testing guidelines
    - E2E testing strategy
    - Performance testing
    - Extract from `/claudedocs/DOCS_TESTING_CHECKLIST.md`

5. **CONTENT_GUIDELINES.md**

    - Writing style guide
    - Terminal aesthetic voice
    - MDX component usage
    - SEO best practices
    - Extract from `/claudedocs/DOCS_CONTENT_GUIDE.md`

6. **MIGRATION_HISTORY.md**
    - Log of major migrations
    - Include this content-collections → fumadocs migration
    - Lessons learned
    - References to detailed migration docs in archive

### 3.6 Phase 6: Fumadocs Enhancement (Days 9-10)

**Enhance all docs with fumadocs components:**

1. **Add Tabs Component** (package managers, code examples)

    ````mdx
    <Tabs items={["npm", "pnpm", "yarn", "bun"]}>
    	<Tab value="npm">```bash npm install snapback ```</Tab>
    	<Tab value="pnpm">```bash pnpm add snapback ```</Tab>
    </Tabs>
    ````

2. **Add Steps Component** (tutorials, workflows)

    ```mdx
    <Steps>
    	<Step>Install SnapBack CLI</Step>
    	<Step>Initialize your project</Step>
    	<Step>Create first checkpoint</Step>
    </Steps>
    ```

3. **Add Files Component** (directory structures)

    ```mdx
    <Files>
    	<Folder name="src" defaultOpen>
    		<File name="index.ts" />
    		<Folder name="checkpoints">
    			<File name="manager.ts" />
    			<File name="detector.ts" />
    		</Folder>
    	</Folder>
    </Files>
    ```

4. **Add Callouts** (notes, warnings, tips)

    ```mdx
    > **Note:** This feature requires API key authentication.

    > **Warning:** Deleting a checkpoint cannot be undone.

    > **Tip:** Use checkpoint tags to organize your recovery points.
    ```

5. **Add Code Groups** (related code examples)

    ````mdx
    <CodeGroup>
      ```ts title="index.ts"
      import { SnapBack } from 'snapback';
    ````

    ```ts title="config.ts"
    export const config = { ... };
    ```

    </CodeGroup>
    ```

### 3.7 Phase 7: Verification & Quality (Day 11)

**Quality Checks:**

1. **Link Validation**

    - All internal links work
    - No 404s
    - Cross-references accurate
    - Navigation flows logically

2. **Content Quality**

    - Terminal aesthetic voice consistent
    - No fumadocs example content ("acme", "lorem ipsum")
    - All SnapBack-specific
    - Examples work
    - Code syntax highlighted

3. **Frontmatter Validation**

    - All pages have title
    - All pages have description
    - Appropriate icons assigned
    - SEO metadata complete

4. **Component Usage**

    - Tabs for package managers
    - Steps for workflows
    - Files for structures
    - Callouts for important info
    - Code groups where appropriate

5. **Accessibility**

    - Heading hierarchy correct
    - Alt text on images
    - Descriptive link text
    - ARIA labels where needed

6. **Mobile Responsiveness**
    - Renders correctly on mobile
    - Tables scroll horizontally
    - Code blocks readable
    - Navigation works

---

## 4. CONTENT QUALITY IMPROVEMENTS

### 4.1 Frontmatter Standards

**Required frontmatter for every page:**

```yaml
---
title: Clear, Descriptive Title (Max 60 chars)
description: One-sentence summary for SEO (120-150 chars)
icon: RelevantLucideIcon (optional but recommended)
---
```

**Examples:**

```yaml
# Good
---
title: Quick Start Guide
description: Get SnapBack running in 5 minutes and create your first AI-aware checkpoint
icon: Zap
---
# Bad
---
title: Getting Started
description: This page explains how to get started.
---
```

### 4.2 Content Structure Template

**Standard page structure:**

```mdx
---
title: [Descriptive Title]
description: [One-sentence summary]
icon: [LucideIcon]
---

# {title}

## Overview

[2-3 sentence introduction explaining what this page covers]

## Prerequisites

[What users need before following this guide]

## [Main Content Section]

[Step-by-step instructions or conceptual explanation]

### [Subsection 1]

[Detailed content with code examples]

### [Subsection 2]

[Detailed content with code examples]

## Examples

[Practical examples with fumadocs components]

## Troubleshooting

[Common issues and solutions]

## Next Steps

-   [Link to related page 1]
-   [Link to related page 2]
```

### 4.3 Writing Style Guide - Terminal Aesthetic

**Voice & Tone:**

-   **Active, Direct:** "Run `snapback init`" not "The init command should be run"
-   **Developer-Focused:** Speak to developers, not end users
-   **Terminal-Inspired:** Use CLI metaphors, command-line language
-   **Concise:** Short sentences, bullet points, scannable
-   **Confident:** "This protects your code" not "This might help protect"

**Terminal Language Examples:**

-   ✅ "Execute the checkpoint command"
-   ✅ "Your codebase is now protected"
-   ✅ "Recovery initiated"
-   ✅ "Checkpoint created successfully"
-   ❌ "You might want to try creating a checkpoint"
-   ❌ "This could potentially help"
-   ❌ "Feel free to..."

**Code Examples:**

-   Always use syntax highlighting
-   Include terminal prompts (`$` or `>`)
-   Show actual output
-   Use realistic examples (no "foo", "bar")

````mdx
# Good Example

\```bash
$ snapback checkpoint create --tag "before-refactor"
✓ Checkpoint created: cp_xyz123
✓ Protected: 45 files, 12,847 lines
\```

# Bad Example

\```
snapback checkpoint create
\```
````

### 4.4 Fumadocs Component Usage Guidelines

**When to Use Each Component:**

1. **Tabs** - Multiple alternatives (package managers, languages, approaches)
2. **Steps** - Sequential workflows, tutorials, processes
3. **Files** - Directory structures, file organization
4. **Callouts** - Important notes, warnings, tips, version info
5. **Code Groups** - Related code files, before/after comparisons
6. **Accordions** - Optional details, advanced topics, FAQs

**Component Standards:**

````mdx
<!-- Package Manager Examples - ALWAYS use Tabs -->
<Tabs items={['npm', 'pnpm', 'yarn', 'bun']}>
  <Tab value="npm">
    \```bash
    npm install snapback
    \```
  </Tab>
  <!-- ... other tabs -->
</Tabs>

<!-- Workflows - ALWAYS use Steps -->

<Steps>
	<Step>Install SnapBack CLI globally</Step>
	<Step>Initialize in your project directory</Step>
	<Step>Create your first checkpoint</Step>
</Steps>

<!-- Important Info - Use Callouts -->

> **Note:** API keys are generated once and cannot be recovered.

> **Warning:** Deleting a checkpoint removes all associated recovery points.

> **Tip:** Tag checkpoints with meaningful names for easier identification.

<!-- Directory Structures - Use Files -->

<Files>
	<Folder name=".snapback" defaultOpen>
		<File name="config.json" />
		<Folder name="checkpoints">
			<File name="cp_xyz123.json" />
		</Folder>
	</Folder>
</Files>
````

---

## 5. MIGRATION-SPECIFIC CONTENT

### 5.1 New Migration Guide Document

**Create:** `/apps/web/content/docs/development/migration-guide.mdx`

```mdx
---
title: Migration Guide - content-collections to fumadocs
description: How we migrated SnapBack documentation from content-collections to fumadocs-mdx
icon: GitBranch
---

# Documentation Migration Guide

## Overview

This guide documents the migration from content-collections to fumadocs-mdx for the SnapBack documentation system.

## Why Migrate?

### Issues with content-collections

-   Outdated build from September 29
-   Showing fumadocs example content instead of actual docs
-   Limited component support
-   Build performance issues

### Benefits of fumadocs-mdx

-   Native MDX support with React components
-   Better component library (Tabs, Steps, Files)
-   Improved performance
-   Active maintenance
-   Better TypeScript integration

## Migration Process

### Phase 1: Content Inventory

[Document the audit process]

### Phase 2: Content Consolidation

[Document the merge strategy]

### Phase 3: Component Migration

[Document component replacements]

### Phase 4: Verification

[Document testing approach]

## Lessons Learned

### What Worked Well

-   Progressive content migration
-   Maintaining existing URL structure
-   Using fumadocs components from the start

### Challenges

-   Duplicate content identification
-   Component API differences
-   Build configuration changes

## Best Practices for Future Migrations

1. **Audit First** - Complete content inventory before changes
2. **Preserve URLs** - Maintain existing URL structure
3. **Gradual Migration** - Migrate in phases, not all at once
4. **Component Library** - Choose component library early
5. **Content Templates** - Establish templates before migration

## References

-   [Fumadocs Documentation](https://fumadocs.vercel.app)
-   [Migration Archive](/claudedocs/archive/2024-10/migration-notes/)
-   [Content Consolidation Strategy](/claudedocs/FUMADOCS_CONTENT_CONSOLIDATION_STRATEGY.md)
```

### 5.2 Update Root README.md

**Enhance:** `/README.md`

````markdown
# SnapBack

> AI-aware code protection system that automatically creates intelligent checkpoints before AI assistants make changes to your codebase.

## Overview

SnapBack is an innovative developer tool that:

-   **Detects AI Modifications**: Automatically identifies when AI assistants are editing your code
-   **Creates Smart Checkpoints**: Generates intelligent recovery points before AI changes
-   **Enables Instant Recovery**: One-click rollback when AI changes break your code
-   **Tracks Usage**: Monitors API usage and enforces plan-based limits

## Quick Start

```bash
# Install SnapBack CLI
npm install -g snapback

# Initialize in your project
snapback init

# Create your first checkpoint
snapback checkpoint create --tag "initial"
```
````

## Documentation

📘 **[Full Documentation](https://snapback.dev/docs)**

### Key Sections

-   [Quick Start Guide](https://snapback.dev/docs/essentials/quick-start) - Get running in 5 minutes
-   [Core Concepts](https://snapback.dev/docs/essentials/core-concepts) - Understand AI-aware checkpoints
-   [API Reference](https://snapback.dev/docs/api/overview) - Complete API documentation
-   [Development Guide](https://snapback.dev/docs/development/overview) - Contributing and architecture

## Technology Stack

-   **Frontend**: Next.js 15, React 19, TypeScript
-   **Backend**: HONO with oRPC (type-safe APIs)
-   **Database**: PostgreSQL with Drizzle ORM
-   **Auth**: Better Auth
-   **Testing**: Playwright (E2E), Vitest (unit)
-   **Monorepo**: Turborepo + PNPM

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

See [Development Documentation](https://snapback.dev/docs/development/local-setup) for detailed setup instructions.

## Project Structure

This is a monorepo containing:

-   `apps/web` - Next.js application
-   `packages/*` - Shared packages (database, auth, api, etc.)
-   `clients/*` - SnapBack client libraries
-   `extensions/*` - IDE extensions

See [Architecture Documentation](https://snapback.dev/docs/development/architecture) for details.

## Contributing

We welcome contributions! See our [Contributing Guide](https://snapback.dev/docs/development/contributing) for:

-   Development workflow
-   Code standards
-   Testing requirements
-   PR process

## License

[Your License Here]

## Links

-   📘 [Documentation](https://snapback.dev/docs)
-   🚀 [Live Demo](https://snapback.dev)
-   🐛 [Report Issues](https://github.com/yourorg/snapback/issues)
-   💬 [Discussions](https://github.com/yourorg/snapback/discussions)

```

---

## 6. EXECUTION TIMELINE

### Week 1: Planning & Audit (Days 1-2)
- ✅ Day 1: Complete content inventory (this document)
- Day 2: Detailed file-by-file classification
- Day 2: Create content merge map
- Day 2: Identify all gaps and new content needed

### Week 2: Content Consolidation (Days 3-7)
- Day 3: Merge getting started + setup docs
- Day 4: Merge architecture documentation
- Day 5: Consolidate component documentation
- Day 6: Extract canonical documentation
- Day 7: Organize archive structure

### Week 3: New Content Creation (Days 8-12)
- Day 8: Create essentials/* docs (quick-start, core-concepts)
- Day 9: Create new API docs (authentication, webhooks)
- Day 10: Create reference docs (CLI, glossary, config)
- Day 11: Create troubleshooting docs (error-codes, debugging)
- Day 12: Create migration guide and update README

### Week 4: Enhancement & Verification (Days 13-15)
- Day 13: Add fumadocs components to all docs
- Day 14: Quality assurance (links, formatting, accessibility)
- Day 15: Final verification and launch

---

## 7. DELIVERABLES CHECKLIST

### Documentation Deliverables

- [ ] **Content Audit Spreadsheet**
  - All files inventoried
  - Classification complete (keep/merge/archive/canonical)
  - Priority assigned (P1-P3)
  - Actions defined for each file

- [ ] **Consolidated Documentation**
  - [ ] Merged getting started guide
  - [ ] Merged architecture documentation
  - [ ] Consolidated component documentation
  - [ ] All new essential documents created
  - [ ] All new reference documents created

- [ ] **Enhanced Content Structure**
  - [ ] Updated meta.json with new organization
  - [ ] All frontmatter standardized
  - [ ] Fumadocs components added throughout
  - [ ] Terminal aesthetic voice consistent
  - [ ] No fumadocs example content remaining

- [ ] **Canonical Documentation**
  - [ ] ARCHITECTURE_DECISIONS.md
  - [ ] DESIGN_PATTERNS.md
  - [ ] BEST_PRACTICES.md
  - [ ] TESTING_STRATEGY.md
  - [ ] CONTENT_GUIDELINES.md
  - [ ] MIGRATION_HISTORY.md

- [ ] **Organized Archive**
  - [ ] /archive/2024-10/ structure created
  - [ ] Implementation summaries moved
  - [ ] Migration notes moved
  - [ ] Analysis reports moved
  - [ ] Archive README created

- [ ] **Content Templates**
  - [ ] Frontmatter template
  - [ ] Guide template
  - [ ] API reference template
  - [ ] Troubleshooting template
  - [ ] Reference template

- [ ] **Writing Guidelines**
  - [ ] Terminal aesthetic style guide
  - [ ] Code example standards
  - [ ] Component usage guidelines
  - [ ] SEO best practices

### Quality Assurance

- [ ] **Link Validation**
  - [ ] All internal links tested
  - [ ] No 404 errors
  - [ ] Cross-references accurate
  - [ ] Navigation flows logically

- [ ] **Content Quality**
  - [ ] No duplicate content
  - [ ] All SnapBack-specific (no example content)
  - [ ] Terminal voice consistent
  - [ ] Code examples work
  - [ ] Syntax highlighting correct

- [ ] **Accessibility**
  - [ ] Heading hierarchy correct
  - [ ] Alt text on all images
  - [ ] Descriptive link text
  - [ ] ARIA labels where needed
  - [ ] Keyboard navigation works

- [ ] **Mobile Responsiveness**
  - [ ] Renders correctly on mobile
  - [ ] Tables scroll or stack
  - [ ] Code blocks readable
  - [ ] Navigation drawer works

- [ ] **SEO Optimization**
  - [ ] All pages have title
  - [ ] All pages have description
  - [ ] Meta tags complete
  - [ ] Semantic HTML used

---

## 8. COORDINATION WITH FRONTEND-ARCHITECT

### Handoff Points

**After Frontend-Architect completes technical migration:**

1. **Receive Updated Structure**
   - New fumadocs-mdx configuration
   - Updated component library
   - New routing structure
   - Build configuration

2. **Content Writer Actions**
   - Reorganize content per new structure
   - Verify fumadocs components work
   - Update all navigation paths
   - Test all links and references

3. **Collaborative Verification**
   - Joint review of navigation
   - Verify component functionality
   - Test mobile responsiveness
   - Accessibility audit

4. **Launch Preparation**
   - Final content quality check
   - SEO verification
   - Performance testing
   - Deployment coordination

### Communication Protocol

**Regular Check-ins:**
- Daily standups during migration weeks
- Shared progress tracking document
- Immediate escalation of blockers
- Weekly milestone reviews

**Shared Responsibility:**
- Frontend-Architect: Technical implementation
- Technical Writer: Content quality and organization
- Joint: User experience and navigation flow

---

## 9. SUCCESS METRICS

### Content Quality Metrics

- **Coverage**: 100% of SnapBack features documented
- **Freshness**: No outdated content (all current as of migration date)
- **Accuracy**: All code examples tested and working
- **Completeness**: No "TODO" or "Coming soon" placeholders
- **Consistency**: Terminal aesthetic voice throughout

### User Experience Metrics

- **Findability**: Users can locate information in <3 clicks
- **Readability**: Flesch reading score >60 for user-facing docs
- **Accessibility**: WCAG 2.1 AA compliance
- **Mobile**: 100% mobile responsive
- **Performance**: Documentation pages load in <2s

### Technical Metrics

- **Build Success**: Zero build errors
- **Link Integrity**: Zero broken internal links
- **SEO**: All pages have optimized metadata
- **Components**: Fumadocs components used appropriately
- **No Example Content**: Zero fumadocs example content remaining

### Migration Success Criteria

✅ **Migration Complete When:**
1. All SnapBack content consolidated and enhanced
2. No fumadocs example content ("acme", "lorem ipsum") remaining
3. All navigation working correctly
4. All links verified
5. Mobile responsiveness confirmed
6. Accessibility validated
7. SEO optimization complete
8. Performance benchmarks met
9. Content quality review passed
10. User acceptance testing complete

---

## 10. RISK MITIGATION

### Potential Risks & Mitigation

**Risk 1: Content Loss During Migration**
- *Mitigation*: Git version control, backup before changes
- *Rollback Plan*: Revert to previous commit

**Risk 2: Broken Links After Reorganization**
- *Mitigation*: Comprehensive link audit before and after
- *Tool*: Automated link checker in CI/CD

**Risk 3: Inconsistent Voice/Tone**
- *Mitigation*: Style guide reference, peer review
- *Tool*: Grammarly/linting for consistency

**Risk 4: Fumadocs Components Not Working**
- *Mitigation*: Test each component type early
- *Coordination*: Close collaboration with Frontend-Architect

**Risk 5: Timeline Overrun**
- *Mitigation*: Prioritized task list (P1-P3)
- *Contingency*: Focus on P1 tasks, defer P3 if needed

**Risk 6: Accessibility Issues**
- *Mitigation*: Accessibility checklist at each phase
- *Tool*: Automated accessibility testing (axe, Lighthouse)

---

## 11. POST-MIGRATION MAINTENANCE

### Ongoing Content Maintenance

**Monthly Review Cycle:**
- Links validation (automated)
- Code example verification
- Dependency version updates
- New feature documentation
- Deprecated feature updates

**Quarterly Content Audit:**
- User feedback review
- Analytics review (most/least visited pages)
- SEO performance check
- Accessibility re-validation
- Mobile responsiveness check

**Version Updates:**
- Document all breaking changes
- Update migration guides
- Archive old version docs
- Maintain changelog

### Content Contribution Workflow

**For New Features:**
1. Create documentation draft alongside feature
2. Technical writer review
3. Add to appropriate section
4. Update navigation
5. Cross-reference from related pages

**For Documentation Improvements:**
1. Anyone can suggest via PR
2. Follow content templates
3. Match terminal aesthetic voice
4. Include fumadocs components
5. Technical writer final review

---

## 12. APPENDIX

### A. Lucide Icons Reference

**Common Documentation Icons:**
```

Zap - Quick start, essentials
BookOpen - Guides, tutorials
Sparkles - Features
Code2 - Development, code
FileCode - API, technical reference
Rocket - Deployment, production
TestTube - Testing
LifeBuoy - Troubleshooting, support
Library - Reference documentation
Settings - Configuration
Terminal - CLI, commands
Shield - Security
Database - Data, storage
GitBranch - Version control, migration

````

### B. Fumadocs Component Examples

**Complete Examples Repository:**
- See `/apps/web/content/docs/reference/fumadocs-components-examples.mdx` (to be created)

### C. Terminal Aesthetic Language Bank

**Action Verbs:**
- Execute, run, initialize, deploy, commit, push
- Create, generate, build, compile, bundle
- Protect, secure, verify, validate, authenticate
- Monitor, track, log, analyze, report

**System Responses:**
- ✓ Success, ✗ Failed, → Processing
- Initiated, Completed, In Progress
- Protected, Secured, Verified

**Command Language:**
- "Run the following command"
- "Execute in your terminal"
- "Initialize with"
- "Deploy using"

### D. Content Audit Spreadsheet Template

| File Path | Current Location | Classification | Priority | Action | New Location | Assigned To | Status | Notes |
|-----------|-----------------|----------------|----------|--------|--------------|-------------|--------|-------|
| index.mdx | /content/docs/ | KEEP | P1 | Enhance | /content/docs/ | Writer | Pending | Add fumadocs components |
| getting-started/overview.mdx | /content/docs/ | MERGE | P1 | Merge with setup | /content/docs/guides/getting-started.mdx | Writer | Pending | Combine with development/setup.mdx |

### E. Quality Checklist Template

```markdown
## Page Quality Checklist: [Page Name]

### Content
- [ ] Title clear and descriptive (<60 chars)
- [ ] Description optimized for SEO (120-150 chars)
- [ ] Icon assigned and appropriate
- [ ] Terminal aesthetic voice consistent
- [ ] No fumadocs example content
- [ ] Code examples work and tested
- [ ] Syntax highlighting correct

### Structure
- [ ] Frontmatter complete
- [ ] Heading hierarchy correct (h1 → h2 → h3)
- [ ] Prerequisites section (if applicable)
- [ ] Examples section
- [ ] Next steps / related pages

### Components
- [ ] Tabs used for package managers
- [ ] Steps used for workflows
- [ ] Files used for directory structures
- [ ] Callouts used for important info
- [ ] Code groups for related code

### Links
- [ ] All internal links work
- [ ] All external links open in new tab
- [ ] Cross-references accurate
- [ ] Navigation context correct

### Accessibility
- [ ] Alt text on images
- [ ] Descriptive link text (not "click here")
- [ ] ARIA labels where needed
- [ ] Keyboard navigation works

### Mobile
- [ ] Renders correctly on mobile
- [ ] Touch targets adequate (44x44px min)
- [ ] Code blocks scroll horizontally
- [ ] Tables responsive
````

---

## NEXT STEPS

1. **Frontend-Architect**: Complete technical fumadocs-mdx migration
2. **Technical Writer**: Execute content consolidation per this strategy
3. **Collaborative**: Joint verification and quality assurance
4. **Launch**: Deploy updated documentation

**This strategy document serves as the master plan for content consolidation. All content work should reference and follow this strategy.**

---

**Document Version:** 1.0
**Last Updated:** 2025-10-02
**Owner:** Technical Writer
**Status:** ✅ Ready for Execution
**Estimated Completion:** 15 working days from start
