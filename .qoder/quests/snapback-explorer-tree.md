# SnapBack Explorer Tree View Design

## Overview

This design document specifies the implementation of a new SnapBack Explorer tree view in the VS Code extension's Explorer sidebar. The view will display workspace safety metrics and snapshot summaries by consuming pre-existing authentication abstractions and workspace API endpoints. This is a **tree-only quest** that assumes auth, token handling, and HTTP plumbing are implemented separately.

## Goals

1. Provide at-a-glance workspace safety status in the Explorer sidebar
2. Surface blocking issues and watch items that require developer attention
3. Display snapshot recommendations, active branch status, and cleanup candidates
4. Consume existing auth abstractions without implementing any auth logic
5. Gracefully handle unauthenticated scenarios by showing a connect prompt
6. Maintain consistency with existing VS Code extension patterns and TypeScript standards

## Architecture

### Component Structure

The implementation follows VS Code's TreeDataProvider pattern with these core components:

1. **SnapBackTreeDataProvider**: Main provider implementing TreeDataProvider interface
2. **Node Model**: Unified node structure representing all tree items
3. **API Integration**: Leveraging existing authentication and API client infrastructure
4. **Command Registration**: New commands for tree interactions

### Integration Points

The tree view integrates with **pre-existing** abstractions (implemented by separate auth task):

- **CredentialsManager**: Provides `getCredentials()` and `clearCredentials()` via `src/auth/credentials.ts`
- **AuthedApiClient**: Provides authenticated `fetch()` with automatic token refresh via `src/api/authedApiClient.ts`
- **Configuration**: Reads `snapback.apiBaseUrl` and `snapback.webConsoleBaseUrl` from VS Code settings
- **Extension Activation**: Registers view during phase 4 provider initialization
- **Event Bus**: May publish refresh events on authentication state changes

## Data Model

### Pre-Existing Auth Abstractions

#### CredentialsManager Interface

Location: `src/auth/credentials.ts` (implemented by auth task)

**Interface Definition**:

| Type | Field | Description |
|------|-------|-------------|
| `ExtensionCredentials` | `user` | User identity object with id, email, name |
| | `workspace` | Optional workspace object with id, name, plan tier |
| | `accessToken` | OAuth access token string |
| | `refreshToken` | OAuth refresh token string |
| | `expiresAt` | Token expiration timestamp (number) |
| `CredentialsManager` | `getCredentials()` | Returns ExtensionCredentials or null if unauthenticated |
| | `clearCredentials()` | Clears stored credentials (async) |

**Factory Function**: `createCredentialsManager(secrets: vscode.SecretStorage): CredentialsManager`

**Usage Pattern**:

```typescript
const credentialsManager = createCredentialsManager(context.secrets);
const creds = await credentialsManager.getCredentials();

if (creds === null) {
  // User is unauthenticated - show connect node
} else {
  // User is authenticated - proceed with API calls
}
```

#### AuthedApiClient Interface

Location: `src/api/authedApiClient.ts` (implemented by auth task)

**Interface Definition**:

| Method | Signature | Behavior |
|--------|-----------|----------|
| `fetch<T>` | `(path: string, init?: RequestInit) => Promise<T>` | Automatically adds Authorization header, refreshes tokens when needed, throws on session expiry |

**Factory Function**: `createAuthedApiClient(context: vscode.ExtensionContext): AuthedApiClient`

**Error Handling**:
- Throws `Error("Session expired - please reconnect your account")` when session cannot be refreshed
- Caller must catch this error and call `credentialsManager.clearCredentials()` then refresh tree

**Base URL Configuration**:
- Reads from `snapback.apiBaseUrl` setting (default: `https://api.snapback.dev`)
- Paths are relative to base URL (e.g., `/api/v1/workspace/safety`)

**Usage Pattern**:

```typescript
const apiClient = createAuthedApiClient(context);

try {
  const data = await apiClient.fetch<SafetyResponse>("/api/v1/workspace/safety");
  // Process data
} catch (error) {
  if (error.message.includes("Session expired")) {
    await credentialsManager.clearCredentials();
    this._onDidChangeTreeData.fire(undefined); // Refresh tree
  } else {
    // Show error node
  }
}
```

### Backend API Contracts

#### Safety Endpoint

**Request**: `GET /api/v1/workspace/safety`

**Response Schema**:

| Field | Type | Description |
|-------|------|-------------|
| `blockingIssues` | Array of SafetyIssue | Issues preventing safe operations |
| `watchItems` | Array of SafetyIssue | Items requiring developer awareness |

**SafetyIssue Schema**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the issue |
| `kind` | "blocking" \| "watch" | Issue severity category |
| `message` | string | Human-readable description |
| `severity` | "low" \| "medium" \| "high" | Risk level assessment |
| `createdAt` | ISO 8601 string | Timestamp of issue detection |
| `filePath` | string (optional) | Associated file path if applicable |

#### Snapshots Endpoint

**Request**: `GET /api/v1/workspace/snapshots`

**Response Schema**:

| Field | Type | Description |
|-------|------|-------------|
| `recommendedRecoveryPoints` | Array of SnapshotRecoveryPoint | Snapshots suggested for restore operations |
| `activeBranches` | Array of SnapshotActiveBranch | Git branches with snapshot activity |
| `cleanupCandidates` | Array of SnapshotCleanupCandidate | Snapshots eligible for deletion |
| `total` | number | Total snapshot count across workspace |

**SnapshotRecoveryPoint Schema**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Snapshot identifier |
| `reason` | string | Why this snapshot is recommended |
| `createdAt` | ISO 8601 string | Snapshot creation time |
| `trigger` | string | What caused snapshot creation |
| `branch` | string | Git branch at snapshot time |
| `label` | string | Display label for UI |

**SnapshotActiveBranch Schema**:

| Field | Type | Description |
|-------|------|-------------|
| `branch` | string | Git branch name |
| `snapshots` | number | Number of snapshots on branch |
| `lastSnapshotAgeSeconds` | number | Seconds since last snapshot |
| `status` | "healthy" \| "needs_snapshot" \| "stale" | Branch snapshot health |

**SnapshotCleanupCandidate Schema**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Snapshot identifier |
| `reason` | string | Why cleanup is recommended |
| `ageSeconds` | number | Snapshot age in seconds |
| `storageBytes` | number | Storage space consumed |

### Node Model

All tree items use a unified node structure based on discriminated union pattern:

**SnapBackTreeNode Schema**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the node |
| `label` | string | Primary display text |
| `description` | string (optional) | Secondary text (right-aligned) |
| `icon` | string (optional) | VS Code codicon identifier |
| `section` | "workspaceSafety" \| "snapshots" (optional) | Root section categorization |
| `kind` | SnapBackNodeKind | Discriminator for node type |
| `collapsibleState` | TreeItemCollapsibleState | Expanded, Collapsed, or None |
| `snapshotId` | string (optional) | Associated snapshot for actions |
| `filePath` | string (optional) | Associated file for navigation |

**SnapBackNodeKind Type**:

```typescript
type SnapBackNodeKind =
  | "rootStatus"       // Last updated timestamp node
  | "section"          // Root section (Safety or Snapshots)
  | "group"            // Grouping node (Blocking Issues, Recovery Points, etc.)
  | "blockingIssue"    // Blocking safety issue leaf
  | "watchItem"        // Watch item leaf
  | "snapshot"         // Snapshot leaf (recovery point or cleanup candidate)
  | "branch";          // Active branch leaf
```

**Type Guards** (following always-typescript-patterns.md):

```typescript
function isSection(node: SnapBackTreeNode): node is SnapBackTreeNode & { section: SnapBackSection } {
  return node.kind === "section";
}

function isSnapshot(node: SnapBackTreeNode): node is SnapBackTreeNode & { snapshotId: string } {
  return node.kind === "snapshot" && node.snapshotId !== undefined;
}
```

### Tree Structure Specification

#### Unauthenticated State

When `credentialsManager.getCredentials()` returns `null`:

```
SnapBack Explorer
└─ Connect SnapBack Account
   id: "connect"
   kind: "section"
   label: "Connect SnapBack Account"
   description: "Link VS Code to your SnapBack workspace"
   icon: "account"
   collapsibleState: None
   command: snapback.connect → Opens {webConsoleBaseUrl}/connect/vscode
```

#### Authenticated State

When `credentialsManager.getCredentials()` returns `ExtensionCredentials`:

```
SnapBack Explorer
├─ Last updated Xs/Xm/Xh/Xd ago
│  id: "status"
│  kind: "rootStatus"
│  icon: "clock"
│  collapsibleState: None
│
├─ Workspace Safety
│  id: "workspaceSafety"
│  kind: "section"
│  section: "workspaceSafety"
│  icon: "shield"
│  collapsibleState: Expanded (default)
│  │
│  ├─ Blocking Issues (N)
│  │  icon: "error" if N>0, "pass" if N=0
│  │  │
│  │  ├─ ⚠️ env.ts changed without snapshot
│  │  │  description: "5m ago"
│  │  │  icon: "warning"
│  │  │  contextValue: "blockingIssue"
│  │  │  filePath: "/path/to/env.ts"
│  │  │
│  │  └─ ⚠️ High-risk snapshot active in main
│  │     description: "12m ago"
│  │     icon: "warning"
│  │     contextValue: "blockingIssue"
│  │
│  └─ Watch Items (M)
│     icon: "eye"
│     │
│     ├─ Large changeset: 250 LOC across 15 files
│     │  description: "10m ago"
│     │  icon: "circle-outline"
│     │
│     └─ High velocity: 12 files touched in last 20m
│        description: "20m ago"
│        icon: "circle-outline"
│
└─ Snapshots
   id: "snapshots"
   kind: "section"
   section: "snapshots"
   icon: "history"
   collapsibleState: Collapsed (default)
   │
   ├─ Total Snapshots: 37
   │  icon: "list-tree"
   │  collapsibleState: None
   │
   ├─ ⭐ Recommended Recovery Points (3)
   │  icon: "star-full"
   │  │
   │  ├─ Last known good before test failure
   │  │  description: "main • pre-commit • 10m ago"
   │  │  icon: "star-full"
   │  │  snapshotId: "snap-abc123"
   │  │  contextValue: "snapshot"
   │  │
   │  ├─ Before large refactor on main
   │  │  description: "main • manual • 2h ago"
   │  │  icon: "star-full"
   │  │  snapshotId: "snap-def456"
   │  │  contextValue: "snapshot"
   │  │
   │  └─ Pre-merge checkpoint for feature/auth
   │     description: "feature/auth • pre-merge • 1d ago"
   │     icon: "star-full"
   │     snapshotId: "snap-ghi789"
   │     contextValue: "snapshot"
   │
   ├─ 🔄 Active Branches (2)
   │  icon: "git-branch"
   │  │
   │  ├─ main
   │  │  description: "8 snapshots • 10m ago • needs snapshot"
   │  │  icon: "git-branch"
   │  │
   │  └─ feature/auth-hardening
   │     description: "3 snapshots • 2h ago • healthy"
   │     icon: "git-branch"
   │
   └─ 🗑️ Cleanup Candidates (4)
      icon: "trash"
      │
      ├─ Branch deleted 30d ago
      │  description: "14d ago • 8.0 MB"
      │  icon: "trash"
      │  snapshotId: "snap-old123"
      │
      └─ Old refactor checkpoint
         description: "45d ago • 3.2 MB"
         icon: "trash"
         snapshotId: "snap-old456"
```

## Implementation Components

### 1. SnapBackTreeDataProvider

**Responsibilities**:
- Implement VS Code TreeDataProvider interface
- Consume `AuthedApiClient` for workspace data fetching
- Consume `CredentialsManager` for authentication state checks
- Manage API response caching
- Build node hierarchy from API responses using discriminated unions
- Emit tree refresh events
- Handle session expiry by delegating to `CredentialsManager.clearCredentials()`

**Key Methods**:

| Method | Signature | Description |
|--------|-----------|-------------|
| `getTreeItem` | `(element: SnapBackTreeNode) => TreeItem` | Convert node to VS Code TreeItem |
| `getChildren` | `(element?: SnapBackTreeNode) => Promise<SnapBackTreeNode[]>` | Build child node list |
| `refresh` | `() => void` | Clear cache and refresh tree |
| `_onDidChangeTreeData` | EventEmitter | Notify VS Code of data changes |

**State Management**:

| State Variable | Type | Purpose |
|----------------|------|---------||
| `safetyCache` | WorkspaceSafetyResponse \| null | Cached safety data |
| `snapshotsCache` | WorkspaceSnapshotsResponse \| null | Cached snapshots data |
| `lastUpdatedAt` | Date \| null | Last successful fetch timestamp |
| `apiClient` | AuthedApiClient | Injected authenticated API client |
| `credentialsManager` | CredentialsManager | Injected credentials manager |

**Data Flow** (following discriminated union pattern from always-typescript-patterns.md):

1. VS Code calls `getChildren(undefined)` for root nodes
2. Provider calls `credentialsManager.getCredentials()`
3. If `null`, return single connect node with `kind: "section"`
4. If `ExtensionCredentials`, return three root nodes:
   - Status node (`kind: "rootStatus"`)
   - Workspace Safety section (`kind: "section", section: "workspaceSafety"`)
   - Snapshots section (`kind: "section", section: "snapshots"`)
5. When section node expanded, check `node.section` discriminator
6. Call appropriate `apiClient.fetch()` method
7. On success: cache response, update `lastUpdatedAt`, build child nodes
8. On session expiry: call `credentialsManager.clearCredentials()`, fire refresh
9. On other errors: return error node
10. Return constructed node array with proper `kind` discriminators

### 2. API Client Integration

The tree view **consumes** the pre-existing `AuthedApiClient` interface:

**Initialization Pattern**:

```typescript
// In SnapBackTreeDataProvider constructor
const apiClient = createAuthedApiClient(context);
const credentialsManager = createCredentialsManager(context.secrets);
```

**API Call Pattern**:

```typescript
// Fetch safety data
const safety = await this.apiClient.fetch<WorkspaceSafetyResponse>(
  "/api/v1/workspace/safety"
);

// Fetch snapshots data
const snapshots = await this.apiClient.fetch<WorkspaceSnapshotsResponse>(
  "/api/v1/workspace/snapshots"
);
```

**Error Handling Pattern** (following always-result-type-pattern.md):

```typescript
try {
  const data = await this.apiClient.fetch<T>(endpoint);
  return this.buildNodesFromData(data);
} catch (error) {
  if (error instanceof Error && error.message.includes("Session expired")) {
    await this.credentialsManager.clearCredentials();
    this._onDidChangeTreeData.fire(undefined);
    return []; // Next root call will show connect node
  }

  // Other errors: return error node
  return [this.createErrorNode(section, error)];
}
```

**No Auth Implementation Required**:

- Token refresh: Handled automatically by `AuthedApiClient`
- Authorization headers: Added automatically by `AuthedApiClient`
- Credential storage: Managed by `CredentialsManager`
- Session expiry detection: Thrown as error by `AuthedApiClient`

### 3. Node Construction Logic

#### Root Node Construction

**When unauthenticated** (`credentialsManager.getCredentials()` returns `null`):

Return single node with:
- `id: "connect"`
- `kind: "section"`
- `label: "Connect SnapBack Account"`
- `description: "Link VS Code to your SnapBack workspace"`
- `icon: "account"`
- `collapsibleState: None`
- Command triggering `snapback.connect` which opens `{webConsoleBaseUrl}/connect/vscode`

**Configuration Reading**:

```typescript
const config = vscode.workspace.getConfiguration("snapback");
const webConsoleBaseUrl = config.get<string>(
  "webConsoleBaseUrl",
  "https://console.snapback.dev"
);
```

**When authenticated** (`credentialsManager.getCredentials()` returns `ExtensionCredentials`):

Return three root nodes in order (following const assertion pattern from always-typescript-patterns.md):

1. **Status Node**:
   - `id: "status"`
   - `kind: "rootStatus"`
   - `label: "Last updated Xs ago"` (computed from `lastUpdatedAt`) or `"Last updated: never"` if no data
   - `icon: "clock"`
   - `collapsibleState: None`

2. **Workspace Safety Section**:
   - `id: "workspaceSafety"`
   - `kind: "section"`
   - `section: "workspaceSafety"`
   - `label: "Workspace Safety"`
   - `icon: "shield"`
   - `collapsibleState: Expanded`

3. **Snapshots Section**:
   - `id: "snapshots"`
   - `kind: "section"`
   - `section: "snapshots"`
   - `label: "Snapshots"`
   - `icon: "history"`
   - `collapsibleState: Collapsed`

**Type Safety** (using discriminated union):

```typescript
const SECTION_CONFIGS = [
  {
    id: "workspaceSafety",
    section: "workspaceSafety" as const,
    label: "Workspace Safety",
    icon: "shield",
    collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
  },
  {
    id: "snapshots",
    section: "snapshots" as const,
    label: "Snapshots",
    icon: "history",
    collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
  },
] as const;
```

#### Workspace Safety Children

When `getChildren` called with node where `section === "workspaceSafety"`:

1. Fetch safety data:
   ```typescript
   const safety = await this.apiClient.fetch<WorkspaceSafetyResponse>(
     "/api/v1/workspace/safety"
   );
   ```
2. Update `safetyCache` and `lastUpdatedAt = new Date()`
3. Build two group nodes (following discriminated union pattern):

**Blocking Issues Group**:
- `id: "blockingIssues"`
- `kind: "group"`
- `label: "Blocking Issues (N)"` where N = `blockingIssues.length`
- `icon: N > 0 ? "error" : "pass"`
- `collapsibleState: N > 0 ? Expanded : None`
- Children: Array of blocking issue leaf nodes

**Watch Items Group**:
- `id: "watchItems"`
- `kind: "group"`
- `label: "Watch Items (M)"` where M = `watchItems.length`
- `icon: "eye"`
- `collapsibleState: M > 0 ? Expanded : None`
- Children: Array of watch item leaf nodes

**Issue Leaf Nodes** (using discriminated kind):

For each blocking issue:
- `id: issue.id`
- `kind: "blockingIssue"`
- `label: issue.message`
- `description: formatAge(issue.createdAt)`
- `icon: "warning"`
- `filePath: issue.filePath` (if present)
- `collapsibleState: None`

For each watch item:
- `id: issue.id`
- `kind: "watchItem"`
- `label: issue.message`
- `description: formatAge(issue.createdAt)`
- `icon: "circle-large-outline"`
- `collapsibleState: None`

#### Snapshots Children

When `getChildren` called with node where `section === "snapshots"`:

1. Fetch snapshots data:
   ```typescript
   const snapshots = await this.apiClient.fetch<WorkspaceSnapshotsResponse>(
     "/api/v1/workspace/snapshots"
   );
   ```
2. Update `snapshotsCache` and `lastUpdatedAt = new Date()`
3. Build four nodes in order:

**Total Snapshots Node**:
- `id: "snapshotsTotal"`
- `kind: "group"`
- `label: "Total Snapshots: {total}"`
- `icon: "list-tree"`
- `collapsibleState: None`

**Recommended Recovery Points Group**:
- `id: "recommendedRecoveryPoints"`
- `kind: "group"`
- `label: "⭐ Recommended Recovery Points ({len})"`
- `icon: "star-full"`
- `collapsibleState: len > 0 ? Expanded : None`
- Children: Array of recovery point leaf nodes

Recovery point leaf:
- `id: snap.id`
- `kind: "snapshot"`
- `label: snap.label || snap.reason`
- `description: "{branch} • {trigger} • {age}"`
- `icon: "star-full"`
- `snapshotId: snap.id`
- `collapsibleState: None`

**Active Branches Group**:
- `id: "activeBranches"`
- `kind: "group"`
- `label: "🔄 Active Branches ({len})"`
- `icon: "git-branch"`
- `collapsibleState: len > 0 ? Expanded : None`
- Children: Array of branch leaf nodes

Branch leaf:
- `id: "branch-{branch}"`
- `kind: "branch"`
- `label: branch`
- `description: "{snapshots} snapshots • {age} • {statusLabel}"`
- `icon: "git-branch"`
- `collapsibleState: None`

**Cleanup Candidates Group**:
- `id: "cleanupCandidates"`
- `kind: "group"`
- `label: "🗑️ Cleanup Candidates ({len})"`
- `icon: "trash"`
- `collapsibleState: len > 0 ? Expanded : None`
- Children: Array of cleanup leaf nodes

Cleanup leaf:
- `id: snap.id`
- `kind: "snapshot"`
- `label: snap.reason || "Snapshot {id}"`
- `description: "{age} • {sizeMb} MB"`
- `icon: "trash"`
- `snapshotId: snap.id`
- `collapsibleState: None`

### 4. Error Handling

#### Session Expiry Errors

When `apiClient.fetch()` throws error with message containing "Session expired":

1. Call `await credentialsManager.clearCredentials()`
2. Clear all caches (`safetyCache = null`, `snapshotsCache = null`)
3. Fire tree refresh: `this._onDidChangeTreeData.fire(undefined)`
4. Next `getChildren(undefined)` call will check credentials, find `null`, and return connect node

**Pattern**:

```typescript
try {
  const data = await this.apiClient.fetch<T>(endpoint);
  // Process data
} catch (error) {
  if (error instanceof Error && error.message.includes("Session expired")) {
    await this.credentialsManager.clearCredentials();
    this._onDidChangeTreeData.fire(undefined);
    return [];
  }
  // Handle other errors below
}
```

#### Other API Errors

For non-session errors (network timeout, 500 errors, etc.):

Return single error node for that section:
- `id: "error-{section}"`
- `kind: "group"`
- `label: "Failed to load {Section Name}"`
- `description: error.message`
- `icon: "warning"`
- `collapsibleState: None`

Example: If safety fetch fails, return:
```typescript
{
  id: "error-workspaceSafety",
  kind: "group",
  label: "Failed to load Workspace Safety",
  description: "Network timeout after 5000ms",
  icon: "warning",
  collapsibleState: vscode.TreeItemCollapsibleState.None,
}
```

**Cache Behavior**: Cache remains `null` so retry on next manual refresh will re-fetch

**Logging** (following always-monorepo-imports.md):

```typescript
import { logger } from "@snapback/infrastructure";

logger.error("Workspace safety fetch failed", {
  endpoint: "/api/v1/workspace/safety",
  error: error.message,
  stack: error.stack,
});
```

### 5. Utility Functions

**formatAge(isoString: string): string**

Convert ISO 8601 timestamp to relative time string:

| Time Delta | Format | Example |
|------------|--------|---------|
| < 60s | "Xs ago" | "23s ago" |
| < 3600s | "Xm ago" | "15m ago" |
| < 86400s | "Xh ago" | "3h ago" |
| >= 86400s | "Xd ago" | "2d ago" |

Implementation uses current time minus parsed ISO timestamp, then formats based on delta magnitude.

**branchStatusLabel(status: string): string**

Convert status enum to display label:

| Status | Label |
|--------|-------|
| "healthy" | "healthy" |
| "needs_snapshot" | "needs snapshot" |
| "stale" | "stale" |

**formatBytes(bytes: number): string**

Convert bytes to human-readable size:

| Range | Format | Example |
|-------|--------|---------|
| < 1024 | "X B" | "512 B" |
| < 1048576 | "X KB" | "15.3 KB" |
| < 1073741824 | "X MB" | "8.0 MB" |
| >= 1073741824 | "X GB" | "2.1 GB" |

Round to one decimal place for KB/MB/GB.

### 6. Command Registration

Register following commands in `extension.ts`:

**snapback.refreshTree**

- **Action**: Call `treeDataProvider.refresh()`
- **Purpose**: Manual tree refresh trigger
- **Icon**: "refresh" ($(refresh))

**snapback.openSnapshotInWeb**

- **Action**: Open `{webConsoleBaseUrl}/snapshots/{snapshotId}` via `vscode.env.openExternal`
- **Parameters**: `snapshotId: string`
- **Purpose**: View snapshot details in web console
- **Icon**: "link-external" ($(link-external))

**snapback.createSnapshot**

- **Action**: Show information message "Snapshot creation coming soon"
- **Purpose**: Placeholder for future snapshot creation flow
- **Icon**: "save" ($(save))
- **Note**: Will later integrate with `POST /snapback/v1/snapshots`

**snapback.connect**

- **Action**: Open `{webConsoleBaseUrl}/connect/vscode` via `vscode.env.openExternal`
- **Configuration**: Read `webConsoleBaseUrl` from `snapback.webConsoleBaseUrl` setting (default: `https://console.snapback.dev`)
- **Purpose**: Initiate OAuth connection flow (implementation handled by separate auth task)
- **Icon**: "account" ($(account))

**Implementation**:

```typescript
vscode.commands.registerCommand("snapback.connect", async () => {
  const config = vscode.workspace.getConfiguration("snapback");
  const baseUrl = config.get<string>(
    "webConsoleBaseUrl",
    "https://console.snapback.dev"
  );
  const url = `${baseUrl}/connect/vscode`;
  await vscode.env.openExternal(vscode.Uri.parse(url));
});
```

### 7. Context Value Menus

Define context menu associations in `package.json` using `TreeItem.contextValue`:

**Setting contextValue in getTreeItem**:

```typescript
getTreeItem(element: SnapBackTreeNode): vscode.TreeItem {
  const item = new vscode.TreeItem(element.label, element.collapsibleState);

  // Set contextValue based on kind
  if (element.kind === "blockingIssue" && element.filePath) {
    item.contextValue = "blockingIssue";
  } else if (element.kind === "snapshot" && element.snapshotId) {
    item.contextValue = "snapshot";
  }

  // Set other properties...
  return item;
}
```

**Package.json menu contributions**:

```jsonc
"menus": {
  "view/item/context": [
    {
      "command": "snapback.createSnapshot",
      "when": "view == snapbackView && viewItem == blockingIssue",
      "group": "inline"
    },
    {
      "command": "snapback.openSnapshotInWeb",
      "when": "view == snapbackView && viewItem == snapshot",
      "group": "inline"
    }
  ]
}
```

## Configuration

### Package.json View Contribution

Add to `contributes.views.explorer` array (or extend if `snapbackView` already exists):

```json
{
  "id": "snapbackView",
  "name": "SnapBack",
  "when": "snapback.isActive",
  "visibility": "collapsed"
}
```

**Important**: Use `snapbackView` as the canonical view ID. Do not create `snapback.explorerView` or any other variant.

### Settings

Define in `contributes.configuration.properties`:

```jsonc
"snapback.apiBaseUrl": {
  "type": "string",
  "default": "https://api.snapback.dev",
  "description": "Base URL for SnapBack API endpoints"
},
"snapback.webConsoleBaseUrl": {
  "type": "string",
  "default": "https://console.snapback.dev",
  "description": "Base URL for SnapBack web console"
}
```

**No auth settings required**: Credentials managed via `CredentialsManager` using VS Code SecretStorage.

## Testing Strategy

### Unit Testing

Test coverage areas:

1. **Node Construction**:
   - Verify correct node structure for each scenario
   - Validate icon selection logic
   - Test description formatting

2. **API Integration**:
   - Mock API responses
   - Test 401 handling
   - Test network error handling

3. **Utility Functions**:
   - Test `formatAge` across time ranges
   - Test `formatBytes` for various sizes
   - Test `branchStatusLabel` for all statuses

4. **Authentication State**:
   - Test unauthenticated flow
   - Test authentication transition
   - Test credential retrieval failure

### Integration Testing

Manual testing scenarios:

1. **Unauthenticated State**:
   - Verify connect node appears
   - Click connect node triggers browser open
   - After OAuth, tree refreshes automatically

2. **Authenticated State**:
   - Verify root nodes appear in correct order
   - Expand Workspace Safety section
   - Expand Snapshots section
   - Verify data matches API responses

3. **Error Scenarios**:
   - Disconnect network, verify error nodes
   - Simulate 401, verify connect node returns
   - Simulate timeout, verify error handling

4. **Context Menus**:
   - Right-click blocking issue, verify snapshot command
   - Right-click snapshot, verify web console command

## Performance Considerations

### Caching Strategy

- Cache API responses in provider instance variables
- Cache lifetime: Until manual refresh or authentication change
- Cache invalidation: On `refresh()` call or auth state change

### Lazy Loading

- Root nodes constructed immediately
- Section children fetched on first expand
- Subsequent expands use cached data

### Network Efficiency

- Use existing `NetworkAdapter` with request queuing
- Respect timeout configuration
- Avoid parallel requests for same endpoint

## Migration Path

### Phase 1: Core Implementation

1. Implement SnapBackTreeDataProvider
2. Extend ApiClient with new endpoints
3. Register view in package.json
4. Wire provider in phase 4 activation

### Phase 2: Commands and Menus

1. Register command handlers
2. Add context menu contributions
3. Test command execution

### Phase 3: Polish

1. Implement utility functions
2. Add error handling
3. Add logging
4. Documentation updates

## Non-Goals

The following are explicitly out of scope for Phase 1:

- Inline editing of snapshot metadata
- Drag-and-drop operations
- Custom filtering or search
- Snapshot creation UI (placeholder only)
- Real-time updates via websocket
- Snapshot preview on hover

These may be considered for future iterations based on user feedback.

## Success Criteria

The implementation is considered successful when:

1. Tree view appears in Explorer sidebar when extension active
2. Unauthenticated state shows connect node correctly
3. Authenticated state displays safety and snapshot data
4. API fetch errors show appropriate error nodes
5. Context menus trigger correct commands
6. All existing extension tests continue passing
7. New unit tests achieve 80%+ coverage of new code
8. Manual testing confirms all user scenarios work

## Design Decisions

### 1. Refresh Strategy

**Decision**: Manual refresh only via `snapback.refreshTree` command.

**Rationale**: Avoids unnecessary API calls and respects rate limits. User can trigger refresh when needed.

**Future**: Consider event-driven refresh when auth state changes (listen to auth task events).

### 2. Base URL Configuration

**Decision**: Separate `apiBaseUrl` and `webConsoleBaseUrl` settings.

**Rationale**:
- API and web console may be deployed to different domains
- Allows local development with `http://localhost:3001` for API and `http://localhost:3000` for web
- Follows single responsibility principle

### 3. Authentication State

**Decision**: Check credentials on every root `getChildren()` call, not cached.

**Rationale**:
- Credentials can change externally (user signs out via command palette)
- Minimal performance cost (reading from SecretStorage is fast)
- Ensures UI always reflects current auth state

### 4. Error Recovery

**Decision**: On session expiry, clear credentials and show connect node. Do not auto-retry.

**Rationale**:
- Avoids infinite retry loops
- Clear user action required (reconnect account)
- Follows VS Code UX patterns (explicit user action for re-auth)

### 5. Multi-Workspace Support

**Decision**: Phase 1 shows aggregate workspace data (first workspace in `ExtensionCredentials`).

**Rationale**:
- Backend API `/api/v1/workspace/safety` operates on authenticated user's workspace
- Multi-workspace UI requires per-folder views (future enhancement)
- Keeps initial implementation focused

### 6. Type Safety

**Decision**: Use discriminated unions with `kind` field for all nodes.

**Rationale**:
- Follows `always-typescript-patterns.md` rule for exhaustive checking
- Type guards enable compile-time safety
- Clear node categorization without magic strings

**Example**:

```typescript
function getChildren(element?: SnapBackTreeNode): Promise<SnapBackTreeNode[]> {
  if (!element) {
    return this.getRootNodes();
  }

  // Exhaustive checking via discriminated union
  switch (element.kind) {
    case "section":
      return this.getSectionChildren(element);
    case "group":
      return element.children || [];
    case "rootStatus":
    case "blockingIssue":
    case "watchItem":
    case "snapshot":
    case "branch":
      return []; // Leaf nodes have no children
    default:
      // TypeScript ensures all cases handled
      const _exhaustive: never = element.kind;
      return [];
  }
}
```
