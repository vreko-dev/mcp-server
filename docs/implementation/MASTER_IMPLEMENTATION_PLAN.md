# SnapBack MCP Bundling: Master Implementation Plan

**Purpose**: Single source of truth for implementing MCP bundling with VSCode extension
**Audience**: LLM coding agents, developers, technical leads
**Optimization**: Parallel workstreams with minimal conflicts
**Auth**: Better Auth API keys + PostHog feature flags
**Status**: Ready for implementation

---

## 🎯 Executive Summary

### What We're Building

**Bundle MCP server with VSCode extension** for one-click installation while:
- Protecting IP (basic patterns local, ML models server-side)
- Using **Better Auth + PostHog** for tier management
- Enabling offline-first operation
- Supporting standalone MCP distribution
- Maintaining <3s activation time
- Providing graceful degradation

### Success Criteria

- ✅ Single VSIX install enables extension + MCP
- ✅ Extension activates in <3 seconds
- ✅ MCP starts in <2 seconds (background, non-blocking)
- ✅ Local analysis <50ms, API analysis <200ms
- ✅ Works 100% offline (no network dependencies for core features)
- ✅ VSIX size <15 MB
- ✅ Zero manual MCP configuration for 95% of users
- ✅ Feature flags control tier capabilities (not just API key)

---

## 🔐 Authentication & Tier Management

### Architecture Decision

**Identity**: Better Auth API keys
**Capabilities**: PostHog feature flags
**Why**: Gradual rollouts, A/B testing, emergency kill switches, analytics

### Flow

```typescript
// 1. Verify API key (Better Auth)
const user = await betterAuth.verifyApiKey(apiKey);

// 2. Get feature flags (PostHog)
const flags = await posthog.getFeatureFlags(user.id, {
  subscriptionTier: user.subscription.tier,
  organizationId: user.organizationId,
});

// 3. Route based on flags
if (flags['ml-detection'] && flags['api-analysis-enabled']) {
  return await apiClient.analyzeFast(code); // Pro tier
} else {
  return await guardianLite.analyze(code); // Free tier
}
```

### Feature Flags (PostHog)

```javascript
{
  'ml-detection': true,           // Pro/Enterprise only
  'cloud-sync': true,             // Pro/Enterprise only
  'custom-rules': true,           // Enterprise only
  'api-analysis-enabled': true,   // Global kill switch
  'experimental-ast': false,      // Beta (10% rollout)
}
```

---

## 📋 Implementation Architecture

### Three-Phase Activation (Simplified from 5)

```typescript
// Phase 1: Critical Path (<500ms)
// - Load config, storage, core services
// - Register essential commands
// - No network calls, no heavy computation

// Phase 2: Background Initialization (non-blocking)
// - Start bundled MCP server
// - Initialize telemetry queue
// - Connect to event bus

// Phase 3: Lazy Services (on-demand)
// - Guardian Lite (loads on first snapshot)
// - API Client (loads on first Pro feature use)
// - Analytics (loads after 5s idle)
```

### Capability Distribution

| Feature | Local (Guardian Lite) | API (Backend) | Tier |
|---------|----------------------|---------------|------|
| **Basic pattern detection** | ✅ 15 patterns | ❌ | Free |
| **ML-based detection** | ❌ | ✅ 100+ patterns + ML | Pro (via flag) |
| **Snapshot CRUD** | ✅ SQLite | ☑️ Cloud sync | Free (local), Pro (sync via flag) |
| **Session tracking** | ✅ Local | ☑️ Analytics | All |
| **Custom rules** | ❌ | ✅ | Enterprise (via flag) |

---

## 🔧 Parallel Workstreams

### Workstream Matrix

| Workstream | Can Start | Dependencies | Merge Conflicts | Est. Time |
|------------|----------|--------------|-----------------|-----------|
| **WS1: Guardian Lite Package** | ✅ Day 1 | None | Low | 3-4 days |
| **WS2: MCP Build & Bundle** | ✅ Day 1 | None | Low | 2-3 days |
| **WS3: Extension Lifecycle Manager** | Day 2 | WS2 complete | Medium | 3-4 days |
| **WS4: Analysis Router + Auth** | Day 3 | WS1 complete | Low | 3-4 days |
| **WS5: Circuit Breaker** | ✅ Day 1 | None | Low | 1-2 days |
| **WS6: Performance Monitoring** | Day 4 | WS4 complete | Low | 2 days |
| **WS7: Integration & Testing** | Day 8 | All complete | High | 3-4 days |

**Total Duration**: 10-12 days (2 weeks) with parallel execution

**Optimal Parallelization**:
- Start WS1, WS2, WS5 simultaneously (zero conflicts)
- WS3 can start after WS2 (MCP binary exists)
- WS4 can start after WS1 (Guardian Lite available)
- WS6 can start after WS4 (services to monitor exist)
- WS7 integrates everything

---

## 🚀 Workstream 1: Guardian Lite Package

### Objective
Create private package with 15 basic detection patterns (no proprietary IP).

### File Structure
```
packages/guardian-lite/
├── src/
│   ├── index.ts              # Main export
│   ├── guardian-lite.ts      # Core orchestrator
│   ├── patterns/
│   │   ├── secrets.ts        # 5 basic secret patterns
│   │   ├── mocks.ts          # 5 test framework patterns
│   │   └── dependencies.ts   # 5 import/dependency patterns
│   └── types.ts              # Type definitions
├── package.json              # "private": true (never publish)
├── tsconfig.json
└── README.md
```

### Implementation

**File**: `packages/guardian-lite/package.json`
```json
{
  "name": "@snapback/guardian-lite",
  "version": "1.0.0",
  "description": "Lightweight local detection engine with 15 basic patterns for offline-first code analysis",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "author": "SnapBack Team <team@snapback.dev>",
  "license": "UNLICENSED",
  "keywords": [
    "snapback",
    "guardian",
    "detection",
    "security",
    "code-analysis"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/snapback/snapback.git",
    "directory": "packages/guardian-lite"
  },
  "bugs": {
    "url": "https://github.com/snapback/snapback/issues"
  },
  "homepage": "https://snapback.dev/docs/guardian-lite",
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {},
  "devDependencies": {
    "@snapback/tsconfig": "workspace:*",
    "typescript": "catalog:",
    "vitest": "catalog:"
  },
  "publishConfig": {
    "access": "restricted"
  }
}
```

**File**: `packages/guardian-lite/README.md`
```markdown
# @snapback/guardian-lite

Lightweight local detection engine with 15 basic patterns for offline-first code analysis.

## Features

- ✅ 15 industry-standard detection patterns
- ✅ <50ms analysis time (1000 lines)
- ✅ Zero network dependencies
- ✅ TypeScript-first with full type safety
- ❌ No ML models (see `@snapback/core` for advanced detection)

## Usage

\`\`\`typescript
import { GuardianLite } from '@snapback/guardian-lite';

const guardian = new GuardianLite();
const result = guardian.analyze(code);

if (result.riskLevel === 'high') {
  console.warn('High risk detected:', result.issues);
}
\`\`\`

## Patterns Detected

### Secrets (5 patterns)
- AWS Keys (AKIA...)
- Generic API Keys
- JWT Tokens
- Private Keys (PEM)
- Database Connection Strings

### Mocks (5 patterns)
- Jest mocks
- Vitest mocks
- Sinon stubs
- Test doubles
- Mock adapters

### Dependencies (5 patterns)
- Phantom imports
- Missing dependencies

## Performance

- **Target**: <50ms for 1000 lines
- **Typical**: 10-20ms for most files
- **Memory**: ~5 MB

## Private Package

This package is **not published to npm**. It's bundled with the VSCode extension and MCP server.

For advanced detection (ML models, context-aware analysis), use the SnapBack API (Pro tier).
```

**File**: `packages/guardian-lite/src/guardian-lite.ts`
```typescript
export interface AnalysisResult {
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  confidence: number; // 0-1
  issues: Issue[];
  executionTime: number;
  upgradePrompt: boolean;
  recommendations: string[];
}

export interface Issue {
  type: 'secret' | 'mock' | 'dependency';
  severity: 'low' | 'medium' | 'high';
  message: string;
  line?: number;
  pattern: string;
}

export class GuardianLite {
  private readonly PATTERNS = {
    secrets: [
      { name: 'AWS_KEY', regex: /AKIA[0-9A-Z]{16}/, severity: 'high' },
      { name: 'GENERIC_API_KEY', regex: /api[_-]?key.*[a-z0-9]{32,}/i, severity: 'medium' },
      { name: 'JWT', regex: /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/, severity: 'low' },
      { name: 'PRIVATE_KEY', regex: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/, severity: 'high' },
      { name: 'DB_CONNECTION', regex: /(postgres|mysql|mongodb):\/\/[^\s]+/, severity: 'high' },
    ],
    mocks: [
      { name: 'JEST_MOCK', regex: /jest\.mock\(/, severity: 'medium' },
      { name: 'VITEST_MOCK', regex: /vi\.mock\(/, severity: 'medium' },
      { name: 'SINON_STUB', regex: /sinon\.(stub|spy|mock)/, severity: 'medium' },
      { name: 'TEST_DOUBLE', regex: /td\.(replace|when|verify)/, severity: 'low' },
      { name: 'MOCK_AXIOS', regex: /MockAdapter|mock\.onGet/, severity: 'low' },
    ],
    dependencies: [
      { name: 'PHANTOM_IMPORT', regex: /import .+ from ['"](?!\.|\@snapback)/, severity: 'medium' },
      { name: 'REQUIRE_EXTERNAL', regex: /require\(['"](?!\.|\@snapback)/, severity: 'medium' },
    ],
  };

  analyze(code: string): AnalysisResult {
    const startTime = performance.now();
    const issues: Issue[] = [];

    // Check all patterns
    for (const [type, patterns] of Object.entries(this.PATTERNS)) {
      for (const pattern of patterns) {
        const matches = this.findMatches(code, pattern.regex);
        for (const match of matches) {
          issues.push({
            type: type as Issue['type'],
            severity: pattern.severity as Issue['severity'],
            message: `Detected ${pattern.name}`,
            line: match.line,
            pattern: pattern.name,
          });
        }
      }
    }

    const executionTime = performance.now() - startTime;
    const riskLevel = this.calculateRiskLevel(issues);
    const confidence = this.calculateConfidence(issues);

    return {
      riskLevel,
      confidence,
      issues,
      executionTime,
      upgradePrompt: issues.length > 2 || issues.some(i => i.severity === 'high'),
      recommendations: this.generateRecommendations(issues),
    };
  }

  private findMatches(code: string, regex: RegExp): Array<{ line: number; match: string }> {
    const matches: Array<{ line: number; match: string }> = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const match = line.match(regex);
      if (match) {
        matches.push({ line: index + 1, match: match[0] });
      }
    });

    return matches;
  }

  private calculateRiskLevel(issues: Issue[]): AnalysisResult['riskLevel'] {
    if (issues.length === 0) return 'none';
    if (issues.some(i => i.severity === 'high')) return 'high';
    if (issues.some(i => i.severity === 'medium')) return 'medium';
    return 'low';
  }

  private calculateConfidence(issues: Issue[]): number {
    // Higher confidence when more issues detected (more data points)
    // Lower confidence when close to upgrade boundary (might need ML)
    if (issues.length === 0) return 0.95;
    if (issues.length > 5) return 0.60; // Suggest API analysis
    return 0.85;
  }

  private generateRecommendations(issues: Issue[]): string[] {
    const recs: string[] = [];

    if (issues.some(i => i.type === 'secret')) {
      recs.push('Move secrets to environment variables (.env file)');
    }
    if (issues.some(i => i.type === 'mock')) {
      recs.push('Remove test mocks from production code');
    }
    if (issues.some(i => i.type === 'dependency')) {
      recs.push('Add missing dependencies to package.json');
    }
    if (issues.length > 2) {
      recs.push('💎 Upgrade to Pro for ML-powered detection and context-aware analysis');
    }

    return recs;
  }
}
```

### Tests

**File**: `packages/guardian-lite/src/guardian-lite.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { GuardianLite } from './guardian-lite';

describe('GuardianLite', () => {
  const guardian = new GuardianLite();

  it('should detect AWS keys', () => {
    const code = 'const key = "AKIAIOSFODNN7EXAMPLE";';
    const result = guardian.analyze(code);

    expect(result.riskLevel).toBe('high');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].pattern).toBe('AWS_KEY');
  });

  it('should detect jest mocks', () => {
    const code = 'jest.mock("./module");';
    const result = guardian.analyze(code);

    expect(result.riskLevel).toBe('medium');
    expect(result.issues[0].type).toBe('mock');
  });

  it('should return none for clean code', () => {
    const code = 'const x = 1 + 1;';
    const result = guardian.analyze(code);

    expect(result.riskLevel).toBe('none');
    expect(result.issues).toHaveLength(0);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('should suggest upgrade when multiple issues detected', () => {
    const code = `
      const key = "AKIAIOSFODNN7EXAMPLE";
      jest.mock("./module");
      const db = "postgres://user:pass@localhost/db";
    `;
    const result = guardian.analyze(code);

    expect(result.upgradePrompt).toBe(true);
    expect(result.recommendations).toContain(
      expect.stringContaining('Upgrade to Pro')
    );
  });

  it('should complete analysis in <50ms', () => {
    const code = 'const x = 1;'.repeat(1000); // 1000 lines
    const result = guardian.analyze(code);

    expect(result.executionTime).toBeLessThan(50);
  });
});
```

### Acceptance Criteria
- [ ] Package builds successfully (`pnpm build`)
- [ ] All 15 patterns detect correctly
- [ ] Tests pass with 100% coverage
- [ ] Analysis completes in <50ms for 1000 lines
- [ ] `"private": true` in package.json (never published)
- [ ] Exports clear TypeScript types
- [ ] README documents all patterns

---

## 🚀 Workstream 2: MCP Build & Bundle

[... same as before, no changes ...]

---

## 🚀 Workstream 3: Extension Lifecycle Manager

### Objective
Manage MCP server lifecycle with **exponential backoff** for restarts.

### File**: `apps/vscode/src/services/MCPLifecycleManager.ts`
```typescript
import { spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as net from 'node:net';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { logger } from '../utils/logger.js';

export interface MCPStartOptions {
  extensionPath: string;
  dbPath: string;
  socketPath?: string;
  timeout?: number;
}

export class MCPLifecycleManager implements vscode.Disposable {
  private mcpProcess: ChildProcess | null = null;
  private isReady = false;
  private restartCount = 0;
  private readonly maxRestarts = 3;
  private socketPath: string;

  constructor(private options: MCPStartOptions) {
    this.socketPath = options.socketPath || '/tmp/snapback-mcp.sock';
  }

  async start(): Promise<void> {
    const startTime = Date.now();
    const mcpPath = path.join(this.options.extensionPath, 'dist', 'mcp-server.js');

    // Verify MCP binary exists
    if (!fs.existsSync(mcpPath)) {
      throw new Error(`MCP server binary not found: ${mcpPath}`);
    }

    logger.info('Starting bundled MCP server', { mcpPath, socketPath: this.socketPath });

    // Clean up old socket if exists
    if (fs.existsSync(this.socketPath)) {
      fs.unlinkSync(this.socketPath);
    }

    // Spawn MCP process
    this.mcpProcess = spawn('node', [mcpPath], {
      env: {
        ...process.env,
        SNAPBACK_MODE: 'bundled',
        SNAPBACK_DB_PATH: this.options.dbPath,
        SNAPBACK_IPC_SOCKET: this.socketPath,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Capture logs
    this.mcpProcess.stdout?.on('data', (data) => {
      logger.debug(`[MCP] ${data.toString().trim()}`);
    });

    this.mcpProcess.stderr?.on('data', (data) => {
      const message = data.toString().trim();
      // Ignore noisy messages
      if (!message.includes('Biome') && !message.includes('[PERF]')) {
        logger.error(`[MCP Error] ${message}`);
      }
    });

    // Monitor for crashes with exponential backoff
    this.mcpProcess.on('exit', (code, signal) => {
      logger.warn(`MCP process exited`, { code, signal });

      if (code !== 0 && this.restartCount < this.maxRestarts) {
        this.restartCount++;

        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.min(2000 * Math.pow(2, this.restartCount - 1), 8000);

        logger.info(
          `Attempting MCP restart (${this.restartCount}/${this.maxRestarts}) in ${delay}ms`
        );

        setTimeout(() => this.start(), delay);
      } else if (this.restartCount >= this.maxRestarts) {
        vscode.window.showErrorMessage(
          '⚠️ SnapBack MCP failed to start after 3 attempts. Extension will work with reduced functionality.',
          'View Logs',
          'Disable MCP'
        ).then(action => {
          if (action === 'View Logs') {
            logger.showOutputChannel();
          } else if (action === 'Disable MCP') {
            vscode.workspace.getConfiguration('snapback')
              .update('mcp.enabled', false, vscode.ConfigurationTarget.Global);
          }
        });
      }
    });

    // Wait for ready signal
    const timeout = this.options.timeout || 3000;
    try {
      await this.waitForReady(timeout);
      const duration = Date.now() - startTime;
      logger.info(`MCP server ready in ${duration}ms`);
      this.isReady = true;
    } catch (error) {
      logger.error('MCP startup timeout', error as Error);
      throw error;
    }
  }

  private async waitForReady(timeoutMs: number): Promise<void> {
    const start = Date.now();

    return new Promise((resolve, reject) => {
      const checkReady = setInterval(async () => {
        // Check if Unix socket exists
        const socketExists = fs.existsSync(this.socketPath);

        if (!socketExists) {
          if (Date.now() - start > timeoutMs) {
            clearInterval(checkReady);
            reject(new Error('MCP Unix socket not created within timeout'));
          }
          return; // Keep waiting
        }

        // Socket exists - verify MCP responds to ping
        try {
          const health = await this.pingMCP();
          if (health.status === 'ready') {
            clearInterval(checkReady);
            resolve();
          }
        } catch (error) {
          // Socket exists but MCP not responding
          if (Date.now() - start > timeoutMs) {
            clearInterval(checkReady);
            reject(new Error('MCP socket exists but server not responding'));
          }
        }
      }, 100);
    });
  }

  private async pingMCP(): Promise<{ status: string }> {
    return new Promise((resolve, reject) => {
      const client = net.connect(this.socketPath, () => {
        client.write(JSON.stringify({ type: 'ping' }));
      });

      client.on('data', (data) => {
        try {
          const response = JSON.parse(data.toString());
          client.end();
          resolve(response);
        } catch (error) {
          client.end();
          reject(error);
        }
      });

      client.on('error', reject);
      setTimeout(() => {
        client.end();
        reject(new Error('Ping timeout'));
      }, 1000);
    });
  }

  async stop(): Promise<void> {
    if (!this.mcpProcess) return;

    logger.info('Stopping MCP server');

    this.mcpProcess.kill('SIGTERM');

    // Wait for graceful shutdown
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        logger.warn('MCP did not stop gracefully, force killing');
        this.mcpProcess?.kill('SIGKILL');
        resolve();
      }, 5000);

      this.mcpProcess?.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    this.mcpProcess = null;
    this.isReady = false;

    // Clean up socket
    if (fs.existsSync(this.socketPath)) {
      fs.unlinkSync(this.socketPath);
    }
  }

  get ready(): boolean {
    return this.isReady;
  }

  dispose(): void {
    this.stop();
  }
}
```

### Exponential Backoff Benefits

| Attempt | Delay | Why |
|---------|-------|-----|
| 1st restart | 2s | Quick recovery for transient errors |
| 2nd restart | 4s | Allow more time for resource cleanup |
| 3rd restart | 8s | Final attempt with maximum patience |
| After 3 failures | No retry | Show error to user, prevent infinite loops |

**Prevents**: Rapid crash loops that consume CPU
**Allows**: Recovery from temporary resource contention

[... rest of WS3 same as before ...]

---

## 🚀 Workstream 4: Analysis Router + Auth

### Objective
Route analysis requests using **Better Auth + PostHog feature flags**.

### Dependencies
- WS1 complete (Guardian Lite)
- WS5 complete (Circuit Breaker)
- `posthog-node` npm package
- `@snapback/auth` package

### New Packages Required

```bash
# Add to apps/mcp-server
pnpm add posthog-node
pnpm add @snapback/auth
```

### Implementation

**File**: `apps/mcp-server/src/services/FeatureFlagClient.ts` (NEW)
```typescript
import { PostHog } from 'posthog-node';

export interface UserContext {
  userId: string;
  email: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  organizationId?: string;
}

export class FeatureFlagClient {
  private posthog: PostHog;
  private cache = new Map<string, { flags: Record<string, boolean>; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor(apiKey: string) {
    this.posthog = new PostHog(apiKey, {
      host: 'https://app.posthog.com',
    });
  }

  async getFeatureFlags(userContext: UserContext): Promise<Record<string, boolean>> {
    // Check cache first (offline support)
    const cached = this.cache.get(userContext.userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.flags;
    }

    try {
      // Fetch from PostHog
      const flags = await this.posthog.getAllFlags(userContext.userId, {
        personProperties: {
          email: userContext.email,
          subscriptionTier: userContext.subscriptionTier,
          organizationId: userContext.organizationId,
        },
      });

      // Cache result
      this.cache.set(userContext.userId, {
        flags: flags as Record<string, boolean>,
        timestamp: Date.now(),
      });

      return flags as Record<string, boolean>;
    } catch (error) {
      // Fallback to cached flags if PostHog unavailable
      if (cached) {
        console.warn('PostHog unavailable, using cached flags');
        return cached.flags;
      }

      // No cache, return empty flags (free tier)
      console.error('PostHog error and no cache available', error);
      return {};
    }
  }

  async isFeatureEnabled(
    featureName: string,
    userContext: UserContext
  ): Promise<boolean> {
    const flags = await this.getFeatureFlags(userContext);
    return flags[featureName] === true;
  }

  clearCache(userId?: string): void {
    if (userId) {
      this.cache.delete(userId);
    } else {
      this.cache.clear();
    }
  }

  async shutdown(): Promise<void> {
    await this.posthog.shutdown();
  }
}
```

**File**: `apps/mcp-server/src/services/AnalysisRouter.ts` (NEW)
```typescript
import { GuardianLite, type AnalysisResult } from '@snapback/guardian-lite';
import { CircuitBreaker } from './CircuitBreaker.js';
import { FeatureFlagClient, type UserContext } from './FeatureFlagClient.js';
import { SnapBackAPIClient } from '../client/snapback-api.js';
import { verifyApiKey } from '@snapback/auth';

export class AnalysisRouter {
  private localGuardian: GuardianLite;
  private apiClient: SnapBackAPIClient | null = null;
  private circuitBreaker: CircuitBreaker | null = null;
  private featureFlags: FeatureFlagClient | null = null;

  constructor(
    private snapbackApiKey?: string,
    private posthogApiKey?: string,
  ) {
    this.localGuardian = new GuardianLite();

    if (snapbackApiKey) {
      this.apiClient = new SnapBackAPIClient({
        baseUrl: process.env.SNAPBACK_API_URL || 'https://api.snapback.dev',
        apiKey: snapbackApiKey,
      });

      this.circuitBreaker = new CircuitBreaker({
        failureThreshold: 5,
        recoveryTimeout: 30000,
        onOpen: () => console.warn('⚠️ API circuit breaker opened'),
        onClose: () => console.info('✅ API circuit breaker closed'),
      });
    }

    if (posthogApiKey) {
      this.featureFlags = new FeatureFlagClient(posthogApiKey);
    }
  }

  async analyze(code: string, userApiKey?: string): Promise<AnalysisResult> {
    // No API key = Free tier (local only)
    if (!userApiKey) {
      const result = this.localGuardian.analyze(code);
      return this.addUpgradePrompt(result);
    }

    // Verify API key and get user context
    const authResult = await verifyApiKey(userApiKey);
    if (!authResult) {
      // Invalid API key, treat as free tier
      const result = this.localGuardian.analyze(code);
      return this.addUpgradePrompt(result);
    }

    // Get user context for feature flags
    const userContext: UserContext = {
      userId: authResult.userId,
      email: authResult.user.email,
      subscriptionTier: authResult.user.subscription?.tier || 'free',
      organizationId: authResult.organizationId,
    };

    // Check feature flags
    const flags = await this.featureFlags?.getFeatureFlags(userContext) || {};

    // Route based on flags
    if (flags['ml-detection'] && flags['api-analysis-enabled']) {
      // Pro/Enterprise tier with ML detection enabled
      return this.analyzeWithAPI(code, userContext);
    } else {
      // Fallback to local (subscription active but ML flag disabled or in rollout)
      const result = this.localGuardian.analyze(code);

      if (userContext.subscriptionTier !== 'free') {
        // Pro user but ML flag disabled (might be in rollout %)
        return {
          ...result,
          recommendations: [
            ...result.recommendations,
            '⚙️ ML detection not enabled for your account yet. Stay tuned!',
          ],
        };
      }

      return this.addUpgradePrompt(result);
    }
  }

  private async analyzeWithAPI(
    code: string,
    userContext: UserContext
  ): Promise<AnalysisResult> {
    if (!this.circuitBreaker || !this.apiClient) {
      return this.localGuardian.analyze(code);
    }

    return this.circuitBreaker.execute(
      // Primary: API call
      async () => {
        const apiResult = await this.apiClient!.analyzeFast({
          code,
          filePath: 'analysis.ts',
          context: {
            userId: userContext.userId,
            tier: userContext.subscriptionTier,
          },
        });

        return this.mapAPIResult(apiResult);
      },
      // Fallback: Local Guardian Lite
      () => {
        console.info('API unavailable, using local fallback');
        return this.localGuardian.analyze(code);
      }
    );
  }

  private addUpgradePrompt(result: AnalysisResult): AnalysisResult {
    if (result.upgradePrompt) {
      return {
        ...result,
        recommendations: [
          ...result.recommendations,
          '💎 Upgrade to Pro for ML-powered detection',
          '📊 Start free trial: https://snapback.dev/upgrade',
        ],
      };
    }
    return result;
  }

  private mapAPIResult(apiResult: any): AnalysisResult {
    return {
      riskLevel: this.mapRiskLevel(apiResult.riskLevel),
      confidence: apiResult.score,
      issues: apiResult.issues.map((issue: any) => ({
        type: 'secret',
        severity: issue.severity,
        message: issue.message,
        line: issue.line,
        pattern: 'API_ML_DETECTED',
      })),
      executionTime: apiResult.analysisTimeMs,
      upgradePrompt: false,
      recommendations: apiResult.factors,
    };
  }

  private mapRiskLevel(apiLevel: string): AnalysisResult['riskLevel'] {
    const mapping: Record<string, AnalysisResult['riskLevel']> = {
      safe: 'none',
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'high',
    };
    return mapping[apiLevel] || 'medium';
  }
}
```

### Update MCP Server Index

**File**: `apps/mcp-server/src/index.ts` (UPDATE)
```typescript
import { AnalysisRouter } from './services/AnalysisRouter.js';

export async function startServer() {
  // ... existing setup

  // Initialize analysis router with PostHog
  const router = new AnalysisRouter(
    process.env.SNAPBACK_API_KEY,
    process.env.POSTHOG_API_KEY
  );

  // ... existing server setup

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'snapback.analyze_risk') {
      const parsed = z.object({
        changes: z.array(z.object({
          value: z.string(),
        })),
        apiKey: z.string().optional(), // User's API key from extension
      }).parse(args);

      const code = parsed.changes.map(c => c.value).join('\n');

      // Use analysis router with user's API key
      const result = await router.analyze(code, parsed.apiKey);

      return {
        content: [
          { type: 'json', json: result },
          {
            type: 'text',
            text: `Risk Level: ${result.riskLevel.toUpperCase()}\n` +
                  `Issues Found: ${result.issues.length}\n` +
                  `Execution Time: ${result.executionTime.toFixed(1)}ms\n\n` +
                  `Recommendations:\n${result.recommendations.join('\n')}`,
          },
        ],
      };
    }

    // ... other tools
  });
}
```

### Environment Variables

**File**: `apps/mcp-server/.env.example`
```bash
# PostHog (server-side constant)
POSTHOG_API_KEY=phc_...

# Backend API
SNAPBACK_API_URL=https://api.snapback.dev
```

### Acceptance Criteria
- [ ] Free tier uses local Guardian Lite only
- [ ] Pro tier with `ml-detection` flag uses API
- [ ] Pro tier without flag uses local (gradual rollout support)
- [ ] Circuit breaker prevents repeated API failures
- [ ] Feature flags cached for 1 minute (offline support)
- [ ] Invalid API keys fall back to free tier
- [ ] PostHog tracks feature usage

---

[... WS5 Circuit Breaker same as before ...]

[... WS6 Performance Monitoring same as before ...]

[... WS7 Integration Testing same as before ...]

---

## 📊 Feature Flags Configuration

### PostHog Setup

**Feature Flags**:

```javascript
{
  // Core capabilities
  'ml-detection': {
    rollout: 100,
    filters: [
      { property: 'subscriptionTier', value: 'pro' },
      { property: 'subscriptionTier', value: 'enterprise' },
    ],
  },

  'cloud-sync': {
    rollout: 100,
    filters: [
      { property: 'subscriptionTier', value: 'pro' },
      { property: 'subscriptionTier', value: 'enterprise' },
    ],
  },

  'custom-rules': {
    rollout: 100,
    filters: [
      { property: 'subscriptionTier', value: 'enterprise' },
    ],
  },

  // Kill switches
  'api-analysis-enabled': {
    rollout: 100, // Can be set to 0 for emergency disable
    filters: [],
  },

  // Experimental (gradual rollout)
  'experimental-ast-analysis': {
    rollout: 10, // 10% of Pro users
    filters: [
      { property: 'subscriptionTier', value: 'pro' },
    ],
  },
}
```

### Analytics Events

Track in PostHog:
- `analysis_completed` - Every analysis (local or API)
- `analysis_failed` - API failures (for monitoring)
- `upgrade_prompt_shown` - Free users seeing upgrade CTA
- `feature_flag_fetched` - Flag fetch performance

---

## 📋 Merge Strategy & Conflict Prevention

[... same as before ...]

---

## 🎯 Implementation Timeline

[... same as before with one addition ...]

### Week 1 (Parallel Execution)

**Day 1-2**:
- WS1 (Guardian Lite): Create package with enhanced metadata
- WS2 (MCP Build): Update esbuild configs
- WS5 (Circuit Breaker): Implement + test

**Day 3-4**:
- WS3 (Lifecycle Manager): Implement with exponential backoff
- WS4 (Analysis Router): Integrate Better Auth + PostHog

**Day 5**:
- Merge WS1, WS5 → main
- Merge WS2 → main
- Merge WS3 → main

### Week 2 (Integration)

**Day 6-7**:
- Merge WS4 → main
- WS6 (Performance Monitor): Add monitoring
- Configure PostHog feature flags

**Day 8-9**:
- WS7 (Integration Tests): End-to-end testing
- Test feature flag scenarios (free, pro, gradual rollout)
- Performance validation

**Day 10**:
- Final VSIX build
- Manual testing with real API keys
- Tag release: `v1.3.0-mcp-bundled`

---

## 📚 Summary of Updates

### What Changed from Original Plan

1. ✅ **Guardian Lite package.json**: Added comprehensive metadata (author, keywords, repository, homepage, engines)

2. ✅ **MCPLifecycleManager**: Exponential backoff for restarts (2s → 4s → 8s instead of fixed 2s)

3. ✅ **AnalysisRouter**: Uses Better Auth + PostHog instead of just checking API key presence

4. ✅ **Feature Flags**: PostHog integration for gradual rollouts, A/B tests, kill switches

5. ✅ **Offline Support**: Feature flags cached for 1 minute, fallback to cache if PostHog unavailable

### Benefits

| Feature | Before | After |
|---------|--------|-------|
| **Restart resilience** | Fixed 2s delay | Exponential backoff (2s → 4s → 8s) |
| **Tier management** | API key presence | Better Auth + PostHog flags |
| **Gradual rollouts** | ❌ | ✅ Enable for 10% first |
| **A/B testing** | ❌ | ✅ Test features with subsets |
| **Kill switches** | ❌ | ✅ Disable features instantly |
| **Offline support** | Basic | ✅ Cached flags work offline |

---

**Document Status**: Ready for implementation
**Last Updated**: 2025-01-11
**Dependencies**: posthog-node, Better Auth integration
**Estimated Duration**: 10-12 days with parallel execution
