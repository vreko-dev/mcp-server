# SnapBack MCP Server

**Purpose**: MCP server exposing SnapBack detection & analysis to Claude Code/Cursor
**Role**: AI safety tools via Model Context Protocol (stdio)

## Hard Constraints

```text
Tool latency: analyze_risk <200ms | check_dependencies <300ms | create_checkpoint <500ms
Bundle: lightweight (MCP SDK + zod only)
Security: path validation, PII sanitization, 1MB max buffer
```

## Tools (When to Call)

| Tool                          | Signal Words                             | When NOT to Call                 |
| ----------------------------- | ---------------------------------------- | -------------------------------- |
| `snapback.analyze_risk`       | "is this safe", "before I accept"        | Trivial changes, non-code files  |
| `snapback.check_dependencies` | "module not found", imports, package.json | After deps already installed     |
| `snapback.create_checkpoint`  | "save snapshot", "before this change"    | Every single save                |

## Response Format

```ts
{ risk_level: 'safe'|'low'|'medium'|'high'|'critical',
  issues: [{ type, severity, message, line?, recommendation }],
  overall_score: 0-1 }
```

## Architecture (API-First)

- Remote Guardian over local: consistency, feature flags, centralized updates
- Detection plugins: SecretDetection, MockReplacement, PhantomDependency
- IPC: Unix domain sockets to VS Code extension (10s timeout)

## Error Handling

- Dev: full stack traces | Prod: sanitized `"Internal error, log ID: ERR-xxx"`
- Codes: `INTERNAL_ERROR`, `VALIDATION_ERROR`, `TIMEOUT_ERROR`

## Reference (View as Needed)

```text
.claude/context/
├── audits/mcp-audit.md              # Detailed MCP analysis
└── specs/snapback-mcp-server-spec.md  # Full implementation spec
docs/
├── snapshot-retry-hook.md           # Retry/recovery patterns
└── snapshot-ux-migration.md         # UX migration guide
```

## Quick Commands

```bash
pnpm test              # Unit tests
pnpm build             # Build dist
pnpm type-check        # TypeScript validation
```

---

*Full context in `.claude/context/`. Retrieve directly—don't ask.*
