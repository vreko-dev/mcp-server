# @snapback/intelligence

**Unified intelligence layer for SnapBack** - validation, learning, and context retrieval.

Same algorithms powering SnapBack's internal development, now available for your codebase.

## Features

- **7-Layer Validation Pipeline**: Syntax, types, tests, architecture, security, dependencies, performance
- **Self-Learning System**: Pattern recognition with auto-promotion (1x → 3x → 5x thresholds)
- **Semantic Context Retrieval**: 88% token reduction via local embeddings (optional)
- **Violation Tracking**: Automatic pattern promotion and detection rule generation
- **MCP Protocol Support**: Integrate with Cursor, Claude Desktop, or any MCP-compatible client

## Installation

```bash
pnpm add @snapback/intelligence
```

## Usage

### Option 1: MCP Server (Recommended for IDE Integration)

The intelligence package includes an MCP server for seamless IDE integration.

#### Setup

1. **Install the package in your project:**

```bash
pnpm add @snapback/intelligence
```

2. **Configure your MCP client** (e.g., `~/.cursor/mcp.json` or Claude Desktop config):

```json
{
  "mcpServers": {
    "snapback": {
      "command": "npx",
      "args": ["@snapback/intelligence", "mcp"],
      "env": {
        "SNAPBACK_ROOT": "/path/to/your/workspace"
      }
    }
  }
}
```

3. **Restart your IDE/MCP client**

#### Available MCP Tools

| Tool | Description | When to Use |
|------|-------------|-------------|
| `mcp_snapback_validate_code` | Run 7-layer validation pipeline | Before committing |
| `mcp_snapback_get_context` | Get architectural context for a task | Before implementing |
| `mcp_snapback_check_patterns` | Validate against learned patterns | During code review |
| `mcp_snapback_report_violation` | Report pattern violation for learning | After mistakes |
| `mcp_snapback_query_learnings` | Search past learnings | When solving similar problems |

**Example Usage in Cursor/Claude:**

```typescript
// Before implementing a feature
mcp_snapback_get_context({
  task: "Add authentication to API",
  files: ["src/api/auth.ts"],
  keywords: ["auth", "jwt", "middleware"]
})

// Before committing
mcp_snapback_validate_code({
  code: "your new code here",
  filePath: "src/api/auth.ts"
})
```

### Option 2: Direct API Usage

```typescript
import { Intelligence } from "@snapback/intelligence";

// Initialize with your workspace
const intel = await Intelligence.create({
  rootDir: "/path/to/your/workspace",
  learningsDir: ".snapback/learnings",  // Where patterns are stored
  patternsDir: ".snapback/patterns",
  enableSemanticSearch: true,           // Optional: Requires @huggingface/transformers
  enableLearningLoop: true,
  enableAutoPromotion: true,
});

// Validate code
const result = await intel.validate(code, filePath);
if (result.recommendation === "full_review") {
  console.log("Issues found:", result.focusPoints);
}

// Get context for a task
const context = await intel.getContext(
  "Add authentication middleware",
  ["auth", "jwt", "middleware"]
);

// Report a violation (triggers learning)
await intel.reportViolation({
  type: "layer-boundary-violation",
  file: "src/api/handlers.ts",
  whatHappened: "Imported database directly in handler",
  whyItHappened: "Didn't check layer boundaries",
  prevention: "Use service layer instead",
});

// Query past learnings
const learnings = await intel.queryLearnings(["auth", "jwt"]);
```

### Option 3: Subpath Imports

Import specific modules for tree-shaking:

```typescript
import { ValidationPipeline } from "@snapback/intelligence/validation";
import { LearningEngine } from "@snapback/intelligence/learning";
import { SemanticRetriever } from "@snapback/intelligence/context";
```

## Configuration

### Full Config Schema

```typescript
{
  rootDir: string;                    // Workspace root (REQUIRED)
  patternsDir?: string;               // Default: "patterns"
  learningsDir?: string;              // Default: "feedback"
  constraintsFile?: string;           // Default: "CONSTRAINTS.md"
  violationsFile?: string;            // Default: "patterns/violations.jsonl"
  embeddingsDb?: string;              // Default: "embeddings.db"
  contextFiles?: string[];            // Files to index for semantic search
  enableSemanticSearch?: boolean;     // Default: false (requires deps)
  enableLearningLoop?: boolean;       // Default: true
  enableAutoPromotion?: boolean;      // Default: true
}
```

### Data Directory Structure

When you use the intelligence package, it creates this structure in your workspace:

```
your-workspace/
├── .snapback/
│   ├── patterns/
│   │   ├── codebase-patterns.md    # Promoted patterns (3x+ occurrences)
│   │   └── violations.jsonl        # All violations tracked
│   ├── learnings/
│   │   ├── learnings.jsonl         # Session learnings
│   │   ├── interactions.jsonl      # AI interaction log
│   │   └── golden.jsonl            # Golden dataset (high-confidence examples)
│   └── embeddings.db               # Semantic search index (if enabled)
└── CONSTRAINTS.md                   # Your project constraints (optional)
```

## Validation Pipeline

The validation pipeline runs 7 layers in parallel:

| Layer | Checks |
|-------|--------|
| **Syntax** | Bracket matching, semicolons, basic parsing |
| **Types** | `any` usage, `@ts-ignore` without reason, excessive non-null assertions |
| **Tests** | Vague assertions (`.toBeTruthy()`), 4-path coverage (happy/sad/edge/error) |
| **Architecture** | Layer boundaries, service bypass, import patterns |
| **Security** | Hardcoded secrets, `eval()`, privacy violations |
| **Dependencies** | Deprecated packages (moment, request, etc.) |
| **Performance** | console.log in production, sync I/O, await in loops |

**Confidence Scoring:**
- 0 critical issues → 95% confidence → `auto_merge`
- 0 issues → 95% confidence → `auto_merge`
- ≤2 issues → 70% confidence → `quick_review`
- ≤5 issues → 50% confidence → `full_review`
- \>5 issues → 20% confidence → `full_review`

## Learning System

### Auto-Promotion Thresholds

- **1x seen**: Stored in `violations.jsonl`
- **3x seen**: Auto-promoted to `codebase-patterns.md`
- **5x seen**: Marked for automated detection

### Query Classification

The learning engine auto-classifies queries for pattern matching:

- `authentication` - Auth, JWT, OAuth queries
- `testing` - Vitest, test coverage queries
- `api` - API endpoints, procedures
- `database` - DB queries, migrations
- `ui` - React, components
- `vscode` - VS Code extension patterns
- `mcp` - MCP server patterns
- `performance` - Optimization queries
- `architecture` - Design patterns

## MCP Server vs API Usage

**Use MCP Server when:**
- Integrating with IDEs (Cursor, VS Code with MCP plugin)
- Want conversational interface for AI assistants
- Need real-time pattern checking during development

**Use Direct API when:**
- Building custom tooling or CI/CD integrations
- Embedding validation in build pipelines
- Programmatic access to learning data

## Internal vs External

This package powers both:

1. **SnapBack's internal development** (`ai_dev_utils/mcp/` with `rootDir='ai_dev_utils'`)
2. **Your codebase** (`@snapback/intelligence` with `rootDir=yourWorkspace`)

**Same algorithms, different data sources.**

## Examples

See `test/` directory for comprehensive usage examples.

## License

Apache-2.0

## Support

For issues or questions about the intelligence package:
- GitHub Issues: [snapback-dev/snapback](https://github.com/snapback-dev/snapback)
- Documentation: [docs.snapback.dev](https://docs.snapback.dev)
