# SnapBack Architecture: Bundled MCP + Tiered Capabilities

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER EXPERIENCE                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
         ┌──────────▼────────┐           ┌─────────▼─────────┐
         │  VSCode Extension │           │  Cursor / Claude  │
         │   (Primary UI)    │           │   Desktop (MCP)   │
         └──────────┬────────┘           └─────────┬─────────┘
                    │                               │
                    │ Spawns child process          │ Uses standalone
                    │                               │
         ┌──────────▼────────────────────────────────▼─────────┐
         │            Bundled MCP Server                        │
         │  • Analysis routing (local vs API)                   │
         │  • Tool handlers (analyze_risk, create_checkpoint)   │
         │  • Authentication & tier detection                   │
         └──────────┬──────────────┬────────────────────────────┘
                    │              │
          Local     │              │        Cloud
          (Free)    │              │        (Pro/Enterprise)
                    │              │
         ┌──────────▼────────┐    │    ┌─────────────────────┐
         │  Guardian Lite    │    │    │   Backend API       │
         │  • 10-15 basic    │    │    │  • ML detection     │
         │    patterns       │    │    │  • Context-aware    │
         │  • Offline-first  │    │    │  • Custom rules     │
         │  • <50ms response │    │    │  • Team policies    │
         └──────────┬────────┘    │    └─────────┬───────────┘
                    │              │              │
         ┌──────────▼──────────────▼──────────────▼───────────┐
         │             Local SQLite Storage                    │
         │  • Snapshots (deduplicated)                         │
         │  • Session manifests                                │
         │  • Protection policies (team sync)                  │
         │  • Analysis cache                                   │
         └─────────────────────────────────────────────────────┘
```

## Data Flow: Risk Analysis Request

### Free Tier (Local Only)
```
Claude Code suggests code
  ↓
MCP tool: analyze_risk
  ↓
Check user tier → Free
  ↓
Guardian Lite (local)
  ├─ Pattern matching (15 patterns)
  ├─ Basic entropy check
  └─ Response: 15ms
  ↓
Result + "Upgrade to Pro" CTA
  ↓
Display to user in Claude
```

### Pro Tier (API with Fallback)
```
Claude Code suggests code
  ↓
MCP tool: analyze_risk
  ↓
Check user tier → Pro
  ↓
Try Backend API
  ├─ Success (200ms)
  │   ├─ ML-based detection
  │   ├─ Context-aware scoring
  │   └─ Advanced heuristics
  │
  └─ Failure (timeout/offline)
      └─ Fallback to Guardian Lite (15ms)
  ↓
Cache result locally
  ↓
Display to user in Claude
```

## Capability Distribution by Tier

```
┌──────────────────────────────────────────────────────────────┐
│                     FREE TIER (Local)                         │
├──────────────────────────────────────────────────────────────┤
│ ✅ VSCode extension (full features)                          │
│ ✅ Bundled MCP server                                        │
│ ✅ Guardian Lite (15 basic patterns)                         │
│ ✅ Local snapshots (unlimited)                               │
│ ✅ Session tracking                                          │
│ ✅ Protection levels (Watch/Warn/Block)                      │
│ ✅ Offline operation                                         │
│ ❌ Cloud sync                                                │
│ ❌ ML detection                                              │
│ ❌ Advanced analytics                                        │
│ 📊 API calls: 10/day (for trying Pro features)              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                   PRO TIER ($10/month)                        │
├──────────────────────────────────────────────────────────────┤
│ ✅ Everything in Free                                        │
│ ✅ ML-powered secret detection                               │
│ ✅ Context-aware risk analysis                               │
│ ✅ Cross-project learning                                    │
│ ✅ Cloud snapshot sync                                       │
│ ✅ Web analytics dashboard                                   │
│ ✅ Priority support                                          │
│ ✅ Advanced pattern library (100+ patterns)                  │
│ ❌ Custom detection rules                                    │
│ ❌ Team features                                             │
│ 📊 API calls: Unlimited                                      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│               ENTERPRISE TIER (Custom)                        │
├──────────────────────────────────��───────────────────────────┤
│ ✅ Everything in Pro                                         │
│ ✅ Custom detection rules (company-specific)                 │
│ ✅ Team policy enforcement                                   │
│ ✅ Audit logs & compliance                                   │
│ ✅ SSO/SAML                                                  │
│ ✅ On-premise deployment                                     │
│ ✅ SLA (99.9% uptime)                                        │
│ ✅ Dedicated support                                         │
│ 📊 API calls: Unlimited + dedicated infrastructure           │
└──────────────────────────────────────────────────────────────┘
```

## Packaging Strategy

### Single VSIX Bundle
```
snapback-vscode-1.2.6.vsix (8-12 MB)
├── dist/
│   ├── extension.js           (~2 MB - extension code)
│   └── mcp-server.js          (~3 MB - bundled MCP)
├── node_modules/
│   └── better-sqlite3/        (~2 MB - native module)
├── media/                     (~1 MB - icons, images)
└── package.json

Installation: One click in VSCode
User sees: SnapBack extension + MCP auto-configured
```

### Standalone NPM Package
```
@snapback/mcp (npm package)
├── dist/
│   └── index.js               (~3 MB - MCP server)
└── package.json

Installation: npm install -g @snapback/mcp
User sees: MCP available for Cursor/Claude Desktop
Usage: Manual config in claude_desktop_config.json
```

## IP Protection Layers

```
┌───────────────────────────────────────────────────────────┐
│                    PUBLIC (Shipped to Users)               │
├───────────────────────────────────────────────────────────┤
│ • Guardian Lite (15 basic patterns) - Low IP value       │
│ • VSCode extension UI/UX - Standard patterns             │
│ • SQLite storage schema - Common approach                │
│ • Protection level system - Industry standard            │
│ • Session tracking - Basic logic                         │
│                                                           │
│ 📝 Risk: Competitors can copy, but limited value         │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│                  PROPRIETARY (Backend Only)                │
├───────────────────────────────────────────────────────────┤
│ • ML models (trained on 1M+ repos) - High IP value 🔒    │
│ • Advanced entropy algorithms - Months of R&D 🔒         │
│ • Context-aware heuristics - Competitive moat 🔒         │
│ • Custom rule engine - Enterprise revenue 🔒             │
│ • Training data & datasets - Valuable asset 🔒           │
│ • Cross-project learning - Unique capability 🔒          │
│                                                           │
│ 🛡️ Protection: Never leaves backend servers              │
└───────────────────────────────────────────────────────────┘
```

## Performance Optimization Flow

```
User triggers analysis
  ↓
┌─────────────────────────┐
│ Should use API?         │
├─────────────────────────┤
│ 1. Check user tier      │
│    Free? → Use local    │
│                         │
│ 2. Check offline mode   │
│    Offline? → Use local │
│                         │
│ 3. Check complexity     │
│    Simple? → Use local  │
│                         │
│ 4. Check cache          │
│    Cached? → Use cache  │
│                         │
│ 5. All checks pass?     │
│    → Use API            │
└────────┬────────────────┘
         │
    ┌────┴────┐
    │         │
Local API     │ API
(15ms)        │ (200ms)
    │         │
    └────┬────┘
         │
    Cache result
         │
    Return to user
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Machine (Edge)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │   VSCode     │─spawns→ │ Bundled MCP  │                 │
│  │  Extension   │         │   Server     │                 │
│  └──────┬───────┘         └──────┬───────┘                 │
│         │                        │                          │
│         └────────┬───────────────┘                          │
│                  ▼                                           │
│         ┌─────────────────┐                                 │
│         │  SQLite DB      │                                 │
│         │  (~100 MB)      │                                 │
│         └─────────────────┘                                 │
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    HTTPS  │  (Pro/Enterprise only)
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Cloud (Backend)                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │  API Gateway │ →  │  ML Service  │ →  │  PostgreSQL  │ │
│  │  (Rate limit)│    │  (Detection) │    │  (Analytics) │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐                      │
│  │ Auth Service │    │  S3 Storage  │                      │
│  │  (JWT/OAuth) │    │  (Snapshots) │                      │
│  └──────────────┘    └──────────────┘                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Migration Path

### Existing Users (Without Bundled MCP)
```
1. Update extension to v1.3.0
   ↓
2. Extension auto-detects bundled MCP
   ↓
3. Prompt: "SnapBack now includes MCP server for AI assistance. Enable?"
   ↓
4. User accepts → Start bundled MCP
   ↓
5. Show success: "MCP enabled! Claude Code can now analyze your code."
   ↓
6. (Optional) Offer to remove standalone MCP if detected
```

### New Users
```
1. Install extension from marketplace
   ↓
2. Activation includes MCP startup
   ↓
3. Welcome screen: "Your code safety net is ready!"
   ↓
4. Show quick setup:
   - ✅ Snapshots enabled
   - ✅ Protection levels configured
   - ✅ AI analysis ready (MCP)
   ↓
5. Suggest protecting first critical file
```

---

**Visual Aid Status**: Complete
**Complements**: [mcp-bundling-strategy.md](./mcp-bundling-strategy.md)
**Last Updated**: 2025-01-11
