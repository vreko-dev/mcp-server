# Transport Adapters

Transports are **thin protocol adapters**. They translate between protocol-specific formats and the runtime.

## Design Principle

**Transports contain ZERO business logic.**

All business logic lives in:
- `runtime/orchestrator.ts` - Script coordination
- `runtime/monitor.ts` - Session health
- `runtime/storage.ts` - Snapshot management
- `runtime/events.ts` - Event emission

Transports only:
1. Parse protocol-specific input
2. Call runtime functions
3. Format protocol-specific output

## Available Transports

| Transport | Protocol | Status | Description |
|-----------|----------|--------|-------------|
| `mcp.ts` | MCP (Model Context Protocol) | 📝 TODO | AI assistant integration |
| `cli.ts` | CLI | 📝 TODO | Command-line interface |
| `http.ts` | HTTP/REST | 📝 TODO | API endpoints |

## MCP Transport

**Source:** `apps/mcp-server/src/index.ts` (844 LOC → ~200 LOC)

The MCP server provides tools for AI assistants:

### Tools

| Tool | Description |
|------|-------------|
| `write_files` | Write files with validation (main flow) |
| `get_context` | Get project health and recommendations |
| `get_session_status` | Get detailed session health |
| `list_snapshots` | List available snapshots |
| `restore_snapshot` | Restore files from snapshot |

### Key Simplifications

From the original 844 LOC:
- Remove: Backend API proxying (lines 485-509)
- Remove: DependencyAnalyzer integration (inline to scripts)
- Remove: PolicyEngine calls (replaced by validator scripts)
- Remove: Complex error handling middleware
- Keep: Tool definitions, MCP protocol handling
- Add: Session coach injection (`withCoaching` wrapper)

### Example Tool Handler

```typescript
server.tool("write_files", {
  handler: withCoaching(async ({ files }) => {
    const result = await orchestrate(
      Object.keys(files),
      { skipValidation: false }
    );
    
    if (result.decision === "FAIL") {
      return { success: false, errors: result.errors };
    }
    
    // Create snapshot and apply
    const snapshot = await storage.createSnapshot(...);
    await applyFiles(files);
    
    return { success: true, snapshot: snapshot.id };
  }),
});
```

## CLI Transport

**Source:** `apps/cli/src/index.ts`

Commands:
- `snapback init` - Initialize in workspace
- `snapback status` - Show session health
- `snapback snapshot` - Create manual snapshot
- `snapback restore <id>` - Restore from snapshot
- `snapback list` - List snapshots

## HTTP Transport

**Source:** `apps/api/` (currently separate)

Endpoints:
- `POST /validate` - Validate files
- `GET /health` - Session health
- `POST /snapshot` - Create snapshot
- `GET /snapshots` - List snapshots
- `POST /restore/:id` - Restore snapshot

## Adding New Transports

1. Create `transports/your-transport.ts`
2. Import from `runtime/` only
3. Handle protocol-specific parsing/formatting
4. Keep under 200 LOC
5. No business logic - delegate to runtime

## Session Coach Integration

All transports should inject session health using `withCoaching`:

```typescript
function withCoaching<T>(handler: () => Promise<T>) {
  return async () => {
    const result = await handler();
    const health = sessionMonitor.getHealth();
    
    return {
      result,
      session: {
        health: health.score,
        coaching: health.coachingMessage,
        warnings: health.warnings,
      },
    };
  };
}
```

This ensures agents see health feedback on EVERY response.
