# @snapback/core

**Purpose**: Detection engine & risk analysis foundation
**Role**: AI-assisted code change detection, threat analysis, MCP client orchestration

## Architecture

### Detection Engine (`detection/`)
**Pattern-based code analysis** for AI-generated threats:

- **Plugins** (`plugins/`):
  - `SecretDetectionPlugin`: Regex + Shannon entropy (>4.5 threshold) for credentials/keys
  - `MockReplacementPlugin`: Test framework artifacts in production code
  - `PhantomDependencyPlugin`: Import/package.json mismatch detection

- **Scanner** (`scanner/FusedScanner`): Single-pass multi-pattern regex engine with grouped results
- **Utils**:
  - `ast-helpers.ts`: TypeScript/JS AST parsing (@typescript-eslint/parser → esprima fallback)
  - `entropy.ts`: Combined entropy calculation (Shannon × byte-level analysis)
  - `package-parser.ts`: package.json traversal + LRU cache (100 entries)

### Guardian System (`guardian.ts`)
**Plugin orchestration** with aggregated risk scoring:
- Loads all detection plugins
- Runs parallel analysis per file
- Aggregates scores → single `AnalysisResult` (score ∈ [0,1], severity, factors, recommendations)
- Powers MCP server `analyze_risk` tool

### MCP Integration
**Client-side MCP orchestration**:
- `mcp-client.ts`: Stdio transport manager for claude-code/cursor MCP servers
- `mcp-federation.ts`: Multi-server routing (primary/fallback)
- `mcp-fallbacks.ts`: Graceful degradation when MCP unavailable
- `mcp-response-processor.ts`: Response validation + sanitization

### Utilities (`utils/`)
- `circuit-breaker.ts`: Fail-fast pattern (3 failures → open, 30s cooldown)
- `cache.ts`: Generic LRU cache with TTL support
- `concurrency.ts`: Parallel execution with max concurrency limits
- `watcher.ts`: File system change detection with debouncing
- `logger.ts`: Structured logging with levels (debug/info/warn/error)

### AI Detection (`ai-detection.ts`)
Heuristics for AI-generated code:
- Rapid sequential edits (>5 files in <10s)
- High-entropy additions without context
- Pattern matching known AI signatures

### Risk Analysis (`risk-analyzer.ts`)
Multi-factor risk scoring:
- File criticality (package.json=0.9, .env=0.95)
- Change velocity (lines/min)
- Protection status from registry
- Guardian plugin scores

### Git Integration (`git-integration.ts`)
- simple-git wrapper for commit context
- Branch detection for snapshot naming
- Diff analysis for change statistics

## Data Flow

```
File Change
  ↓
Guardian.analyze(content, filePath)
  ↓
[SecretPlugin, MockPlugin, PhantomPlugin] (parallel)
  ↓
Aggregate Results → AnalysisResult
  ↓
MCP Server (apps/mcp-server) → Claude/Cursor
  ↓
VS Code Diagnostics (future: apps/vscode integration pending)
```

## Performance Budgets
- Analysis: <200ms P95 (enforced in perf tests)
- Memory: <100MB resident
- Cache hit ratio: >80%

## Dependencies
- **Detection**: @typescript-eslint/parser, esprima (AST)
- **MCP**: @modelcontextprotocol/sdk
- **Git**: simple-git
- **Utils**: lru-cache, chokidar (file watching)

## Testing
- **Unit**: 88 test cases (1371 lines)
- **Integration**: MCP federation, guardian-threat
- **Performance**: FusedScanner benchmarks

## Extension Points
Implement `DetectionPlugin` interface:
```ts
interface DetectionPlugin {
  name: string;
  analyze(content: string, filePath?: string): Promise<AnalysisResult>;
}
```

Guardian auto-registers via `addPlugin()`.

## Related Docs
- MCP Server: [apps/mcp-server/CLAUDE.md](../../apps/mcp-server/CLAUDE.md)
- VS Code Extension: [apps/vscode/CLAUDE.md](../../apps/vscode/CLAUDE.md)
- Contracts: [packages/contracts/CLAUDE.md](../contracts/CLAUDE.md)
