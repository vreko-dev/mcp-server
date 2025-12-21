# Customer MCP Implementation Plan

**Purpose:** Roadmap for implementing customer-facing pair programming intelligence
**Architecture:** CLI manages .snapback/, MCP server reads from it
**Dependencies:** `capability_mapping.md`, `thin_proxy_architecture.md`, `the_vision.md`

---

## Executive Summary

The goal is to give SnapBack customers the same **pair programming intelligence** that we use internally with `ai_dev_utils`. The architecture is:

1. **`apps/cli`** → Manages `.snapback/` directory (like `ai_dev_utils/` does for us)
2. **`apps/mcp-server`** → Reads from `.snapback/` (like `ai_dev_utils/mcp/` reads from `ai_dev_utils/`)

### Component Responsibilities

| Component | Responsibility | Internal Equivalent | Status |
|-----------|----------------|--------------------|---------|
| `apps/cli` | Create/manage `.snapback/`, run `snap init`, record learnings | `ai_dev_utils/` directory | 🔴 NOT STARTED |
| `apps/mcp-server` | Read `.snapback/`, provide MCP tools | `ai_dev_utils/mcp/server.ts` | ✅ IMPLEMENTED |
| `@snapback/intelligence` | Shared algorithms (ValidationPipeline, etc.) | Same package | ✅ IMPLEMENTED |
| Server API | Cross-workspace learning, user profiles | N/A (internal only) | 🟡 PARTIAL |

---

## Implementation Status

### Already Implemented ✅

**MCP Server (`apps/mcp-server/src/tools/context-tools.ts`):**
- [x] `snapback.get_context` - SemanticRetriever with `.snapback/embeddings.db`
- [x] `snapback.check_patterns` - ValidationPipeline for pattern checking
- [x] `snapback.validate_code` - 7-layer validation pipeline
- [x] `snapback.record_learning` - LearningEngine writes to `.snapback/learnings/`

**MCP Server Data Paths (already configured for `.snapback/`):**
```typescript
// apps/mcp-server/src/tools/context-tools.ts
SemanticRetriever({ rootDir: workspaceRoot, dbPath: ".snapback/embeddings.db" })
LearningEngine({
  rootDir: workspaceRoot,
  patternsDir: ".snapback/patterns",
  learningsDir: ".snapback/learnings",
  violationsFile: ".snapback/patterns/violations.jsonl",
  embeddingsDb: ".snapback/embeddings.db",
})
```

**Shared Intelligence (`@snapback/intelligence`):**
- [x] SemanticRetriever - 88% token compression
- [x] ValidationPipeline - 7-layer validation
- [x] LearningEngine - Pattern learning and promotion

### Needs Implementation 🔴

**CLI (`apps/cli`) - Phase 1 Commands:**

| Command | Purpose | Storage | Status |
|---------|---------|---------|--------|
| `snap login/logout/whoami` | Auth flow with server | `~/.snapback/credentials.json` | 🔴 TODO |
| `snap init` | Create workspace `.snapback/` | `.snapback/` | 🔴 TODO |
| `snap tools configure` | MCP auto-setup for Cursor/Claude | `~/.cursor/mcp.json` | 🔴 TODO |
| `snap protect add/remove/list` | Protected files management | `.snapback/protected.json` | 🔴 TODO |
| `snap status` | Workspace health check | Reads `.snapback/vitals.json` | 🔴 TODO |
| `snap fix <issue>` | Auto-fix detected issues | Writes to workspace files | 🔴 TODO |
| `snap session start/status` | Session management | `.snapback/session/` | 🔴 TODO |
| `snap learn` | Record learnings | `.snapback/learnings/` | 🔴 TODO |
| `snap patterns list/report` | Pattern management | `.snapback/patterns/` | 🔴 TODO |

**MCP Server - Phase 2 Additions:**
- [ ] MCP Resources for `@snap` mention (see Phase 2)

**The CLI is the missing piece.** MCP server already reads from `.snapback/`, but CLI needs to create and populate it.

---

## Storage Architecture

### Global vs Workspace Storage

```
~/.snapback/                    # GLOBAL (managed by CLI)
├── credentials.json            # Auth tokens (from snap login)
├── config.json                 # User preferences
├── cache/
│   └── user-profile.json       # Cached server profile
└── mcp-configs/                # Auto-generated MCP configs
    ├── cursor.json             # For snap tools configure
    └── claude.json

.snapback/                      # WORKSPACE (managed by CLI)
├── config.json                 # Workspace config
├── vitals.json                 # Workspace vitals
├── protected.json              # Protected files list
├── patterns/                   # Local patterns
├── learnings/                  # Local learnings
├── session/                    # Session state
├── embeddings.db               # Local embeddings cache
└── snapshots/                  # Pro: local snapshots
```

**Creation Flow:**
- `snap login` → Creates `~/.snapback/credentials.json`
- `snap init` → Creates `.snapback/` in workspace
- `snap tools configure` → Writes to `~/.cursor/mcp.json` or `~/.config/claude/`

---

## Hybrid Proxy Pattern

### Tool Classification: Local vs Server-Proxied

```typescript
// LOCAL-FIRST TOOLS (read .snapback/ directly)
// These work offline, no server round-trip needed
const LOCAL_TOOLS = [
  "snapback.get_context",       // SemanticRetriever reads .snapback/embeddings.db
  "snapback.check_patterns",    // ValidationPipeline reads .snapback/patterns/
  "snapback.validate_code",     // 7-layer pipeline, local checks
  "snapback.get_workspace_vitals", // Reads .snapback/vitals.json
  "snapback.check_dependencies", // Local package.json analysis
];

// SERVER-PROXIED TOOLS (call API for intelligence)
// These need server for cross-workspace learning, Pro features
const PROXIED_TOOLS = [
  "snapback.start_session",     // Server classifies task, returns guidance
  "snapback.get_recommendations", // Server aggregates learnings
  "snapback.record_learning",   // Writes to both local + server
  "snapback.analyze_risk",      // Local basic + Server Pro enrichment
  "snapback.create_snapshot",   // Local storage + Server metadata (Pro)
];
```

### Server Endpoint Pattern (Single Endpoint)

Using single `/mcp/execute` endpoint to match thin proxy pattern:

```typescript
// Server: apps/api/src/modules/mcp/router.ts
export const mcpRouter = router({
  execute: publicProcedure
    .input(z.object({
      tool: z.string(),           // e.g., "snapback.start_session"
      args: z.record(z.unknown()), // Tool-specific arguments
      workspaceId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Single routing point for all MCP calls
      switch (input.tool) {
        case "snapback.start_session":
          return handleStartSession(input.args, ctx);
        case "snapback.get_recommendations":
          return handleGetRecommendations(input.args, ctx);
        // ... etc
      }
    }),
});
```

**Why Single Endpoint:**
- Matches thin proxy pattern (one gateway)
- Simpler client implementation
- Easier to add new tools without new routes
- Server-side routing can add auth, logging, circuit breaking

---

## Phase 1: CLI .snapback/ Management

### 1.1 New CLI Commands (apps/cli)

```typescript
// File: apps/cli/src/commands/init.ts
// Equivalent to: creating ai_dev_utils/ structure

/**
 * snap init - Initialize .snapback/ directory
 *
 * Creates:
 *   .snapback/config.json
 *   .snapback/vitals.json (from workspace scan)
 *   .snapback/patterns/
 *   .snapback/learnings/
 *   .snapback/session/
 */
program
  .command('init')
  .description('Initialize SnapBack for this workspace')
  .action(async () => {
    // 1. Create .snapback/ directory structure
    await createSnapbackDirectory(process.cwd());

    // 2. Scan workspace for vitals (framework, deps, etc.)
    const vitals = await scanWorkspaceVitals(process.cwd());
    await writeJson('.snapback/vitals.json', vitals);

    // 3. Detect critical files for protection
    const criticalFiles = await detectCriticalFiles(process.cwd());

    // 4. If logged in, sync with server
    if (isLoggedIn()) {
      const workspaceId = await registerWorkspace(vitals);
      await writeJson('.snapback/config.json', {
        workspaceId,
        tier: getUserTier(),
        createdAt: new Date().toISOString(),
      });
    }

    console.log('✓ SnapBack initialized');
  });


// File: apps/cli/src/commands/session.ts
// Equivalent to: ai_dev_utils/scripts/start.sh

/**
 * snap session start "task description"
 *
 * Creates session in .snapback/session/current.json
 * Like how ai_dev_utils tracks current-task.json
 */
program
  .command('session')
  .description('Manage development sessions')
  .addCommand(
    new Command('start')
      .argument('<task>', 'Task description')
      .action(async (task) => {
        const session = {
          id: `sess_${generateId()}`,
          task,
          startedAt: new Date().toISOString(),
          snapshotCount: 0,
        };

        await writeJson('.snapback/session/current.json', session);

        // Append to history
        await appendJsonl('.snapback/session/history.jsonl', session);

        console.log(`Session started: ${session.id}`);
        console.log(`Task: ${task}`);
      })
  )
  .addCommand(
    new Command('status')
      .action(async () => {
        const session = await readJson('.snapback/session/current.json');
        if (session) {
          console.log(`Active session: ${session.id}`);
          console.log(`Task: ${session.task}`);
          console.log(`Snapshots: ${session.snapshotCount}`);
        } else {
          console.log('No active session');
        }
      })
  );


// File: apps/cli/src/commands/learn.ts
// Equivalent to: ai_dev_utils/scripts/learn.sh

/**
 * snap learn "trigger" "action"
 *
 * Records a learning in .snapback/learnings/user-learnings.jsonl
 * Like how ai_dev_utils records to feedback/learnings.jsonl
 */
program
  .command('learn')
  .argument('<trigger>', 'When to apply this learning')
  .argument('<action>', 'What to do')
  .option('-t, --type <type>', 'Learning type', 'pattern')
  .action(async (trigger, action, options) => {
    const learning = {
      id: `L${Date.now()}`,
      type: options.type,
      trigger,
      action,
      source: 'cli',
      createdAt: new Date().toISOString(),
    };

    await appendJsonl('.snapback/learnings/user-learnings.jsonl', learning);

    console.log('Learning recorded:');
    console.log(`  Trigger: ${trigger}`);
    console.log(`  Action: ${action}`);
  });


// File: apps/cli/src/commands/patterns.ts
// Equivalent to: reading ai_dev_utils/patterns/

/**
 * snap patterns list
 * snap patterns report "violation type" "file" "message"
 */
program
  .command('patterns')
  .description('Manage workspace patterns')
  .addCommand(
    new Command('list')
      .action(async () => {
        const patterns = await readJson('.snapback/patterns/workspace-patterns.json');
        if (patterns?.length) {
          console.log('Active patterns:');
          patterns.forEach((p, i) => console.log(`${i + 1}. ${p.name}: ${p.description}`));
        } else {
          console.log('No patterns recorded yet. Patterns are promoted after 3 occurrences.');
        }
      })
  )
  .addCommand(
    new Command('report')
      .argument('<type>', 'Violation type')
      .argument('<file>', 'File where it occurred')
      .argument('<message>', 'What happened')
      .action(async (type, file, message) => {
        // Load existing violations
        const violations = await loadJsonl('.snapback/patterns/violations.jsonl');

        // Count occurrences of this type
        const count = violations.filter(v => v.type === type).length + 1;

        // Record violation
        await appendJsonl('.snapback/patterns/violations.jsonl', {
          type,
          file,
          message,
          date: new Date().toISOString(),
        });

        // Auto-promote at 3x (like ai_dev_utils)
        if (count >= 3) {
          await promoteToPattern(type, message);
          console.log(`📈 Pattern promoted: ${type} (${count} occurrences)`);
        } else {
          console.log(`Violation recorded: ${type} (${count}/3 for promotion)`);
        }
      });
  );
```

### 1.2 Additional CLI Commands (Phase 1)

```typescript
// File: apps/cli/src/commands/auth.ts

/**
 * snap login - Authenticate with SnapBack server
 * snap logout - Clear credentials
 * snap whoami - Show current user
 */
program
  .command('login')
  .description('Login to SnapBack')
  .action(async () => {
    // Open browser for OAuth or display device code
    const authUrl = await getAuthUrl();
    console.log(`Opening browser: ${authUrl}`);
    await open(authUrl);

    // Poll for completion
    const credentials = await waitForAuth();
    await writeGlobalJson('credentials.json', credentials);
    console.log(`✓ Logged in as ${credentials.email}`);
  });

program
  .command('logout')
  .description('Logout from SnapBack')
  .action(async () => {
    await deleteGlobalJson('credentials.json');
    console.log('✓ Logged out');
  });

program
  .command('whoami')
  .description('Show current user')
  .action(async () => {
    const creds = await readGlobalJson('credentials.json');
    if (creds) {
      console.log(`Logged in as: ${creds.email}`);
      console.log(`Tier: ${creds.tier}`);
    } else {
      console.log('Not logged in. Run: snap login');
    }
  });


// File: apps/cli/src/commands/tools.ts

/**
 * snap tools configure - Auto-setup MCP for Cursor/Claude
 */
program
  .command('tools')
  .description('Configure AI tools')
  .addCommand(
    new Command('configure')
      .option('--cursor', 'Configure for Cursor')
      .option('--claude', 'Configure for Claude')
      .action(async (options) => {
        const mcpConfig = {
          mcpServers: {
            snapback: {
              command: 'npx',
              args: ['-y', '@snapback/mcp-server'],
              env: { SNAPBACK_API_KEY: getApiKey() },
            },
          },
        };

        if (options.cursor) {
          await writeMcpConfig('~/.cursor/mcp.json', mcpConfig);
          console.log('✓ Cursor MCP configured');
        }
        if (options.claude) {
          await writeMcpConfig('~/.config/claude/mcp.json', mcpConfig);
          console.log('✓ Claude MCP configured');
        }
        if (!options.cursor && !options.claude) {
          // Auto-detect installed tools
          await autoConfigureTools(mcpConfig);
        }
      })
  );


// File: apps/cli/src/commands/protect.ts

/**
 * snap protect add/remove/list - Manage protected files
 */
program
  .command('protect')
  .description('Manage file protection')
  .addCommand(
    new Command('add')
      .argument('<pattern>', 'File or glob pattern to protect')
      .action(async (pattern) => {
        const protected = await readSnapbackJson('protected.json') || [];
        protected.push({ pattern, addedAt: new Date().toISOString() });
        await writeSnapbackJson('protected.json', protected);
        console.log(`✓ Added protection: ${pattern}`);
      })
  )
  .addCommand(
    new Command('remove')
      .argument('<pattern>', 'Pattern to unprotect')
      .action(async (pattern) => {
        const protected = await readSnapbackJson('protected.json') || [];
        const filtered = protected.filter(p => p.pattern !== pattern);
        await writeSnapbackJson('protected.json', filtered);
        console.log(`✓ Removed protection: ${pattern}`);
      })
  )
  .addCommand(
    new Command('list')
      .action(async () => {
        const protected = await readSnapbackJson('protected.json') || [];
        if (protected.length === 0) {
          console.log('No files protected. Run: snap protect add <pattern>');
        } else {
          console.log('Protected files:');
          protected.forEach(p => console.log(`  • ${p.pattern}`));
        }
      })
  );


// File: apps/cli/src/commands/status.ts

/**
 * snap status - Workspace health check
 */
program
  .command('status')
  .description('Show workspace health')
  .action(async () => {
    const vitals = await readSnapbackJson('vitals.json');
    const session = await readSnapbackJson('session/current.json');
    const patterns = await loadSnapbackJsonl('patterns/violations.jsonl');

    console.log('Workspace Status');
    console.log('================');

    if (vitals) {
      console.log(`Framework: ${vitals.framework || 'unknown'}`);
      console.log(`Package Manager: ${vitals.packageManager || 'npm'}`);
    }

    if (session) {
      console.log(`\nActive Session: ${session.id}`);
      console.log(`Task: ${session.task}`);
    }

    console.log(`\nViolations: ${patterns.length} recorded`);

    // Check for issues
    const issues = await detectIssues();
    if (issues.length > 0) {
      console.log('\n⚠️ Issues detected:');
      issues.forEach(i => console.log(`  • ${i.id}: ${i.description}`));
      console.log('\nRun: snap fix <issue-id> to resolve');
    }
  });


// File: apps/cli/src/commands/fix.ts

/**
 * snap fix <issue> - Auto-fix detected issues
 */
program
  .command('fix')
  .argument('<issue>', 'Issue ID to fix')
  .option('--dry-run', 'Show what would be fixed')
  .action(async (issue, options) => {
    const fixes = {
      'missing-gitignore': async () => {
        await appendFile('.gitignore', '\n.snapback/snapshots/\n');
        return 'Added .snapback/snapshots/ to .gitignore';
      },
      'missing-protected': async () => {
        const critical = await detectCriticalFiles();
        await writeSnapbackJson('protected.json', critical);
        return `Auto-detected ${critical.length} critical files`;
      },
      'stale-embeddings': async () => {
        await regenerateEmbeddings();
        return 'Regenerated embeddings.db';
      },
    };

    const fixer = fixes[issue];
    if (!fixer) {
      console.log(`Unknown issue: ${issue}`);
      return;
    }

    if (options.dryRun) {
      console.log(`Would fix: ${issue}`);
    } else {
      const result = await fixer();
      console.log(`✓ Fixed: ${result}`);
    }
  });
```

### 1.3 .snapback/ Directory Service

```typescript
// File: apps/cli/src/services/snapback-dir.ts

import { mkdir, readFile, writeFile, appendFile } from 'fs/promises';
import { join, dirname } from 'path';

const SNAPBACK_DIR = '.snapback';

/**
 * Create the .snapback/ directory structure
 * Mirrors the structure of ai_dev_utils/
 */
export async function createSnapbackDirectory(workspaceRoot: string): Promise<void> {
  const dirs = [
    '',
    'patterns',
    'learnings',
    'session',
    'snapshots',
  ];

  for (const dir of dirs) {
    await mkdir(join(workspaceRoot, SNAPBACK_DIR, dir), { recursive: true });
  }

  // Create .gitignore to exclude snapshots but keep patterns
  const gitignore = `
# Ignore snapshot content (large)
snapshots/

# Keep these for team sharing
!patterns/
!learnings/
!vitals.json
!config.json
`.trim();

  await writeFile(
    join(workspaceRoot, SNAPBACK_DIR, '.gitignore'),
    gitignore
  );
}

/**
 * Read JSON file from .snapback/
 */
export async function readSnapbackJson<T>(relativePath: string): Promise<T | null> {
  try {
    const content = await readFile(
      join(process.cwd(), SNAPBACK_DIR, relativePath),
      'utf-8'
    );
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Write JSON file to .snapback/
 */
export async function writeSnapbackJson(relativePath: string, data: unknown): Promise<void> {
  const fullPath = join(process.cwd(), SNAPBACK_DIR, relativePath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, JSON.stringify(data, null, 2));
}

/**
 * Append to JSONL file in .snapback/
 */
export async function appendSnapbackJsonl(relativePath: string, data: unknown): Promise<void> {
  const fullPath = join(process.cwd(), SNAPBACK_DIR, relativePath);
  await mkdir(dirname(fullPath), { recursive: true });
  await appendFile(fullPath, JSON.stringify(data) + '\n');
}

/**
 * Load JSONL file from .snapback/
 */
export async function loadSnapbackJsonl<T>(relativePath: string): Promise<T[]> {
  try {
    const content = await readFile(
      join(process.cwd(), SNAPBACK_DIR, relativePath),
      'utf-8'
    );
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  } catch {
    return [];
  }
}
```

---

## Phase 2: MCP Server Adaptations

### 2.1 MCP Resources for @snap Mentions

To enable `@snap` mentions in Cursor/Claude (e.g., "@snap what should I protect?"), we need MCP Resources:

```typescript
// File: apps/mcp-server/src/resources/index.ts

import { ListResourcesRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";

export const snapbackResourceDefinitions = [
  {
    uri: "snap://context",
    name: "SnapBack Context",
    description: "Current workspace context, patterns, and constraints",
    mimeType: "text/markdown",
  },
  {
    uri: "snap://preferences",
    name: "Your Preferences",
    description: "Your learned preferences and coding style",
    mimeType: "application/json",
  },
  {
    uri: "snap://workspace",
    name: "Workspace Info",
    description: "Workspace vitals, protected files, and session state",
    mimeType: "application/json",
  },
  {
    uri: "snap://patterns",
    name: "Local Patterns",
    description: "Patterns and violations tracked in this workspace",
    mimeType: "text/markdown",
  },
];

// Register in server
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: snapbackResourceDefinitions,
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case "snap://context":
      return {
        contents: [{
          uri,
          mimeType: "text/markdown",
          text: await getWorkspaceContext(),
        }],
      };

    case "snap://preferences":
      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify(await getUserPreferences()),
        }],
      };

    case "snap://workspace":
      const vitals = await readSnapbackJson('vitals.json');
      const protected = await readSnapbackJson('protected.json');
      const session = await readSnapbackJson('session/current.json');
      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify({ vitals, protected, session }),
        }],
      };

    case "snap://patterns":
      const violations = await loadSnapbackJsonl('patterns/violations.jsonl');
      const patterns = await readSnapbackJson('patterns/workspace-patterns.json');
      return {
        contents: [{
          uri,
          mimeType: "text/markdown",
          text: formatPatternsAsMarkdown(patterns, violations),
        }],
      };
  }
});

// Usage in Cursor/Claude:
// @snap what should I protect before refactoring auth?
// -> AI reads snap://workspace and snap://patterns
```

### 2.2 New Tools for Customer MCP

```typescript
// File: apps/mcp-server/src/tools/learning-tools.ts

import { z } from "zod";
import { SnapBackAPIClient } from "../client/snapback-api";

export const StartSessionSchema = z.object({
  taskDescription: z.string().optional(),
  files: z.array(z.string()).optional(),
});

export const learningToolDefinitions = [
  {
    name: "snapback.start_session",
    description: `**Purpose:** Start a new development session with personalized context.

**When to Use:**
- At the beginning of a coding session
- When switching to a new task
- When you want personalized recommendations

**Returns:**
- Session ID for tracking
- Personalized recommendations based on your patterns
- User preferences for this workspace`,
    inputSchema: {
      type: "object",
      properties: {
        taskDescription: {
          type: "string",
          description: "What you're working on",
        },
        files: {
          type: "array",
          items: { type: "string" },
          description: "Files you plan to modify",
        },
      },
    },
    requiresBackend: true,
  },

  {
    name: "snapback.get_recommendations",
    description: `**Purpose:** Get personalized recommendations for your current context.

**When to Use:**
- When you're unsure how to approach a task
- When you want to learn from your past patterns
- When starting work in a new area

**Returns:**
- Curated recommendations based on your history
- Relevant patterns from your workspaces`,
    inputSchema: {
      type: "object",
      properties: {
        context: {
          type: "string",
          description: "Description of what you need help with",
        },
        keywords: {
          type: "array",
          items: { type: "string" },
          description: "Keywords related to your task",
        },
      },
    },
    requiresBackend: true,
  },

  {
    name: "snapback.session_stats",
    description: `**Purpose:** Get statistics for your current session.

**Returns:**
- Snapshot count
- Risk analyses performed
- Session duration
- Coaching suggestions`,
    inputSchema: {
      type: "object",
      properties: {},
    },
    requiresBackend: true,
  },
];

export async function handleStartSession(
  args: z.infer<typeof StartSessionSchema>,
  apiClient: SnapBackAPIClient,
  workspaceId: string
) {
  // Call server for session initialization
  const result = await apiClient.request('mcp.startSession', {
    workspaceId,
    taskDescription: args.taskDescription,
    files: args.files,
  });

  return {
    content: [
      { type: "json", json: result },
      {
        type: "text",
        text: formatSessionGuidance(result.guidance.recommendations)
      },
    ],
  };
}

export async function handleGetRecommendations(
  args: { context?: string; keywords?: string[] },
  apiClient: SnapBackAPIClient,
  workspaceId: string
) {
  const result = await apiClient.request('mcp.getRecommendations', {
    workspaceId,
    context: args.context,
    keywords: args.keywords,
  });

  return {
    content: [
      { type: "json", json: result },
      {
        type: "text",
        text: formatRecommendations(result.recommendations)
      },
    ],
  };
}

function formatSessionGuidance(recommendations: any[]): string {
  if (!recommendations.length) {
    return "✅ Session started. Ready to assist.";
  }

  return `📋 Session Guidance:

${recommendations.map((r, i) => `${i + 1}. **${r.title}**: ${r.description}`).join('\n')}

Use \`snapback.get_recommendations\` for more personalized suggestions.`;
}

function formatRecommendations(recommendations: any[]): string {
  if (!recommendations.length) {
    return "No specific recommendations. Continue with your approach.";
  }

  return `💡 Recommendations:

${recommendations.map((r, i) => {
  const confidence = r.confidence ? ` (${Math.round(r.confidence * 100)}% match)` : '';
  return `${i + 1}. **${r.title}**${confidence}\n   ${r.description}`;
}).join('\n\n')}`;
}
```

### 2.2 Activity Reporting (Metadata Only)

```typescript
// File: apps/mcp-server/src/utils/activity-reporter.ts

/**
 * Report activity to server for learning
 * CRITICAL: Only metadata, never code content
 */
export class ActivityReporter {
  private apiClient: SnapBackAPIClient;
  private sessionId: string | null = null;
  private workspaceId: string;

  constructor(apiClient: SnapBackAPIClient, workspaceId: string) {
    this.apiClient = apiClient;
    this.workspaceId = workspaceId;
  }

  async startSession(task?: string): Promise<string> {
    const result = await this.apiClient.request('mcp.startSession', {
      workspaceId: this.workspaceId,
      taskDescription: task,
    });
    this.sessionId = result.sessionId;
    return this.sessionId;
  }

  /**
   * Report snapshot creation (metadata only)
   */
  async reportSnapshotCreated(metadata: {
    trigger: 'manual' | 'auto' | 'ai-detected';
    fileCount: number;
    totalBytes: number;
    // NEVER: file content, actual paths, diffs
  }): Promise<void> {
    if (!this.sessionId) return;

    await this.apiClient.request('mcp.reportActivity', {
      sessionId: this.sessionId,
      event: 'snapshot_created',
      metadata: {
        trigger: metadata.trigger,
        fileCount: metadata.fileCount,
        totalBytes: metadata.totalBytes,
        // Sanitize - only aggregate data
      },
    });
  }

  /**
   * Report risk analysis (severity only)
   */
  async reportRiskAnalyzed(metadata: {
    riskLevel: string;
    issueCount: number;
    // NEVER: actual code, issue details
  }): Promise<void> {
    if (!this.sessionId) return;

    await this.apiClient.request('mcp.reportActivity', {
      sessionId: this.sessionId,
      event: 'risk_analyzed',
      metadata,
    });
  }
}
```

---

## Phase 3: Integration Points

### 3.1 Wire Learning Tools into MCP Server

```typescript
// File: apps/mcp-server/src/index.ts (modifications)

import {
  learningToolDefinitions,
  handleStartSession,
  handleGetRecommendations
} from "./tools/learning-tools";
import { ActivityReporter } from "./utils/activity-reporter";

// Add to tool list
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // ... existing tools
    ...learningToolDefinitions,
  ],
}));

// Add handlers
if (name === "snapback.start_session") {
  const parsed = StartSessionSchema.parse(args);
  const workspaceId = await getWorkspaceId();
  return await handleStartSession(parsed, apiClient, workspaceId);
}

if (name === "snapback.get_recommendations") {
  const parsed = z.object({
    context: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }).parse(args);
  const workspaceId = await getWorkspaceId();
  return await handleGetRecommendations(parsed, apiClient, workspaceId);
}

// Wire activity reporting into existing tools
if (name === "snapback.create_snapshot") {
  // ... existing logic ...

  // Report activity (metadata only)
  await activityReporter.reportSnapshotCreated({
    trigger: input.trigger || 'manual',
    fileCount: result.snapshot.fileCount,
    totalBytes: result.snapshot.totalBytes,
  });
}
```

### 3.2 Graceful Degradation

```typescript
// File: apps/mcp-server/src/utils/offline-fallback.ts

/**
 * Fallback behavior when server is unavailable
 */
export async function withFallback<T>(
  serverCall: () => Promise<T>,
  localFallback: () => T,
  options: { timeout?: number } = {}
): Promise<T> {
  const timeout = options.timeout || 5000;

  try {
    const result = await Promise.race([
      serverCall(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      ),
    ]);
    return result;
  } catch (error) {
    console.error('[SnapBack MCP] Server unavailable, using local fallback');
    return localFallback();
  }
}

// Usage in handlers
async function handleGetContext(args, apiClient, workspaceRoot) {
  return await withFallback(
    // Try server for enriched context
    () => apiClient.request('mcp.getContext', args),
    // Fallback to local patterns only
    () => getLocalContext(args, workspaceRoot),
  );
}
```

---

## Phase 4: Testing Strategy

### 4.1 Unit Tests

```typescript
// File: apps/mcp-server/src/tools/__tests__/learning-tools.test.ts

describe('Learning Tools', () => {
  describe('handleStartSession', () => {
    it('should return session with recommendations', async () => {
      const mockApiClient = createMockApiClient({
        'mcp.startSession': {
          sessionId: 'sess_123',
          guidance: {
            recommendations: [
              { type: 'pattern', title: 'Test', description: 'Test desc' }
            ]
          }
        }
      });

      const result = await handleStartSession(
        { taskDescription: 'Add auth' },
        mockApiClient,
        'ws_123'
      );

      expect(result.content[0].json.sessionId).toBe('sess_123');
      expect(result.content[1].text).toContain('Test');
    });

    it('should handle server unavailable gracefully', async () => {
      const mockApiClient = createMockApiClient({
        'mcp.startSession': new Error('Network error')
      });

      const result = await handleStartSession(
        { taskDescription: 'Add auth' },
        mockApiClient,
        'ws_123'
      );

      // Should return fallback response
      expect(result.content[0].json.sessionId).toBeDefined();
    });
  });
});
```

### 4.2 Integration Tests

```typescript
// File: apps/api/src/modules/mcp/__tests__/router.integration.test.ts

describe('MCP Router Integration', () => {
  describe('startSession', () => {
    it('should create session and return recommendations', async () => {
      // Create test user with preferences
      const user = await createTestUser({
        preferences: {
          stack: { frameworks: ['nextjs'] }
        }
      });

      const caller = createCaller({ session: { userId: user.id } });

      const result = await caller.mcp.startSession({
        workspaceId: 'ws_123',
        taskDescription: 'Add authentication',
      });

      expect(result.sessionId).toMatch(/^sess_/);
      expect(result.guidance.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('learning aggregation', () => {
    it('should promote pattern after 2+ workspaces', async () => {
      const user = await createTestUser();

      // Record signal in workspace 1
      await recordSignal(user.id, 'ws_1', 'stack', 'typescript', 0.9);

      // Record same signal in workspace 2
      await recordSignal(user.id, 'ws_2', 'stack', 'typescript', 0.9);

      // Trigger aggregation
      await aggregateUserPatterns(user.id);

      // Verify promotion
      const patterns = await db.query.aggregatedPatterns.findMany({
        where: eq(aggregatedPatterns.userId, user.id)
      });

      expect(patterns).toContainEqual(expect.objectContaining({
        patternKey: 'typescript',
        workspaceCount: 2,
        confidence: expect.any(Number),
      }));
    });
  });
});
```

---

## Verification Checklist

### Phase 1: Server Infrastructure
- [ ] Database migrations created and applied
- [ ] API endpoints implemented in `apps/api/src/modules/mcp/`
- [ ] Intelligence functions in `apps/api/src/modules/mcp/intelligence.ts`
- [ ] Unit tests for API endpoints
- [ ] Integration tests for learning aggregation

### Phase 2: MCP Server Adaptations
- [ ] Learning tools added to `apps/mcp-server/src/tools/`
- [ ] Activity reporter implemented
- [ ] Graceful degradation for offline mode
- [ ] Unit tests for new handlers

### Phase 3: Integration
- [ ] Tools wired into main MCP server
- [ ] Activity reporting integrated into existing tools
- [ ] End-to-end flow tested

### Phase 4: Verification
- [ ] No code content sent to server
- [ ] Recommendations don't expose internal logic
- [ ] Fallback behavior works when offline
- [ ] Pro tier gating enforced

---

## References

- **Capability Mapping:** `ai_dev_utils/resources/new_cli/capability_mapping.md`
- **Vision Document:** `ai_dev_utils/resources/new_cli/the_vision.md`
- **Thin Proxy Architecture:** `ai_dev_utils/resources/new_cli/thin_proxy_architecture.md`
- **Local First Adherence:** `ai_dev_utils/resources/new_cli/local_first_adherence.md`
- **Internal MCP:** `ai_dev_utils/mcp/server.ts`
- **Customer MCP:** `apps/mcp-server/src/index.ts`
- **ROUTER.md:** Task classification and routing

**Last Updated:** 2025-12-21
**Status:** Ready for Implementation
