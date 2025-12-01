# MCP Bundling & Capability Distribution Strategy

**Strategic Goal**: Bundle MCP with VSCode extension for seamless UX while protecting IP and maintaining optimal performance.

---

## 🎯 Executive Summary

**Recommended Approach**: **Dual-Binary Bundling** with **Tiered Capability Model**

- **Extension bundle**: Includes compiled MCP server binary + basic local detection
- **Standalone MCP**: Same binary, installable separately for Cursor/other editors
- **Backend API**: Premium detection models, team features, cross-device sync
- **IP Protection**: Keep ML models and advanced heuristics server-side

---

## 📊 Current State Analysis

### What Exists Where

| Component | Location | Status | IP Risk |
|-----------|----------|--------|---------|
| **Guardian (orchestrator)** | `@snapback/core` | Open source | 🟡 Medium (logic visible) |
| **SecretDetectionPlugin** | `@snapback/core` | Regex patterns exposed | 🔴 High (patterns copyable) |
| **MockReplacementPlugin** | `@snapback/core` | Pattern matching exposed | 🟡 Medium |
| **PhantomDependencyPlugin** | `@snapback/core` | AST logic exposed | 🟢 Low (standard approach) |
| **MCP Server** | `apps/mcp-server` | Calls backend API | 🟢 Low (thin client) |
| **VSCode Extension** | `apps/vscode` | 100% local, no API | 🟢 Low (standard patterns) |
| **Backend API** | Not in repo | Proprietary | ✅ Protected |

### IP Exposure Risk

**Current Problem**: If `@snapback/core` is published to npm:
```typescript
// Anyone can import and use your detection algorithms
import { Guardian, SecretDetectionPlugin } from '@snapback/core';

const guardian = new Guardian();
guardian.addPlugin(new SecretDetectionPlugin());
// Now competitors have your exact detection logic
```

---

## 🏗️ Recommended Architecture

### 3-Tier Capability Model

```
┌─────────────────────────────────────────────────────────────┐
│                    Tier 1: LOCAL (Free)                      │
│  VSCode Extension + Bundled MCP                              │
│  • Basic snapshot management (CRUD)                          │
│  • Local SQLite storage                                      │
│  • Protection levels (Watch/Warn/Block)                      │
│  • Session tracking                                          │
│  • Basic pattern detection (10-15 common patterns)           │
│  • Offline-first operation                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Tier 2: CLOUD (Pro)                        │
│  Backend API - Advanced Detection                           │
│  • ML-based secret detection (Shannon entropy + models)     │
│  • Context-aware risk scoring                               │
│  • Cross-project learning                                   │
│  • Cloud snapshot sync                                       │
│  • Analytics dashboard                                       │
│  • API rate limiting (100 req/day free, unlimited pro)      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                Tier 3: ENTERPRISE (Team)                     │
│  Backend API - Team Features                                 │
│  • Custom detection rules (company-specific patterns)       │
│  • Team policy enforcement                                   │
│  • Audit logs & compliance reporting                         │
│  • SSO/SAML authentication                                   │
│  • On-premise deployment option                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Bundling Strategy: Dual-Binary Approach

### Option A: Embedded Node Binary (RECOMMENDED)

**Structure**:
```
snapback-vscode-1.2.6.vsix
├── dist/
│   ├── extension.js           # Extension code (bundled)
│   ├── mcp-server.js          # MCP server (bundled)
│   └── mcp-launcher.js        # Spawns MCP in child process
├── bin/
│   └── node-v20-<platform>    # Bundled Node runtime (optional)
└── package.json
```

**Activation Flow**:
```typescript
// extension.ts activation
export async function activate(context: vscode.ExtensionContext) {
  // Phase 1: Start bundled MCP server
  const mcpProcess = spawnMCPServer(context.extensionPath);

  // Phase 2: Wait for MCP ready signal (Unix socket)
  await waitForMCPReady('/tmp/snapback-mcp.sock');

  // Phase 3: Continue extension activation
  // ... existing 5-phase initialization
}

function spawnMCPServer(extensionPath: string): ChildProcess {
  const mcpPath = path.join(extensionPath, 'dist', 'mcp-server.js');

  return spawn('node', [mcpPath], {
    env: {
      ...process.env,
      SNAPBACK_MODE: 'bundled',
      SNAPBACK_EXTENSION_PATH: extensionPath,
    },
    stdio: ['ignore', 'pipe', 'pipe'], // Capture logs
  });
}
```

**Pros**:
- ✅ Single install for users (one VSIX, no manual MCP config)
- ✅ Extension controls MCP lifecycle (start/stop/restart)
- ✅ Shared SQLite database (no IPC complexity)
- ✅ Automatic updates (MCP updates with extension)
- ✅ Works offline by default

**Cons**:
- ❌ Larger VSIX size (~5-10MB vs ~2MB)
- ❌ Node.js version dependency (use user's Node or bundle own?)

### Option B: Shared Package Model

**Structure**:
```
@snapback/vscode → depends on → @snapback/mcp (as dependency)
```

**Pros**:
- ✅ Code reuse (DRY)
- ✅ Smaller individual bundles

**Cons**:
- ❌ Requires `node` in PATH (not guaranteed in VS Code)
- ❌ Version mismatch risks
- ❌ Complex installation (users must install both)

### Option C: Webview-Based MCP (Future)

Experimental: Run MCP server logic in extension host process (no separate binary).

---

## 🛡️ IP Protection Boundaries

### Keep LOCAL (Low IP Value)

**Basic Pattern Detection**:
```typescript
// Simple, well-known patterns - OK to ship in extension
const BASIC_PATTERNS = {
  awsKey: /AKIA[0-9A-Z]{16}/,
  genericApiKey: /api[_-]?key["\s:=]+["']?([a-zA-Z0-9]{32,})/i,
  jwtToken: /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*/,
};

// Minimal Guardian implementation
class LocalGuardian {
  analyze(code: string): { riskLevel: 'low' | 'medium' | 'high' } {
    // Only detects 10-15 most common patterns
    // No ML, no context-awareness
  }
}
```

**Why Safe to Ship**:
- Industry-standard regexes (publicly available)
- No proprietary algorithms
- Fast enough for local execution (<10ms)
- Offline capability valuable to users

### Keep SERVER-SIDE (High IP Value)

**Advanced Detection**:
```typescript
// PROPRIETARY - Keep in backend API only
class EnterpriseGuardian {
  constructor(private mlModel: TrainedModel) {}

  async analyze(code: string, context: ProjectContext): Promise<Analysis> {
    // 1. ML-based entropy analysis (trained on 1M+ repos)
    const entropyScore = await this.mlModel.predictEntropy(code);

    // 2. Context-aware risk scoring
    const contextRisk = this.analyzeContext(code, context);

    // 3. Cross-project pattern learning
    const historicalRisk = await this.queryHistoricalData(code);

    // 4. Company-specific custom rules (enterprise only)
    const customRules = await this.applyCustomRules(code);

    return this.aggregateRisk([
      entropyScore,
      contextRisk,
      historicalRisk,
      customRules,
    ]);
  }
}
```

**Why Must Be Server-Side**:
- 🔒 ML models are your competitive moat
- 🔒 Training data (1M+ repos) is valuable
- 🔒 Context-aware heuristics took months to develop
- 🔒 Custom rules are enterprise revenue driver
- ⚡ Requires backend compute (GPUs for ML inference)

---

## 🎛️ Capability Distribution Matrix

| Feature | Extension (Local) | MCP (Bundled) | Backend API | Why |
|---------|-------------------|---------------|-------------|-----|
| **Snapshot CRUD** | ✅ Primary | ✅ Proxy to ext | ❌ | SQLite is local, no server needed |
| **Session tracking** | ✅ Primary | ✅ Via IPC | ☑️ Sync only | Privacy-first, local is faster |
| **Protection levels** | ✅ Primary | ❌ | ☑️ Team policies | User data stays local |
| **Basic secret detection** | ✅ 10-15 patterns | ✅ Same | ❌ | Offline capability critical |
| **Advanced ML detection** | ❌ | ❌ | ✅ Pro tier | Protect ML models |
| **Context-aware analysis** | ❌ | ❌ | ✅ Pro tier | Requires cross-project data |
| **Cloud snapshot sync** | ❌ | ❌ | ✅ Pro tier | Backend storage needed |
| **Team policy engine** | ☑️ Read-only | ☑️ Read-only | ✅ Write | Centralized enforcement |
| **Analytics dashboard** | ❌ | ❌ | ✅ Pro tier | Aggregation at scale |
| **Custom detection rules** | ❌ | ❌ | ✅ Enterprise | Revenue protection |
| **Audit logs** | ❌ | ❌ | ✅ Enterprise | Compliance requirements |
| **API rate limiting** | N/A | N/A | ✅ All tiers | Business model |

**Legend**:
- ✅ Primary implementation
- ☑️ Partial/sync only
- ❌ Not available

---

## 🚀 Implementation Roadmap

### Phase 1: MCP Bundling (Week 1-2)

**Goal**: Single-click install for VSCode users

**Tasks**:
1. **Create MCP build for bundling**:
   ```bash
   # apps/mcp-server/esbuild.bundle.config.js
   esbuild.build({
     entryPoints: ['src/index.ts'],
     bundle: true,
     platform: 'node',
     target: 'node20',
     outfile: '../vscode/dist/mcp-server.js',
     external: ['better-sqlite3'], // Share with extension
   });
   ```

2. **Update extension build**:
   ```javascript
   // apps/vscode/esbuild.config.cjs
   await esbuild.build({
     // Extension build
   });

   // Build bundled MCP
   await esbuild.build({
     entryPoints: ['../../apps/mcp-server/src/index.ts'],
     outfile: './dist/mcp-server.js',
     // ... config
   });
   ```

3. **MCP lifecycle manager**:
   ```typescript
   // apps/vscode/src/services/MCPLifecycleManager.ts
   export class MCPLifecycleManager {
     private mcpProcess: ChildProcess | null = null;

     async start(extensionPath: string): Promise<void> {
       const mcpPath = path.join(extensionPath, 'dist', 'mcp-server.js');

       this.mcpProcess = spawn('node', [mcpPath], {
         env: {
           SNAPBACK_MODE: 'bundled',
           SNAPBACK_DB_PATH: this.getSharedDBPath(),
         },
       });

       // Wait for ready signal
       await this.waitForReady();
     }

     async stop(): Promise<void> {
       if (this.mcpProcess) {
         this.mcpProcess.kill('SIGTERM');
         await this.waitForExit();
       }
     }
   }
   ```

4. **Update extension activation**:
   ```typescript
   // apps/vscode/src/extension.ts
   export async function activate(context: vscode.ExtensionContext) {
     // NEW: Start bundled MCP before existing phases
     const mcpManager = new MCPLifecycleManager();
     await mcpManager.start(context.extensionPath);
     context.subscriptions.push({
       dispose: () => mcpManager.stop(),
     });

     // Existing 5-phase activation...
     await initializePhase1Services(context);
     // ... rest of phases
   }
   ```

5. **Package manifest**:
   ```json
   // apps/vscode/package.json
   {
     "contributes": {
       "configuration": {
         "snapback.mcp.enabled": {
           "type": "boolean",
           "default": true,
           "description": "Enable bundled MCP server for AI assistant integration"
         },
         "snapback.mcp.standalone": {
           "type": "boolean",
           "default": false,
           "description": "Use standalone MCP instead of bundled (for advanced users)"
         }
       }
     }
   }
   ```

**Success Criteria**:
- ✅ Single VSIX install enables both extension + MCP
- ✅ Claude Code/Cursor auto-detect bundled MCP
- ✅ No manual MCP configuration needed
- ✅ Works offline with basic detection

---

### Phase 2: Local Guardian Lite (Week 3-4)

**Goal**: Implement basic local detection without exposing advanced IP

**Create new package** (not published to npm):
```
packages/guardian-lite/
├── src/
│   ├── index.ts
│   ├── patterns/
│   │   ├── secrets.ts      # 10-15 basic patterns only
│   │   ├── mocks.ts        # Common test framework patterns
│   │   └── deps.ts         # Import/package.json checker
│   └── guardian-lite.ts
└── package.json            # "private": true
```

**Implementation**:
```typescript
// packages/guardian-lite/src/guardian-lite.ts
export class GuardianLite {
  private readonly BASIC_PATTERNS = [
    // Only include well-known, non-proprietary patterns
    { name: 'AWS Key', pattern: /AKIA[0-9A-Z]{16}/, severity: 'high' },
    { name: 'Generic API Key', pattern: /api[_-]?key.*[a-z0-9]{32,}/i, severity: 'medium' },
    { name: 'JWT', pattern: /eyJ[A-Za-z0-9-_]+\./, severity: 'low' },
    // ... 10-15 total patterns
  ];

  analyze(code: string): LiteAnalysisResult {
    const matches = this.BASIC_PATTERNS
      .map(p => this.checkPattern(code, p))
      .filter(Boolean);

    return {
      riskLevel: this.calculateRisk(matches),
      issues: matches,
      recommendation: matches.length > 0
        ? 'Consider using backend analysis for deeper insights (Pro tier)'
        : 'No issues detected locally',
      upgradePrompt: matches.length > 2, // Suggest upgrade if multiple issues
    };
  }
}
```

**Why This Protects IP**:
- Only ships 10-15 basic patterns (vs 100+ in full Guardian)
- No ML models or advanced heuristics
- Suggests upgrade to Pro for complex cases
- Fast enough for local (<10ms), doesn't need backend

---

### Phase 3: API Integration (Week 5-6)

**Goal**: Connect premium features to backend while keeping free tier local

**Architecture**:
```typescript
// apps/mcp-server/src/analysis-router.ts
export class AnalysisRouter {
  constructor(
    private localGuardian: GuardianLite,
    private apiClient: SnapBackAPIClient,
  ) {}

  async analyze(code: string, user: User): Promise<AnalysisResult> {
    // Free tier: Local only
    if (!user.isPro) {
      const localResult = this.localGuardian.analyze(code);
      return this.addUpgradePrompt(localResult);
    }

    // Pro tier: Try API, fallback to local
    try {
      return await this.apiClient.analyzeFast(code);
    } catch (error) {
      console.warn('API unavailable, using local analysis');
      return this.localGuardian.analyze(code);
    }
  }

  private addUpgradePrompt(result: LiteAnalysisResult): AnalysisResult {
    if (result.upgradePrompt) {
      result.recommendations.push(
        '💎 Upgrade to Pro for ML-powered detection and context-aware analysis'
      );
    }
    return result;
  }
}
```

**Backend API Endpoints** (protect these):
```typescript
// Backend (NOT in repo) - proprietary
POST /api/v1/analyze/fast
  → ML-based secret detection
  → Context-aware risk scoring
  → Response time: <200ms

POST /api/v1/analyze/deep
  → Cross-project learning
  → Historical pattern matching
  → Response time: <500ms

POST /api/v1/custom-rules/evaluate
  → Enterprise custom rules
  → Company-specific patterns
  → Response time: <300ms
```

---

### Phase 4: Standalone MCP Distribution (Week 7-8)

**Goal**: Allow Cursor/other editors to install MCP separately

**NPM Package** (published):
```json
// apps/mcp-server/package.json
{
  "name": "@snapback/mcp",
  "version": "1.0.0",
  "bin": {
    "snapback-mcp": "./dist/index.js"
  },
  "files": ["dist/"],
  "publishConfig": {
    "access": "public"
  }
}
```

**Installation**:
```bash
# Global install
npm install -g @snapback/mcp

# Or npx (no install)
npx @snapback/mcp
```

**Configuration** for Cursor/Claude Desktop:
```json
// claude_desktop_config.json
{
  "mcpServers": {
    "snapback": {
      "command": "npx",
      "args": ["@snapback/mcp"],
      "env": {
        "SNAPBACK_API_KEY": "sk_live_xxx" // Optional for Pro features
      }
    }
  }
}
```

**Auto-detection** in bundled mode:
```typescript
// MCP server detects if running standalone vs bundled
const mode = process.env.SNAPBACK_MODE || 'standalone';

if (mode === 'bundled') {
  // Use shared DB from extension
  const dbPath = process.env.SNAPBACK_DB_PATH;
} else {
  // Create own DB in user's home directory
  const dbPath = path.join(os.homedir(), '.snapback', 'snapback.db');
}
```

---

## 💰 Business Model Alignment

### Free Tier (Local Only)

**Capabilities**:
- ✅ VSCode extension with bundled MCP
- ✅ Unlimited local snapshots
- ✅ Basic pattern detection (10-15 patterns)
- ✅ Protection levels (Watch/Warn/Block)
- ✅ Session tracking
- ✅ Offline-first operation
- ❌ No cloud sync
- ❌ No advanced ML detection
- ❌ API rate limit: 10 requests/day

**Value Prop**: "Professional-grade snapshot management, free forever"

### Pro Tier ($10/month)

**Capabilities**:
- ✅ Everything in Free
- ✅ **Advanced ML-based detection** (backend API)
- ✅ Context-aware risk scoring
- ✅ Cloud snapshot sync (cross-device)
- ✅ Analytics dashboard (web app)
- ✅ API rate limit: Unlimited
- ✅ Priority support

**Value Prop**: "AI-powered protection + cloud sync for serious developers"

### Enterprise Tier (Custom pricing)

**Capabilities**:
- ✅ Everything in Pro
- ✅ **Custom detection rules** (company-specific patterns)
- ✅ Team policy enforcement
- ✅ Audit logs & compliance
- ✅ SSO/SAML
- ✅ On-premise deployment option
- ✅ SLA guarantee (99.9% uptime)
- ✅ Dedicated support

**Value Prop**: "Organization-wide code safety with compliance and control"

---

## 📏 Performance Optimization

### Local-First Strategy

**Decision Tree** (in MCP server):
```typescript
async function shouldUseAPI(analysis: AnalysisRequest): Promise<boolean> {
  // 1. Check user tier
  if (!user.isPro) return false; // Free tier = local only

  // 2. Check offline mode
  if (isOffline || user.preferLocal) return false;

  // 3. Check complexity
  const complexity = estimateComplexity(analysis.code);
  if (complexity < 0.3) return false; // Simple = local is fine

  // 4. Check cache
  const cached = await getCachedResult(analysis.code);
  if (cached && !isStale(cached)) return false;

  // 5. Use API for complex/uncached cases
  return true;
}
```

**Performance Targets**:
| Operation | Local (Free) | API (Pro) | Target |
|-----------|--------------|-----------|--------|
| Simple pattern match | 5-10ms | N/A | <10ms |
| Basic Guardian Lite | 10-20ms | N/A | <50ms |
| ML-based detection | N/A | 100-200ms | <200ms |
| Deep analysis | N/A | 300-500ms | <500ms |
| Cached result | 1-2ms | 1-2ms | <5ms |

---

## 🔐 IP Protection Checklist

### DO Ship Locally (Low Risk)

- ✅ Basic regex patterns (industry standard)
- ✅ Common framework detection (public knowledge)
- ✅ File system operations (SQLite, storage)
- ✅ UI components (VSCode APIs)
- ✅ Session tracking logic
- ✅ Protection level system

### DO NOT Ship Locally (High Risk)

- ❌ ML models and weights
- ❌ Training data or datasets
- ❌ Advanced entropy analysis algorithms
- ❌ Context-aware heuristics
- ❌ Cross-project learning logic
- ❌ Custom rule evaluation engine (enterprise feature)
- ❌ Backend API implementation

### Keep `@snapback/core` Private

**Current Problem**: Published to npm = all logic visible

**Solution**: Split into two packages:
```
packages/
├── guardian-lite/         # Ships with extension (private)
│   └── Basic patterns only
└── core/                  # Backend only (private)
    ├── Guardian (full)
    ├── ML models
    └── Advanced plugins
```

---

## 📋 Implementation Checklist

### Week 1-2: MCP Bundling
- [ ] Create `MCPLifecycleManager` in extension
- [ ] Build MCP server with esbuild for bundling
- [ ] Update extension activation to spawn MCP
- [ ] Test lifecycle (start/stop/restart)
- [ ] Update VSIX packaging to include MCP binary
- [ ] Test installation on clean VSCode instance

### Week 3-4: Guardian Lite
- [ ] Create `packages/guardian-lite` (private package)
- [ ] Implement 10-15 basic detection patterns
- [ ] Add upgrade prompts for complex cases
- [ ] Remove `@snapback/core` dependency from MCP
- [ ] Update MCP to use Guardian Lite by default
- [ ] Add "Upgrade to Pro" CTAs in results

### Week 5-6: API Integration
- [ ] Create `AnalysisRouter` for tier-based routing
- [ ] Implement API client in MCP server
- [ ] Add authentication flow (API key)
- [ ] Build fallback logic (API → local)
- [ ] Add caching layer for API results
- [ ] Implement rate limiting (10/day free, unlimited pro)

### Week 7-8: Standalone Distribution
- [ ] Publish `@snapback/mcp` to npm
- [ ] Create installation docs for Cursor
- [ ] Add auto-detection for bundled vs standalone
- [ ] Test npx installation flow
- [ ] Document configuration for Claude Desktop
- [ ] Create migration guide for existing users

---

## 🎓 Educational Resources for Users

### For Free Tier Users

**In-extension messaging**:
```typescript
// Show after detecting 3+ issues locally
showUpgradePrompt({
  title: 'Multiple risks detected',
  message: 'Guardian Lite found 3 potential issues. Upgrade to Pro for:',
  features: [
    '✨ ML-powered detection (10x more accurate)',
    '🧠 Context-aware analysis',
    '☁️ Cloud snapshot sync',
    '📊 Analytics dashboard',
  ],
  cta: 'Try Pro Free for 14 Days',
});
```

### For Pro Tier Users

**Usage tips**:
- "Using API for complex analysis (200ms)" ← Show in status bar
- "Cached result (2ms)" ← Show fast results
- "Fell back to local (offline)" ← Explain when API unavailable

---

## 🚦 Success Metrics

### Adoption
- **Week 1**: 1,000+ installs (bundled MCP)
- **Week 4**: 100+ Pro signups (API usage)
- **Week 8**: 50+ standalone MCP users (Cursor/others)

### Performance
- **Local analysis**: 95% < 50ms
- **API analysis**: 95% < 200ms
- **Extension activation**: < 3s (including MCP start)

### Revenue Protection
- **IP leak**: 0 incidents (ML models never exposed)
- **Conversion rate**: 5% free → pro (via upgrade prompts)
- **Retention**: 80% monthly (Pro tier)

---

## 🤝 Recommended Next Steps

1. **Review this strategy** with team
2. **Validate business model** assumptions
3. **Prototype MCP bundling** (Week 1-2 tasks)
4. **Test with beta users** before full rollout
5. **Monitor metrics** after launch

---

**Document Status**: Draft for review
**Last Updated**: 2025-01-11
**Owner**: Architecture Team
