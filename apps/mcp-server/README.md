# SnapBack MCP Server

[![npm version](https://img.shields.io/npm/v/@snapback/mcp-server.svg)](https://www.npmjs.com/package/@snapback/mcp-server)
[![License](https://img.shields.io/npm/l/@snapback/mcp-server.svg)](LICENSE)

The SnapBack MCP Server provides real-time safety analysis for AI coding tools through the Model Context Protocol (MCP). It enables pre-emptive risk detection and safety context injection for Claude Desktop, Cursor, and other MCP-compatible tools.

## Features

### 🔍 Real-time Risk Analysis

-   Analyze AI code suggestions before applying them with real backend analysis
-   Detect security vulnerabilities, breaking changes, and complexity increases
-   Provide clear recommendations (ALLOW/WARN/BLOCK)

### 🛡️ Iteration Safety

-   Track consecutive AI edits to prevent quality degradation with real data
-   Monitor change velocity and iteration patterns
-   Warn when research shows increased vulnerability risk

### 📸 Snapshot Management

-   Create code snapshots before risky changes with real backend storage
-   List and manage existing snapshots
-   Restore to previous states when needed

### 🌐 External MCP Integration

-   Proxy tools from external MCP servers (Context7, GitHub, etc.)
-   Unified tool catalog for all connected services
-   Resilient tool calling with circuit breakers and retries

## Installation

```bash
npm install -g @snapback/mcp-server
```

## Quick Start

### Environment Configuration

Before running the SnapBack MCP Server, you need to configure the environment variables:

```bash
# Required environment variables
export SNAPBACK_API_URL="https://api.snapback.dev"  # Your SnapBack backend URL
export SNAPBACK_API_KEY="your-api-key-here"         # Your SnapBack API key

# Optional environment variables (see .env.example for full list)
export MCP_SERVERS="context7=stdio:/usr/local/bin/context7,github=ws:wss://..."  # External MCP servers
```

### Claude Desktop

Add to your Claude configuration (`~/.anthropic/claude_desktop_config.json`):

```json
{
	"mcpServers": {
		"snapback": {
			"command": "npx",
			"args": ["-y", "@snapback/mcp-server"],
			"env": {
				"SNAPBACK_API_URL": "https://api.snapback.dev",
				"SNAPBACK_API_KEY": "your-api-key-here"
			}
		}
	}
}
```

### Cursor

Add to your Cursor configuration (`~/.cursor/mcp.json`):

```json
{
	"mcpServers": {
		"snapback": {
			"command": "npx",
			"args": ["-y", "@snapback/mcp-server"],
			"env": {
				"SNAPBACK_API_URL": "https://api.snapback.dev",
				"SNAPBACK_API_KEY": "your-api-key-here"
			}
		}
	}
}
```

### VS Code

Add to your VS Code configuration (`~/.vscode/mcp.json`):

```json
{
	"mcpServers": {
		"snapback": {
			"command": "npx",
			"args": ["-y", "@snapback/mcp-server"],
			"env": {
				"SNAPBACK_API_URL": "https://api.snapback.dev",
				"SNAPBACK_API_KEY": "your-api-key-here"
			}
		}
	}
}
```

## Tools

### `analyze_suggestion`

Analyze an AI code suggestion for potential risks before applying it with real backend analysis.

**Arguments:**

```typescript
{
  code: string,        // The AI-suggested code to analyze
  file_path: string,   // Path to the file where code will be applied
  context?: {          // Additional context about the change
    surrounding_code?: string,
    project_type?: string,
    language?: string
  }
}
```

**Returns:**
Risk analysis with severity level, specific issues detected, and recommendation from the real backend.

### `check_iteration_safety`

Check if continuing with AI suggestions is safe based on iteration count with real data.

**Arguments:**

```typescript
{
	file_path: string; // Path to the file being edited
}
```

**Returns:**
Current iteration number, risk level, and recommendation from the real backend.

### `create_snapshot`

Manually create a code snapshot before making risky changes with real backend storage.

**Arguments:**

```typescript
{
  file_path: string,   // Path to the file to snapshot
  reason?: string      // Reason for creating snapshot
}
```

**Returns:**
Snapshot ID for later restoration from the real backend.

### `snapback.analyze_risk`

Analyze code changes for potential risks (legacy tool).

### `snapback.check_dependencies`

Check for dependency-related risks (legacy tool).

### `snapback.create_snapshot`

Create a code snapshot (legacy tool).

### `snapback.list_snapshots`

List available snapshots (legacy tool).

### `catalog.list_tools`

List available tools from connected MCP servers.

### Context7 Tools

When Context7 integration is enabled, the following tools are available:

#### `ctx7.resolve-library-id`

Resolve a library or package name into a Context7-compatible library ID.

**Arguments:**

```typescript
{
  libraryName: string  // The name of the library to resolve
}
```

**Returns:**
Context7-compatible library ID and metadata.

#### `ctx7.get-library-docs`

Fetch up-to-date documentation for a specific library.

**Arguments:**

```typescript
{
  context7CompatibleLibraryID: string,  // The Context7-compatible library ID
  topic?: string,                       // Optional topic to filter documentation
  tokens?: number                       // Optional limit on response size in tokens
}
```

**Returns:**
Formatted documentation with code examples and API references.

## Resources

### `snapback://session/current`

Real-time information about the current coding session from the real backend.

### `snapback://guidelines/safety`

Project-specific safety rules and patterns to avoid from the real backend.

## Prompts

### `safety_context`

Inject safety context into AI coding assistant prompts with real data.

**Arguments:**

```typescript
{
  file_path?: string   // Current file being edited
}
```

### `risk_warning`

Show risk warning based on current session state.

**Arguments:**

```typescript
{
	risk_type: string; // Type of risk detected
}
```

## External MCP Server Integration

SnapBack MCP Server can proxy tools from external MCP servers. Configure in `~/.snapback/mcp.json`:

```json
{
	"mcpServers": {
		"context7": {
			"command": "npx",
			"args": ["-y", "@context7/mcp-server"]
		},
		"github": {
			"command": "npx",
			"args": ["-y", "@modelcontextprotocol/server-github"],
			"env": {
				"GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
			}
		}
	}
}
```

Access external tools with namespace prefixes:

-   `ctx7.*` - Context7 tools
-   `gh.*` - GitHub tools
-   `registry.*` - NPM registry tools

## Environment Variables

-   `SNAPBACK_API_URL` - SnapBack backend API URL (required)
-   `SNAPBACK_API_KEY` - SnapBack API key for authentication (required)
-   `SNAPBACK_STORAGE_PATH` - Override default snapshot storage location (default: `.snapback/`)
-   `SNAPBACK_MCP_CONFIG` - Override MCP configuration file path (default: `~/.snapback/mcp.json`)
-   `NODE_ENV` - Set to `development` for verbose logging

### Context7 Integration

To enable Context7 integration for documentation and code examples:

-   `CONTEXT7_API_KEY` - Context7 API key for authenticated access (required for Context7 integration)
-   `CONTEXT7_API_URL` - Override default Context7 API URL (default: `https://context7.com/api`)
-   `CONTEXT7_CACHE_TTL_SEARCH` - Cache TTL for library search results in seconds (default: `3600`)
-   `CONTEXT7_CACHE_TTL_DOCS` - Cache TTL for documentation results in seconds (default: `86400`)

## Best Practices

### Optimal Developer Experience

The SnapBack MCP Server is designed with optimal DX in mind:

1. **Invisible by Default**: Operates silently in the background, only surfacing information when issues are detected
2. **Automatic Safety Checks**: Pre-emptive risk analysis before code is applied with real backend analysis
3. **Minimal Friction**: Lightweight implementation with minimal memory/CPU overhead
4. **Clear Error Handling**: Graceful degradation when external services are unavailable
5. **Proper Logging**: Uses stderr for logging to avoid corrupting JSON-RPC messages

### Performance Optimization

-   Memory-efficient implementation with minimal footprint
-   Fast response times (<100ms for most operations)
-   Connection pooling for external MCP servers
-   Caching mechanisms for frequently accessed data
-   Circuit breaker patterns to prevent cascading failures

### Error Handling

-   Comprehensive error handling with meaningful error messages
-   Automatic retry logic for transient failures
-   Proper error propagation without exposing internal details
-   Logging to stderr to avoid corrupting stdout JSON-RPC messages

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Run with coverage
pnpm test:coverage

# Type checking
pnpm typecheck

# Lint and format
pnpm check
```

## Contributing

We welcome contributions! Please see our [contributing guidelines](CONTRIBUTING.md) for details.

## License

MIT © SnapBack
