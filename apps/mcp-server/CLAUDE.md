# apps/mcp-server - SnapBack MCP Server

**Purpose**: Model Context Protocol server for Claude Code / Cursor integration
**Role**: Exposes SnapBack detection & analysis capabilities as MCP tools

## Architecture

### MCP Server (`index.ts`)
**Stdio-based MCP server** implementing:

**Tools Exposed**:
1. `snapback.analyze_risk`: Guardian detection engine
   - Input: Diff changes (added/removed lines)
   - Output: Risk score, severity, factors, recommendations
   - Budget: <200ms

2. `snapback.check_dependencies`: Phantom dependency detection
   - Input: Import statements
   - Output: Missing/phantom dependencies
   - Budget: <300ms

3. `snapback.create_checkpoint`: Create snapshot via extension
   - Input: File paths, note (optional)
   - Output: Snapshot IDs
   - Budget: <500ms (delegates to extension)

### Guardian Integration (`@snapback/core`)
**Detection plugins** orchestrated by Guardian:
- `SecretDetectionPlugin`: Credentials, API keys, high entropy
- `MockReplacementPlugin`: Test mocks in production code
- `PhantomDependencyPlugin`: Missing package.json entries

Loaded on server start (lines 76-80):
```ts
const guardian = new Guardian();
guardian.addPlugin(new SecretDetectionPlugin());
guardian.addPlugin(new MockReplacementPlugin());
guardian.addPlugin(new PhantomDependencyPlugin());
```

### Event Bus Integration (`@snapback/events`)
**Server mode** for pub/sub hub:
- `eventBus.connect()`: Client mode (subscribes to extension events)
- Publishes: `ANALYSIS_COMPLETED` after risk analysis
- Future: Bridge to web app for remote monitoring

### Extension IPC (`client/extension-ipc.ts`)
**Request/response** with VS Code extension:
- `createSnapshot(filePaths, note)`: Delegates to extension
- Uses Unix domain sockets for IPC
- Timeout: 10s for extension responses

### Security (`utils/security.ts`)
**Path validation & telemetry**:
- `setWorkspaceRoot()`: Restricts file operations to workspace
- `validatePath()`: Prevents path traversal attacks
- `CreateSnapshotSchema`: Zod validation for snapshot requests
- `initializeSecurityTelemetry()`: Posthog client for MCP tool usage

## Tool Behavior

### `analyze_risk`
**When Claude/Cursor should call**:
- BEFORE accepting AI code suggestions
- For critical files (auth, security, DB schemas)
- When user asks "is this safe?"

**When NOT to call**:
- Trivial changes (typo fixes, formatting)
- Non-code files (images, JSON)
- After changes already applied

**Response Structure**:
```ts
{
  risk_level: 'safe' | 'low' | 'medium' | 'high' | 'critical',
  issues: [
    {
      type: 'secret_detection' | 'mock_replacement' | 'phantom_dependency',
      severity: 'low' | 'medium' | 'high' | 'critical',
      message: 'Potential AWS access key detected',
      line?: number,
      recommendation: 'Move secrets to environment variables'
    }
  ],
  overall_score: 0.85 // 0-1 range
}
```

### `check_dependencies`
**When to call**:
- After adding imports
- Before package.json updates
- When build fails with "module not found"

**Response**:
```ts
{
  phantom_dependencies: ['axios', 'lodash'],
  recommendations: [
    'Add axios@^1.0.0 to dependencies',
    'Add lodash@^4.17.21 to dependencies'
  ]
}
```

### `create_checkpoint`
**When to call**:
- Before risky changes
- At logical breakpoints (feature complete, tests passing)
- User explicitly requests "create snapshot"

**Response**:
```ts
{
  snapshot_ids: ['snap-abc123', 'snap-def456'],
  message: 'Created 2 snapshots'
}
```

## Data Flow

```
Claude Code / Cursor
  ↓
MCP Tool Call (stdio)
  ↓
SnapBack MCP Server
  ↓
[analyze_risk] → Guardian.analyze() → Detection Plugins
[check_dependencies] → DependencyAnalyzer
[create_checkpoint] → ExtensionIPCClient → VS Code Extension
  ↓
Response (JSON)
  ↓
Claude / Cursor (displays to user)
```

## Performance Budgets

Enforced via `trackPerformance()`:
- `analyze_risk`: <200ms (logged if exceeded)
- `check_dependencies`: <300ms
- `create_checkpoint`: <500ms (includes IPC)

Budget violations logged to stderr for monitoring.

## Error Handling

**Sanitized errors** prevent PII leakage:
- Development: Full stack traces
- Production: `message: "Internal error, log ID: ERR-xxx"`
- All errors logged to stderr with unique ID

Error codes:
- `INTERNAL_ERROR`: Unexpected failures
- `VALIDATION_ERROR`: Invalid tool arguments
- `TIMEOUT_ERROR`: IPC timeout (10s)

## Configuration

Environment variables:
- `NODE_ENV`: development|production (affects error verbosity)
- `SNAPBACK_EVENT_BUS_PORT`: Event bus port (default: auto-detect)
- `SNAPBACK_IPC_SOCKET`: IPC socket path
- `TELEMETRY_URL`: Analytics endpoint (default: https://telemetry.snapback.dev)

## Testing

- **Unit**: Tool handlers, error sanitization
- **Integration**: Guardian plugin orchestration
- **E2E**: Full MCP stdio protocol (pending)

Test commands:
- `pnpm test`: Vitest unit tests
- `pnpm test:mcp`: MCP protocol validation

## Deployment

**Claude Code**:
Add to `claude_desktop_config.json`:
```
{
  "mcpServers": {
    "snapback": {
      "command": "node",
      "args": ["/path/to/snapback-mcp/dist/index.js"]
    }
  }
}
```

**Cursor**:
Add to MCP settings (similar config).

## Security Considerations

1. **Path Traversal**: All file paths validated against workspace root
2. **PII Prevention**: Error messages sanitized before returning
3. **Resource Limits**: 1MB max buffer size per request
4. **Timeout Protection**: 10s max for IPC calls

## Dependencies

- **MCP**: @modelcontextprotocol/sdk (stdio transport)
- **Detection**: @snapback/core (Guardian + plugins)
- **Events**: @snapback/events (pub/sub bus)
- **Storage**: @snapback/sdk (LocalStorage)
- **Validation**: zod

## Related Docs
- Detection Engine: [packages/core/CLAUDE.md](../../packages/core/CLAUDE.md)
- VS Code Extension: [apps/vscode/CLAUDE.md](../vscode/CLAUDE.md)
- Event Bus: [packages/events/CLAUDE.md](../../packages/events/CLAUDE.md)

## Architectural Decisions

### API-First Approach

The SnapBack MCP Server implements an API-first architectural approach for several key reasons:

#### Rationale for Remote Guardian over Local Implementation

1. **Consistency**: Centralized analysis ensures uniform detection capabilities across all clients
2. **Feature Flags**: Remote API enables dynamic feature toggling without client updates
3. **Circuit Breaker**: Built-in failover mechanisms for high availability
4. **Scalability**: Centralized processing can handle varying loads more efficiently

#### Benefits of API-First Architecture

- **Centralized Updates**: New detection rules and improvements are immediately available to all users
- **Performance Monitoring**: Comprehensive metrics and monitoring of analysis performance
- **A/B Testing**: Ability to test new detection algorithms with specific user segments
- **Resource Efficiency**: Clients don't need to maintain heavy analysis libraries locally

#### Tradeoffs Considered

**Local Guardian Lite** (Planned for Free Tier):
- Pros: Faster response times, offline capability, reduced bandwidth usage
- Cons: Inconsistent detection, harder to update, larger client footprint

**Remote API** (Current Implementation):
- Pros: Consistent detection, easy updates, centralized monitoring
- Cons: Network dependency, potential latency, bandwidth usage

#### Implementation Details

The current implementation proxies analysis requests to the SnapBack backend API instead of using a local Guardian implementation. This approach is documented in the code with detailed comments about the planned AnalysisRouter implementation that will provide tier-based routing between local and remote analysis.

See `apps/mcp-server/src/index.ts` lines 65-85 and 200-235 for implementation details and future enhancement plans.
