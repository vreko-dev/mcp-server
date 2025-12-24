# @snapback/mcp-config

**Purpose**: AI client detection and MCP configuration for SnapBack
**Role**: Shared module for VS Code extension and CLI to detect/configure AI assistants

## Overview

This package provides utilities to:
1. **Detect** installed AI assistants (Claude Desktop, Cursor, Windsurf, Continue)
2. **Write** SnapBack MCP configuration to their config files
3. **Validate** existing configurations
4. **Remove** SnapBack configuration when needed

## Exports

### Detection (`detect.ts`)
- `detectAIClients()` - Detect all AI clients and their config status
- `getClient(name)` - Get specific client by name
- `getConfiguredClients()` - Get clients with SnapBack already configured
- `getClientConfigPath(name)` - Get platform-specific config path

### Writing (`write.ts`)
- `getSnapbackMCPConfig(options)` - Generate SnapBack MCP server config
- `writeClientConfig(client, config)` - Write config to client file
- `removeSnapbackConfig(client)` - Remove SnapBack from client config
- `validateConfig(client)` - Verify config was written correctly

### Types (`types.ts`)
- `AIClientConfig` - Config for a detected AI client
- `DetectionResult` - Result of client detection
- `MCPServerConfig` - MCP server configuration
- `SnapbackConfigOptions` - Options for generating config

## Supported AI Clients

| Client | Config Path (macOS) | Format |
|--------|---------------------|--------|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` | mcpServers |
| Cursor | `~/.cursor/mcp.json` | mcpServers |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | mcpServers |
| Continue | `~/.continue/config.json` | experimental.modelContextProtocolServers |

## Usage Examples

```typescript
import { detectAIClients, writeClientConfig, getSnapbackMCPConfig } from '@snapback/mcp-config';

// Detect installed AI assistants
const result = detectAIClients();
console.log(`Found ${result.detected.length} AI assistants`);
console.log(`${result.needsSetup.length} need SnapBack configuration`);

// Configure all clients that need setup
const mcpConfig = getSnapbackMCPConfig({ apiKey: 'sk_...' });
for (const client of result.needsSetup) {
  const writeResult = writeClientConfig(client, mcpConfig);
  if (writeResult.success) {
    console.log(`Configured ${client.displayName}`);
  }
}
```

## Platform Support

- **macOS**: Full support for all clients
- **Windows**: Full support (uses `%APPDATA%` for Claude Desktop)
- **Linux**: Full support (uses `~/.config/` for Claude Desktop)

## Dependencies

- Node.js built-in modules only (`fs`, `os`, `path`)
- No external runtime dependencies

## Testing

```bash
pnpm test          # Run unit tests
pnpm test:watch    # Run tests in watch mode
```

## Related Packages

- `apps/vscode` - VS Code extension using this for auto-configure
- `apps/cli` - CLI using this for `snapback init` command
- `apps/mcp-server` - The MCP server that gets configured
