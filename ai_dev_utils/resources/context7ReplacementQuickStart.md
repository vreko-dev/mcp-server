# Context7 Replacement - Quick Start Guide

## Installation

```bash
# Install dependencies (adds semver)
cd apps/mcp-server
pnpm install

# Build the service
pnpm build

# Run tests
pnpm test test/unit/services/HybridDocService.test.ts
```

## Environment Setup (Optional)

```bash
# .env.local (optional - defaults work fine)
NPM_REGISTRY_URL=https://registry.npmjs.org
GITHUB_API_URL=https://api.github.com
GITHUB_TOKEN=ghp_your_token_here  # Increases rate limit from 60 to 5000/hr
HYBRID_DOC_CACHE_TTL=3600  # 1 hour cache
```

## Usage in MCP Tool Handlers

### Before (Context7)
```typescript
// OLD approach
const libraryId = await context7Service.resolveLibraryId("react");
const docs = await context7Service.getLibraryDocs(libraryId);
```

### After (Hybrid)
```typescript
import { validateRecommendation } from "./tools/validate-recommendation.js";

// NEW approach - all-in-one validation
const result = await validateRecommendation({
  packageName: "react",
  targetVersion: "18.2.0",
  currentPackageJson: {
    dependencies: {
      "react": "^17.0.2"
    }
  },
  context: {
    aiAssistant: "Cursor",
    recommendationReason: "User requested upgrade"
  }
}, storage);

// Returns structured result
console.log(result.summary);
// "⚠️ REVIEW REQUIRED: Potential breaking changes in react@18.2.0"

console.log(result.recommendation);
// "review-required" | "proceed" | "block"

console.log(result.risks);
// [{ type: "peer-dependency-conflict", package: "react-dom", ... }]
```

## MCP Tool Registration

The new tool is already registered in `tool-definitions-v2.ts`:

```typescript
{
  name: "snapback.validate_recommendation",
  tier: "free",
  requiresBackend: false
}
```

AI assistants can call it like:
```json
{
  "tool": "snapback.validate_recommendation",
  "arguments": {
    "packageName": "lodash",
    "targetVersion": "5.0.0",
    "currentPackageJson": { ... }
  }
}
```

## Response Format

```typescript
{
  safe: boolean;                    // Quick safety check
  recommendation: string;           // "proceed" | "review-required" | "block"
  summary: string;                  // Human-readable summary with emoji

  // Detailed analysis
  risks: Array<{
    type: "peer-dependency-conflict" | "engine-mismatch" | "semver-violation";
    package: string;
    current: string;
    required: string;
    severity: "critical" | "high" | "medium" | "low";
    recommendation: string;
  }>;

  breakingChanges: Array<{
    version: string;
    hasBreakingChanges: boolean;
    changelog: string;
    keywords: string[];
  }>;

  migrationGuidance: string | null;  // Structured migration steps
  layersExecuted: string[];          // Which validation layers ran

  // MCP next_actions for tool chaining
  next_actions: Array<{
    tool: string;
    priority: number;
    reason: string;
  }>;
}
```

## Example Responses

### Safe Installation
```json
{
  "safe": true,
  "recommendation": "proceed",
  "summary": "✅ Safe to install lodash@4.17.21",
  "risks": [],
  "breakingChanges": [],
  "migrationGuidance": null,
  "layersExecuted": ["dependency-cascade"]
}
```

### Review Required
```json
{
  "safe": false,
  "recommendation": "review-required",
  "summary": "⚠️ REVIEW REQUIRED: Potential breaking changes in react@18.2.0",
  "risks": [
    {
      "type": "peer-dependency-conflict",
      "package": "react-dom",
      "current": "^17.0.2",
      "required": "^18.2.0",
      "severity": "high",
      "recommendation": "Update react-dom to ^18.2.0 alongside react"
    }
  ],
  "breakingChanges": [
    {
      "version": "18.0.0",
      "hasBreakingChanges": true,
      "changelog": "BREAKING CHANGE: New concurrent rendering...",
      "keywords": ["breaking", "concurrent", "migration"]
    }
  ],
  "migrationGuidance": "Migration required for react: 17.0.2 → 18.2.0\n\nDetected changes:\n- Version 18.0.0: BREAKING CHANGES detected\n  Keywords: breaking, concurrent, migration\n\nRecommendations:\n1. Review changelog before upgrading\n2. Test in development environment\n3. Update usage patterns if needed",
  "layersExecuted": ["dependency-cascade", "breaking-changes", "semantic-validation"]
}
```

### Blocked Installation
```json
{
  "safe": false,
  "recommendation": "block",
  "summary": "🛑 BLOCKED: Critical issues detected with package@5.0.0",
  "risks": [
    {
      "type": "engine-mismatch",
      "package": "node",
      "current": "v18.17.0",
      "required": ">=20.0.0",
      "severity": "critical",
      "recommendation": "Upgrade Node.js to >=20.0.0"
    }
  ],
  "breakingChanges": [...],
  "migrationGuidance": "...",
  "layersExecuted": ["dependency-cascade", "breaking-changes", "semantic-validation"]
}
```

## Integration with Existing Tools

### Check Dependencies Tool
The existing `snapback.validate_dependencies` tool can now call the hybrid service:

```typescript
// Enhanced dependency checker
import { HybridDocService } from "../services/HybridDocService.js";

export async function checkDependencies(input: DependencyCheckInput) {
  const hybridService = new HybridDocService(storage);

  // For each new/updated dependency
  for (const dep of input.added.concat(input.updated)) {
    const validation = await hybridService.validateRecommendation(
      dep.name,
      dep.versionAfter,
      input.currentDependencies
    );

    // Merge results
    result.risks.push(...validation.risks);
    result.breakingChanges.push(...validation.breakingChanges);
  }

  return result;
}
```

## Performance Optimization

### Caching Strategy
```typescript
// First call: ~500ms (npm + GitHub APIs)
const result1 = await validateRecommendation({...});

// Subsequent calls (within 1 hour): ~10ms (cached)
const result2 = await validateRecommendation({...}); // Same package/version
```

### Rate Limits
| API | Anonymous | Authenticated |
|-----|-----------|---------------|
| npm registry | Unlimited | Unlimited |
| GitHub | 60/hr | 5000/hr |

**Recommendation:** Set `GITHUB_TOKEN` for production use.

## Troubleshooting

### Issue: "Network error" when fetching package metadata
**Solution:** Check npm registry connectivity
```bash
curl https://registry.npmjs.org/react/latest
```

### Issue: GitHub rate limit exceeded
**Solution:** Add GitHub token to `.env.local`
```bash
GITHUB_TOKEN=ghp_your_token_here
```

### Issue: Tests failing with "fetch is not defined"
**Solution:** Tests mock `global.fetch` - ensure vitest is configured correctly
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node'
  }
});
```

## Migration Checklist

- [x] Install semver dependency
- [x] Create HybridDocService
- [x] Create validate-recommendation tool
- [x] Add tool to definitions
- [x] Write comprehensive tests
- [x] Update documentation
- [ ] Deploy to production
- [ ] Monitor metrics (cache hit rate, API errors)
- [ ] Optional: Mark old ctx7.* tools as deprecated

## Next Steps

1. **Run tests:** `pnpm test`
2. **Build service:** `pnpm build`
3. **Test with MCP client:** Use Claude Desktop or other MCP client
4. **Monitor usage:** Check logs for `hybrid_doc.layer_*` metrics
5. **Iterate:** Add AST-based type diff (Phase 2) if needed

## Support

- **Documentation:** See `context7Replacement.md` for full details
- **Issues:** Check test output for detailed error messages
- **Metrics:** Monitor `hybrid_doc.*` telemetry events
- **Performance:** Cache hit rate should be >80% in production

---

**Implementation Date:** 2025-12-23
**Status:** ✅ Complete and tested
**Backward Compatible:** Yes (old ctx7.* tools still work)
