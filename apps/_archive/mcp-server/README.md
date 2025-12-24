# SnapBack MCP Server

[![npm version](https://badge.fury.io/js/@snapback%2Fmcp-server.svg)](https://www.npmjs.com/package/@snapback/mcp-server)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

> **Your AI guardrails and undo button**
>
> Prevents "oh no" moments in AI-assisted development through risk assessment, workspace health monitoring, and instant recovery.

## Quick Start

```bash
npm install -g @snapback/mcp-server
snapback-mcp
```

Works immediately - no configuration required!

## What It Does

### 🆓 Free (No Account Needed)

- ✅ **Pattern Memory Queries**: "Has this refactor pattern caused problems before?"
- ✅ **Risk Assessment**: Check if changes match known failure patterns
- ✅ **Dependency Checking**: Validate package.json changes
- ✅ **Offline Ready**: Works without internet connection

### ☁️ Pro Features (Optional API Key)

Add `SNAPBACK_API_KEY` to unlock:

- 🔐 **Report Outcomes**: Tell SnapBack what actually broke (improves future detection)
- 🔐 **Create Snapshots**: Let your AI agent checkpoint before risky refactors
- 🔐 **Cloud Sync**: Access snapshots across devices
- 🔐 **Team Sharing**: Share learned patterns with teammates

## Installation

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "snapback": {
      "command": "npx",
      "args": ["-y", "@snapback/mcp-server"]
    }
  }
}
```

### With API Key (Optional)

```json
{
  "mcpServers": {
    "snapback": {
      "command": "npx",
      "args": ["-y", "@snapback/mcp-server"],
      "env": {
        "SNAPBACK_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Cursor / Other MCP Clients

```bash
# Install globally
npm install -g @snapback/mcp-server

# Run with stdio transport
snapback-mcp
```

## Workflow Decision Tree

Not sure which tool to use? Follow this guide:

```
User Request →
  ├─ Involves dependencies? → snapback.validate_recommendation
  │   (e.g., "should I install react-query?")
  │
  ├─ Major/risky change? → snapback.prepare_workspace
  │   (e.g., "refactoring auth system")
  │   └─ Protection score 🟡 or 🔴? → snapback.create_snapshot
  │
  ├─ Something broke? → snapback.list_snapshots → snapback.restore_snapshot
  │   (e.g., "this broke everything", "need to undo")
  │
  ├─ Ready to commit? → snapback.check_patterns (quick)
  │   OR snapback.validate_code (comprehensive)
  │
  └─ AI suggesting code? → snapback.assess_risk
      (e.g., "is this safe to apply?")
```

## Quick Start Workflows

### Scenario 1: "Should I install this package?"

```typescript
// User: "Should I use react-query for data fetching?"

1. snapback.validate_recommendation({
  packageName: "react-query",
  targetVersion: "latest",
  currentPackageJson: {...}
})
// Returns: ✅ Safe to install | ⚠️ Breaking changes detected | 🛑 Conflicts found
```

### Scenario 2: "Is it safe to refactor auth?"

```typescript
// User: "I'm about to refactor the authentication system"

1. snapback.prepare_workspace({
  task: "Refactor authentication system",
  files: ["src/auth.ts", "src/middleware/auth.ts"]
})
// Returns: 🔴 Protection Score: 35% - High risk, create snapshot first!

2. snapback.create_snapshot({
  reason: "Pre-auth refactor",
  files: ["src/auth.ts", "src/middleware/auth.ts"]
})
// Returns: ✅ Snapshot snap_abc123 created

3. [Make changes...]

4. snapback.check_patterns({
  code: "...",
  filePath: "src/auth.ts"
})
// Returns: ✅ No violations OR ⚠️ 2 violations found
```

### Scenario 3: "Oh no, I broke everything"

```typescript
// User: "This broke everything, I need to undo"

1. snapback.list_snapshots()
// Returns: List of available snapshots

2. snapback.restore_snapshot({
  snapshotId: "snap_abc123"
})
// Returns: ✅ Restored 2 files to pre-refactor state
```

### Scenario 4: "Before accepting AI suggestion"

```typescript
// AI suggests code changes

1. snapback.assess_risk({
  changes: [
    { added: true, value: "const API_KEY = 'sk_live_...'" }
  ]
})
// Returns: ⚠️ HIGH RISK: Hardcoded secret detected
```

## Available Tools

### `snapback.assess_risk`

Analyze code changes for potential security risks before applying them.

**When to use:**
- Before accepting AI-generated code
- When reviewing complex changes
- For critical files (auth, database, config)

**Example:**
```javascript
// AI detects you want to add authentication
// Before applying changes, it calls:
snapback.assess_risk({
  changes: [
    { added: true, value: "const API_KEY = 'sk_live_...';" }
  ]
})
// Returns: ⚠️ HIGH RISK: Hardcoded secret detected
```

### `snapback.validate_recommendation`

Validates AI package recommendations using npm registry + GitHub API.

**When to use:**
- Before installing packages recommended by AI
- To check for breaking changes in upgrades
- When troubleshooting dependency conflicts

**Example:**
```javascript
snapback.validate_recommendation({
  packageName: "react",
  targetVersion: "18.2.0",
  currentPackageJson: { dependencies: { "react": "17.0.2" } }
})
// Returns: ⚠️ Breaking changes detected, migration required
```

### `snapback.create_snapshot` (Pro)

Create a code snapshot before risky changes.

**Enhanced UX Features:**
- ✅ **Pre-flight validation**: Checks file existence before reading
- ✅ **Fuzzy path matching**: Suggests similar filenames when file not found
- ✅ **Flexible error modes**: Choose how to handle missing files
- ✅ **Rich error messages**: Clear context with workspace root, resolved paths, and suggestions

**Example:**
```javascript
snapback.create_snapshot({
  reason: "Before major refactor",
  files: ["src/auth.ts", "src/db.ts"]
})
// Returns: ✅ Snapshot created: snap_xyz123
```

**Handling Missing Files:**

```javascript
// Option 1: Fail fast (default)
snapback.create_snapshot({
  files: ["src/auth.ts", "missing.ts"],
  onMissingFile: "error" // Default behavior
})
// Returns: ❌ Error with file status:
//   ✅ src/auth.ts (12.5 KB)
//   ❌ missing.ts
//   🔍 Did you mean: src/missing-old.ts (85% match)?

// Option 2: Warn and continue
snapback.create_snapshot({
  files: ["src/auth.ts", "missing.ts"],
  onMissingFile: "warn" // Log warning, snapshot valid files
})
// Returns: ✅ Snapshot created with 1 file (1 skipped)

// Option 3: Silent skip
snapback.create_snapshot({
  files: ["src/auth.ts", "missing.ts"],
  onMissingFile: "skip" // Silently skip invalid files
})
// Returns: ✅ Snapshot created with 1 file
```

**Path Suggestions:**

When a file isn't found, SnapBack automatically suggests alternatives:

```javascript
snapback.create_snapshot({
  files: ["index.ts"], // Missing 'src/' prefix
  suggestAlternatives: true // Default
})
// Returns: 🔍 Did you mean one of these?
//   1. src/index.ts (85% match)
//      Common pattern: files in src/ directory
//   2. app/index.ts (75% match)
//      Try parent directory
```

**Response Format:**

```javascript
{
  success: true,
  snapshot: {
    id: "snap_abc123",
    timestamp: 1703001234567,
    fileCount: 2,
    totalBytes: 25600,
    validation: {
      requested: 3,    // Files requested
      included: 2,     // Files successfully included
      skipped: 1       // Files skipped (missing/invalid)
    }
  }
}
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `files` | `string[]` | Required | File paths relative to workspace root |
| `reason` | `string` | Optional | Reason for creating snapshot |
| `trigger` | `"manual" \| "mcp" \| "ai_assist" \| "session_end"` | `"mcp"` | What triggered the snapshot |
| `onMissingFile` | `"error" \| "warn" \| "skip"` | `"error"` | How to handle missing files |
| `suggestAlternatives` | `boolean` | `true` | Whether to suggest alternative paths |

### `snapback.list_snapshots` (Pro)

List all available snapshots.

### `snapback.restore_snapshot` (Pro)

Restore code from a previous snapshot.

## Configuration

### Environment Variables

```bash
# Optional: SnapBack API key for Pro features
SNAPBACK_API_KEY=sk_...

# Optional: Custom API URL
SNAPBACK_API_URL=https://api.snapback.dev

# Optional: Log level
LOG_LEVEL=info
```

### Offline Mode

Works perfectly without any configuration or API keys:

```bash
# No env vars needed!
npx @snapback/mcp-server
```

**What works offline:**
- Risk analysis (basic)
- Dependency validation (npm registry + GitHub API)
- Secret detection

**What requires API key:**
- Advanced ML risk analysis
- Snapshot creation/restoration
- Cloud sync
- Team features

## Architecture

```
┌─────────────────┐
│   AI Tool       │  (Claude, Cursor, etc.)
│   (MCP Client)  │
└────────┬────────┘
         │ MCP Protocol
         │
┌────────▼─────────────────────────────────┐
│  SnapBack MCP Server                     │
│  ┌──────────────┐  ┌──────────────────┐ │
│  │ Free Tools   │  │  Pro Tools       │ │
│  │ - analyze    │  │  - snapshots     │ │
│  │ - check_deps │  │  - cloud sync    │ │
│  └──────────────┘  └──────────────────┘ │
└───────────┬──────────────────────────────┘
            │
        ┌───┴────┐
        │        │
   ┌────▼───┐ ┌─▼─────────┐
   │ Local  │ │ SnapBack  │
   │Analysis│ │    API    │
   └────────┘ └───────────┘
```

## Development

### Running Locally

```bash
git clone https://github.com/snapback-dev/snapback.dev.git
cd snapback-dev

pnpm install
pnpm build
pnpm start
```

### Testing

```bash
# Run tests
pnpm test

# Test without API key (offline mode)
unset SNAPBACK_API_KEY
pnpm start

# Test with API key
export SNAPBACK_API_KEY=sk_test_...
pnpm start
```

### Building

```bash
pnpm build

# Output: dist/index.js (ESM)
```

## Troubleshooting

### Server won't start

1. Check Node.js version: `node -v` (requires 18+)
2. Clear cache: `rm -rf node_modules && npm install`
3. Check permissions: `chmod +x $(which snapback-mcp)`

### API key not working

1. Verify key format: `sk_live_...` or `sk_test_...`
2. Check env var: `echo $SNAPBACK_API_KEY`
3. Get new key: [snapback.dev/settings/api](https://snapback.dev/settings/api)

### Tools not showing in Claude

1. Restart Claude Desktop completely
2. Check config file syntax (JSON must be valid)
3. Look for errors in Claude's console logs

### Snapshot file not found errors

**Problem:** Getting "File not found" errors when creating snapshots

**Solution:**

1. **Use workspace-relative paths** (not absolute):
   ```javascript
   // ❌ Wrong
   snapback.create_snapshot({ files: ["/Users/john/project/src/auth.ts"] })
   
   // ✅ Correct
   snapback.create_snapshot({ files: ["src/auth.ts"] })
   ```

2. **Check the file actually exists**:
   ```bash
   ls src/auth.ts  # From workspace root
   ```

3. **Use the suggestions** provided in error messages:
   ```
   🔍 Did you mean one of these?
     1. src/auth.ts (85% match)
        Common pattern: files in src/ directory
   ```

4. **For missing files, use flexible error modes**:
   ```javascript
   // Continue with valid files, skip missing ones
   snapback.create_snapshot({
     files: ["src/auth.ts", "maybe-missing.ts"],
     onMissingFile: "warn" // or "skip"
   })
   ```

## Security

- All secrets handled via environment variables
- No data sent to SnapBack without API key
- Local analysis runs offline
- Open source - audit the code yourself

Report security issues: security@snapback.dev

## Links

- **Documentation**: [docs.snapback.dev](https://docs.snapback.dev)
- **Main Repository**: [snapback-dev/snapback.dev](https://github.com/snapback-dev/snapback.dev)
- **Issues**: [github.com/snapback-dev/snapback.dev/issues](https://github.com/snapback-dev/snapback.dev/issues)
- **NPM**: [@snapback/mcp-server](https://www.npmjs.com/package/@snapback/mcp-server)

## License

Apache-2.0 © SnapBack

## Related

- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=MarcelleLabs.snapback-vscode)
- [`@snapback-oss/sdk`](https://www.npmjs.com/package/@snapback-oss/sdk) - TypeScript SDK
- [`@snapback-oss/contracts`](https://www.npmjs.com/package/@snapback-oss/contracts) - Type definitions
