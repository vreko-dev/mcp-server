# MCP Bundling: Implementation Quick Reference

> **⚠️ DEPRECATED DOCUMENT (December 2025)**
>
> This document describes the **V1 Guardian architecture** which has been replaced by the **V2 Engine**.
>
> **Current Architecture:**
> - `packages/engine/` - V2 script-based architecture (PRIMARY)
> - `packages/engine/src/signals/` - Risk detection signals (ai-detection, threats, phantom-deps, etc.)
> - `packages/engine/src/transports/` - MCP, CLI, HTTP adapters
>
> **Removed/Deprecated:**
> - `packages/guardian-lite/` - REMOVED (Week 6 migration complete)
> - `GuardianLite` class - REMOVED
> - `Guardian` class in packages/core - DEPRECATED (scheduled for removal in v1.0.0)
>
> See `packages/engine/MIGRATION.md` for the V2 architecture and migration guide.

---

**Goal**: Ship VSCode extension with bundled MCP in a single VSIX, protecting IP while enabling standalone use.

---

## 🎯 TL;DR Decisions

| Question | Answer |
|----------|--------|
| **How to bundle?** | Dual-binary: Extension spawns MCP as child process |
| **What stays local?** | Guardian Lite (15 basic patterns), snapshot CRUD, session tracking |
| **What goes to API?** | ML detection, context-aware analysis, custom rules, team policies |
| **Free tier gets?** | Full local features, 10 API calls/day to try Pro |
| **How to protect IP?** | Keep `@snapback/core` private, ship Guardian Lite only |
| **Standalone MCP?** | Publish `@snapback/mcp` to npm, same binary as bundled |

---

## 📦 Package Structure Changes

### Create New Package: `guardian-lite`

```bash
# Create private package (not published to npm)
mkdir -p packages/guardian-lite/src
```

**File**: `packages/guardian-lite/package.json`
```json
{
  "name": "@snapback/guardian-lite",
  "version": "1.0.0",
  "private": true,  // ← Never publish to npm
  "main": "dist/index.js",
  "exports": {
    ".": "./dist/index.js"
  }
}
```

**File**: `packages/guardian-lite/src/index.ts`
```typescript
// Only 15 basic patterns - industry standard, no proprietary logic
export class GuardianLite {
  private readonly PATTERNS = [
    { name: 'AWS_KEY', regex: /AKIA[0-9A-Z]{16}/, severity: 'high' },
    { name: 'GENERIC_API_KEY', regex: /api[_-]?key.*[a-z0-9]{32,}/i, severity: 'medium' },
    { name: 'JWT', regex: /eyJ[A-Za-z0-9-_]+\./, severity: 'low' },
    // ... 12 more basic patterns
  ];

  analyze(code: string): AnalysisResult {
    const issues = this.PATTERNS
      .map(p => this.match(code, p))
      .filter(Boolean);

    return {
      riskLevel: this.calculateRisk(issues),
      issues,
      executionTime: Date.now() - start,
      upgradePrompt: issues.length > 2, // Suggest Pro if multiple issues
    };
  }
}
```

---

## 🔧 Extension Changes

### 1. Update `esbuild.config.cjs`

```javascript
// apps/vscode/esbuild.config.cjs
async function main() {
  // Build extension (existing)
  const extensionCtx = await esbuild.context({
    entryPoints: ['./src/extension.ts'],
    bundle: true,
    outfile: 'dist/extension.js',
    // ... existing config
  });

  // NEW: Build bundled MCP server
  const mcpCtx = await esbuild.context({
    entryPoints: ['../mcp-server/src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: 'dist/mcp-server.js',
    external: ['better-sqlite3'], // Share native module with extension
    define: {
      'process.env.SNAPBACK_MODE': '"bundled"',
    },
  });

  await Promise.all([
    extensionCtx.rebuild(),
    mcpCtx.rebuild(),
  ]);

  // Cleanup
  await extensionCtx.dispose();
  await mcpCtx.dispose();
}
```

### 2. Create MCP Lifecycle Manager

**File**: `apps/vscode/src/services/MCPLifecycleManager.ts`
```typescript
import { spawn, type ChildProcess } from 'node:child_process';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { logger } from '../utils/logger.js';

export class MCPLifecycleManager implements vscode.Disposable {
  private mcpProcess: ChildProcess | null = null;
  private isReady = false;

  constructor(private extensionPath: string) {}

  async start(): Promise<void> {
    const mcpPath = path.join(this.extensionPath, 'dist', 'mcp-server.js');
    const dbPath = path.join(this.extensionPath, '.snapback', 'snapback.db');

    logger.info('Starting bundled MCP server', { mcpPath });

    this.mcpProcess = spawn('node', [mcpPath], {
      env: {
        ...process.env,
        SNAPBACK_MODE: 'bundled',
        SNAPBACK_DB_PATH: dbPath,
        SNAPBACK_IPC_SOCKET: '/tmp/snapback-mcp.sock',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Capture logs
    this.mcpProcess.stdout?.on('data', (data) => {
      logger.debug(`[MCP] ${data.toString()}`);
    });

    this.mcpProcess.stderr?.on('data', (data) => {
      logger.error(`[MCP Error] ${data.toString()}`);
    });

    // Wait for ready signal
    await this.waitForReady();

    logger.info('MCP server ready');
  }

  private async waitForReady(timeoutMs = 5000): Promise<void> {
    const start = Date.now();

    return new Promise((resolve, reject) => {
      const checkReady = setInterval(() => {
        // Check if Unix socket exists
        const socketExists = fs.existsSync('/tmp/snapback-mcp.sock');

        if (socketExists) {
          clearInterval(checkReady);
          this.isReady = true;
          resolve();
        }

        if (Date.now() - start > timeoutMs) {
          clearInterval(checkReady);
          reject(new Error('MCP server failed to start'));
        }
      }, 100);
    });
  }

  async stop(): Promise<void> {
    if (!this.mcpProcess) return;

    logger.info('Stopping MCP server');

    this.mcpProcess.kill('SIGTERM');

    // Wait for graceful shutdown
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        this.mcpProcess?.kill('SIGKILL'); // Force kill after 5s
        resolve();
      }, 5000);

      this.mcpProcess?.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    this.mcpProcess = null;
    this.isReady = false;
  }

  dispose(): void {
    this.stop();
  }
}
```

### 3. Update Extension Activation

**File**: `apps/vscode/src/extension.ts`
```typescript
import { MCPLifecycleManager } from './services/MCPLifecycleManager.js';

let mcpManager: MCPLifecycleManager | null = null;

export async function activate(context: vscode.ExtensionContext) {
  const startTime = Date.now();
  logger.info('Extension activation started');

  // PHASE 0: Start bundled MCP (before existing phases)
  const config = vscode.workspace.getConfiguration('snapback');
  const mcpEnabled = config.get<boolean>('mcp.enabled', true);

  if (mcpEnabled) {
    try {
      mcpManager = new MCPLifecycleManager(context.extensionPath);
      await mcpManager.start();
      context.subscriptions.push(mcpManager);

      logger.info('Bundled MCP server started successfully');
    } catch (error) {
      logger.error('Failed to start bundled MCP', error as Error);
      vscode.window.showWarningMessage(
        'SnapBack MCP server failed to start. AI analysis features will be limited.'
      );
    }
  }

  // PHASE 1-5: Existing activation (unchanged)
  await initializePhase1Services(context);
  // ... rest of activation

  const activationTime = Date.now() - startTime;
  logger.info(`Extension activated in ${activationTime}ms`);
}

export async function deactivate() {
  // Stop MCP before other cleanup
  if (mcpManager) {
    await mcpManager.stop();
  }

  // Existing cleanup...
}
```

### 4. Add Configuration

**File**: `apps/vscode/package.json` (contributes section)
```json
{
  "contributes": {
    "configuration": {
      "properties": {
        "snapback.mcp.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable bundled MCP server for AI assistant integration (Claude Code, Cursor)"
        },
        "snapback.mcp.autoStart": {
          "type": "boolean",
          "default": true,
          "description": "Automatically start MCP server on extension activation"
        },
        "snapback.mcp.standalone": {
          "type": "boolean",
          "default": false,
          "description": "Use standalone MCP installation instead of bundled version (advanced)"
        }
      }
    }
  }
}
```

---

## 🔌 MCP Server Changes

### 1. Update Dependencies

**File**: `apps/mcp-server/package.json`
```json
{
  "dependencies": {
    "@snapback/guardian-lite": "workspace:*",  // NEW: Use lite version
    // Remove: "@snapback/core": "workspace:*"  // OLD: Don't depend on full Guardian
    "@snapback/auth": "workspace:*",
    "@snapback/events": "workspace:*",
    "@snapback/sdk": "workspace:*"
  }
}
```

### 2. Create Analysis Router

**File**: `apps/mcp-server/src/services/AnalysisRouter.ts`
```typescript
import { GuardianLite } from '@snapback/guardian-lite';
import { SnapBackAPIClient } from '../client/snapback-api.js';

export class AnalysisRouter {
  private localGuardian: GuardianLite;
  private apiClient: SnapBackAPIClient | null = null;

  constructor(apiKey?: string) {
    this.localGuardian = new GuardianLite();

    if (apiKey) {
      this.apiClient = new SnapBackAPIClient({
        baseUrl: process.env.SNAPBACK_API_URL || 'https://api.snapback.dev',
        apiKey,
      });
    }
  }

  async analyze(code: string, userTier: 'free' | 'pro' | 'enterprise'): Promise<AnalysisResult> {
    // Free tier: Local only
    if (userTier === 'free' || !this.apiClient) {
      const result = this.localGuardian.analyze(code);
      return this.addUpgradePrompt(result, userTier);
    }

    // Pro/Enterprise: Try API, fallback to local
    try {
      const apiResult = await this.apiClient.analyzeFast({
        code,
        filePath: 'analysis.ts',
      });

      return apiResult;
    } catch (error) {
      console.warn('API analysis failed, using local fallback', error);
      return this.localGuardian.analyze(code);
    }
  }

  private addUpgradePrompt(result: AnalysisResult, tier: string): AnalysisResult {
    if (result.upgradePrompt && tier === 'free') {
      result.recommendations = [
        ...result.recommendations,
        '💎 Upgrade to Pro for ML-powered detection and context-aware analysis',
        '📊 Try 10 free API calls: https://snapback.dev/upgrade',
      ];
    }

    return result;
  }
}
```

### 3. Update Tool Handler

**File**: `apps/mcp-server/src/index.ts`
```typescript
import { AnalysisRouter } from './services/AnalysisRouter.js';

export async function startServer() {
  // Initialize analysis router
  const apiKey = process.env.SNAPBACK_API_KEY;
  const analysisRouter = new AnalysisRouter(apiKey);

  // Detect user tier from API key or default to free
  const userTier = await detectUserTier(apiKey);

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'snapback.analyze_risk') {
      const parsed = z.object({
        changes: z.array(z.object({
          value: z.string(),
        })),
      }).parse(args);

      const code = parsed.changes.map(c => c.value).join('\n');

      // Use router instead of direct API/local call
      const result = await analysisRouter.analyze(code, userTier);

      return {
        content: [
          { type: 'json', json: result },
          {
            type: 'text',
            text: `Risk Level: ${result.riskLevel.toUpperCase()}\n` +
                  `Issues Found: ${result.issues.length}\n` +
                  result.recommendations.join('\n'),
          },
        ],
      };
    }
  });
}
```

---

## 📝 Testing Checklist

### Local Development
```bash
# 1. Build both extension and MCP
cd apps/vscode
pnpm run compile

# 2. Verify MCP binary exists
ls -lh dist/mcp-server.js  # Should be ~3 MB

# 3. Test MCP standalone
node dist/mcp-server.js
# Should output: "SnapBack MCP Server started"

# 4. Install extension in VSCode
pnpm run dev

# 5. Check MCP process is running
ps aux | grep mcp-server
# Should show node process with mcp-server.js
```

### Functional Testing
- [ ] Extension activates in <3s (including MCP startup)
- [ ] MCP Unix socket exists at `/tmp/snapback-mcp.sock`
- [ ] `analyze_risk` tool works (test in Claude Code)
- [ ] Local analysis completes in <50ms
- [ ] API analysis (with key) completes in <200ms
- [ ] Fallback works when API is offline
- [ ] MCP stops cleanly on extension deactivation
- [ ] No zombie processes after reload

### User Experience
- [ ] First-time users see MCP enabled automatically
- [ ] Settings allow disabling MCP if desired
- [ ] Error messages are clear (e.g., "MCP failed to start")
- [ ] Upgrade prompts appear for free tier (>2 issues detected)
- [ ] Status bar shows "API" or "Local" during analysis

---

## 🚀 Deployment

### Build Production VSIX
```bash
cd apps/vscode

# 1. Build with production optimizations
pnpm run compile

# 2. Package VSIX
pnpm run package-vsce-no-deps

# 3. Verify size
ls -lh *.vsix
# Target: < 15 MB (extension ~2MB + MCP ~3MB + deps ~5MB + media ~1MB)

# 4. Test installation
code --install-extension snapback-vscode-*.vsix --force

# 5. Verify in fresh VSCode window
code --new-window
```

### Publish to Marketplace
```bash
# Prerequisites: Set up publisher credentials
# https://code.visualstudio.com/api/working-with-extensions/publishing-extension

# Deploy
pnpm run deploy

# Monitor marketplace
# https://marketplace.visualstudio.com/items?itemName=MarcelleLabs.snapback-vscode
```

### Publish Standalone MCP to NPM
```bash
cd apps/mcp-server

# 1. Build for NPM distribution
pnpm run build

# 2. Test locally
npm pack
npm install -g snapback-mcp-*.tgz
snapback-mcp  # Should start server

# 3. Publish
npm publish --access public
```

---

## 🔒 IP Protection Verification

### Pre-Release Checklist
- [ ] `@snapback/core` is **NOT** in `dependencies` of MCP
- [ ] Only `@snapback/guardian-lite` (private package) is used
- [ ] ML models are **NOT** in bundled code
- [ ] Advanced heuristics are **NOT** in bundled code
- [ ] Backend API endpoints require authentication
- [ ] Free tier has rate limiting (10 API calls/day)
- [ ] Source maps do **NOT** expose sensitive logic
- [ ] VSIX does **NOT** include training data

### Manual Inspection
```bash
# 1. Extract VSIX
unzip snapback-vscode-*.vsix -d vsix-contents

# 2. Check bundled MCP
cat vsix-contents/dist/mcp-server.js | grep -i "mlModel\|TrainedModel\|GuardianFull"
# Should return NOTHING (all ML code is server-side)

# 3. Verify only Guardian Lite is used
cat vsix-contents/dist/mcp-server.js | grep -i "GuardianLite"
# Should find references to Guardian Lite

# 4. Check for exposed secrets/patterns
cat vsix-contents/dist/mcp-server.js | wc -l
# Should be ~500-1000 lines (not 10,000+ from full Guardian)
```

---

## 📊 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Extension activation | < 3s | VSCode startup time |
| MCP startup | < 2s | Time to Unix socket ready |
| Local analysis | < 50ms | Guardian Lite execution |
| API analysis | < 200ms | Backend round-trip |
| Cached result | < 5ms | SQLite query |
| VSIX size | < 15 MB | Final packaged size |
| Memory usage | < 100 MB | Extension + MCP combined |

---

## 🐛 Troubleshooting

### MCP Server Won't Start
```bash
# Check logs
code --log-level=debug
# Look for: "[SnapBack MCP] Failed to start"

# Common causes:
# 1. Port already in use
lsof -i :6379  # Event bus port
# Fix: Kill process or change port

# 2. Permission denied
chmod +x dist/mcp-server.js

# 3. Node not in PATH
which node
# Fix: Ensure Node 20+ is installed
```

### Analysis Not Working
```typescript
// Enable debug logging in extension
const config = vscode.workspace.getConfiguration('snapback');
config.update('logLevel', 'debug', true);

// Check MCP tool registration
// In Claude Code, type: "List available MCP tools"
// Should show: snapback.analyze_risk
```

### VSIX Too Large (> 15 MB)
```bash
# Find large files
cd apps/vscode
du -sh dist/* | sort -hr | head -10

# Common culprits:
# - Source maps (disable in production)
# - Duplicate dependencies (check bundle)
# - Large images (optimize with svgo)
```

---

## 📚 Next Steps

1. **Implement Phase 1** (Week 1-2): MCP bundling
   - [ ] Create `MCPLifecycleManager`
   - [ ] Update esbuild configs
   - [ ] Test extension + MCP activation

2. **Implement Phase 2** (Week 3-4): Guardian Lite
   - [ ] Create `@snapback/guardian-lite` package
   - [ ] Port 15 basic patterns
   - [ ] Add upgrade prompts

3. **Implement Phase 3** (Week 5-6): API integration
   - [ ] Create `AnalysisRouter`
   - [ ] Implement tier detection
   - [ ] Add fallback logic

4. **Test & Ship** (Week 7-8): Production deployment
   - [ ] End-to-end testing
   - [ ] Performance profiling
   - [ ] Marketplace submission

---

**Quick Reference Status**: Ready for implementation
**Related Docs**:
- [MCP Bundling Strategy](./mcp-bundling-strategy.md) (full strategy)
- [Architecture Diagrams](./bundling-architecture-diagram.md) (visual reference)
