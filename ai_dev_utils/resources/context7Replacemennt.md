This is a great use case for SnapBack's "proactive protection" evolution. Let me break down what you actually need and the options:

## What You're Detecting

1. **Dependency cascade risks** - "Installing `library-x@3.0` requires updating `react` from 17→18"
2. **Peer dependency conflicts** - "This library needs `typescript@5.x` but you have `4.9`"
3. **API breaking changes** - "The recommended `useQuery` hook signature changed in v5"
4. **Integration pattern shifts** - "This version requires switching from CommonJS to ESM"

## Achievable Without Context7

### 1. Dependency Cascade Detection (npm registry API - free)

```typescript
// Fetch package metadata including peer deps
const getPackageInfo = async (pkg: string, version?: string) => {
  const url = version
    ? `https://registry.npmjs.org/${pkg}/${version}`
    : `https://registry.npmjs.org/${pkg}/latest`;
  return fetch(url).then(r => r.json());
};

// Check if installation would force upgrades
async function detectCascade(
  recommended: string,
  currentDeps: Record<string, string>
): Promise<CascadeRisk[]> {
  const info = await getPackageInfo(recommended);
  const risks: CascadeRisk[] = [];

  // Check peer dependencies
  for (const [peer, required] of Object.entries(info.peerDependencies || {})) {
    if (currentDeps[peer] && !semver.satisfies(currentDeps[peer], required)) {
      risks.push({
        type: 'peer-dependency-conflict',
        package: peer,
        current: currentDeps[peer],
        required: required as string,
        severity: 'high'
      });
    }
  }

  // Check engines (node version, etc.)
  if (info.engines?.node && !semver.satisfies(process.version, info.engines.node)) {
    risks.push({
      type: 'engine-mismatch',
      engine: 'node',
      current: process.version,
      required: info.engines.node,
      severity: 'critical'
    });
  }

  return risks;
}
```

### 2. Breaking Change Detection via Changelogs (GitHub API - free tier)

```typescript
// Fetch CHANGELOG or releases for breaking change keywords
async function detectBreakingChanges(pkg: string, fromVersion: string, toVersion: string) {
  // Get repo from package.json repository field
  const pkgInfo = await getPackageInfo(pkg);
  const repoUrl = pkgInfo.repository?.url; // e.g., "git+https://github.com/org/repo.git"

  if (!repoUrl) return { unknown: true };

  const [owner, repo] = parseGitHubUrl(repoUrl);

  // Fetch releases between versions
  const releases = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases`
  ).then(r => r.json());

  const relevantReleases = releases.filter(r =>
    semver.gt(r.tag_name.replace('v', ''), fromVersion) &&
    semver.lte(r.tag_name.replace('v', ''), toVersion)
  );

  // Scan for breaking change indicators
  const breakingPatterns = [
    /BREAKING CHANGE/i,
    /\[BREAKING\]/i,
    /⚠️.*breaking/i,
    /removed.*deprecated/i,
    /migration required/i
  ];

  return relevantReleases.map(release => ({
    version: release.tag_name,
    hasBreakingChanges: breakingPatterns.some(p => p.test(release.body)),
    body: release.body
  }));
}
```

### 3. API Signature Changes (AST-based - local)

```typescript
// For TypeScript projects, compare .d.ts files between versions
import ts from 'typescript';

async function compareAPISignatures(pkg: string, fromV: string, toV: string) {
  // Download type definitions from unpkg or jsDelivr
  const oldTypes = await fetch(`https://unpkg.com/${pkg}@${fromV}/dist/index.d.ts`).then(r => r.text());
  const newTypes = await fetch(`https://unpkg.com/${pkg}@${toV}/dist/index.d.ts`).then(r => r.text());

  const oldExports = extractExports(oldTypes);
  const newExports = extractExports(newTypes);

  return {
    removed: oldExports.filter(e => !newExports.includes(e)),
    added: newExports.filter(e => !oldExports.includes(e)),
    // Signature changes require deeper AST comparison
  };
}

function extractExports(dts: string): string[] {
  const sourceFile = ts.createSourceFile('index.d.ts', dts, ts.ScriptTarget.Latest);
  const exports: string[] = [];

  ts.forEachChild(sourceFile, node => {
    if (ts.isExportDeclaration(node) ||
        (ts.isVariableStatement(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword))) {
      // Extract export names
    }
  });

  return exports;
}
```

## Where Context7 Adds Unique Value

The gap that's hard to fill without Context7 or similar:

| Scenario | DIY Approach | Limitation |
|----------|--------------|------------|
| "useQuery changed from v4 to v5" | Compare .d.ts exports | Tells you *what* changed, not *how to migrate* |
| "React 18 requires new root API" | Detect peer dep bump | Doesn't explain the pattern shift |
| "Next.js App Router vs Pages" | Changelog keywords | Can't validate code against correct patterns |

**Context7 fills the "semantic understanding" gap** - knowing that `ReactDOM.render()` → `createRoot().render()` isn't just an API change but a fundamental pattern shift.

## Pragmatic Recommendation

**Build a hybrid approach:**

```
┌─────────────────────────────────────────────────────────────┐
│                 AI Recommendation Validator                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: Dependency Analysis (100% local/free)             │
│  ├── Peer dependency conflicts (npm registry)               │
│  ├── Engine requirements (node, npm versions)               │
│  └── Semver range satisfaction                              │
│                                                             │
│  Layer 2: Breaking Change Detection (GitHub API - free)     │
│  ├── Changelog/release scanning                             │
│  ├── .d.ts signature diff                                   │
│  └── Keyword pattern matching                               │
│                                                             │
│  Layer 3: Semantic Validation (Context7 - only if needed)   │
│  └── "Is this code pattern valid for this version?"         │
│      (Call only when Layers 1-2 flag potential issues)      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Implementation priority:**
1. **Now (S effort)**: Layers 1-2 cover 80% of cases with zero external API dependency
2. **Later (M effort)**: Add Context7 as a "deep validation" tier for flagged recommendations
3. **Future (L effort)**: Build your own documentation index for key libraries (competitive moat)

## Quick Win: Integrate with Your Existing Risk Analysis

You already have `snapback.analyze_risk` and `snapback.check_dependencies`. Extend them:

```typescript
// In your MCP tool handler
case 'snapback.validate_recommendation':
  const { packageName, targetVersion, currentPackageJson } = args;

  // Layer 1: Dependency cascade
  const cascadeRisks = await detectCascade(
    `${packageName}@${targetVersion}`,
    currentPackageJson.dependencies
  );

  // Layer 2: Breaking changes
  const currentVersion = currentPackageJson.dependencies[packageName];
  const breakingChanges = currentVersion
    ? await detectBreakingChanges(packageName, currentVersion, targetVersion)
    : null;

  // Layer 3: Only call Context7 if layers 1-2 found issues
  let migrationGuidance = null;
  if (cascadeRisks.length > 0 || breakingChanges?.some(b => b.hasBreakingChanges)) {
    migrationGuidance = await context7Service.getLibraryDocs(
      packageName,
      `migration from ${currentVersion} to ${targetVersion}`
    );
  }

  return {
    safe: cascadeRisks.length === 0 && !breakingChanges?.some(b => b.hasBreakingChanges),
    risks: cascadeRisks,
    breakingChanges,
    migrationGuidance
  };
```

This gives you the "AI said to install X, here's what would break" feature without being dependent on Context7 for the core logic. Want me to spec out the full implementation?
