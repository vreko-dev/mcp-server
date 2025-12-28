# SnapBack MCP Broker: Implementation Guide for Thin Clients

## What is the MCP Broker in SnapBack's Context?

The **MCP Broker** is not a separate componentâ€”it's the **communication pattern** that allows your thin clients (Extension + Web Console) to talk to your SnapBack backend through the Model Context Protocol standard.

Think of it as your **API translation layer**:
- Extension speaks MCP (JSON-RPC over stdio)
- Console speaks REST/GraphQL over HTTP
- MCP Broker translates both into consistent backend calls
- All communication flows through authenticated sessions

---

## Three Communication Patterns in SnapBack

### **Pattern 1: Extension â†” Local MCP Server â†” SnapBack Backend**

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ VS Code Extension (MCP Client)                                   â”‚
â”‚ - Listens for file changes                                      â”‚
â”‚ - Sends "backup file" requests                                  â”‚
â”‚ - Displays backup status                                        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                   â”‚
              STDIO (JSON-RPC 2.0)
                   â”‚ [Text-based protocol]
                   â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Local MCP Server (Node.js process on developer machine)          â”‚
â”‚ - Spawned by extension on activation                            â”‚
â”‚ - Implements MCP tool: "backup_file"                            â”‚
â”‚ - Implements MCP tool: "restore_file"                           â”‚
â”‚ - Implements MCP resource: "workspace_metadata"                 â”‚
â”‚ - Manages token lifecycle                                       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                   â”‚
              HTTP (Bearer Token)
                   â”‚
                   â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ SnapBack Backend (api.snapback.dev)                              â”‚
â”‚ - POST /backups (create backup)                                 â”‚
â”‚ - GET /backups (list backups)                                   â”‚
â”‚ - POST /restore (initiate restore)                              â”‚
â”‚ - POST /ide-context (register IDE instance)                    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Protocol Breakdown:**
```
Extension â†’ MCP Server:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "backup_file",
    "arguments": {
      "filePath": "/Users/dev/project/index.ts",
      "content": "function hello() { ... }",
      "language": "typescript"
    }
  }
}

MCP Server â†’ Backend:
POST /backups
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "filePath": "/Users/dev/project/index.ts",
  "content": "function hello() { ... }",
  "language": "typescript",
  "workspaceId": "ws_123",
  "timestamp": 1735429200
}

Backend â†’ MCP Server:
{
  "id": "bkp_456",
  "status": "created",
  "size": 1247,
  "url": "https://console.snapback.dev/backups/bkp_456"
}

MCP Server â†’ Extension:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "backupId": "bkp_456",
    "status": "success"
  }
}
```

---

### **Pattern 2: Web Console â†” MCP Server (Remote) â†” SnapBack Backend**

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Browser (console.snapback.dev)                                   â”‚
â”‚ - React/Next.js app                                              â”‚
â”‚ - Authenticated with session token                              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                   â”‚
            HTTP + SSE (JSON-RPC 2.0)
                   â”‚ [Can't use stdio from browser]
                   â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Remote MCP Server (api.snapback.dev/mcp)                         â”‚
â”‚ - HTTP endpoint that speaks MCP protocol                         â”‚
â”‚ - Converts HTTP requests to backend calls                       â”‚
â”‚ - Supports Server-Sent Events for streaming                    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                   â”‚
              Internal API
                   â”‚
                   â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ SnapBack Backend (api.snapback.dev)                              â”‚
â”‚ - Same endpoints as above                                       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Protocol Breakdown:**
```
Browser â†’ Remote MCP Server:
POST https://api.snapback.dev/mcp
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "list_backups",
    "arguments": {
      "limit": 50,
      "offset": 0
    }
  }
}

Remote MCP Server â†’ Backend:
GET /backups?limit=50&offset=0
Authorization: Bearer <internal_token>

Backend â†’ Remote MCP Server:
[
  { "id": "bkp_123", "files": 45, "size": 2048, "createdAt": "..." },
  { "id": "bkp_124", "files": 43, "size": 1920, "createdAt": "..." }
]

Remote MCP Server â†’ Browser:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    { "id": "bkp_123", "files": 45, "size": 2048, "createdAt": "..." },
    { "id": "bkp_124", "files": 43, "size": 1920, "createdAt": "..." }
  ]
}
```

---

### **Pattern 3: Extension â†” Web Console (Bidirectional Sync)**

When both are running simultaneously, they stay in sync:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Extension                    â”‚
â”‚ File: "index.ts" changed     â”‚
â”‚ Sends backup request â†’ MCP   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                   â”‚
            STDIO + HTTP
                   â†“
         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
         â”‚ Backend         â”‚
         â”‚ Stores backup   â”‚
         â”‚ Notifies both   â”‚
         â”‚ clients         â”‚
         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜
                   â”‚
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â†“                     â†“
   STDIO (Extension)    HTTP+SSE (Console)
        â†“                     â†“
   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
   â”‚ Extension    â”‚   â”‚ Console      â”‚
   â”‚ Status bar:  â”‚   â”‚ Shows: Backupâ”‚
   â”‚ "Backed up"  â”‚   â”‚ "2 min ago"  â”‚
   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## MCP Server Implementation Checklist

### **Local MCP Server** (Extension + Node.js)

```javascript
// mcp-server.js - runs on developer machine

const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");

class SnapBackMCPServer {
  constructor() {
    this.server = new Server({
      name: "snapback-mcp",
      version: "0.1.0"
    });

    this.sessionToken = null;
    this.workspaceId = null;
    this.ideContext = null;
  }

  // Initialize with auth token from extension
  async initialize(token, workspace) {
    this.sessionToken = token;
    this.workspaceId = workspace;

    // Register IDE context with backend
    await fetch("https://api.snapback.dev/ide-context", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ide: "vscode",
        version: "1.96.0",
        workspace: workspace
      })
    });
  }

  // Tool: Backup a single file
  registerBackupTool() {
    this.server.setRequestHandler("tools/call", async (request) => {
      if (request.params.name === "backup_file") {
        const { filePath, content, language } = request.params.arguments;

        try {
          const response = await fetch("https://api.snapback.dev/backups", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${this.sessionToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              filePath,
              content,
              language,
              workspaceId: this.workspaceId,
              timestamp: Date.now()
            })
          });

          if (!response.ok) throw new Error(`API error: ${response.status}`);

          const backup = await response.json();
          return {
            content: [{
              type: "text",
              text: `âœ… Backup created: ${backup.id}`
            }],
            isError: false
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `âŒ Backup failed: ${error.message}`
            }],
            isError: true
          };
        }
      }
    });

    this.server.setRequestHandler("tools/list", async () => {
      return {
        tools: [{
          name: "backup_file",
          description: "Create a backup of a file in your workspace",
          inputSchema: {
            type: "object",
            properties: {
              filePath: {
                type: "string",
                description: "Absolute path to the file"
              },
              content: {
                type: "string",
                description: "File content to backup"
              },
              language: {
                type: "string",
                description: "Programming language (typescript, python, etc)"
              }
            },
            required: ["filePath", "content", "language"]
          }
        }]
      };
    });
  }

  // Resource: Workspace metadata
  registerWorkspaceResource() {
    this.server.setRequestHandler("resources/list", async () => {
      return {
        resources: [{
          uri: `snapback://workspace/${this.workspaceId}`,
          name: "Current Workspace",
          mimeType: "application/json",
          description: "Metadata about the current VS Code workspace"
        }]
      };
    });

    this.server.setRequestHandler("resources/read", async (request) => {
      if (request.params.uri.startsWith("snapback://workspace/")) {
        return {
          contents: [{
            uri: request.params.uri,
            mimeType: "application/json",
            text: JSON.stringify({
              id: this.workspaceId,
              ide: "vscode",
              ideVersion: "1.96.0",
              lastBackup: new Date().toISOString(),
              filesProtected: 1247
            })
          }]
        };
      }
    });
  }

  async start() {
    this.registerBackupTool();
    this.registerWorkspaceResource();

    const transport = new StdioClientTransport({
      command: "node",
      args: [__filename]
    });

    await this.server.connect(transport);
    console.log("SnapBack MCP Server running on stdio");
  }
}

const server = new SnapBackMCPServer();
server.start().catch(console.error);
```

### **Remote MCP Server** (HTTP endpoint)

```javascript
// api.snapback.dev/mcp - Express endpoint

const express = require("express");
const app = express();

app.post("/mcp", authenticateToken, async (req, res) => {
  const { jsonrpc, method, params, id } = req.body;
  const userId = req.user.id;

  try {
    if (method === "tools/call") {
      const { name, arguments: args } = params;

      if (name === "backup_file") {
        const backup = await BackupService.create(userId, {
          filePath: args.filePath,
          content: args.content,
          language: args.language
        });

        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            backupId: backup.id,
            status: "success"
          }
        });
      }

      if (name === "list_backups") {
        const backups = await BackupService.list(userId, {
          limit: args.limit,
          offset: args.offset
        });

        return res.json({
          jsonrpc: "2.0",
          id,
          result: backups
        });
      }
    }

    if (method === "resources/read") {
      // Handle resource reads
    }

    // Method not found
    return res.status(400).json({
      jsonrpc: "2.0",
      id,
      error: {
        code: -32601,
        message: "Method not found"
      }
    });
  } catch (error) {
    return res.status(500).json({
      jsonrpc: "2.0",
      id,
      error: {
        code: -32603,
        message: "Internal error",
        data: { error: error.message }
      }
    });
  }
});

app.listen(3000);
```

---

## Authentication Token Flow Through MCP

### **Initial Authentication** (Magic Link â†’ Session Token)

```
1. User clicks magic link
   â†“
2. GET /auth/verify?token=magic_token_xyz
   â†“
3. Backend validates magic token
   â†“
4. Backend creates session token (JWT)
   â†“
5. Response includes:
   - sessionToken: "sess_abc123xyz789"
   - refreshToken: "refresh_abc123xyz789"
   - expiresIn: 3600 (seconds)
   - Set-Cookie: sessionId=...; HttpOnly; Secure; SameSite=Strict
   â†“
6. Browser stores in:
   - HttpOnly cookie (for API calls)
   - localStorage as fallback (for context detection)
   â†“
7. Extension receives token via localStorage event listener
   â†“
8. Extension initializes MCP server with token
   â†“
9. MCP server registers with backend: POST /ide-context
```

### **Token Refresh** (Automatic, before expiry)

```
Extension detects: 5 minutes until session expiry
   â†“
Extension: POST /auth/refresh with refreshToken
   â†“
Backend validates refreshToken, issues new sessionToken
   â†“
Extension updates token in localStorage
   â†“
All subsequent MCP calls use new token
   â†“
No interruption to user
```

### **Token Revocation** (Logout or security event)

```
User clicks logout button (Console or Extension)
   â†“
POST /auth/logout with sessionToken
   â†“
Backend marks token as revoked
   â†“
Backend sends notification to all active sessions (WebSocket/SSE)
   â†“
Extension receives notification, clears localStorage
   â†“
Console receives notification, redirects to login
   â†“
MCP server closes gracefully
```

---

## Error Handling & Resilience

### **Scenario 1: Network Interruption During Backup**

```
Extension: Backup file â†’ MCP Server
   â†“
MCP Server: Call /backups endpoint
   â†“
Network fails (no internet)
   â†“
Fetch timeout after 30 seconds
   â†“
MCP Server: Return error to Extension
   â†“
Extension: Queue backup in local IndexedDB
   â†“
Background listener monitors network status
   â†“
Network restored
   â†“
Extension: Retry queued backups with fresh token
   â†“
Backend: Process queued backups with deduplication
```

**Implementation:**
```javascript
// Extension: Queue failed backup
const queuedBackup = {
  id: "queued_" + Date.now(),
  filePath,
  content,
  language,
  status: "pending",
  attempt: 0,
  createdAt: Date.now()
};

// Store in VS Code storage
await context.globalStorageUri.writeFile(
  vscode.Uri.joinPath(context.globalStorageUri, "queued-backups.json"),
  Buffer.from(JSON.stringify([queuedBackup]))
);

// Listen for network status
window.addEventListener("online", async () => {
  const queued = await loadQueuedBackups();
  for (const backup of queued) {
    await retryBackup(backup);
  }
});
```

### **Scenario 2: Token Expires During Backup**

```
Extension: MCP call with sessionToken (5 min remaining)
   â†“
Backend: Request completes successfully
   â†“
4 minutes pass
   â†“
Extension: Next MCP call with expired token
   â†“
Backend: Returns 401 Unauthorized
   â†“
MCP Server: Detects 401, automatically calls /auth/refresh
   â†“
New sessionToken obtained
   â†“
MCP Server: Retries original request automatically
   â†“
Success (transparent to user)
```

**Implementation:**
```javascript
// MCP Server: Auto-refresh on 401
async makeAuthenticatedCall(endpoint, options = {}) {
  let response = await fetch(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      "Authorization": `Bearer ${this.sessionToken}`
    }
  });

  if (response.status === 401) {
    // Token expired, refresh it
    const refreshed = await this.refreshToken();
    if (refreshed) {
      // Retry with new token
      response = await fetch(endpoint, {
        ...options,
        headers: {
          ...options.headers,
          "Authorization": `Bearer ${this.sessionToken}`
        }
      });
    }
  }

  return response;
}
```

### **Scenario 3: MCP Server Crashes**

```
Extension: Sends MCP request
   â†“
MCP Server process crashes (out of memory, exception)
   â†“
Extension: No response within 5 seconds
   â†“
Extension: Timeout error bubbles up to UI
   â†“
User sees: "Connection lost. Reconnecting..."
   â†“
Extension spawns new MCP Server process
   â†“
New server reinitializes with token
   â†“
Extension retries request
   â†“
Success
```

**Implementation:**
```javascript
// Extension: MCP process health monitor
const spawnMCPServer = () => {
  const server = spawn("node", ["./mcp-server.js"]);

  server.on("exit", (code) => {
    if (code !== 0) {
      console.warn("MCP server crashed, restarting...");
      setTimeout(() => {
        this.mcpServer = spawnMCPServer();
      }, 1000); // Exponential backoff
    }
  });

  server.on("error", (err) => {
    console.error("MCP server error:", err);
    this.showStatusMessage("Connection error. Retrying...");
  });

  return server;
};
```

---

## Testing the MCP Broker

### **Unit Tests** (MCP Server)

```javascript
// __tests__/mcp-server.test.js

describe("SnapBack MCP Server", () => {
  let server;

  beforeEach(() => {
    server = new SnapBackMCPServer();
    server.sessionToken = "test_token";
    server.workspaceId = "test_workspace";
  });

  test("should handle backup_file tool call", async () => {
    const result = await server.handleToolCall({
      name: "backup_file",
      arguments: {
        filePath: "/test/file.ts",
        content: "const x = 1;",
        language: "typescript"
      }
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("Backup created");
  });

  test("should retry on 401 with token refresh", async () => {
    server.sessionToken = "invalid_token";

    // Mock refresh
    server.refreshToken = jest.fn().mockResolvedValue(true);

    const result = await server.makeAuthenticatedCall("/backups", {
      method: "POST"
    });

    expect(server.refreshToken).toHaveBeenCalled();
    expect(result.status).toBe(200);
  });
});
```

### **Integration Tests** (Extension + MCP + Backend)

```javascript
// __tests__/integration.test.js

describe("Extension â†” MCP â†” Backend Integration", () => {
  test("should create backup from file change event", async () => {
    // Simulate file change
    const backup = await extension.createBackup({
      filePath: "/test/app.ts",
      content: "const app = {};"
    });

    // Verify in backend
    const retrieved = await backend.getBackup(backup.id);
    expect(retrieved.filePath).toBe("/test/app.ts");
    expect(retrieved.content).toBe("const app = {};");
  });

  test("should sync backup between extension and console", async () => {
    // Create backup from extension
    const backup = await extension.createBackup({
      filePath: "/test/file.ts",
      content: "v1"
    });

    // Wait for sync
    await sleep(500);

    // Verify in console
    const list = await console.listBackups();
    expect(list).toContainEqual(expect.objectContaining({ id: backup.id }));
  });

  test("should handle network interruption gracefully", async () => {
    // Simulate network down
    networkMock.disable();

    const backup = await extension.createBackup({
      filePath: "/test/file.ts",
      content: "v1"
    });

    expect(backup.status).toBe("queued");

    // Network restored
    networkMock.enable();
    await sleep(100);

    // Verify retry succeeded
    const verified = await backend.getBackup(backup.id);
    expect(verified.status).toBe("created");
  });
});
```

---

## Deployment Checklist

### **Before Launch**

- [ ] Local MCP server handles token refresh automatically
- [ ] Remote MCP endpoint has rate limiting (prevent abuse)
- [ ] All MCP calls timeout after 30 seconds
- [ ] Error messages are user-friendly (not JSON-RPC errors)
- [ ] Token refresh happens before expiry (5-min buffer)
- [ ] Logout revokes all active sessions
- [ ] Extension retries failed backups up to 3 times
- [ ] MCP server logs all API calls for debugging
- [ ] Network interruption queue has size limit (don't store GBs)
- [ ] No sensitive data in MCP error messages

### **Monitoring**

- [ ] Track MCP call latency (p50, p95, p99)
- [ ] Monitor token refresh rate (should be ~0% during normal use)
- [ ] Alert on MCP server crashes
- [ ] Track backup queue depth (indicate network issues)
- [ ] Monitor API error rates by endpoint
- [ ] Track user authentication success rate

---

## Quick Reference: MCP Methods to Implement

| Method | Called By | Purpose |
|--------|-----------|---------|
| `initialize` | Host on startup | Handshake, version check |
| `tools/list` | Host on demand | Advertise available tools |
| `tools/call` | Host on user action | Execute tool (backup, restore, etc) |
| `resources/list` | Host periodically | Advertise available resources |
| `resources/read` | Host on demand | Read resource (workspace metadata) |
| `notifications/resource/list_changed` | Server â†’ Host | Tell host resource list changed |
| `notifications/resource/updated` | Server â†’ Host | Tell host a resource was updated |

---

## Why This Matters for SnapBack

âœ… **Single abstraction for both clients** - Extension and Console use same MCP interface
âœ… **Token centralization** - Session token managed in one place (backend)
âœ… **Resilience baked in** - Retry logic, timeout handling, auto-refresh
âœ… **Scalable** - Can add more thin clients (Cursor IDE, Windsurf, etc) by implementing MCP
âœ… **Standards-based** - Not custom protocol, follows Model Context Protocol spec
âœ… **Testable** - MCP is protocol-agnostic, easy to mock and test
