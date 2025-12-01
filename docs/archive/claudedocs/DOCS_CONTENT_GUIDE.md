# Documentation Content Guide

**For Technical Writers**
**Date:** 2025-10-02

## Overview

This guide explains the new documentation structure and how to organize content effectively within the improved frontend architecture.

## Navigation Structure

The documentation now uses a hierarchical structure with progressive disclosure. Here's how it's organized:

### Current Navigation Hierarchy

```
📘 Introduction (index.mdx)

📖 Getting Started
  └─ Overview

✨ Features
  ├─ Dashboard
  ├─ API Keys
  └─ Usage Tracking

🏗️ Architecture
  ├─ Overview
  ├─ Monorepo Structure
  └─ Technology Stack

🔧 Development
  ├─ Setup
  ├─ Commands
  └─ Workflow

🧪 Testing
  ├─ Overview
  ├─ E2E Tests
  └─ Backend Tests

🚀 Deployment
  ├─ Overview
  ├─ CI/CD
  └─ Production

📄 API Reference
  ├─ Overview
  └─ Endpoints

🆘 Troubleshooting
  ├─ FAQ
  └─ Common Issues

⚙️ Components (for developers)
  ├─ Glass Island Navigation
  └─ Infinite Moving Cards
```

## Adding New Documentation

### 1. Create MDX File

Create your new documentation file in the appropriate directory:

```bash
/apps/web/content/docs/
  ├── getting-started/
  ├── features/
  ├── architecture/
  ├── development/
  ├── testing/
  ├── deployment/
  ├── api/
  ├── troubleshooting/
  └── components/
```

**Example:**

```mdx
---
title: Your Page Title
description: Brief description for SEO and preview
---

# Your Page Title

Your content here...
```

### 2. Update meta.json

Add your page to `/apps/web/content/docs/meta.json`:

**For a new page in existing section:**

```json
{
	"title": "Getting Started",
	"icon": "BookOpen",
	"pages": [
		"getting-started/overview",
		"getting-started/your-new-page" // Add here
	]
}
```

**For a new section:**

```json
{
	"title": "Your New Section",
	"icon": "IconName", // See icon list below
	"description": "Optional subtitle",
	"pages": ["section/page1", "section/page2"]
}
```

### 3. Available Icons

Use these Lucide icon names in meta.json:

**Documentation Icons:**

-   `BookOpen` - Learning, getting started
-   `BookMarked` - Guides, tutorials
-   `FileText` - General documentation
-   `FileCode` - Code, API reference
-   `BookText` - Detailed guides

**Feature Icons:**

-   `Sparkles` - Features, capabilities
-   `Zap` - Quick actions, shortcuts
-   `Star` - Highlights, important
-   `Trophy` - Achievements, best practices

**Technical Icons:**

-   `Blocks` - Architecture, structure
-   `Code2` - Components, code
-   `Wrench` - Tools, development
-   `Settings` - Configuration
-   `Terminal` - CLI, commands

**Process Icons:**

-   `TestTube` - Testing, quality
-   `Rocket` - Deployment, launch
-   `GitBranch` - Version control
-   `Package` - Dependencies, packages

**Support Icons:**

-   `LifeBuoy` - Help, troubleshooting
-   `MessageSquare` - Community, discussion
-   `HelpCircle` - FAQ, questions
-   `AlertCircle` - Warnings, important notes

## Content Organization Best Practices

### Progressive Disclosure

Follow this pattern for content depth:

**Level 1: Essential (Always Visible)**

-   Getting Started
-   Core Features
-   Quick References

**Level 2: Common Tasks (Expanded by default)**

-   Development guides
-   Testing procedures
-   Deployment workflows

**Level 3: Reference (Collapsed by default)**

-   API documentation
-   Architecture details
-   Advanced configurations

**Level 4: Specialized (Collapsed by default)**

-   Component documentation (for developers)
-   Troubleshooting (when needed)
-   Edge cases

### Page Structure Template

```mdx
---
title: Clear, Action-Oriented Title
description: One-sentence summary (150 chars max)
---

# {title}

## Overview

Brief introduction (2-3 sentences) explaining what this page covers.

## Prerequisites

What users need before following this guide.

## Main Content Section

Step-by-step instructions or conceptual explanation.

### Subsection 1

Detailed content...

### Subsection 2

Detailed content...

## Examples

Practical code examples with explanations.

## Troubleshooting

Common issues and solutions.

## Next Steps

Where to go from here (related pages).
```

### Writing Style Guidelines

**Do:**

-   ✅ Start with the user's goal ("To deploy your application...")
-   ✅ Use active voice ("Run the command" not "The command should be run")
-   ✅ Provide context before details
-   ✅ Include code examples with explanations
-   ✅ Link to related documentation
-   ✅ Use callouts for important information

**Don't:**

-   ❌ Assume prior knowledge without linking to prerequisites
-   ❌ Use jargon without explanation
-   ❌ Create circular references
-   ❌ Mix conceptual and procedural content
-   ❌ Omit error handling guidance

### Using MDX Components

The following components are available in all documentation pages:

**Code Blocks:**

```tsx
// Syntax highlighting automatic
const example = "code here";
```

**Tabs:**

````mdx
<Tabs items={["npm", "pnpm", "yarn"]}>
	<Tab value="npm">```bash npm install ```</Tab>
	<Tab value="pnpm">```bash pnpm install ```</Tab>
</Tabs>
````

**Steps:**

```mdx
<Steps>
	<Step>First step content</Step>
	<Step>Second step content</Step>
	<Step>Third step content</Step>
</Steps>
```

**File Trees:**

```mdx
<Files>
	<Folder name="src">
		<File name="index.ts" />
		<File name="app.ts" />
	</Folder>
	<File name="package.json" />
</Files>
```

**Images:**

```mdx
![Alt text](path/to/image.png)
// Automatically gets zoom capability and border
```

## SEO and Metadata

### Title Guidelines

**Format:** `{Page Title} | SnapBack Documentation`

-   Keep under 60 characters
-   Include primary keyword
-   Be descriptive and unique

**Examples:**

-   ✅ "Getting Started with SnapBack | SnapBack Documentation"
-   ✅ "API Key Management | SnapBack Documentation"
-   ❌ "Getting Started" (too generic)
-   ❌ "How to Get Started with SnapBack and Create Your First Checkpoint" (too long)

### Description Guidelines

**Format:** One clear sentence explaining the page content

-   120-150 characters optimal
-   Include relevant keywords naturally
-   Avoid duplication across pages

**Examples:**

-   ✅ "Learn how to set up SnapBack, generate API keys, and create your first intelligent code checkpoint."
-   ✅ "Comprehensive guide to SnapBack's architecture, including monorepo structure and technology stack."
-   ❌ "This page explains everything." (too vague)
-   ❌ "SnapBack is a system that..." (too generic)

## Cross-Referencing

### Linking Strategy

**Internal Links (Preferred):**

```mdx
[Link text](/docs/section/page)
```

**Related Pages Section:**

```mdx
## Related Documentation

-   [Getting Started](/docs/getting-started/overview)
-   [API Reference](/docs/api/overview)
-   [Troubleshooting](/docs/troubleshooting/faq)
```

### Navigation Flow

Ensure logical progression through documentation:

1. **Introduction** → Getting Started
2. **Getting Started** → Features OR Development
3. **Features** → Development OR Architecture
4. **Development** → Testing
5. **Testing** → Deployment
6. **Deployment** → Troubleshooting (when needed)

## Accessibility Considerations

### Writing for Accessibility

**Do:**

-   ✅ Use descriptive link text ("Read the deployment guide" not "Click here")
-   ✅ Provide alt text for images
-   ✅ Use proper heading hierarchy (h1 → h2 → h3, no skipping)
-   ✅ Write clear, simple sentences
-   ✅ Define acronyms on first use

**Don't:**

-   ❌ Use color alone to convey meaning
-   ❌ Use "above" or "below" (use "previous section" or "following section")
-   ❌ Create overly complex tables
-   ❌ Embed critical information only in images

### Heading Hierarchy

```mdx
# Page Title (h1) - ONE per page

## Major Section (h2)

### Subsection (h3)

#### Detail Point (h4) - Use sparingly

Never skip levels (h1 → h3)
```

## Content Maintenance

### Regular Review Checklist

Monthly review of documentation:

-   [ ] Links still valid (no 404s)
-   [ ] Code examples work with latest version
-   [ ] Screenshots up to date
-   [ ] Dependencies versions accurate
-   [ ] Terminology consistent across docs
-   [ ] New features documented
-   [ ] Deprecated features marked

### Version Management

When documenting version-specific features:

```mdx
> **Note:** This feature is available in v2.0 and later.

> **Deprecated:** This method is deprecated as of v3.0. Use [new method](/docs/new-approach) instead.
```

## Footer Link Management

The documentation footer lives in `/apps/web/modules/marketing/docs/components/DocsFooter.tsx`.

To update footer links:

1. Edit the component file
2. Modify the appropriate section (Documentation, Resources, Legal)
3. Use `LocaleLink` for internal links
4. Use `<a>` tags for external links with `target="_blank"` and `rel="noopener noreferrer"`

**Example:**

```tsx
<LocaleLink
	href="/docs/new-section"
	className="text-muted-foreground hover:text-primary transition-colors"
>
	New Section
</LocaleLink>
```

## Component Documentation Guidelines

Component documentation (in `/components/` directory) should:

1. **Target Audience:** Developers extending SnapBack
2. **Required Sections:**

    - Component purpose
    - Props API
    - Usage examples
    - Accessibility notes
    - Styling customization

3. **Template:**

```mdx
---
title: Component Name
description: Brief component description
---

# Component Name

## Purpose

What this component does and when to use it.

## Installation

How to import and include the component.

## Usage

Basic usage example.

## Props

| Prop  | Type   | Default | Description |
| ----- | ------ | ------- | ----------- |
| prop1 | string | -       | Description |

## Examples

Multiple usage examples with variations.

## Accessibility

ARIA attributes, keyboard support, screen reader behavior.

## Customization

How to style and extend the component.
```

## Questions?

For questions about content organization or frontend architecture:

-   Review `/claudedocs/DOCS_FRONTEND_ARCHITECTURE.md`
-   Check Fumadocs documentation at https://fumadocs.vercel.app
-   Consult the development team

---

**Last Updated:** 2025-10-02
**Maintained By:** SnapBack Documentation Team
