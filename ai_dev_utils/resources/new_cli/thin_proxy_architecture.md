# Thin Proxy MCP Server Implementation

**Principle:** Local process, server-side intelligence

---

## Package Structure

```
packages/mcp-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server setup
│   ├── proxy.ts              # API proxy layer
│   ├── tools/
│   │   └── definitions.ts    # Tool schemas (public)
│   ├── context/
│   │   ├── workspace.ts      # Workspace detection
│   │   └── session.ts        # Session management
│   └── utils/
│       ├── auth.ts           # Token handling
│       ├── hash.ts           # Path hashing
│       └── metadata.ts       # Metadata collection
└── README.md
```

---

## package.json

```json
{
  "name": "@snapback/mcp-server",
  "version": "1.0.0",
  "description": "SnapBack MCP server for AI coding assistants",
  "type": "module",
  "bin": {
    "snapback-mcp": "./dist/index.js"
  },
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "dev": "tsup src/index.ts --format esm --watch",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0"
  },
  "engines": {
    "node": ">=18"
  },
  "files": [
    "dist"
  ],
  "keywords": [
    "mcp",
    "snapback",
    "ai",
    "code-protection"
  ]
}
```

---

## src/index.ts (Entry Point)

```typescript
#!/usr/bin/env node
/**
 * SnapBack MCP Server
 *
 * A thin proxy that connects AI coding assistants to SnapBack's
 * server-side intelligence. All business logic runs on our servers;
 * this process just handles MCP protocol and forwards requests.
 *
 * Usage:
 *   npx @snapback/mcp-server
 *
 * Environment:
 *   SNAPBACK_TOKEN - Authentication token (required)
 *   SNAPBACK_API_URL - API endpoint (optional, defaults to production)
 *   SNAPBACK_DEBUG - Enable debug logging (optional)
 */

import { createServer } from './server.js';

async function main() {
  const token = process.env.SNAPBACK_TOKEN;

  if (!token) {
    console.error('Error: SNAPBACK_TOKEN environment variable is required');
    console.error('');
    console.error('Get your token by running: snap login');
    console.error('Or set it manually: export SNAPBACK_TOKEN=your_token');
    process.exit(1);
  }

  const server = await createServer({
    token,
    apiUrl: process.env.SNAPBACK_API_URL || 'https://api.snapback.dev',
    debug: process.env.SNAPBACK_DEBUG === 'true',
  });

  await server.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

---

## src/server.ts (MCP Server Setup)

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { TOOL_DEFINITIONS } from './tools/definitions.js';
import { createProxy } from './proxy.js';
import { getWorkspaceContext } from './context/workspace.js';
import { getOrCreateSession } from './context/session.js';

interface ServerConfig {
  token: string;
  apiUrl: string;
  debug: boolean;
}

export async function createServer(config: ServerConfig) {
  const { token, apiUrl, debug } = config;

  const log = debug
    ? (...args: unknown[]) => console.error('[snapback-mcp]', ...args)
    : () => {};

  log('Initializing SnapBack MCP server');
  log('API URL:', apiUrl);

  // Create the proxy that handles all server communication
  const proxy = createProxy({ token, apiUrl, debug });

  // Create MCP server
  const server = new Server(
    {
      name: 'snapback',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
      },
    }
  );

  // ============================================================
  // TOOL LISTING (Static - just returns definitions)
  // ============================================================

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    log('Listing tools');

    // Tool definitions are public (just the interface)
    // The implementation is server-side
    return {
      tools: TOOL_DEFINITIONS,
    };
  });

  // ============================================================
  // TOOL EXECUTION (Proxied to server)
  // ============================================================

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    log('Tool call:', name, args);

    try {
      // Collect local context (metadata only, no code)
      const workspace = await getWorkspaceContext();
      const session = await getOrCreateSession(workspace);

      // Proxy to server - ALL LOGIC IS SERVER-SIDE
      const result = await proxy.executeTool({
        tool: name,
        args: args || {},
        context: {
          workspaceId: workspace.id,
          workspacePathHash: workspace.pathHash,
          sessionId: session.id,
          // Metadata only - never send code
          fileCount: workspace.fileCount,
          framework: workspace.framework,
          cliVersion: workspace.cliVersion,
        },
      });

      log('Tool result:', result.success ? 'success' : 'error');

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${result.error}\n\n${result.message || ''}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: typeof result.data === 'string'
              ? result.data
              : JSON.stringify(result.data, null, 2),
          },
        ],
      };
    } catch (error) {
      log('Tool error:', error);

      return {
        content: [
          {
            type: 'text',
            text: `SnapBack error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  });

  // ============================================================
  // PROMPTS (Optional - for guided workflows)
  // ============================================================

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    // Prompts are fetched from server (can be updated without npm publish)
    const prompts = await proxy.getPrompts();
    return { prompts };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Prompt content comes from server
    const prompt = await proxy.getPrompt(name, args);
    return prompt;
  });

  // ============================================================
  // SERVER LIFECYCLE
  // ============================================================

  return {
    async start() {
      log('Starting MCP server with stdio transport');

      const transport = new StdioServerTransport();
      await server.connect(transport);

      log('MCP server connected');

      // Verify connection to SnapBack API
      try {
        await proxy.healthCheck();
        log('API connection verified');
      } catch (error) {
        log('Warning: Could not verify API connection:', error);
        // Don't exit - tools will fail gracefully with error messages
      }
    },
  };
}
```

---

## src/tools/definitions.ts (Public Tool Schemas)

```typescript
import { z } from 'zod';

/**
 * Tool definitions are PUBLIC - they just define the interface.
 * All implementation logic is SERVER-SIDE.
 *
 * This file can be reverse-engineered, and that's fine.
 * It just tells AI assistants what tools are available.
 */

export const TOOL_DEFINITIONS = [
  // ============================================================
  // SNAPSHOT TOOLS
  // ============================================================
  {
    name: 'create_snapshot',
    description: `Create a snapshot of the current workspace state. Use this before making significant changes to ensure you can roll back if needed.`,
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Optional description of why this snapshot is being created',
        },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific files to snapshot. If omitted, snapshots all tracked files.',
        },
      },
    },
  },

  {
    name: 'list_snapshots',
    description: `List recent snapshots for the current workspace. Shows snapshot ID, timestamp, trigger, and file count.`,
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of snapshots to return (default: 10)',
        },
      },
    },
  },

  {
    name: 'restore_snapshot',
    description: `Restore files from a previous snapshot. Can restore all files or specific files.`,
    inputSchema: {
      type: 'object',
      properties: {
        snapshotId: {
          type: 'string',
          description: 'The ID of the snapshot to restore from',
        },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific files to restore. If omitted, restores all files.',
        },
        dryRun: {
          type: 'boolean',
          description: 'If true, shows what would be restored without making changes',
        },
      },
      required: ['snapshotId'],
    },
  },

  {
    name: 'diff_snapshot',
    description: `Show the differences between current files and a snapshot.`,
    inputSchema: {
      type: 'object',
      properties: {
        snapshotId: {
          type: 'string',
          description: 'The ID of the snapshot to compare against',
        },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific files to diff. If omitted, diffs all changed files.',
        },
      },
      required: ['snapshotId'],
    },
  },

  // ============================================================
  // ANALYSIS TOOLS
  // ============================================================
  {
    name: 'analyze_risk',
    description: `Analyze the risk level of proposed changes. Use this before making significant modifications to understand potential impact.`,
    inputSchema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files that will be modified',
        },
        changeType: {
          type: 'string',
          enum: ['refactor', 'feature', 'bugfix', 'dependency', 'config'],
          description: 'Type of change being made',
        },
        description: {
          type: 'string',
          description: 'Brief description of the planned changes',
        },
      },
      required: ['files'],
    },
  },

  {
    name: 'check_dependencies',
    description: `Check for dependency issues that might affect a rollback. Analyzes imports and module relationships.`,
    inputSchema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files to analyze for dependencies',
        },
      },
      required: ['files'],
    },
  },

  // ============================================================
  // PROTECTION TOOLS
  // ============================================================
  {
    name: 'get_protected_files',
    description: `List files that have enhanced protection in this workspace. These files trigger automatic snapshots when modified.`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  {
    name: 'protect_file',
    description: `Add a file or pattern to the protected files list. Protected files get automatic snapshots on AI edits.`,
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'File path or glob pattern to protect (e.g., "src/config/*.ts")',
        },
        level: {
          type: 'string',
          enum: ['critical', 'standard', 'watched'],
          description: 'Protection level (default: standard)',
        },
        reason: {
          type: 'string',
          description: 'Why this file needs protection',
        },
      },
      required: ['pattern'],
    },
  },

  // ============================================================
  // STATUS TOOLS
  // ============================================================
  {
    name: 'workspace_status',
    description: `Get the current status of SnapBack protection for this workspace. Shows health score, recent activity, and any issues.`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  {
    name: 'session_info',
    description: `Get information about the current coding session, including snapshot count and AI detection stats.`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// Type helper for tool names
export type ToolName = typeof TOOL_DEFINITIONS[number]['name'];
```

---

## src/proxy.ts (API Proxy Layer)

```typescript
/**
 * Proxy layer that handles all communication with SnapBack's API.
 *
 * This is the ONLY place that talks to our servers.
 * All business logic lives server-side.
 */

interface ProxyConfig {
  token: string;
  apiUrl: string;
  debug: boolean;
}

interface ToolExecutionRequest {
  tool: string;
  args: Record<string, unknown>;
  context: {
    workspaceId: string;
    workspacePathHash: string;
    sessionId: string;
    fileCount?: number;
    framework?: string;
    cliVersion?: string;
  };
}

interface ToolExecutionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

export function createProxy(config: ProxyConfig) {
  const { token, apiUrl, debug } = config;

  const log = debug
    ? (...args: unknown[]) => console.error('[proxy]', ...args)
    : () => {};

  async function request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST';
      body?: unknown;
    } = {}
  ): Promise<T> {
    const { method = 'GET', body } = options;

    const url = `${apiUrl}${endpoint}`;
    log(`${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'snapback-mcp/1.0.0',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      log('Request failed:', response.status, errorText);

      // Handle specific error cases
      if (response.status === 401) {
        throw new Error('Authentication failed. Run `snap login` to refresh your token.');
      }
      if (response.status === 403) {
        throw new Error('This feature requires a Pro plan. Run `snap upgrade` to unlock.');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }

      throw new Error(`API error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  return {
    /**
     * Execute a tool on the server
     *
     * ALL TOOL LOGIC IS SERVER-SIDE
     * This just sends metadata and receives results
     */
    async executeTool(req: ToolExecutionRequest): Promise<ToolExecutionResponse> {
      return request<ToolExecutionResponse>('/mcp/execute', {
        method: 'POST',
        body: {
          tool: req.tool,
          args: req.args,
          context: req.context,
          // Include timestamp for request tracking
          timestamp: new Date().toISOString(),
        },
      });
    },

    /**
     * Get available prompts from server
     * Prompts can be updated server-side without npm publish
     */
    async getPrompts() {
      const response = await request<{ prompts: Array<{ name: string; description: string }> }>(
        '/mcp/prompts'
      );
      return response.prompts;
    },

    /**
     * Get a specific prompt with arguments filled in
     */
    async getPrompt(name: string, args?: Record<string, string>) {
      return request<{ messages: Array<{ role: string; content: { type: string; text: string } }> }>(
        '/mcp/prompts/' + name,
        {
          method: 'POST',
          body: { arguments: args },
        }
      );
    },

    /**
     * Health check - verify API connection
     */
    async healthCheck(): Promise<boolean> {
      const response = await request<{ status: string }>('/health');
      return response.status === 'ok';
    },

    /**
     * Report local snapshot creation
     * Server tracks metadata for analytics, never receives code
     */
    async reportSnapshot(metadata: {
      snapshotId: string;
      workspaceId: string;
      sessionId: string;
      trigger: 'manual' | 'auto' | 'ai-detected';
      fileCount: number;
      totalBytes: number;
      files: Array<{ path: string; size: number; hash: string }>;
      aiDetected?: boolean;
      aiTool?: string;
      aiConfidence?: number;
    }): Promise<void> {
      await request('/mcp/snapshot-created', {
        method: 'POST',
        body: metadata,
        // Note: we send file paths and hashes, NEVER content
      });
    },
  };
}
```

---

## src/context/workspace.ts (Workspace Detection)

```typescript
import { createHash } from 'crypto';
import { readFile, readdir, stat } from 'fs/promises';
import { join, basename } from 'path';
import { homedir } from 'os';

interface WorkspaceContext {
  id: string;
  name: string;
  path: string;
  pathHash: string;
  fileCount: number;
  framework?: string;
  cliVersion?: string;
  initialized: boolean;
}

/**
 * Detect workspace context from current directory.
 *
 * This collects METADATA ONLY - no file content.
 */
export async function getWorkspaceContext(): Promise<WorkspaceContext> {
  const cwd = process.cwd();
  const pathHash = hashPath(cwd);

  // Check if workspace is initialized
  const snapbackDir = join(cwd, '.snapback');
  let initialized = false;
  let workspaceId = `ws_${pathHash.slice(0, 12)}`;

  try {
    const configPath = join(snapbackDir, 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf-8'));
    initialized = true;
    workspaceId = config.workspaceId || workspaceId;
  } catch {
    // Not initialized
  }

  // Count files (metadata only)
  const fileCount = await countFiles(cwd);

  // Detect framework (from package.json, metadata only)
  const framework = await detectFramework(cwd);

  // Get CLI version if installed
  const cliVersion = await getCliVersion();

  return {
    id: workspaceId,
    name: basename(cwd),
    path: cwd,
    pathHash,
    fileCount,
    framework,
    cliVersion,
    initialized,
  };
}

/**
 * Hash path for privacy - we never send actual paths to server
 */
function hashPath(path: string): string {
  return createHash('sha256').update(path).digest('hex');
}

/**
 * Count files in workspace (metadata only)
 */
async function countFiles(dir: string, depth = 0): Promise<number> {
  if (depth > 5) return 0;

  const ignore = ['node_modules', '.git', 'dist', 'build', '.next', '.snapback'];

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    let count = 0;

    for (const entry of entries) {
      if (ignore.includes(entry.name)) continue;

      if (entry.isFile()) {
        count++;
      } else if (entry.isDirectory()) {
        count += await countFiles(join(dir, entry.name), depth + 1);
      }
    }

    return count;
  } catch {
    return 0;
  }
}

/**
 * Detect framework from package.json dependencies
 */
async function detectFramework(dir: string): Promise<string | undefined> {
  try {
    const pkgPath = join(dir, 'package.json');
    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Check for common frameworks (order matters)
    if (deps['next']) return 'nextjs';
    if (deps['remix']) return 'remix';
    if (deps['nuxt']) return 'nuxt';
    if (deps['svelte'] || deps['@sveltejs/kit']) return 'svelte';
    if (deps['astro']) return 'astro';
    if (deps['vue']) return 'vue';
    if (deps['react']) return 'react';
    if (deps['express']) return 'express';
    if (deps['fastify']) return 'fastify';

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get CLI version if installed
 */
async function getCliVersion(): Promise<string | undefined> {
  try {
    const configPath = join(homedir(), '.snapback', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf-8'));
    return config.cliVersion;
  } catch {
    return undefined;
  }
}
```

---

## src/context/session.ts (Session Management)

```typescript
import { randomUUID } from 'crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

interface Session {
  id: string;
  workspaceId: string;
  startedAt: string;
  lastActivityAt: string;
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Get or create a session for the current workspace.
 *
 * Sessions group related activity together.
 * They're used server-side for DBSCAN clustering.
 */
export async function getOrCreateSession(
  workspace: { id: string; path: string }
): Promise<Session> {
  const sessionPath = join(workspace.path, '.snapback', 'session.json');

  try {
    const existing = JSON.parse(await readFile(sessionPath, 'utf-8')) as Session;

    // Check if session is still valid
    const lastActivity = new Date(existing.lastActivityAt).getTime();
    const now = Date.now();

    if (now - lastActivity < SESSION_TIMEOUT_MS) {
      // Update last activity
      existing.lastActivityAt = new Date().toISOString();
      await writeFile(sessionPath, JSON.stringify(existing, null, 2));
      return existing;
    }

    // Session expired, create new one
  } catch {
    // No existing session
  }

  // Create new session
  const session: Session = {
    id: `sess_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
    workspaceId: workspace.id,
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  };

  await mkdir(join(workspace.path, '.snapback'), { recursive: true });
  await writeFile(sessionPath, JSON.stringify(session, null, 2));

  return session;
}
```

---

## src/utils/auth.ts (Token Handling)

```typescript
import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

interface Credentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  userId: string;
  email: string;
  tier: 'free' | 'pro' | 'enterprise';
}

/**
 * Get stored credentials from CLI config.
 *
 * The CLI handles auth flow; MCP just reads the token.
 */
export async function getStoredCredentials(): Promise<Credentials | null> {
  try {
    const credPath = join(homedir(), '.snapback', 'credentials.json');
    const content = await readFile(credPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Check if token is expired or about to expire
 */
export function isTokenExpired(credentials: Credentials): boolean {
  const expiresAt = new Date(credentials.expiresAt).getTime();
  const now = Date.now();
  const buffer = 5 * 60 * 1000; // 5 minute buffer

  return now >= expiresAt - buffer;
}
```

---

## Server-Side Endpoint (API)

```typescript
// packages/api/src/routes/mcp.ts
// This runs on YOUR server - all the intelligence is here

import { createRouter, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const mcpRouter = createRouter({

  /**
   * Execute MCP tool
   *
   * ALL BUSINESS LOGIC IS HERE
   * Client just sends metadata, receives results
   */
  execute: protectedProcedure
    .input(z.object({
      tool: z.string(),
      args: z.record(z.unknown()),
      context: z.object({
        workspaceId: z.string(),
        workspacePathHash: z.string(),
        sessionId: z.string(),
        fileCount: z.number().optional(),
        framework: z.string().optional(),
        cliVersion: z.string().optional(),
      }),
      timestamp: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { tool, args, context } = input;

      // Check tier for premium tools
      const premiumTools = ['analyze_risk', 'check_dependencies'];
      if (premiumTools.includes(tool) && ctx.user.tier === 'free') {
        return {
          success: false,
          error: 'TIER_REQUIRED',
          message: `The ${tool} tool requires a Pro plan. Run \`snap upgrade\` to unlock.`,
        };
      }

      // Route to appropriate handler
      // ALL LOGIC IS IN THESE HANDLERS
      switch (tool) {
        case 'create_snapshot':
          return await handlers.createSnapshot(ctx, args, context);

        case 'list_snapshots':
          return await handlers.listSnapshots(ctx, args, context);

        case 'restore_snapshot':
          return await handlers.restoreSnapshot(ctx, args, context);

        case 'analyze_risk':
          // PROTECTED IP: Risk scoring algorithms
          return await handlers.analyzeRisk(ctx, args, context);

        case 'check_dependencies':
          // PROTECTED IP: Dependency analysis
          return await handlers.checkDependencies(ctx, args, context);

        case 'workspace_status':
          return await handlers.workspaceStatus(ctx, args, context);

        case 'get_protected_files':
          // PROTECTED IP: Protection rules
          return await handlers.getProtectedFiles(ctx, args, context);

        case 'protect_file':
          return await handlers.protectFile(ctx, args, context);

        default:
          return {
            success: false,
            error: 'UNKNOWN_TOOL',
            message: `Unknown tool: ${tool}`,
          };
      }
    }),

  /**
   * Get available prompts
   */
  prompts: protectedProcedure
    .query(async ({ ctx }) => {
      // Prompts can be updated here without npm publish
      return {
        prompts: [
          {
            name: 'safe-refactor',
            description: 'Guide for safely refactoring code with SnapBack protection',
          },
          {
            name: 'recover-from-mistake',
            description: 'Steps to recover from an AI coding mistake',
          },
        ],
      };
    }),
});

// Tool handlers - THIS IS WHERE THE IP LIVES
const handlers = {
  async analyzeRisk(ctx: Context, args: unknown, context: ToolContext) {
    // PROTECTED: Risk scoring algorithm
    const { files, changeType } = args as { files: string[]; changeType?: string };

    // Server-side risk calculation
    const riskScore = await calculateRiskScore({
      userId: ctx.user.id,
      workspaceId: context.workspaceId,
      files,
      changeType,
      // Uses our proprietary algorithms
    });

    return {
      success: true,
      data: {
        riskScore: riskScore.score,
        riskLevel: riskScore.level,
        factors: riskScore.factors,
        recommendation: riskScore.recommendation,
      },
    };
  },

  // ... other handlers with protected logic
};
```

---

## Summary

The MCP package is ~300 lines of "glue code":

| Component | Lines | Purpose |
|-----------|-------|---------|
| index.ts | ~30 | Entry point |
| server.ts | ~100 | MCP protocol handling |
| proxy.ts | ~80 | API communication |
| tools/definitions.ts | ~150 | Tool schemas (public) |
| context/*.ts | ~100 | Metadata collection |

**What's public (in npm):**
- Tool names and schemas
- MCP protocol handling
- Metadata collection

**What's protected (on server):**
- Risk scoring algorithms
- Dependency analysis
- Protection rules
- AI detection patterns
- All business logic

The client is intentionally "dumb" - it just collects metadata and displays results.
