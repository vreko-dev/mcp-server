# MCP Tool Naming Update - Implementation Guide

## Summary of Changes

Based on the 150 LLM selection strategies research + external reviewer feedback, here are the minimal, high-impact changes:

### Tool Renames

| Old Name | New Name | Rationale |
|----------|----------|-----------|
| `snapback.analyze_risk` | `snapback.assess_risk` | "assess" is measured (not brochure vibes) but decisive |
| `snapback.check_dependencies` | `snapback.validate_dependencies` | "validate" is more decisive than passive "check" |
| `catalog.list_tools` | `snapback.meta_list_tools` | Unified namespace, "meta_" indicates meta-operation |
| `ctx7.resolve-library-id` | `snapback.docs_find` | Discoverable alias (user asks about "docs") |
| `ctx7.get-library-docs` | `snapback.docs_fetch` | Discoverable alias |

### Kept As-Is (Per Reviewer)

- `snapback.create_snapshot` ✓
- `snapback.list_snapshots` ✓
- `snapback.restore_snapshot` ✓
- `snapback.get_workspace_vitals` ✓
- `snapback.acknowledge_risk` ✓
- `snapback.get_context` ✓
- `snapback.check_patterns` ✓

### Added

1. **MCP Annotations** (title, readOnlyHint, destructiveHint, idempotentHint)
2. **outputSchema** with ranked `next_actions` for tool chaining
3. **Error handling** with `isError: true` per MCP spec

---

## Implementation Steps

### Step 1: Update Tool Definitions in index.ts

Replace the inline tool definitions with imports from the new module:

```typescript
// apps/mcp-server/src/index.ts

import {
  snapbackToolDefinitions,
  toolNameMigrations,
  getToolByName,
  createErrorResult,
  createSuccessResult,
} from "./tools/tool-definitions-v2";

// In ListToolsRequestSchema handler:
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: snapbackToolDefinitions.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    // Include annotations if present
    ...(tool.annotations && { annotations: tool.annotations }),
  })),
}));
```

### Step 2: Handle Backward Compatibility

Add migration layer for old tool names:

```typescript
// In CallToolRequestSchema handler:
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  let { name, arguments: args } = request.params;

  // Migrate old tool names
  if (toolNameMigrations[name]) {
    console.error(`[MCP] Migrating deprecated tool: ${name} → ${toolNameMigrations[name]}`);
    name = toolNameMigrations[name];
  }

  // ... rest of handler
});
```

### Step 3: Update Error Handling

Replace protocol-level errors with tool result errors:

```typescript
// BEFORE (protocol-level error - LLM can't see details)
throw new Error(`Unknown tool: ${name}`);

// AFTER (tool result with isError - LLM can self-correct)
return createErrorResult(
  `Unknown tool: ${name}`,
  `Available tools: ${snapbackToolDefinitions.map(t => t.name).join(", ")}`
);
```

### Step 4: Add next_actions to Responses

Update each tool handler to include ranked next actions:

```typescript
// Example: assess_risk handler
if (name === "snapback.assess_risk") {
  const result = await engineAdapter.analyzeRisk(parsed.changes);

  // Determine next actions based on risk level
  const nextActions = [];

  if (result.risk_score > 30) {
    nextActions.push({
      tool: "snapback.create_snapshot",
      priority: 0.9,
      reason: "Risk score >30 - create safety checkpoint first",
      condition: "Before applying changes",
    });
  }

  nextActions.push({
    tool: "snapback.get_workspace_vitals",
    priority: 0.5,
    reason: "Check overall workspace health",
  });

  return createSuccessResult(result, nextActions);
}
```

### Step 5: Add Docs Aliases

Add wrapper handlers for `snapback.docs_*` that delegate to `ctx7.*`:

```typescript
// Handle docs aliases
if (name === "snapback.docs_find") {
  // Delegate to ctx7 implementation
  const parsed = z.object({ libraryName: z.string().min(1) }).parse(args);
  const result = await context7Service.resolveLibraryId(parsed.libraryName);

  // Wrap with next_actions
  return createSuccessResult(
    result,
    result.library_id
      ? [
          {
            tool: "snapback.docs_fetch",
            priority: 0.95,
            reason: "Fetch documentation for this library",
          },
        ]
      : []
  );
}

if (name === "snapback.docs_fetch") {
  const parsed = z
    .object({
      library_id: z.string().min(1),
      topic: z.string().optional(),
      tokens: z.number().optional(),
    })
    .parse(args);

  const result = await context7Service.getLibraryDocs(parsed.library_id, {
    topic: parsed.topic,
    tokens: parsed.tokens,
  });

  return result;
}
```

### Step 6: Update Internal MCP Separator

For the `ai_dev_utils/mcp` internal server, change `:` to `_`:

```typescript
// BEFORE
const server = new Server({ name: "codebase", ... });
// Tools: codebase:get_context, codebase:check_patterns

// AFTER
const server = new Server({ name: "codebase", ... });
// Tools: codebase_get_context, codebase_check_patterns
```

**Why?** The `:` separator is outside MCP's accepted character set per the reviewer.

---

## Testing Checklist

### Unit Tests

- [ ] `assess_risk` returns correct outputSchema structure
- [ ] `validate_dependencies` returns correct outputSchema structure
- [ ] `toolNameMigrations` correctly maps old → new names
- [ ] `createErrorResult` returns `isError: true`
- [ ] `createSuccessResult` includes `next_actions` array

### Integration Tests

- [ ] Old tool names still work (migration layer)
- [ ] `snapback.docs_find` → `ctx7.resolve-library-id` delegation works
- [ ] `snapback.docs_fetch` → `ctx7.get-library-docs` delegation works
- [ ] Annotations appear in `ListToolsRequestSchema` response

### A/B Testing (Post-Deploy)

Per reviewer feedback, add these metrics:

1. **Tool selection precision/recall**
   - Label correct tool(s) for test queries
   - Precision: When called, was it appropriate?
   - Recall: When it should be called, was it?

2. **Over-call rate**
   - Average tool calls per session
   - Track if "assess" wording increases false positives

---

## Rollout Plan

### Phase 1: Soft Launch (This Week)

1. Deploy new tool definitions alongside old names
2. Log migration hits to track which old names are still used
3. Monitor for any tool selection regressions

### Phase 2: Deprecation Notices (Week 2)

1. Add deprecation warnings to old tool name logs
2. Update documentation to use new names
3. Update example prompts and demos

### Phase 3: Remove Old Names (Week 4)

1. Remove migration layer after confirming no active usage
2. Clean up old handler code
3. Final documentation update

---

## Files to Modify

| File | Changes |
|------|---------|
| `apps/mcp-server/src/tools/tool-definitions-v2.ts` | New file (created) |
| `apps/mcp-server/src/index.ts` | Import new definitions, add migration layer |
| `apps/mcp-server/src/tools/context-tools.ts` | Update exports if needed |
| `apps/mcp-server/src/tools/vitals-tools.ts` | Already uses correct names |
| `ai_dev_utils/mcp/server.ts` | Change `:` to `_` separator |
| `ai_dev_utils/mcp/README.md` | Update tool name examples |

---

## Key Insights from Reviewer

1. **"Boring is good"** - Tool catalog should read like a well-designed API, not marketing copy
2. **Don't rename checkpoint tools** - They're already optimal
3. **Multiple namespaces are OK** if grammar is consistent
4. **Add precision/recall metrics** - Selection rate alone can't detect false positives
5. **Errors as tool results** - `isError: true` lets LLM self-correct
6. **No made-up annotations** - Stick to actual MCP spec (no `tags` or `priority` fields)
