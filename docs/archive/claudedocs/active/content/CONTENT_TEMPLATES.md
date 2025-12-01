# SnapBack Documentation Content Templates

## Fumadocs-MDX Writing Templates & Examples

**Date:** 2025-10-02
**Purpose:** Standardized templates for consistent, high-quality documentation
**Migration:** content-collections → fumadocs-mdx

---

## FRONTMATTER STANDARDS

### Required Frontmatter Template

```yaml
---
title: Clear, Descriptive Title
description: One-sentence summary optimized for SEO (120-150 characters)
icon: LucideIconName
---
```

### Optional Frontmatter Fields

```yaml
---
title: Page Title
description: SEO-optimized description
icon: IconName
# Optional fields:
author: Author Name
date: 2025-10-02
tags: [tag1, tag2, tag3]
difficulty: beginner|intermediate|advanced
estimatedTime: 5-10 minutes
---
```

### Frontmatter Examples

**Good Examples:**

```yaml
---
title: Quick Start Guide
description: Get SnapBack running in 5 minutes and create your first AI-aware checkpoint
icon: Zap
difficulty: beginner
estimatedTime: 5 minutes
---
```

```yaml
---
title: API Authentication
description: Secure your SnapBack API with API keys, OAuth tokens, and webhook verification
icon: Shield
difficulty: intermediate
estimatedTime: 10 minutes
---
```

**Bad Examples:**

```yaml
---
title: Getting Started
description: This page helps you get started.
---
# ❌ Too vague, no icon, poor SEO
```

```yaml
---
title: How to Get Started with SnapBack and Create Your First Checkpoint Using the CLI
description: Learn everything about SnapBack.
---
# ❌ Title too long, description too vague
```

---

## 1. GUIDE/TUTORIAL TEMPLATE

### File: `guides/template.mdx`

````mdx
---
title: [Action-Oriented Title]
description: [One sentence describing what user will achieve]
icon: BookOpen
difficulty: [beginner|intermediate|advanced]
estimatedTime: [X-Y minutes]
---

# [Title]

## Overview

[2-3 sentence introduction explaining:

-   What this guide covers
-   Who it's for
-   What the user will achieve]

## Prerequisites

Before starting, ensure you have:

-   [ ] Prerequisite 1
-   [ ] Prerequisite 2
-   [ ] Prerequisite 3

> **Note:** [Important prerequisite note if needed]

## What You'll Build

By the end of this guide, you'll have:

-   ✓ Outcome 1
-   ✓ Outcome 2
-   ✓ Outcome 3

---

## Step 1: [First Major Step]

[Brief description of what this step accomplishes]

<Steps>
  <Step>
    ### [Substep 1]

    [Detailed instructions]

    <Tabs items={['npm', 'pnpm', 'yarn', 'bun']}>
      <Tab value="npm">
        ```bash
        npm install snapback
        ```
      </Tab>
      <Tab value="pnpm">
        ```bash
        pnpm add snapback
        ```
      </Tab>
      <Tab value="yarn">
        ```bash
        yarn add snapback
        ```
      </Tab>
      <Tab value="bun">
        ```bash
        bun add snapback
        ```
      </Tab>
    </Tabs>

  </Step>

  <Step>
    ### [Substep 2]

    [Instructions with code example]

    ```typescript title="config.ts"
    export const config = {
      apiKey: process.env.SNAPBACK_API_KEY,
      autoCheckpoint: true
    };
    ```

  </Step>

  <Step>
    ### [Substep 3]

    [Instructions]

    > **Tip:** [Helpful tip for this step]

  </Step>
</Steps>

### Verify Step 1

Run the following to verify:

```bash
$ snapback status
✓ SnapBack initialized
✓ API key configured
✓ Ready to create checkpoints
```
````

---

## Step 2: [Second Major Step]

[Description]

<Steps>
  <Step>
    ### [Substep 1]

    [Instructions]

  </Step>

  <Step>
    ### [Substep 2]

    [Instructions]

  </Step>
</Steps>

---

## Step 3: [Third Major Step]

[Continue pattern...]

---

## Complete Example

Here's the complete working example:

<CodeGroup>
  ```typescript title="index.ts"
  import { SnapBack } from 'snapback';

const snapback = new SnapBack({
apiKey: process.env.SNAPBACK_API_KEY
});

// Create checkpoint
await snapback.checkpoint.create({
tag: 'before-changes'
});

````

```typescript title="config.ts"
export const config = {
  apiKey: process.env.SNAPBACK_API_KEY,
  autoCheckpoint: true,
  retentionDays: 30
};
````

```json title="package.json"
{
	"dependencies": {
		"snapback": "^1.0.0"
	}
}
```

</CodeGroup>

---

## Troubleshooting

### Issue: [Common Problem]

**Error:**

```
Error message here
```

**Cause:** [Why this happens]

**Solution:**

```bash
# Fix command
snapback reset --config
```

### Issue: [Another Common Problem]

[Solution...]

---

## Next Steps

Now that you've completed this guide, you can:

-   [Next logical step 1](/docs/path/to/next-guide)
-   [Related feature](/docs/related-feature)
-   [Advanced topic](/docs/advanced-topic)

### Related Documentation

-   [Related Guide 1](/docs/guides/related-1)
-   [Related Guide 2](/docs/guides/related-2)
-   [API Reference](/docs/api/overview)

---

## Summary

In this guide, you:

-   ✅ Accomplished task 1
-   ✅ Accomplished task 2
-   ✅ Accomplished task 3

> **What's Next?** [Suggestion for next learning path]

````

---

## 2. FEATURE DOCUMENTATION TEMPLATE

### File: `features/template.mdx`

```mdx
---
title: [Feature Name]
description: [What this feature does and why it matters]
icon: Sparkles
---

# [Feature Name]

## Overview

[2-3 sentences explaining:
- What the feature is
- Why it exists
- Key benefits]

## How It Works

[Technical explanation of the feature mechanics]

### Architecture

[High-level architecture diagram or explanation]

<Files>
  <Folder name="Feature Components" defaultOpen>
    <File name="detector.ts" />
    <File name="processor.ts" />
    <File name="manager.ts" />
  </Folder>
</Files>

---

## Key Capabilities

### Capability 1: [Name]

[Description of capability]

**Example:**
```typescript
// Code example demonstrating capability
const result = await feature.capability1();
````

### Capability 2: [Name]

[Description]

**Example:**

```typescript
// Code example
```

### Capability 3: [Name]

[Description]

---

## Usage

### Basic Usage

```typescript title="basic-usage.ts"
import { Feature } from "snapback";

const feature = new Feature({
	option1: "value1",
	option2: true,
});

await feature.execute();
```

### Advanced Usage

```typescript title="advanced-usage.ts"
// Advanced example with more options
const feature = new Feature({
	option1: "value1",
	option2: true,
	callbacks: {
		onSuccess: () => console.log("Success"),
		onError: (err) => console.error(err),
	},
});
```

---

## Configuration

### Options

| Option    | Type      | Default     | Description             |
| --------- | --------- | ----------- | ----------------------- |
| `option1` | `string`  | `'default'` | Description of option 1 |
| `option2` | `boolean` | `false`     | Description of option 2 |
| `option3` | `number`  | `100`       | Description of option 3 |

### Configuration Example

```typescript title="config.ts"
export const featureConfig = {
	option1: "custom-value",
	option2: true,
	option3: 200,
};
```

---

## Use Cases

### Use Case 1: [Scenario Name]

**Scenario:** [Describe the scenario]

**Solution:**

```typescript
// Code implementing the solution
```

**Result:** [What happens]

### Use Case 2: [Scenario Name]

[Continue pattern...]

---

## Best Practices

### Do's ✅

-   **Do this:** Explanation why
-   **Do that:** Explanation why
-   **Do this too:** Explanation why

### Don'ts ❌

-   **Don't do this:** Explanation why
-   **Don't do that:** Explanation why

### Performance Tips

> **Tip:** [Performance optimization tip]

> **Warning:** [Performance pitfall to avoid]

---

## Troubleshooting

### Common Issues

#### Issue: Feature Not Working

**Symptoms:**

-   Symptom 1
-   Symptom 2

**Diagnosis:**

```bash
# Debug command
snapback debug feature
```

**Solution:**

```bash
# Fix command
snapback fix feature
```

#### Issue: [Another Common Problem]

[Solution...]

---

## API Reference

### Methods

#### `feature.method1()`

```typescript
async method1(param: string): Promise<Result>
```

**Parameters:**

-   `param` (string): Description

**Returns:** Promise<Result>

**Example:**

```typescript
const result = await feature.method1("value");
```

#### `feature.method2()`

[Continue pattern...]

### Events

The feature emits the following events:

-   `event1`: Fired when [condition]
-   `event2`: Fired when [condition]

**Example:**

```typescript
feature.on("event1", (data) => {
	console.log("Event fired:", data);
});
```

---

## Related Features

-   [Related Feature 1](/docs/features/related-1) - How it relates
-   [Related Feature 2](/docs/features/related-2) - How it relates
-   [Complementary Feature](/docs/features/complementary) - Works together

---

## Next Steps

-   [Guide using this feature](/docs/guides/using-feature)
-   [API documentation](/docs/api/feature-endpoints)
-   [Advanced configurations](/docs/reference/feature-config)

````

---

## 3. API REFERENCE TEMPLATE

### File: `api/template.mdx`

```mdx
---
title: [API Endpoint Name]
description: [What this API endpoint does]
icon: FileCode
---

# [API Endpoint Name]

## Endpoint

````

[METHOD] /api/v1/resource

````

## Overview

[Description of what this endpoint does]

## Authentication

This endpoint requires authentication:

```bash
Authorization: Bearer YOUR_API_KEY
````

[Link to authentication guide](/docs/api/authentication)

---

## Request

### HTTP Request

```
[METHOD] https://api.snapback.dev/v1/resource
```

### Headers

| Header          | Required | Description               |
| --------------- | -------- | ------------------------- |
| `Authorization` | Yes      | Bearer token with API key |
| `Content-Type`  | Yes      | `application/json`        |
| `X-Request-ID`  | No       | Unique request identifier |

### Path Parameters

| Parameter | Type   | Description         |
| --------- | ------ | ------------------- |
| `id`      | string | Resource identifier |

### Query Parameters

| Parameter | Type   | Required | Default | Description              |
| --------- | ------ | -------- | ------- | ------------------------ |
| `page`    | number | No       | 1       | Page number              |
| `limit`   | number | No       | 20      | Items per page (max 100) |
| `filter`  | string | No       | -       | Filter criteria          |

### Request Body

```typescript
interface RequestBody {
	field1: string;
	field2?: number;
	field3: {
		nested1: string;
		nested2: boolean;
	};
}
```

| Field    | Type   | Required | Description |
| -------- | ------ | -------- | ----------- |
| `field1` | string | Yes      | Description |
| `field2` | number | No       | Description |
| `field3` | object | Yes      | Description |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
	"success": true,
	"data": {
		"id": "resource_123",
		"field1": "value",
		"field2": 42,
		"createdAt": "2025-10-02T10:30:00Z",
		"updatedAt": "2025-10-02T10:30:00Z"
	},
	"meta": {
		"page": 1,
		"limit": 20,
		"total": 100
	}
}
```

### Response Schema

```typescript
interface SuccessResponse {
	success: true;
	data: Resource;
	meta?: {
		page: number;
		limit: number;
		total: number;
	};
}

interface Resource {
	id: string;
	field1: string;
	field2: number;
	createdAt: string;
	updatedAt: string;
}
```

---

## Error Responses

### 400 Bad Request

```json
{
	"success": false,
	"error": {
		"code": "INVALID_REQUEST",
		"message": "Validation failed",
		"details": [
			{
				"field": "field1",
				"message": "field1 is required"
			}
		]
	}
}
```

### 401 Unauthorized

```json
{
	"success": false,
	"error": {
		"code": "UNAUTHORIZED",
		"message": "Invalid or missing API key"
	}
}
```

### 404 Not Found

```json
{
	"success": false,
	"error": {
		"code": "NOT_FOUND",
		"message": "Resource not found"
	}
}
```

### 429 Too Many Requests

```json
{
	"success": false,
	"error": {
		"code": "RATE_LIMIT_EXCEEDED",
		"message": "Rate limit exceeded",
		"retryAfter": 60
	}
}
```

---

## Examples

### cURL

<Tabs items={['Create', 'Read', 'Update', 'Delete']}>
<Tab value="Create">
`bash
    curl -X POST https://api.snapback.dev/v1/resource \
      -H "Authorization: Bearer YOUR_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "field1": "value",
        "field3": {
          "nested1": "value",
          "nested2": true
        }
      }'
    `
</Tab>

  <Tab value="Read">
    ```bash
    curl https://api.snapback.dev/v1/resource/resource_123 \
      -H "Authorization: Bearer YOUR_API_KEY"
    ```
  </Tab>

  <Tab value="Update">
    ```bash
    curl -X PATCH https://api.snapback.dev/v1/resource/resource_123 \
      -H "Authorization: Bearer YOUR_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"field1": "updated-value"}'
    ```
  </Tab>

  <Tab value="Delete">
    ```bash
    curl -X DELETE https://api.snapback.dev/v1/resource/resource_123 \
      -H "Authorization: Bearer YOUR_API_KEY"
    ```
  </Tab>
</Tabs>

### JavaScript/TypeScript

```typescript title="api-client.ts"
const response = await fetch("https://api.snapback.dev/v1/resource", {
	method: "POST",
	headers: {
		Authorization: `Bearer ${process.env.SNAPBACK_API_KEY}`,
		"Content-Type": "application/json",
	},
	body: JSON.stringify({
		field1: "value",
		field3: {
			nested1: "value",
			nested2: true,
		},
	}),
});

const data = await response.json();
console.log(data);
```

### Python

```python title="api_client.py"
import requests
import os

response = requests.post(
    'https://api.snapback.dev/v1/resource',
    headers={
        'Authorization': f'Bearer {os.getenv("SNAPBACK_API_KEY")}',
        'Content-Type': 'application/json'
    },
    json={
        'field1': 'value',
        'field3': {
            'nested1': 'value',
            'nested2': True
        }
    }
)

print(response.json())
```

---

## Rate Limiting

This endpoint is subject to rate limiting:

-   **Limit:** 100 requests per minute
-   **Headers:**
    -   `X-RateLimit-Limit`: Maximum requests
    -   `X-RateLimit-Remaining`: Remaining requests
    -   `X-RateLimit-Reset`: Reset timestamp

See [Rate Limits](/docs/api/rate-limits) for details.

---

## Webhooks

This endpoint triggers the following webhooks:

-   `resource.created`: When resource is created
-   `resource.updated`: When resource is updated
-   `resource.deleted`: When resource is deleted

See [Webhooks](/docs/api/webhooks) for webhook setup.

---

## Related Endpoints

-   [GET /api/v1/resource](/docs/api/endpoints#get-resource) - List resources
-   [GET /api/v1/resource/:id](/docs/api/endpoints#get-resource-id) - Get single resource
-   [PATCH /api/v1/resource/:id](/docs/api/endpoints#patch-resource) - Update resource
-   [DELETE /api/v1/resource/:id](/docs/api/endpoints#delete-resource) - Delete resource

````

---

## 4. TROUBLESHOOTING TEMPLATE

### File: `troubleshooting/template.mdx`

```mdx
---
title: [Problem Category]
description: Common issues and solutions for [category]
icon: LifeBuoy
---

# [Problem Category]

## Overview

This guide covers common issues related to [category] and their solutions.

---

## Common Issues

### Issue: [Problem Title]

**Symptoms:**
- User sees [symptom 1]
- Error message: `[error text]`
- [Symptom 3]

**Cause:**
[Explanation of root cause]

**Solution:**

<Steps>
  <Step>
    ### [First step to resolve]

    ```bash
    $ snapback command --option
    ```
  </Step>

  <Step>
    ### [Second step]

    [Instructions]
  </Step>

  <Step>
    ### [Verification]

    Verify the fix:

    ```bash
    $ snapback verify
    ✓ Issue resolved
    ```
  </Step>
</Steps>

**Prevention:**
> **Tip:** To prevent this issue, [prevention advice]

---

### Issue: [Another Problem]

[Continue pattern...]

---

## Error Codes Reference

### Error: `CODE_001`

**Message:** `Error message text`

**Meaning:** [What this error means]

**Common Causes:**
1. Cause 1
2. Cause 2
3. Cause 3

**Solutions:**

<Tabs items={['Quick Fix', 'Complete Reset', 'Manual Fix']}>
  <Tab value="Quick Fix">
    ```bash
    # Quick fix command
    snapback fix --code CODE_001
    ```
  </Tab>

  <Tab value="Complete Reset">
    ```bash
    # Complete reset (destructive)
    snapback reset --all
    snapback init
    ```
  </Tab>

  <Tab value="Manual Fix">
    1. Step 1
    2. Step 2
    3. Step 3
  </Tab>
</Tabs>

### Error: `CODE_002`

[Continue pattern...]

---

## Diagnostic Tools

### Built-in Diagnostics

Run the diagnostic tool:

```bash
$ snapback diagnose
Running diagnostics...
✓ API connection: OK
✓ Configuration: OK
✗ Permissions: FAILED
  → Fix: Run 'snapback fix --permissions'
````

### Debug Mode

Enable debug logging:

```bash
$ export SNAPBACK_DEBUG=true
$ snapback command
[DEBUG] Detailed log output...
```

### Health Check

```bash
$ snapback health
System Health:
✓ API: Connected
✓ Database: Online
✓ Storage: Available (85% free)
⚠ Cache: High usage (recommend clear)
```

---

## Getting Help

### Before Requesting Support

1. ✅ Check this troubleshooting guide
2. ✅ Review [FAQ](/docs/troubleshooting/faq)
3. ✅ Run diagnostic tools
4. ✅ Check [GitHub Issues](https://github.com/snapback/issues)

### Support Channels

-   **Community Forum:** [discuss.snapback.dev](https://discuss.snapback.dev)
-   **GitHub Issues:** [github.com/snapback/issues](https://github.com/snapback/issues)
-   **Email Support:** support@snapback.dev
-   **Discord:** [discord.gg/snapback](https://discord.gg/snapback)

### Information to Include

When requesting support, include:

```bash
# System info
$ snapback --version
$ snapback diagnose --export > diagnostics.txt
```

-   Error messages (full text)
-   Steps to reproduce
-   Expected vs actual behavior
-   System diagnostics output

---

## Related Documentation

-   [FAQ](/docs/troubleshooting/faq)
-   [Error Codes](/docs/troubleshooting/error-codes)
-   [Debugging Guide](/docs/troubleshooting/debugging)
-   [Configuration](/docs/guides/configuration)

````

---

## 5. REFERENCE DOCUMENTATION TEMPLATE

### File: `reference/template.mdx`

```mdx
---
title: [Reference Topic]
description: Complete reference for [topic]
icon: Library
---

# [Reference Topic]

## Overview

Comprehensive reference documentation for [topic].

---

## [Section 1]

### [Subsection]

| Item | Type | Description |
|------|------|-------------|
| Item 1 | Type | Description |
| Item 2 | Type | Description |

**Example:**
```typescript
// Usage example
````

---

## [Section 2]

[Content organized in easily scannable format]

---

## Quick Reference

### Common Commands

```bash
# Command 1
snapback command1 [options]

# Command 2
snapback command2 --flag

# Command 3
snapback command3 <required> [optional]
```

### Keyboard Shortcuts

| Shortcut | Action           |
| -------- | ---------------- |
| `Ctrl+C` | Cancel operation |
| `Ctrl+D` | Exit             |
| `↑/↓`    | Navigate history |

---

## Related Documentation

-   [Related Reference 1](/docs/reference/related-1)
-   [Related Guide](/docs/guides/related)
-   [API Documentation](/docs/api/overview)

````

---

## WRITING STYLE GUIDE

### Terminal Aesthetic Voice

**Characteristics:**
- **Direct:** "Run `command`" not "You can run command"
- **Active:** "Create checkpoint" not "A checkpoint is created"
- **Technical:** Developer-focused, not consumer-focused
- **Concise:** Short sentences, bullet points
- **Confident:** "This protects" not "This might help protect"

**Examples:**

✅ **Good - Terminal Voice:**
```markdown
Execute the checkpoint command:

```bash
$ snapback checkpoint create --tag "before-refactor"
✓ Checkpoint created: cp_xyz123
✓ Protected: 45 files, 12,847 lines
````

Your codebase is now protected. Recovery available if needed.

````

❌ **Bad - Consumer Voice:**
```markdown
You might want to try creating a checkpoint. This could potentially help protect your code. Feel free to run the command below if you'd like.
````

### Code Examples Standards

**Always Include:**

-   Syntax highlighting (language specified)
-   File names (where applicable)
-   Terminal prompts (`$` or `>`)
-   Expected output
-   Realistic variable names (no "foo", "bar")

**Example:**

```typescript title="checkpoint-manager.ts"
import { SnapBack } from "snapback";

const snapback = new SnapBack({
	apiKey: process.env.SNAPBACK_API_KEY,
});

// Create checkpoint before AI changes
const checkpoint = await snapback.checkpoint.create({
	tag: "before-ai-refactor",
	metadata: {
		ai: "detected",
		session: "vscode-copilot",
	},
});

console.log(`✓ Checkpoint ${checkpoint.id} created`);
```

---

## FUMADOCS COMPONENT USAGE

### When to Use Each Component

| Component     | Use Case                                            | Example                      |
| ------------- | --------------------------------------------------- | ---------------------------- |
| `<Tabs>`      | Multiple alternatives (package managers, languages) | Install instructions         |
| `<Steps>`     | Sequential workflow                                 | Tutorial, setup process      |
| `<Files>`     | Directory structure                                 | File organization            |
| `<Callout>`   | Important notes                                     | Warnings, tips, version info |
| `<CodeGroup>` | Related code files                                  | Complete examples            |
| `<Accordion>` | Optional details                                    | Advanced options, FAQs       |

### Component Examples

**Tabs for Package Managers (ALWAYS):**

````mdx
<Tabs items={["npm", "pnpm", "yarn", "bun"]}>
	<Tab value="npm">```bash npm install snapback ```</Tab>
	<Tab value="pnpm">```bash pnpm add snapback ```</Tab>
	<Tab value="yarn">```bash yarn add snapback ```</Tab>
	<Tab value="bun">```bash bun add snapback ```</Tab>
</Tabs>
````

**Steps for Workflows:**

````mdx
<Steps>
  <Step>
    ### Install CLI

    Install SnapBack globally:

    ```bash
    npm install -g snapback
    ```

  </Step>

  <Step>
    ### Initialize Project

    Initialize in your project:

    ```bash
    cd your-project
    snapback init
    ```

  </Step>

  <Step>
    ### Create Checkpoint

    Create your first checkpoint:

    ```bash
    snapback checkpoint create
    ```

  </Step>
</Steps>
````

**Files for Directory Structure:**

```mdx
<Files>
	<Folder name=".snapback" defaultOpen>
		<File name="config.json" />
		<Folder name="checkpoints">
			<File name="cp_xyz123.json" />
			<File name="cp_abc456.json" />
		</Folder>
		<Folder name="cache">
			<File name="index.json" />
		</Folder>
	</Folder>
	<File name=".snapbackignore" />
</Files>
```

**Callouts for Important Info:**

```mdx
> **Note:** API keys are generated once and cannot be recovered. Store securely.

> **Warning:** Deleting a checkpoint removes all associated recovery points.

> **Tip:** Tag checkpoints with meaningful names for easier identification.

> **Version Info:** This feature requires SnapBack v2.0 or later.
```

**Code Groups for Complete Examples:**

````mdx
<CodeGroup>
  ```typescript title="index.ts"
  import { SnapBack } from 'snapback';
  import { config } from './config';

const snapback = new SnapBack(config);
await snapback.init();
````

```typescript title="config.ts"
export const config = {
	apiKey: process.env.SNAPBACK_API_KEY,
	autoCheckpoint: true,
	retentionDays: 30,
};
```

```json title="package.json"
{
	"dependencies": {
		"snapback": "^1.0.0"
	},
	"scripts": {
		"checkpoint": "snapback checkpoint create"
	}
}
```

</CodeGroup>
```

---

## ACCESSIBILITY CHECKLIST

### Every Page Must Have:

-   [ ] Proper heading hierarchy (h1 → h2 → h3, no skipping)
-   [ ] Descriptive link text (not "click here")
-   [ ] Alt text for all images
-   [ ] ARIA labels for icons
-   [ ] Keyboard navigable
-   [ ] Sufficient color contrast
-   [ ] No color-only information
-   [ ] Touch targets ≥44x44px (mobile)

### Example - Accessible Link Text:

✅ **Good:**

```markdown
See the [API Authentication Guide](/docs/api/authentication) for details.
```

❌ **Bad:**

```markdown
Click [here](/docs/api/authentication) for more information.
```

---

## TEMPLATE USAGE WORKFLOW

### 1. Choose Template

-   Guide/Tutorial: Step-by-step instructions
-   Feature: Capability documentation
-   API Reference: Endpoint documentation
-   Troubleshooting: Problem solving
-   Reference: Quick lookup

### 2. Copy Template

```bash
cp /path/to/template.mdx /path/to/new-doc.mdx
```

### 3. Fill in Frontmatter

-   Title: Clear, descriptive
-   Description: SEO-optimized
-   Icon: Appropriate Lucide icon

### 4. Replace Placeholders

-   [Brackets] indicate placeholders
-   Replace with actual content
-   Remove unused sections

### 5. Add Fumadocs Components

-   Tabs for alternatives
-   Steps for workflows
-   Files for structures
-   Callouts for notes

### 6. Verify Quality

-   [ ] All links work
-   [ ] Code examples tested
-   [ ] Terminal voice consistent
-   [ ] Accessibility compliant
-   [ ] Mobile responsive

---

**Document Status:** ✅ Complete Templates Ready for Use
**Last Updated:** 2025-10-02
**Next Review:** As needed during content creation
