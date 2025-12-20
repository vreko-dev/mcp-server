# Codebase MCP Server

Self-learning pair programmer context tools with **prompt caching** for 90% cost reduction.

## Tools Available

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `codebase:get_context` | Get architectural context | **BEFORE any implementation** |
| `codebase:check_patterns` | Validate code against patterns | **BEFORE committing** |
| `codebase:report_violation` | Report a mistake for learning | **AFTER making mistakes** |
| `codebase:query_learnings` | Search past learnings | When looking for patterns |
| `codebase:get_violations_summary` | See violation statistics | Check system health |
| `codebase:record_learning` | Capture new patterns | **AFTER completing tasks** |
| **`codebase:ask_ai`** ✨ | **Query with cached context** | **90% cost savings via prompt caching** |

## Setup

```bash
cd ai_dev_utils/mcp
pnpm install --ignore-workspace
```

## Configuration

### Cursor / Claude Desktop

Add to `~/.cursor/mcp.json` or Claude Desktop config:

```json
{
  "mcpServers": {
    "codebase": {
      "command": "pnpm",
      "args": ["--dir", "/path/to/SnapBack-Site/ai_dev_utils/mcp", "start"],
      "env": {
        "ANTHROPIC_API_KEY": "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"
      }
    }
  }
}
```

**Required for `ask_ai` tool:** Set `ANTHROPIC_API_KEY` to enable prompt caching.

### Verification

After restarting, tools should appear as:
- `codebase:get_context`
- `codebase:check_patterns`
- etc.

## Usage Flow

```
1. Start task
   └── codebase:get_context({ task: "...", files: [...] })

2. Before commit
   └── codebase:check_patterns({ code: "...", filePath: "..." })

3. If mistake made
   └── codebase:report_violation({ type: "...", ... })

4. After task complete
   └── codebase:record_learning({ type: "pattern", ... })
```

## Data Files

| File | Purpose |
|------|---------|
| `patterns/violations.jsonl` | All tracked violations |
| `patterns/codebase-patterns.md` | Promoted patterns (3x+ violations) |
| `feedback/learnings.jsonl` | Session learnings |
| `ARCHITECTURE.md` | System boundaries |
| `CONSTRAINTS.md` | Hard rules |

## Prompt Caching (✨ NEW)

Implements **Multiplier 1** from [unified_context_system.md](../resources/unified_context_system.md):

### Cost Impact
- **Without caching:** $600/day (500 requests)
- **With caching:** $65/day
- **Savings:** $16,050/month (89%)

### How It Works
1. Static context (ARCHITECTURE, PATTERNS, CONSTRAINTS) loaded once
2. Anthropic `cache_control` caches context for 5 minutes
3. First call: cache MISS (full cost)
4. Subsequent calls: cache HIT (90% cheaper)

### Usage
```typescript
// First call - creates cache
codebase.ask_ai({
  query: "Should I use @snapback/core in the VSCode extension?"
})
// Returns: cacheInfo: "📤 Cache MISS - context cached for next 5 minutes"

// Second call (within 5 min) - reads from cache
codebase.ask_ai({
  query: "What are layer boundary rules?"
})
// Returns: cacheInfo: "✅ Cache HIT - 90% cost savings!"
```

### Testing
```bash
ANTHROPIC_API_KEY=your-key pnpm test:cache
```

## Next Steps (Roadmap)

- ✅ **Multiplier 1:** Prompt Caching (90% cost reduction) **← COMPLETE**
- ⏳ **Multiplier 2:** Context Compression (88% token reduction)
- ⏳ **Multiplier 3:** Validation Pipeline (7-layer checks)
- ⏳ **Multiplier 4:** Learning Engine (60% → 95% accuracy)
- ⏳ **Multiplier 5:** Context Versioning
