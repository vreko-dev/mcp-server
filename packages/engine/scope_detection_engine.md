# Snapshot Scope Decision Engine v2.0

**Status**: Implementation Specification
**Priority**: Core IP / Competitive Moat
**Revision**: 2.0 (incorporates architectural review feedback)
**Date**: December 2025

---

## Vision

> **"Code fearlessly at AI speed."**

The Snapshot Scope Decision Engine is what transforms SnapBack from "automatic backups" into "intelligent protection." It answers the question every developer has when an AI agent is rewriting their code:

*"If this goes wrong, what will I need to recover?"*

The answer isn't static. It depends on:
- What kind of project this is
- What file is being changed
- How that file connects to everything else
- What this specific AI tool tends to get wrong
- What this specific developer tends to need
- What we've learned from millions of AI-assisted edits across all users

**Our goal**: Reduce the friction between human intent and AI execution to near-zero. When developers trust that SnapBack will catch them, they can let AI agents work faster, experiment more boldly, and ship with confidence.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Layer 1: Deterministic Analysis](#layer-1-deterministic-analysis)
3. [Layer 2: Heuristic Scoring](#layer-2-heuristic-scoring)
4. [Layer 3: Personalization & Learning](#layer-3-personalization--learning)
5. [Specific Scenario Handling](#specific-scenario-handling)
6. [Telemetry & Feedback](#telemetry--feedback)
7. [Privacy Architecture](#privacy-architecture)
8. [Performance & Caching](#performance--caching)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Success Metrics](#success-metrics)

---

## Architecture Overview

### Three-Layer Decision Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SNAPSHOT SCOPE DECISION ENGINE v2                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ LAYER 1: DETERMINISTIC ANALYSIS                                        │ │
│  │ Location: Client (Extension)  |  Tier: Free  |  Latency: <50ms        │ │
│  │                                                                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │ │
│  │  │ Repo Type    │  │ File         │  │ Dependency   │  │ Critical   │ │ │
│  │  │ Detection    │  │ Classification│  │ Graph        │  │ Path       │ │ │
│  │  │              │  │              │  │ Analysis     │  │ Distance   │ │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │ │
│  │         │                 │                 │                │        │ │
│  └─────────┼─────────────────┼─────────────────┼────────────────┼────────┘ │
│            │                 │                 │                │          │
│            ▼                 ▼                 ▼                ▼          │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ LAYER 2: HEURISTIC SCORING                                             │ │
│  │ Location: Client (Extension)  |  Tier: Free  |  Latency: <10ms        │ │
│  │                                                                        │ │
│  │  Inputs:                          Scoring Function:                    │ │
│  │  • File category risk             score = Σ(wᵢ × fᵢ)                   │ │
│  │  • Blast radius (calibrated)      where weights are tunable            │ │
│  │  • AI tool × file type risk                                            │ │
│  │  • Change magnitude               Output:                              │ │
│  │  • Session coherence              • Strategy (SINGLE → SESSION)        │ │
│  │  • Temporal risk                  • Files to include                   │ │
│  │  • Critical path distance         • Confidence score                   │ │
│  │                                   • Reasoning (explainable)            │ │
│  └─────────────────────────────────────┬──────────────────────────────────┘ │
│                                        │                                    │
│            ┌───────────────────────────┼───────────────────────────┐        │
│            │                           │                           │        │
│            ▼                           ▼                           ▼        │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ LAYER 3: PERSONALIZATION & LEARNING                                    │ │
│  │ Location: Server (API)  |  Tier: Pro  |  Latency: <100ms              │ │
│  │                                                                        │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │ │
│  │  │ User Profile    │  │ Aggregate       │  │ Feedback Loop           │ │ │
│  │  │ • Rollback rate │  │ Insights        │  │ • Explicit (👍/👎)      │ │ │
│  │  │ • Tool patterns │  │ • Optimal       │  │ • Implicit (restore     │ │ │
│  │  │ • Time patterns │  │   weights       │  │   behavior)             │ │ │
│  │  │ • Weight adj.   │  │ • Risk matrices │  │ • Ground truth labels   │ │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │ │
│  │                                                                        │ │
│  │  Weight Blending:                                                      │ │
│  │  final = DEFAULT × 0.2 + AGGREGATE × 0.3 + USER_SPECIFIC × 0.5        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Decision Flow

```typescript
async function decideSnapshotScope(
  event: FileChangeEvent
): Promise<ScopeDecision> {
  // Layer 1: Deterministic (always runs, local)
  const repoContext = await detectRepoType(event.workspaceRoot);
  const fileClass = classifyFile(event.filePath, repoContext);
  const depGraph = await getDependencyGraph(event.workspaceRoot); // cached
  const criticalPath = calculateCriticalPathDistance(event.filePath, depGraph);

  // Layer 2: Heuristic Scoring (always runs, local)
  const weights = await getWeights(event.userId); // may fetch from server
  const score = calculateScore({
    fileClass,
    depGraph,
    criticalPath,
    aiContext: event.aiDetection,
    sessionContext: event.session,
    weights
  });

  // Map score to strategy
  let decision = mapScoreToStrategy(score, fileClass, repoContext);

  // Layer 3: Personalization adjustments (Pro tier, server-enhanced)
  if (await isPro(event.userId)) {
    decision = await enhanceWithPersonalization(decision, event);
  }

  // Track for learning (async, non-blocking)
  trackDecision(decision, event).catch(log);

  return decision;
}
```

---

## Layer 1: Deterministic Analysis

### 1.1 Repository Type Detection

The first decision: **what kind of codebase is this?**

```typescript
interface RepoContext {
  type: 'single' | 'monorepo' | 'turborepo';
  rootPath: string;

  // For monorepos
  workspaces: WorkspaceInfo[];

  // Entry points (main files that start the app)
  entryPoints: string[];

  // Build tool detection
  buildTool: 'vite' | 'webpack' | 'esbuild' | 'rollup' | 'turbopack' | 'none';
}

interface WorkspaceInfo {
  name: string;
  path: string;
  type: 'app' | 'package' | 'config';
  dependents: string[];    // Other workspaces that depend on this
  dependencies: string[];  // Workspaces this depends on
}

async function detectRepoType(workspaceRoot: string): Promise<RepoContext> {
  // Check for turbo.json first (Turborepo is specific)
  if (await exists(join(workspaceRoot, 'turbo.json'))) {
    return await analyzeTurborepo(workspaceRoot);
  }

  // Check for pnpm-workspace.yaml or lerna.json
  if (await exists(join(workspaceRoot, 'pnpm-workspace.yaml')) ||
      await exists(join(workspaceRoot, 'lerna.json'))) {
    return await analyzeMonorepo(workspaceRoot);
  }

  // Check package.json for workspaces field
  const pkg = await readJson(join(workspaceRoot, 'package.json'));
  if (pkg.workspaces) {
    return await analyzeMonorepo(workspaceRoot);
  }

  // Single repo
  return {
    type: 'single',
    rootPath: workspaceRoot,
    workspaces: [],
    entryPoints: await findEntryPoints(workspaceRoot),
    buildTool: await detectBuildTool(workspaceRoot)
  };
}

async function analyzeTurborepo(root: string): Promise<RepoContext> {
  const turboConfig = await readJson(join(root, 'turbo.json'));
  const workspaceGlobs = await getWorkspaceGlobs(root);
  const workspaces: WorkspaceInfo[] = [];

  for (const glob of workspaceGlobs) {
    const dirs = await fg(glob, { onlyDirectories: true, cwd: root });
    for (const dir of dirs) {
      const pkg = await readJson(join(root, dir, 'package.json'));
      workspaces.push({
        name: pkg.name,
        path: dir,
        type: inferWorkspaceType(dir, pkg),
        dependents: [],      // Populated below
        dependencies: []     // Populated below
      });
    }
  }

  // Build dependency graph between workspaces
  await populateWorkspaceDependencies(workspaces, root);

  return {
    type: 'turborepo',
    rootPath: root,
    workspaces,
    entryPoints: workspaces
      .filter(w => w.type === 'app')
      .flatMap(w => findEntryPoints(join(root, w.path))),
    buildTool: 'turbopack'
  };
}
```

### 1.2 File Classification

Every file gets classified into a category with a base risk score:

```typescript
enum FileCategory {
  // Config files (highest risk - affect everything)
  ROOT_CONFIG = 'root_config',           // package.json, tsconfig.json at root
  BUILD_CONFIG = 'build_config',         // vite.config.ts, webpack.config.js
  ENV_CONFIG = 'env_config',             // .env files, environment configs
  WORKSPACE_CONFIG = 'workspace_config', // Workspace-level package.json, tsconfig

  // Core code (high risk - wide blast radius)
  ENTRY_POINT = 'entry_point',           // main.ts, index.ts, app.tsx
  SHARED_EXPORT = 'shared_export',       // Files that export to many consumers
  TYPE_DEFINITION = 'type_definition',   // .d.ts files, shared types

  // Domain code (medium risk)
  DOMAIN_LOGIC = 'domain_logic',         // Business logic, services
  COMPONENT = 'component',               // UI components
  HOOK = 'hook',                         // React hooks
  UTILITY = 'utility',                   // Helper functions

  // Support code (lower risk)
  TEST_FILE = 'test_file',               // *.test.ts, *.spec.ts
  STYLE = 'style',                       // CSS, SCSS, styled-components
  ASSET = 'asset',                       // Images, fonts, static files
  DOCUMENTATION = 'documentation'        // README, docs
}

// Base risk scores (0-100) - learned from aggregate data
const CATEGORY_BASE_RISK: Record<FileCategory, number> = {
  [FileCategory.ROOT_CONFIG]: 90,
  [FileCategory.BUILD_CONFIG]: 85,
  [FileCategory.ENV_CONFIG]: 80,
  [FileCategory.WORKSPACE_CONFIG]: 75,
  [FileCategory.ENTRY_POINT]: 70,
  [FileCategory.SHARED_EXPORT]: 65,
  [FileCategory.TYPE_DEFINITION]: 60,
  [FileCategory.DOMAIN_LOGIC]: 55,
  [FileCategory.HOOK]: 55,
  [FileCategory.COMPONENT]: 50,
  [FileCategory.UTILITY]: 45,
  [FileCategory.TEST_FILE]: 20,
  [FileCategory.STYLE]: 30,
  [FileCategory.ASSET]: 15,
  [FileCategory.DOCUMENTATION]: 10
};

interface FileClassification {
  category: FileCategory;
  baseRisk: number;
  filePath: string;
  packageScope: string | null;  // Which workspace package this belongs to

  // Import analysis
  importedByCount: number;
  importsCount: number;
  isExported: boolean;          // Does it export things?
  exportCount: number;          // How many exports?
}

function classifyFile(filePath: string, repoContext: RepoContext): FileClassification {
  const filename = basename(filePath);
  const dir = dirname(filePath);
  const ext = extname(filePath);

  // Priority 1: Root configs
  if (isRootConfig(filePath, repoContext)) {
    return {
      category: FileCategory.ROOT_CONFIG,
      baseRisk: CATEGORY_BASE_RISK[FileCategory.ROOT_CONFIG],
      filePath,
      packageScope: null,
      // ... other fields
    };
  }

  // Priority 2: Build configs
  if (isBuildConfig(filename)) {
    return {
      category: FileCategory.BUILD_CONFIG,
      baseRisk: CATEGORY_BASE_RISK[FileCategory.BUILD_CONFIG],
      // ...
    };
  }

  // Priority 3: Entry points
  if (isEntryPoint(filePath, repoContext)) {
    return {
      category: FileCategory.ENTRY_POINT,
      baseRisk: CATEGORY_BASE_RISK[FileCategory.ENTRY_POINT],
      // ...
    };
  }

  // ... continue classification logic

  // Default to domain logic for .ts/.tsx files
  if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
    return {
      category: FileCategory.DOMAIN_LOGIC,
      baseRisk: CATEGORY_BASE_RISK[FileCategory.DOMAIN_LOGIC],
      // ...
    };
  }

  return {
    category: FileCategory.ASSET,
    baseRisk: CATEGORY_BASE_RISK[FileCategory.ASSET],
    // ...
  };
}
```

### 1.3 Dependency Graph Analysis

Using `madge` for dependency graph analysis with caching:

```typescript
interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Map<string, Set<string>>;  // file → files it imports
  reverseEdges: Map<string, Set<string>>;  // file → files that import it
}

interface DependencyNode {
  filePath: string;
  imports: string[];           // Files this imports
  importedBy: string[];        // Files that import this
  transitiveImporters: {
    depth1: string[];          // Direct importers
    depth2: string[];          // Importers of importers
    depth3Plus: string[];      // Deeper dependencies
  };
  crossPackageImports: string[];  // Imports from other packages (monorepo)
}

// Cache dependency graph with TTL
const depGraphCache = new Map<string, {
  graph: DependencyGraph;
  computedAt: number;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getDependencyGraph(workspaceRoot: string): Promise<DependencyGraph> {
  const cached = depGraphCache.get(workspaceRoot);
  if (cached && Date.now() - cached.computedAt < CACHE_TTL) {
    return cached.graph;
  }

  // Use madge to analyze dependencies
  const result = await madge(workspaceRoot, {
    fileExtensions: ['ts', 'tsx', 'js', 'jsx'],
    excludeRegExp: [/node_modules/, /\.test\./, /\.spec\./]
  });

  const graph = buildDependencyGraph(result);
  depGraphCache.set(workspaceRoot, {
    graph,
    computedAt: Date.now()
  });

  return graph;
}

function buildDependencyGraph(madgeResult: MadgeResult): DependencyGraph {
  const nodes = new Map<string, DependencyNode>();
  const edges = new Map<string, Set<string>>();
  const reverseEdges = new Map<string, Set<string>>();

  // Build forward edges
  const deps = madgeResult.obj();
  for (const [file, imports] of Object.entries(deps)) {
    edges.set(file, new Set(imports));
    for (const imported of imports) {
      if (!reverseEdges.has(imported)) {
        reverseEdges.set(imported, new Set());
      }
      reverseEdges.get(imported)!.add(file);
    }
  }

  // Build nodes with transitive importers
  for (const file of edges.keys()) {
    const importedBy = reverseEdges.get(file) ?? new Set();
    const depth1 = [...importedBy];

    const depth2 = new Set<string>();
    for (const d1 of depth1) {
      const d1Importers = reverseEdges.get(d1) ?? new Set();
      for (const d2 of d1Importers) {
        if (d2 !== file && !depth1.includes(d2)) {
          depth2.add(d2);
        }
      }
    }

    const depth3Plus = new Set<string>();
    // Could continue for deeper analysis, but 2 levels is usually sufficient

    nodes.set(file, {
      filePath: file,
      imports: [...(edges.get(file) ?? [])],
      importedBy: depth1,
      transitiveImporters: {
        depth1,
        depth2: [...depth2],
        depth3Plus: [...depth3Plus]
      },
      crossPackageImports: identifyCrossPackageImports(file, [...(edges.get(file) ?? [])])
    });
  }

  return { nodes, edges, reverseEdges };
}
```

### 1.4 Critical Path Distance

Calculate how close a file is to the app's entry points:

```typescript
interface CriticalPathAnalysis {
  distanceToNearestEntry: number;  // -1 if not reachable
  entryPointsReached: string[];
  isOnCriticalPath: boolean;       // True if distance <= 2
  criticalPathScore: number;       // 0-100 based on distance
}

function calculateCriticalPathDistance(
  filePath: string,
  depGraph: DependencyGraph
): CriticalPathAnalysis {
  const entryPoints = identifyEntryPoints(depGraph);

  let minDistance = Infinity;
  const entryPointsReached: string[] = [];

  // BFS from the file to find distance to entry points
  for (const entry of entryPoints) {
    const distance = bfsDistance(filePath, entry, depGraph);
    if (distance >= 0) {
      entryPointsReached.push(entry);
      minDistance = Math.min(minDistance, distance);
    }
  }

  // If file can reach an entry point, also check if entry can reach file
  // (bidirectional - both import paths and export paths matter)
  for (const entry of entryPoints) {
    const reverseDistance = bfsDistance(entry, filePath, depGraph);
    if (reverseDistance >= 0) {
      if (!entryPointsReached.includes(entry)) {
        entryPointsReached.push(entry);
      }
      minDistance = Math.min(minDistance, reverseDistance);
    }
  }

  const distance = minDistance === Infinity ? -1 : minDistance;

  // Score based on distance (closer = higher risk)
  let criticalPathScore: number;
  if (distance === -1) {
    criticalPathScore = 10;  // Orphan file - low risk
  } else if (distance === 0) {
    criticalPathScore = 100; // IS an entry point
  } else if (distance === 1) {
    criticalPathScore = 80;  // Direct import by entry
  } else if (distance === 2) {
    criticalPathScore = 60;  // 2 hops from entry
  } else if (distance <= 4) {
    criticalPathScore = 40;  // 3-4 hops
  } else {
    criticalPathScore = 20;  // Far from entry points
  }

  return {
    distanceToNearestEntry: distance,
    entryPointsReached,
    isOnCriticalPath: distance >= 0 && distance <= 2,
    criticalPathScore
  };
}

function bfsDistance(
  from: string,
  to: string,
  depGraph: DependencyGraph
): number {
  if (from === to) return 0;

  const visited = new Set<string>();
  const queue: Array<{ file: string; depth: number }> = [{ file: from, depth: 0 }];

  while (queue.length > 0) {
    const { file, depth } = queue.shift()!;

    if (visited.has(file)) continue;
    visited.add(file);

    const node = depGraph.nodes.get(file);
    if (!node) continue;

    for (const imported of node.imports) {
      if (imported === to) return depth + 1;
      if (!visited.has(imported)) {
        queue.push({ file: imported, depth: depth + 1 });
      }
    }
  }

  return -1; // Not reachable
}
```

### 1.5 Config File Special Handling

Config files need explicit blast radius rules because they don't follow import graphs:

```typescript
interface ConfigBlastRadius {
  scope: 'file' | 'package' | 'workspace' | 'extends-chain' | 'env-consumers';
  affectedFiles: string[];
  affectedPackages: string[];
  reasoning: string;
}

const CONFIG_HANDLERS: Record<string, (
  filePath: string,
  repoContext: RepoContext
) => Promise<ConfigBlastRadius>> = {

  // Root package.json affects everything
  'package.json': async (filePath, ctx) => {
    const isRoot = dirname(filePath) === ctx.rootPath;

    if (isRoot && ctx.type !== 'single') {
      // Root package.json in monorepo
      return {
        scope: 'workspace',
        affectedFiles: ctx.entryPoints,
        affectedPackages: ctx.workspaces.map(w => w.name),
        reasoning: 'Root package.json affects all workspace packages'
      };
    } else if (isRoot) {
      // Root package.json in single repo
      return {
        scope: 'workspace',
        affectedFiles: ctx.entryPoints,
        affectedPackages: [],
        reasoning: 'Root package.json affects entire application'
      };
    } else {
      // Workspace package.json
      const pkg = findPackageScope(filePath, ctx);
      const workspace = ctx.workspaces.find(w => w.name === pkg);
      return {
        scope: 'package',
        affectedFiles: await getPackageEntryPoints(pkg!, ctx),
        affectedPackages: workspace?.dependents ?? [],
        reasoning: `Package ${pkg} package.json affects package and its ${workspace?.dependents.length ?? 0} dependents`
      };
    }
  },

  // tsconfig.json uses extends chains
  'tsconfig.json': async (filePath, ctx) => {
    const extending = await findTsconfigExtenders(filePath, ctx);
    const isRoot = dirname(filePath) === ctx.rootPath;

    if (isRoot && ctx.type === 'turborepo') {
      return {
        scope: 'extends-chain',
        affectedFiles: extending.extendingFiles,
        affectedPackages: extending.extendingPackages,
        reasoning: `Root tsconfig extended by ${extending.extendingPackages.length} packages`
      };
    }

    return {
      scope: 'package',
      affectedFiles: await getTypescriptFiles(filePath),
      affectedPackages: [],
      reasoning: 'tsconfig affects all TypeScript files in scope'
    };
  },

  // .env files affect files that read env vars
  '.env': async (filePath, ctx) => {
    const consumers = await findEnvConsumers(ctx.rootPath);
    return {
      scope: 'env-consumers',
      affectedFiles: consumers,
      affectedPackages: [],
      reasoning: `Environment file affects ${consumers.length} files that read process.env`
    };
  },

  // Build tool configs
  'vite.config.ts': async (_, ctx) => ({
    scope: 'workspace',
    affectedFiles: ctx.entryPoints,
    affectedPackages: [],
    reasoning: 'Vite config affects entire build output'
  }),

  'next.config.js': async (_, ctx) => ({
    scope: 'workspace',
    affectedFiles: ctx.entryPoints,
    affectedPackages: [],
    reasoning: 'Next.js config affects entire application'
  }),

  'turbo.json': async (_, ctx) => ({
    scope: 'workspace',
    affectedFiles: ctx.entryPoints,
    affectedPackages: ctx.workspaces.map(w => w.name),
    reasoning: 'Turbo config affects all workspace tasks'
  })
};

async function findEnvConsumers(workspaceRoot: string): Promise<string[]> {
  // Find all files that reference process.env
  const patterns = [
    /process\.env\./,
    /import\.meta\.env\./,
    /\$env\//  // SvelteKit
  ];

  const sourceFiles = await fg('**/*.{ts,tsx,js,jsx}', {
    cwd: workspaceRoot,
    ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*']
  });

  const consumers: string[] = [];

  for (const file of sourceFiles) {
    const content = await readFile(join(workspaceRoot, file), 'utf-8');
    if (patterns.some(p => p.test(content))) {
      consumers.push(file);
    }
  }

  return consumers;
}
```

---

## Layer 2: Heuristic Scoring

### 2.1 Scoring Factors

```typescript
interface ScoringInput {
  // From Layer 1
  fileClassification: FileClassification;
  dependencyContext: DependencyNode;
  criticalPath: CriticalPathAnalysis;
  configBlastRadius?: ConfigBlastRadius;
  repoContext: RepoContext;

  // From AI Detection
  aiDetection: {
    detected: boolean;
    tool: 'cursor' | 'copilot' | 'claude' | 'windsurf' | 'aider' | 'unknown';
    confidence: number;           // 0-1
    editType: 'completion' | 'chat' | 'agent' | 'unknown';
  };

  // From Change Analysis
  changeMetrics: {
    linesAdded: number;
    linesDeleted: number;
    linesModified: number;
    isStructuralChange: boolean;  // Added/removed exports, changed signatures
  };

  // From Session Context
  session: {
    id: string;
    startedAt: number;
    files: SessionFile[];
    changeVelocity: number;       // Changes per minute
  };

  // Temporal
  temporal: {
    timestamp: number;
    hourOfDay: number;
    dayOfWeek: number;
    timeSinceLastSnapshot: number;
  };
}

interface SessionFile {
  path: string;
  category: FileCategory;
  changeCount: number;
  lastChangedAt: number;
}

interface ScoringOutput {
  totalScore: number;             // 0-100

  // Individual factor scores (for explainability)
  factors: {
    categoryRisk: { score: number; weight: number; raw: number };
    blastRadius: { score: number; weight: number; raw: number };
    aiToolRisk: { score: number; weight: number; raw: number };
    changeMagnitude: { score: number; weight: number; raw: number };
    sessionCoherence: { score: number; weight: number; raw: number };
    temporalRisk: { score: number; weight: number; raw: number };
    criticalPath: { score: number; weight: number; raw: number };
  };

  // Explainability
  reasoning: string[];
  confidence: number;             // 0-1, how confident we are in this score
}
```

### 2.2 Calibrated Blast Radius Calculation

**Key insight**: Linear weighting doesn't match reality. We use logarithmic scaling and importer-type weighting.

```typescript
function calculateBlastRadius(
  fileClass: FileClassification,
  depNode: DependencyNode,
  configRadius?: ConfigBlastRadius
): { score: number; reasoning: string[] } {
  const reasoning: string[] = [];

  // Config files use special handling
  if (configRadius) {
    const configScore = calculateConfigBlastRadius(configRadius);
    reasoning.push(configRadius.reasoning);
    return { score: configScore, reasoning };
  }

  // Logarithmic scaling for import count (diminishing returns)
  // 1 importer = 10, 10 importers = 33, 100 importers = 67
  const directImportScore = Math.min(50,
    Math.log10(depNode.importedBy.length + 1) * 33
  );

  // Weight importers by their type (entry points matter more)
  let importerTypeBonus = 0;
  for (const importer of depNode.importedBy) {
    const importerClass = classifyFile(importer, {} as RepoContext); // Simplified
    if (importerClass.category === FileCategory.ENTRY_POINT) {
      importerTypeBonus += 15;
    } else if (importerClass.category === FileCategory.SHARED_EXPORT) {
      importerTypeBonus += 10;
    }
  }
  importerTypeBonus = Math.min(30, importerTypeBonus);

  // Cross-package imports are higher risk (monorepo)
  const crossPkgScore = Math.min(20, depNode.crossPackageImports.length * 10);

  // Transitive depth adds some risk
  const transitiveScore = Math.min(15,
    depNode.transitiveImporters.depth2.length * 2
  );

  const totalScore = Math.min(100,
    directImportScore + importerTypeBonus + crossPkgScore + transitiveScore
  );

  if (directImportScore > 30) {
    reasoning.push(`High direct importer count: ${depNode.importedBy.length}`);
  }
  if (importerTypeBonus > 10) {
    reasoning.push('Imported by critical-path files');
  }
  if (crossPkgScore > 0) {
    reasoning.push(`Cross-package imports: ${depNode.crossPackageImports.length}`);
  }

  return { score: totalScore, reasoning };
}

function calculateConfigBlastRadius(configRadius: ConfigBlastRadius): number {
  switch (configRadius.scope) {
    case 'workspace':
      return 95;  // Affects everything
    case 'extends-chain':
      return 80 + Math.min(15, configRadius.affectedPackages.length * 3);
    case 'package':
      return 60 + Math.min(30, configRadius.affectedPackages.length * 5);
    case 'env-consumers':
      return Math.min(85, 40 + configRadius.affectedFiles.length * 2);
    case 'file':
      return 20;
    default:
      return 50;
  }
}
```

### 2.3 AI Tool Risk Matrix

Different AI tools have different risk profiles for different file types. Claude might be great at tests but risky with configs.

```typescript
// AI Tool × File Category risk matrix
// Values 0-100, learned from aggregate telemetry
// These are initial estimates, will be updated from real data
const AI_TOOL_FILE_RISK: Record<string, Record<FileCategory, number>> = {
  'cursor': {
    [FileCategory.ROOT_CONFIG]: 85,
    [FileCategory.BUILD_CONFIG]: 80,
    [FileCategory.ENV_CONFIG]: 75,
    [FileCategory.WORKSPACE_CONFIG]: 75,
    [FileCategory.ENTRY_POINT]: 70,
    [FileCategory.SHARED_EXPORT]: 65,
    [FileCategory.TYPE_DEFINITION]: 60,
    [FileCategory.DOMAIN_LOGIC]: 55,
    [FileCategory.COMPONENT]: 50,
    [FileCategory.UTILITY]: 55,
    [FileCategory.TEST_FILE]: 35,
    [FileCategory.STYLE]: 40,
    [FileCategory.HOOK]: 55,
    [FileCategory.ASSET]: 20,
    [FileCategory.DOCUMENTATION]: 15
  },
  'copilot': {
    [FileCategory.ROOT_CONFIG]: 70,
    [FileCategory.BUILD_CONFIG]: 65,
    [FileCategory.DOMAIN_LOGIC]: 45,
    [FileCategory.TEST_FILE]: 30,
    // ... etc (Copilot tends to be more conservative)
  },
  'claude': {
    [FileCategory.ROOT_CONFIG]: 60,
    [FileCategory.DOMAIN_LOGIC]: 50,
    [FileCategory.TYPE_DEFINITION]: 45,
    // ... etc (Claude is often used for larger refactors)
  },
  'windsurf': {
    [FileCategory.ROOT_CONFIG]: 80,
    [FileCategory.BUILD_CONFIG]: 75,
    [FileCategory.DOMAIN_LOGIC]: 55,
    // ... etc
  },
  'aider': {
    [FileCategory.ROOT_CONFIG]: 75,
    [FileCategory.DOMAIN_LOGIC]: 60,
    // ... etc
  },
  'unknown': {
    // Conservative defaults for unknown tools
    [FileCategory.ROOT_CONFIG]: 80,
    [FileCategory.BUILD_CONFIG]: 75,
    [FileCategory.DOMAIN_LOGIC]: 60,
    // ... etc
  }
};

// Edit type multipliers
const EDIT_TYPE_MULTIPLIER: Record<string, number> = {
  'completion': 0.8,    // Single completions are lower risk
  'chat': 1.0,          // Chat-based edits are baseline
  'agent': 1.3,         // Agent mode (autonomous) is higher risk
  'unknown': 1.0
};

function calculateAiToolRisk(
  aiDetection: ScoringInput['aiDetection'],
  fileCategory: FileCategory
): { score: number; reasoning: string[] } {
  const reasoning: string[] = [];

  if (!aiDetection.detected) {
    return { score: 0, reasoning: ['No AI tool detected'] };
  }

  // Get base risk from matrix
  const toolRisks = AI_TOOL_FILE_RISK[aiDetection.tool] ?? AI_TOOL_FILE_RISK['unknown'];
  const baseRisk = toolRisks[fileCategory] ?? 50;

  // Apply confidence scaling (lower confidence = higher risk)
  // High confidence might actually be wrong, so we don't reduce much
  const confidenceMultiplier = aiDetection.confidence > 0.9
    ? 1.0  // Very confident AI is still risky
    : 1 + (1 - aiDetection.confidence) * 0.3;  // Less confident = more risky

  // Apply edit type multiplier
  const editMultiplier = EDIT_TYPE_MULTIPLIER[aiDetection.editType] ?? 1.0;

  const finalScore = Math.min(100, baseRisk * confidenceMultiplier * editMultiplier);

  reasoning.push(`AI tool: ${aiDetection.tool} (${aiDetection.editType} mode)`);
  if (editMultiplier > 1) {
    reasoning.push(`Agent mode increases risk by ${((editMultiplier - 1) * 100).toFixed(0)}%`);
  }

  return { score: finalScore, reasoning };
}
```

### 2.4 Session Coherence

Do the files changed in this session make sense together? High coherence = we can snapshot them as a unit.

```typescript
interface SessionCoherenceResult {
  score: number;       // 0-100 (high = coherent, inverted for risk)
  level: 'high' | 'medium' | 'low' | 'scattered';
  reasoning: string[];
}

function calculateSessionCoherence(
  changedFile: string,
  session: ScoringInput['session'],
  depGraph: DependencyGraph,
  repoContext: RepoContext
): SessionCoherenceResult {
  const reasoning: string[] = [];
  const sessionFiles = session.files.map(f => f.path);

  if (sessionFiles.length <= 1) {
    return { score: 100, level: 'high', reasoning: ['Single file session'] };
  }

  // Check 1: Are files in the same package? (monorepo)
  if (repoContext.type !== 'single') {
    const packages = new Set(sessionFiles.map(f => findPackageScope(f, repoContext)));
    const packageCoherence = 100 - (packages.size - 1) * 20;
    if (packages.size > 1) {
      reasoning.push(`Files span ${packages.size} packages`);
    }
  }

  // Check 2: Are files in the same directory tree?
  const dirs = sessionFiles.map(f => dirname(f));
  const commonPrefix = findCommonPrefix(dirs);
  const dirDepth = commonPrefix.split('/').length;
  const avgFileDepth = dirs.reduce((sum, d) => sum + d.split('/').length, 0) / dirs.length;
  const dirCoherence = Math.min(100, (dirDepth / avgFileDepth) * 100);

  // Check 3: Are files connected in dependency graph?
  let graphConnections = 0;
  for (let i = 0; i < sessionFiles.length; i++) {
    for (let j = i + 1; j < sessionFiles.length; j++) {
      if (areConnected(sessionFiles[i], sessionFiles[j], depGraph)) {
        graphConnections++;
      }
    }
  }
  const maxConnections = (sessionFiles.length * (sessionFiles.length - 1)) / 2;
  const graphCoherence = (graphConnections / maxConnections) * 100;

  // Check 4: Are files of the same category?
  const categories = sessionFiles.map(f => classifyFile(f, repoContext).category);
  const uniqueCategories = new Set(categories);
  const categoryCoherence = 100 - (uniqueCategories.size - 1) * 15;

  // Weighted combination
  const totalScore = Math.round(
    dirCoherence * 0.25 +
    graphCoherence * 0.40 +
    categoryCoherence * 0.35
  );

  let level: SessionCoherenceResult['level'];
  if (totalScore >= 80) level = 'high';
  else if (totalScore >= 50) level = 'medium';
  else if (totalScore >= 30) level = 'low';
  else level = 'scattered';

  if (graphCoherence > 60) {
    reasoning.push(`${graphConnections}/${maxConnections} files are connected in dependency graph`);
  }

  return { score: totalScore, level, reasoning };
}

function areConnected(file1: string, file2: string, depGraph: DependencyGraph): boolean {
  const node1 = depGraph.nodes.get(file1);
  const node2 = depGraph.nodes.get(file2);

  if (!node1 || !node2) return false;

  // Check direct connection
  if (node1.imports.includes(file2) || node2.imports.includes(file1)) {
    return true;
  }

  // Check one-hop connection (shared import)
  const shared = node1.imports.filter(i => node2.imports.includes(i));
  return shared.length > 0;
}
```

### 2.5 Temporal Risk

When are mistakes most likely?

```typescript
interface TemporalRiskResult {
  score: number;
  reasoning: string[];
}

function calculateTemporalRisk(
  temporal: ScoringInput['temporal'],
  session: ScoringInput['session'],
  userProfile?: UserProfile  // From Layer 3
): TemporalRiskResult {
  const reasoning: string[] = [];
  let score = 0;

  // Factor 1: Change velocity (burst detection)
  // >3 changes/minute suggests rapid AI-assisted editing
  if (session.changeVelocity > 5) {
    score += 30;
    reasoning.push(`High change velocity: ${session.changeVelocity.toFixed(1)}/min`);
  } else if (session.changeVelocity > 3) {
    score += 20;
    reasoning.push(`Elevated change velocity: ${session.changeVelocity.toFixed(1)}/min`);
  }

  // Factor 2: Time since last snapshot
  const minutesSinceSnapshot = temporal.timeSinceLastSnapshot / 60000;
  if (minutesSinceSnapshot < 1) {
    score += 15;  // Very recent snapshot, might be a burst
    reasoning.push('Recent snapshot (<1 min ago)');
  } else if (minutesSinceSnapshot > 30) {
    score += 10;  // Long time without snapshot, more accumulated risk
    reasoning.push(`No snapshot in ${minutesSinceSnapshot.toFixed(0)} minutes`);
  }

  // Factor 3: Session length
  const sessionMinutes = (temporal.timestamp - session.startedAt) / 60000;
  if (sessionMinutes < 5) {
    score += 15;  // New session, more error-prone
    reasoning.push('Early in session (<5 min)');
  }

  // Factor 4: Time of day / day of week risk (from user profile or aggregate)
  if (userProfile) {
    if (userProfile.patterns.riskiestHours.includes(temporal.hourOfDay)) {
      score += 15;
      reasoning.push(`User's historically risky hour: ${temporal.hourOfDay}:00`);
    }
  } else {
    // Use aggregate patterns
    const riskyHours = [23, 0, 1, 2, 3, 14, 15]; // Late night, post-lunch
    if (riskyHours.includes(temporal.hourOfDay)) {
      score += 10;
      reasoning.push(`Generally risky hour: ${temporal.hourOfDay}:00`);
    }

    // Friday afternoon effect
    if (temporal.dayOfWeek === 5 && temporal.hourOfDay >= 14) {
      score += 10;
      reasoning.push('Friday afternoon (historically higher error rate)');
    }
  }

  return {
    score: Math.min(100, score),
    reasoning
  };
}
```

### 2.6 Combined Scoring Function

```typescript
// Default weights (tunable, learned from data)
const DEFAULT_WEIGHTS = {
  categoryRisk: 0.20,
  blastRadius: 0.20,
  aiToolRisk: 0.20,
  changeMagnitude: 0.10,
  sessionCoherence: 0.10,  // Inverse: low coherence = high risk
  temporalRisk: 0.10,
  criticalPath: 0.10
};

function calculateTotalScore(input: ScoringInput, weights = DEFAULT_WEIGHTS): ScoringOutput {
  const reasoning: string[] = [];

  // Calculate each factor
  const categoryRisk = {
    raw: input.fileClassification.baseRisk,
    weight: weights.categoryRisk,
    score: input.fileClassification.baseRisk * weights.categoryRisk
  };

  const blastRadiusResult = calculateBlastRadius(
    input.fileClassification,
    input.dependencyContext,
    input.configBlastRadius
  );
  const blastRadius = {
    raw: blastRadiusResult.score,
    weight: weights.blastRadius,
    score: blastRadiusResult.score * weights.blastRadius
  };
  reasoning.push(...blastRadiusResult.reasoning);

  const aiRiskResult = calculateAiToolRisk(
    input.aiDetection,
    input.fileClassification.category
  );
  const aiToolRisk = {
    raw: aiRiskResult.score,
    weight: weights.aiToolRisk,
    score: aiRiskResult.score * weights.aiToolRisk
  };
  reasoning.push(...aiRiskResult.reasoning);

  const changeMag = calculateChangeMagnitude(input.changeMetrics);
  const changeMagnitude = {
    raw: changeMag,
    weight: weights.changeMagnitude,
    score: changeMag * weights.changeMagnitude
  };

  const coherenceResult = calculateSessionCoherence(
    input.fileClassification.filePath,
    input.session,
    /* depGraph */ null!,
    input.repoContext
  );
  // Invert coherence: low coherence = high risk
  const sessionCoherence = {
    raw: 100 - coherenceResult.score,
    weight: weights.sessionCoherence,
    score: (100 - coherenceResult.score) * weights.sessionCoherence
  };
  reasoning.push(...coherenceResult.reasoning);

  const temporalResult = calculateTemporalRisk(input.temporal, input.session);
  const temporalRisk = {
    raw: temporalResult.score,
    weight: weights.temporalRisk,
    score: temporalResult.score * weights.temporalRisk
  };
  reasoning.push(...temporalResult.reasoning);

  const criticalPath = {
    raw: input.criticalPath.criticalPathScore,
    weight: weights.criticalPath,
    score: input.criticalPath.criticalPathScore * weights.criticalPath
  };
  if (input.criticalPath.isOnCriticalPath) {
    reasoning.push(`On critical path (distance: ${input.criticalPath.distanceToNearestEntry})`);
  }

  // Sum weighted scores
  const totalScore =
    categoryRisk.score +
    blastRadius.score +
    aiToolRisk.score +
    changeMagnitude.score +
    sessionCoherence.score +
    temporalRisk.score +
    criticalPath.score;

  // Calculate confidence based on data quality
  const confidence = calculateConfidence(input);

  return {
    totalScore: Math.min(100, totalScore),
    factors: {
      categoryRisk,
      blastRadius,
      aiToolRisk,
      changeMagnitude,
      sessionCoherence,
      temporalRisk,
      criticalPath
    },
    reasoning,
    confidence
  };
}

function calculateChangeMagnitude(metrics: ScoringInput['changeMetrics']): number {
  // Combine change metrics with structural change boost
  const lineScore = Math.min(50, Math.sqrt(
    metrics.linesAdded ** 2 +
    metrics.linesDeleted ** 2 +
    metrics.linesModified ** 2
  ));

  const structuralBoost = metrics.isStructuralChange ? 30 : 0;

  return Math.min(100, lineScore + structuralBoost);
}

function calculateConfidence(input: ScoringInput): number {
  let confidence = 1.0;

  // Reduce confidence for unknown AI tool
  if (input.aiDetection.tool === 'unknown') {
    confidence *= 0.8;
  }

  // Reduce confidence for orphan files (not in dependency graph)
  if (input.criticalPath.distanceToNearestEntry === -1) {
    confidence *= 0.9;
  }

  // Reduce confidence for very new sessions (less context)
  const sessionMinutes = (input.temporal.timestamp - input.session.startedAt) / 60000;
  if (sessionMinutes < 2) {
    confidence *= 0.9;
  }

  return confidence;
}
```

### 2.7 Strategy Mapping

```typescript
enum SnapshotStrategy {
  SINGLE_FILE = 'single_file',
  DIRECT_DEPENDENTS = 'direct_dependents',
  TRANSITIVE_CLUSTER = 'transitive_cluster',
  MODULE_SCOPE = 'module_scope',
  PACKAGE_SCOPE = 'package_scope',
  SESSION_SCOPE = 'session_scope'
}

interface ScopeDecision {
  strategy: SnapshotStrategy;
  filesToInclude: string[];
  fidelity: 'diff-only' | 'full';  // Small changes can use diff
  reasoning: string[];
  confidence: number;
  suggestedName: string;
}

// Thresholds for strategy selection (tunable)
const STRATEGY_THRESHOLDS = {
  singleFile: 25,        // 0-25: just the file
  directDependents: 45,  // 25-45: + direct importers
  transitive: 65,        // 45-65: + 2 levels of importers
  module: 80,            // 65-80: entire module/feature
  package: 90,           // 80-90: entire package (monorepo)
  session: 100           // 90+: all session files
};

function mapScoreToStrategy(
  scoringOutput: ScoringOutput,
  fileClass: FileClassification,
  repoContext: RepoContext,
  sessionFiles: string[],
  depGraph: DependencyGraph
): ScopeDecision {
  const score = scoringOutput.totalScore;
  const changedFile = fileClass.filePath;

  // Low risk: just the file
  if (score < STRATEGY_THRESHOLDS.singleFile) {
    return {
      strategy: SnapshotStrategy.SINGLE_FILE,
      filesToInclude: [changedFile],
      fidelity: score < 15 ? 'diff-only' : 'full',
      reasoning: ['Low risk - single file snapshot sufficient'],
      confidence: scoringOutput.confidence,
      suggestedName: generateSnapshotName(changedFile, 'single')
    };
  }

  // Medium-low risk: include direct dependents
  if (score < STRATEGY_THRESHOLDS.directDependents) {
    const node = depGraph.nodes.get(changedFile);
    const directDeps = node?.importedBy ?? [];

    return {
      strategy: SnapshotStrategy.DIRECT_DEPENDENTS,
      filesToInclude: [changedFile, ...directDeps],
      fidelity: 'full',
      reasoning: [
        'Medium risk - including direct dependents',
        `${directDeps.length} files import this file`
      ],
      confidence: scoringOutput.confidence,
      suggestedName: generateSnapshotName(changedFile, 'cluster')
    };
  }

  // Medium risk: transitive dependents
  if (score < STRATEGY_THRESHOLDS.transitive) {
    const node = depGraph.nodes.get(changedFile);
    const transitiveDeps = [
      ...(node?.transitiveImporters.depth1 ?? []),
      ...(node?.transitiveImporters.depth2 ?? [])
    ];

    return {
      strategy: SnapshotStrategy.TRANSITIVE_CLUSTER,
      filesToInclude: [changedFile, ...transitiveDeps],
      fidelity: 'full',
      reasoning: [
        'Higher risk - including transitive dependents',
        `Blast radius: ${transitiveDeps.length} files`
      ],
      confidence: scoringOutput.confidence * 0.95,
      suggestedName: generateSnapshotName(changedFile, 'transitive')
    };
  }

  // High risk: module scope
  if (score < STRATEGY_THRESHOLDS.module) {
    const moduleFiles = getModuleFiles(changedFile, repoContext);

    return {
      strategy: SnapshotStrategy.MODULE_SCOPE,
      filesToInclude: moduleFiles,
      fidelity: 'full',
      reasoning: [
        'High risk change detected',
        `Including entire module (${moduleFiles.length} files)`
      ],
      confidence: scoringOutput.confidence * 0.9,
      suggestedName: generateSnapshotName(changedFile, 'module')
    };
  }

  // Very high risk: package scope (monorepo only)
  if (score < STRATEGY_THRESHOLDS.package && repoContext.type !== 'single') {
    const packageFiles = getPackageFiles(changedFile, repoContext);

    return {
      strategy: SnapshotStrategy.PACKAGE_SCOPE,
      filesToInclude: packageFiles,
      fidelity: 'full',
      reasoning: [
        'Very high risk - including entire package',
        `Package scope: ${packageFiles.length} files`
      ],
      confidence: scoringOutput.confidence * 0.85,
      suggestedName: generateSnapshotName(changedFile, 'package')
    };
  }

  // Critical risk: session scope
  return {
    strategy: SnapshotStrategy.SESSION_SCOPE,
    filesToInclude: dedupeAndSort([changedFile, ...sessionFiles]),
    fidelity: 'full',
    reasoning: [
      'Critical risk - including all session files',
      'Maximum protection for complete recovery context'
    ],
    confidence: scoringOutput.confidence * 0.8,
    suggestedName: generateSnapshotName(changedFile, 'session')
  };
}
```

---

## Layer 3: Personalization & Learning

### 3.1 User Profile Schema

```typescript
interface UserProfile {
  userId: string;
  tier: 'free' | 'pro';

  // Behavioral patterns
  patterns: {
    // Rollback behavior
    rollbackRate: number;                    // 0-1, how often they restore
    rollbackLatencyBuckets: {
      immediate: number;                     // <1 min
      sameSession: number;                   // <30 min
      later: number;                         // >30 min
    };

    // File type patterns
    fileTypeProtection: Record<FileCategory, {
      protectionCount: number;
      rollbackCount: number;
      rollbackRate: number;
    }>;

    // AI tool patterns
    aiToolStats: Record<string, {
      usageCount: number;
      rollbackRate: number;
      avgConfidenceAtRollback: number;
      fileTypeRollbackRates: Record<FileCategory, number>;
    }>;

    // Temporal patterns
    riskiestHours: number[];                 // Hours with highest rollback rate
    avgSessionLength: number;
    typicalChangeVelocity: number;
  };

  // Computed weight adjustments
  weightAdjustments: Partial<typeof DEFAULT_WEIGHTS>;

  // Metadata
  updatedAt: number;
  dataPointCount: number;                    // How much data we have
}

// Note: Co-change matrix is LOCAL ONLY (privacy)
// It's stored in extension storage, never sent to server
interface LocalUserData {
  coChangeMatrix: Map<string, Map<string, number>>;  // file → file → frequency
  recentDecisions: DecisionRecord[];                  // Last 100 decisions
}
```

### 3.2 Bayesian Weight Updates

```typescript
async function updateUserProfile(
  userId: string,
  event: UserBehaviorEvent
): Promise<void> {
  const profile = await getUserProfile(userId);

  switch (event.type) {
    case 'snapshot_restored': {
      // User rolled back → we should have been MORE protective
      // This is a strong signal

      // Update overall rollback rate (EWMA with α=0.1)
      profile.patterns.rollbackRate = ewma(
        profile.patterns.rollbackRate,
        1,
        0.1
      );

      // Update file type rollback rate
      const category = event.fileCategory;
      const typeStats = profile.patterns.fileTypeProtection[category] ??= {
        protectionCount: 0,
        rollbackCount: 0,
        rollbackRate: 0
      };
      typeStats.rollbackCount++;
      typeStats.rollbackRate = typeStats.rollbackCount / typeStats.protectionCount;

      // Update AI tool rollback rate if applicable
      if (event.aiTool) {
        const toolStats = profile.patterns.aiToolStats[event.aiTool] ??= {
          usageCount: 0,
          rollbackRate: 0,
          avgConfidenceAtRollback: 0,
          fileTypeRollbackRates: {}
        };
        toolStats.rollbackRate = ewma(toolStats.rollbackRate, 1, 0.1);

        // Track which file types this tool struggles with
        toolStats.fileTypeRollbackRates[category] = ewma(
          toolStats.fileTypeRollbackRates[category] ?? 0,
          1,
          0.15
        );
      }

      // Update temporal patterns
      if (event.timestamp) {
        const hour = new Date(event.timestamp).getHours();
        updateRiskyHours(profile, hour);
      }

      // Update rollback latency buckets
      const latencyMinutes = (event.timestamp - event.snapshotCreatedAt) / 60000;
      if (latencyMinutes < 1) {
        profile.patterns.rollbackLatencyBuckets.immediate++;
      } else if (latencyMinutes < 30) {
        profile.patterns.rollbackLatencyBuckets.sameSession++;
      } else {
        profile.patterns.rollbackLatencyBuckets.later++;
      }

      break;
    }

    case 'snapshot_created': {
      // Track protection events for rate calculation
      const category = event.fileCategory;
      const typeStats = profile.patterns.fileTypeProtection[category] ??= {
        protectionCount: 0,
        rollbackCount: 0,
        rollbackRate: 0
      };
      typeStats.protectionCount++;

      if (event.aiTool) {
        const toolStats = profile.patterns.aiToolStats[event.aiTool] ??= {
          usageCount: 0,
          rollbackRate: 0,
          avgConfidenceAtRollback: 0,
          fileTypeRollbackRates: {}
        };
        toolStats.usageCount++;
      }

      break;
    }

    case 'snapshot_ignored': {
      // They ignored our snapshot - maybe we were TOO protective
      profile.patterns.rollbackRate = ewma(profile.patterns.rollbackRate, 0, 0.1);
      break;
    }

    case 'files_changed_together': {
      // Update co-change matrix (local only)
      // This is stored in extension storage, not sent to server
      updateCoChangeMatrix(event.files);
      break;
    }
  }

  // Recompute weight adjustments
  profile.weightAdjustments = computeWeightAdjustments(profile);

  await saveUserProfile(profile);
}

// Adjust weights based on user history using Bayesian updating
function computeWeightAdjustments(profile: UserProfile): Partial<typeof DEFAULT_WEIGHTS> {
  const adjustments: Partial<typeof DEFAULT_WEIGHTS> = {};

  // If user rolls back a lot, increase all weights (more protective)
  if (profile.patterns.rollbackRate > 0.1) { // >10% rollback rate
    const protectionMultiplier = 1 + (profile.patterns.rollbackRate - 0.1) * 2;
    adjustments.aiToolRisk = protectionMultiplier;
    adjustments.blastRadius = protectionMultiplier;
  }

  // If certain AI tools cause more problems for this user
  for (const [tool, stats] of Object.entries(profile.patterns.aiToolStats)) {
    if (stats.rollbackRate > 0.15) {
      // This user has trouble with this tool - boost AI risk weight
      adjustments.aiToolRisk = (adjustments.aiToolRisk ?? 1) * 1.2;
    }
  }

  // If user frequently edits config files and rolls them back
  const configCategories = [
    FileCategory.ROOT_CONFIG,
    FileCategory.BUILD_CONFIG,
    FileCategory.ENV_CONFIG
  ];

  for (const cat of configCategories) {
    const stats = profile.patterns.fileTypeProtection[cat];
    if (stats && stats.rollbackRate > 0.25) {
      adjustments.categoryRisk = Math.max(
        adjustments.categoryRisk ?? 1,
        1 + (stats.rollbackRate - 0.25) * 1.2
      );
    }
  }

  // If they restore immediately (within 1 min), they need faster protection
  const immediateFraction = profile.patterns.rollbackLatencyBuckets.immediate /
    (profile.patterns.rollbackLatencyBuckets.immediate +
     profile.patterns.rollbackLatencyBuckets.sameSession +
     profile.patterns.rollbackLatencyBuckets.later || 1);

  if (immediateFraction > 0.5) {
    // They often restore immediately → be more aggressive
    adjustments.temporalRisk = (adjustments.temporalRisk ?? 1) * 1.2;
  }

  return adjustments;
}

function ewma(current: number, newValue: number, alpha: number): number {
  return current * (1 - alpha) + newValue * alpha;
}
```

### 3.3 Aggregate Insights (Server-Side)

```typescript
interface AggregateInsights {
  // Global patterns from all users
  global: {
    // Optimal weights learned from aggregate data
    optimalWeights: typeof DEFAULT_WEIGHTS;

    // AI tool risk matrix (learned)
    aiToolFileRisk: Record<string, Record<FileCategory, number>>;

    // File category risk ranking
    categoryRiskRanking: Array<{
      category: FileCategory;
      avgRollbackRate: number;
      sampleSize: number;
    }>;

    // Strategy effectiveness
    strategyEffectiveness: Record<SnapshotStrategy, {
      successRate: number;          // Restores that had all needed files
      overInclusionRate: number;    // Restores that had excess files
      avgFileCount: number;
    }>;

    // Optimal thresholds
    optimalThresholds: typeof STRATEGY_THRESHOLDS;

    // Temporal patterns
    temporalPatterns: {
      riskiestHoursGlobal: number[];
      riskiestDaysGlobal: number[];
    };
  };

  // Repo-type specific patterns
  byRepoType: Record<RepoContext['type'], {
    avgBlastRadius: number;
    recommendedWeightAdjustments: Partial<typeof DEFAULT_WEIGHTS>;
    mostProblematicConfigs: string[];
  }>;

  // Metadata
  computedAt: number;
  sampleSize: number;
  confidenceLevel: number;
}

// Server-side aggregation job (runs daily)
async function computeAggregateInsights(): Promise<AggregateInsights> {
  const events = await getAnonymizedTelemetry({ days: 30 });

  // Filter to users with sufficient data
  const qualifiedEvents = events.filter(e => e.userDataPoints > 20);

  // Compute AI tool × file type risk matrix
  const aiToolFileRisk = computeAiToolFileRiskMatrix(qualifiedEvents);

  // Compute category risk ranking
  const categoryRiskRanking = computeCategoryRiskRanking(qualifiedEvents);

  // Compute strategy effectiveness
  const strategyEffectiveness = computeStrategyEffectiveness(qualifiedEvents);

  // Learn optimal weights via grid search or gradient descent
  const optimalWeights = await optimizeWeights(qualifiedEvents);

  // Learn optimal thresholds
  const optimalThresholds = optimizeThresholds(qualifiedEvents, optimalWeights);

  // Compute repo-type specific patterns
  const byRepoType = computeRepoTypePatterns(qualifiedEvents);

  return {
    global: {
      optimalWeights,
      aiToolFileRisk,
      categoryRiskRanking,
      strategyEffectiveness,
      optimalThresholds,
      temporalPatterns: computeTemporalPatterns(qualifiedEvents)
    },
    byRepoType,
    computedAt: Date.now(),
    sampleSize: qualifiedEvents.length,
    confidenceLevel: qualifiedEvents.length > 10000 ? 0.95 :
                     qualifiedEvents.length > 1000 ? 0.8 : 0.6
  };
}
```

### 3.4 Weight Combination Formula

```typescript
// Final weights = blend of default, user-specific, and aggregate
function getFinalWeights(
  userId: string,
  repoType: RepoContext['type']
): typeof DEFAULT_WEIGHTS {
  // Start with defaults
  let weights = { ...DEFAULT_WEIGHTS };

  // Layer in aggregate insights (learned from all users)
  const aggregate = getAggregateInsights();
  weights = blendWeights(weights, aggregate.global.optimalWeights, 0.3);

  // Layer in repo-type specific patterns
  const repoPatterns = aggregate.byRepoType[repoType];
  if (repoPatterns) {
    // Adjust based on typical blast radius for this repo type
    if (repoPatterns.avgBlastRadius > 50) {
      weights.blastRadius *= 1.2;
    }
  }

  // Layer in user-specific adjustments (strongest signal)
  const userProfile = getUserProfile(userId);
  if (userProfile?.weightAdjustments) {
    weights = blendWeights(weights, userProfile.weightAdjustments, 0.5);
  }

  // Normalize weights to sum to 1
  return normalizeWeights(weights);
}

function blendWeights(
  base: typeof DEFAULT_WEIGHTS,
  adjustments: Partial<typeof DEFAULT_WEIGHTS>,
  blendFactor: number
): typeof DEFAULT_WEIGHTS {
  const result = { ...base };
  for (const [key, value] of Object.entries(adjustments)) {
    if (value !== undefined) {
      result[key as keyof typeof DEFAULT_WEIGHTS] =
        base[key as keyof typeof DEFAULT_WEIGHTS] * (1 - blendFactor) +
        value * blendFactor;
    }
  }
  return result;
}

function normalizeWeights(weights: typeof DEFAULT_WEIGHTS): typeof DEFAULT_WEIGHTS {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  const result = { ...weights };
  for (const key of Object.keys(result) as Array<keyof typeof DEFAULT_WEIGHTS>) {
    result[key] = result[key] / sum;
  }
  return result;
}
```

---

## Specific Scenario Handling

### Scenario 1: Workspace tsconfig in Turborepo

```typescript
// User changes packages/platform/tsconfig.json in a Turborepo

const scenario = {
  file: 'packages/platform/tsconfig.json',
  repoType: 'turborepo',
  workspaces: [
    { name: 'platform', dependents: ['web', 'api', 'cli'] },
    { name: 'web', dependents: [] },
    { name: 'api', dependents: [] }
  ]
};

// Layer 1 Analysis:
// - File category: WORKSPACE_CONFIG (baseRisk: 75)
// - Config blast radius: follows extends chain + affects dependents
// - Affected packages: ['web', 'api', 'cli']

// Layer 2 Scoring:
// - categoryRisk: 75 × 0.20 = 15
// - blastRadius: 85 × 0.20 = 17 (3 dependent packages × 20 + chain)
// - aiToolRisk: 60 × 0.20 = 12 (if Cursor)
// - criticalPath: 70 × 0.10 = 7 (configs are core)
// Total: ~60 → TRANSITIVE_CLUSTER or PACKAGE_SCOPE

// Decision:
const decision: ScopeDecision = {
  strategy: SnapshotStrategy.PACKAGE_SCOPE,
  filesToInclude: [
    'packages/platform/tsconfig.json',
    'packages/platform/src/**/*.ts',
    'apps/web/src/index.ts',      // Entry point of dependent
    'apps/api/src/index.ts',      // Entry point of dependent
    'apps/cli/src/index.ts'       // Entry point of dependent
  ],
  fidelity: 'full',
  reasoning: [
    'Package-level tsconfig in Turborepo detected',
    '3 downstream packages depend on platform',
    'Including entry points of dependents for verification'
  ],
  confidence: 0.92,
  suggestedName: 'platform-tsconfig-change'
};
```

### Scenario 2: AI Burst Detection

```typescript
// Cursor making rapid changes across auth feature

const scenario = {
  file: 'src/features/auth/hooks/useAuth.ts',
  aiTool: 'cursor',
  aiConfidence: 0.95,
  editType: 'agent',  // Agent mode = higher risk
  changeVelocity: 6,  // 6 changes per minute
  sessionFiles: [
    'src/features/auth/types.ts',
    'src/features/auth/api.ts',
    'src/features/auth/hooks/useAuth.ts',
    'src/features/auth/components/LoginForm.tsx'
  ]
};

// Layer 1 Analysis:
// - File category: HOOK (baseRisk: 55)
// - Session coherence: HIGH (all in same feature)
// - Graph coherence: HIGH (related imports)

// Layer 2 Scoring:
// - categoryRisk: 55 × 0.20 = 11
// - blastRadius: 40 × 0.20 = 8
// - aiToolRisk: 70 × 1.3 (agent mode) × 0.20 = 18.2
// - sessionCoherence: 20 × 0.10 = 2 (inverted: high coherence = low risk)
// - temporalRisk: 45 × 0.10 = 4.5 (burst detected)
// Total: ~55 → TRANSITIVE_CLUSTER

// But with high session coherence, we can optimize:
const decision: ScopeDecision = {
  strategy: SnapshotStrategy.MODULE_SCOPE,
  filesToInclude: [
    'src/features/auth/**/*'  // Entire auth feature
  ],
  fidelity: 'full',
  reasoning: [
    'AI burst detected: 6 changes/min from Cursor (agent mode)',
    'High session coherence (100%): all files in auth feature',
    'Including entire feature boundary for atomic recovery'
  ],
  confidence: 0.88,
  suggestedName: 'auth-feature-ai-burst'
};
```

### Scenario 3: Low-Risk Isolated Edit

```typescript
// Human edits a utility function with no AI involved

const scenario = {
  file: 'src/utils/formatDate.ts',
  aiDetection: { detected: false },
  changeSize: { linesModified: 3 },
  importedBy: ['src/components/DatePicker.tsx', 'src/pages/events.tsx']
};

// Layer 2 Scoring:
// - categoryRisk: 45 × 0.20 = 9
// - blastRadius: 20 × 0.20 = 4 (only 2 importers)
// - aiToolRisk: 0 × 0.20 = 0
// - changeMagnitude: 10 × 0.10 = 1
// - temporalRisk: 5 × 0.10 = 0.5
// Total: ~18 → SINGLE_FILE

const decision: ScopeDecision = {
  strategy: SnapshotStrategy.SINGLE_FILE,
  filesToInclude: ['src/utils/formatDate.ts'],
  fidelity: 'diff-only',  // Small change, diff is sufficient
  reasoning: [
    'No AI detected',
    'Low blast radius (2 importers)',
    'Small change (3 lines)'
  ],
  confidence: 0.95,
  suggestedName: 'formatDate-edit'
};
```

### Scenario 4: Personalized High-Risk User

```typescript
// User with high rollback rate edits a component

const userProfile: UserProfile = {
  patterns: {
    rollbackRate: 0.25,  // 25% rollback rate (high)
    aiToolStats: {
      'cursor': { rollbackRate: 0.35, usageCount: 50 }
    }
  },
  weightAdjustments: {
    blastRadius: 1.3,    // +30% blast radius weight
    aiToolRisk: 1.4      // +40% AI risk weight
  }
};

// Same edit as Scenario 3, but with personalization:
// Adjusted weights make total score higher
// → More protective strategy selected

const decision: ScopeDecision = {
  strategy: SnapshotStrategy.DIRECT_DEPENDENTS,
  filesToInclude: [
    'src/utils/formatDate.ts',
    'src/components/DatePicker.tsx',
    'src/pages/events.tsx'
  ],
  fidelity: 'full',
  reasoning: [
    'User has high rollback rate (25%)',
    'Personalized weights increase protection',
    'Including direct dependents as precaution'
  ],
  confidence: 0.85,
  suggestedName: 'formatDate-edit-protected'
};
```

---

## Telemetry & Feedback

### 6.1 Decision Tracking (Privacy-Preserving)

```typescript
interface DecisionTelemetry {
  event: 'scope_decision';

  // Decision context (anonymized)
  fileCategory: FileCategory;
  repoType: RepoContext['type'];
  blastRadiusBucket: 'low' | 'medium' | 'high' | 'critical';

  // AI context
  aiTool: string | null;
  aiConfidenceBucket: '0-0.5' | '0.5-0.8' | '0.8-1.0' | null;
  aiEditType: string | null;

  // Session context
  sessionFileCount: number;
  sessionCoherenceLevel: 'high' | 'medium' | 'low' | 'scattered';
  changeVelocityBucket: 'normal' | 'elevated' | 'burst';

  // Decision output
  strategy: SnapshotStrategy;
  filesIncludedCount: number;
  totalScore: number;
  confidence: number;

  // Scoring factors (for analysis)
  factors: {
    categoryRisk: number;
    blastRadius: number;
    aiToolRisk: number;
    changeMagnitude: number;
    sessionCoherence: number;
    temporalRisk: number;
    criticalPath: number;
  };

  // Weight source
  weightSource: 'default' | 'aggregate' | 'personalized';

  // For learning
  decisionId: string;
  timestamp: number;
}

interface OutcomeTelemetry {
  event: 'scope_decision_outcome';
  decisionId: string;

  // What happened
  outcome: 'restored' | 'expired_unused' | 'deleted_manually';

  // If restored
  restoreLatencyBucket?: 'immediate' | 'same_session' | 'later';
  hadAllNeededFiles?: boolean;
  excessFileCountBucket?: 'none' | 'few' | 'many';

  // Explicit feedback
  explicitFeedback?: 'positive' | 'negative' | null;
  feedbackReason?: string | null;
}
```

### 6.2 User Feedback UI

```typescript
// After a restore, show feedback prompt
interface FeedbackPrompt {
  type: 'post_restore';
  decisionId: string;

  // Questions
  questions: [
    {
      id: 'helpful',
      text: 'Was this snapshot helpful?',
      type: 'thumbs',  // 👍 👎
    },
    {
      id: 'completeness',
      text: 'Did it include all the files you needed?',
      type: 'yes_no_partial',
      showIf: 'helpful === positive'
    },
    {
      id: 'excess',
      text: 'Were there too many files included?',
      type: 'yes_no',
      showIf: 'helpful === negative'
    }
  ];
}

// Track feedback with high weight
async function recordFeedback(
  decisionId: string,
  feedback: UserFeedback
): Promise<void> {
  // Send to telemetry
  await trackEvent({
    event: 'scope_decision_outcome',
    decisionId,
    explicitFeedback: feedback.helpful,
    feedbackReason: feedback.reason
  });

  // Update user profile immediately
  await updateUserProfile(userId, {
    type: 'explicit_feedback',
    positive: feedback.helpful === 'positive',
    reason: feedback.reason,
    timestamp: Date.now()
  });
}
```

### 6.3 Algorithm KPIs

```typescript
const ALGORITHM_KPIS = {
  // Primary: Did we protect what was needed?
  restore_success_rate: {
    description: 'When users restore, did we have all needed files?',
    target: 0.95,
    query: 'restores where hadAllNeededFiles = true'
  },

  // Secondary: Did we over-include?
  over_inclusion_rate: {
    description: 'How often do we include unnecessary files?',
    target: 0.20,  // Some over-inclusion is okay for safety
    query: 'decisions where excessFileCountBucket = many'
  },

  // Efficiency: Are we using the right strategies?
  strategy_distribution: {
    description: 'Are we using the right strategies?',
    target: {
      single_file: 0.40,      // Most changes are low risk
      direct_dependents: 0.30,
      transitive_cluster: 0.15,
      module_scope: 0.08,
      package_scope: 0.05,
      session_scope: 0.02
    }
  },

  // Learning: Is personalization helping?
  personalization_lift: {
    description: 'How much better are personalized weights?',
    target: 0.10,  // 10% improvement over defaults
    query: 'compare user_adjusted outcomes vs default outcomes'
  },

  // Efficiency metrics
  snapshot_size_efficiency: {
    description: 'Average files per snapshot vs naive approach',
    target: 0.65,  // 35% smaller than "include everything"
    query: 'avg(filesIncluded) / avg(sessionFileCount)'
  },

  // User confidence
  user_satisfaction: {
    description: 'Thumbs up rate on restores',
    target: 0.90,
    query: 'restores where explicitFeedback = positive'
  }
};
```

---

## Privacy Architecture

### 7.1 What We Track vs. What Stays Local

```typescript
// SENT TO SERVER (anonymized)
interface ServerTelemetry {
  // ✅ Categories, not specific paths
  fileCategory: FileCategory;
  repoType: 'single' | 'monorepo' | 'turborepo';

  // ✅ Buckets, not exact values
  blastRadiusBucket: 'low' | 'medium' | 'high';
  changeVelocityBucket: 'normal' | 'elevated' | 'burst';

  // ✅ Tool names (not user code)
  aiTool: string;

  // ✅ Numeric scores (anonymized)
  totalScore: number;
  confidence: number;
}

// STAYS LOCAL (never sent)
interface LocalOnlyData {
  // ❌ File paths
  filePath: string;

  // ❌ File content
  content: string;

  // ❌ Co-change matrix (reveals project structure)
  coChangeMatrix: Map<string, Map<string, number>>;

  // ❌ Actual dependency graph
  dependencyGraph: DependencyGraph;

  // ❌ Session file lists
  sessionFiles: string[];
}
```

### 7.2 Opt-In for Enhanced Features

```typescript
interface PrivacySettings {
  // Default: metadata only
  telemetryLevel: 'minimal' | 'standard' | 'enhanced';

  // Minimal: Only rollback events, no file categories
  // Standard: Categories, scores, AI tool (default)
  // Enhanced: + co-change patterns (anonymized hashes)

  // Cloud backup (requires explicit opt-in)
  cloudBackup: boolean;

  // Aggregate learning participation
  contributeToAggregate: boolean;  // Default: true
}
```

---

## Performance & Caching

### 8.1 Caching Strategy

```typescript
// Dependency graph: expensive to compute, changes rarely
const DEP_GRAPH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// User profile: fetched once per session
const USER_PROFILE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Aggregate insights: refreshed daily
const AGGREGATE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// File classification: memoized per file path
const fileClassCache = new LRUCache<string, FileClassification>({
  max: 500,
  ttl: DEP_GRAPH_CACHE_TTL
});

// Precompute on extension activation
async function warmCaches(workspaceRoot: string): Promise<void> {
  // Start dependency graph computation
  getDependencyGraph(workspaceRoot); // async, non-blocking

  // Fetch user profile if logged in
  if (isAuthenticated()) {
    getUserProfile(getCurrentUserId());
  }

  // Fetch aggregate insights
  getAggregateInsights();
}
```

### 8.2 Performance Budgets

```typescript
const PERFORMANCE_BUDGETS = {
  // Full decision (Layer 1 + 2)
  totalDecisionTime: 50, // ms (p95)

  // Individual layers
  repoTypeDetection: 10,   // ms (cached after first)
  fileClassification: 1,   // ms (simple rules)
  dependencyLookup: 5,     // ms (cached graph)
  scoringCalculation: 2,   // ms (pure computation)
  strategyMapping: 1,      // ms (threshold checks)

  // Layer 3 (async, not in critical path)
  personalizationFetch: 100, // ms (server round-trip)

  // Never block on
  telemetryTracking: 'async', // Fire and forget
  profileUpdate: 'async'      // Background sync
};
```

---

## Implementation Roadmap

### Phase 1: Foundation (Free Tier) - Week 1-2

- [ ] Implement `detectRepoType()` with caching
- [ ] Implement file classification system
- [ ] Integrate madge for dependency graph
- [ ] Basic scoring with default weights
- [ ] Single strategy: DIRECT_DEPENDENTS only
- [ ] Basic telemetry (decision made, outcome)

### Phase 2: Full Scoring (Free Tier) - Week 3-4

- [ ] Implement all 7 scoring factors
- [ ] Strategy mapping with thresholds
- [ ] Config file special handling (all handlers)
- [ ] Critical path distance calculation
- [ ] Session coherence analysis
- [ ] Comprehensive telemetry

### Phase 3: Personalization (Pro Tier) - Week 5-6

- [ ] User profile schema and storage
- [ ] Behavior event tracking
- [ ] Weight adjustment calculation
- [ ] Local co-change matrix
- [ ] User feedback UI
- [ ] Server-side profile sync

### Phase 4: Learning Loop (Pro Tier) - Week 7-8

- [ ] Aggregate insights computation (server job)
- [ ] A/B testing framework for weights
- [ ] Weight blending with aggregate
- [ ] Algorithm KPI dashboard
- [ ] Personalization lift measurement

---

## Success Metrics

### Primary Metrics (User Value)

| Metric | Target | Current | Measurement |
|--------|--------|---------|-------------|
| Restore success rate | 95% | TBD | Restores with all needed files |
| User satisfaction | 90% | TBD | 👍 rate on restore feedback |
| Snapshot size efficiency | 35% smaller | TBD | vs. "include everything" |

### Secondary Metrics (Algorithm Health)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Over-inclusion rate | <20% | Restores with "too many files" |
| Strategy distribution | See targets | Match expected distribution |
| Personalization lift | +10% | User-adjusted vs default |

### Operational Metrics

| Metric | Budget | Measurement |
|--------|--------|-------------|
| Decision latency (p95) | <50ms | Time from save to decision |
| Cache hit rate | >80% | Dep graph, user profile |
| Telemetry success | >99% | Events tracked without failure |

---

## Summary

The Snapshot Scope Decision Engine is a three-layer system designed to maximize user value:

1. **Deterministic Layer** (Local, Free): Analyzes repo structure, file types, and dependency graphs to understand the "shape" of the codebase. Fast, cacheable, always runs.

2. **Heuristic Layer** (Local, Free): Combines 7 risk factors with tunable weights to produce a score that maps to a snapshot strategy. Explainable, efficient, privacy-preserving.

3. **Personalization Layer** (Server, Pro): Learns from individual user behavior and aggregate patterns to improve weight accuracy over time. Creates competitive moat through data flywheel.

**The key insight**: The right answer depends on context. A config file in a Turborepo needs different handling than in a single repo. A user who frequently rolls back needs more protection. An AI tool that causes problems for many users should trigger broader snapshots.

By building this layered system with telemetry and feedback loops, SnapBack can start with reasonable defaults and **get smarter over time** - both for individual users and across the entire user base.

This is the core intelligence that enables developers to **code fearlessly at AI speed**.file type risk matrix
4. Layer 3: Personalization & Learning - User profile schema, Bayesian weight updates, aggregate insights computation, and the weight blending formula
5. Specific Scenario Handling - Four detailed scenarios (Turborepo tsconfig, AI burst detection, low-risk isolated edit, personalized high-risk user)
6. Telemetry & Feedback - Privacy-preserving decision tracking, user feedback UI, and algorithm KPIs
7. Privacy Architecture - What stays local vs. what's sent to server
8. Performance & Caching - Caching strategy and performance budgets
9. Implementation Roadmap - 4-phase plan (Foundation → Full Scoring → Personalization → Learning Loop)
10. Success Metrics - Primary, secondary, and operational metrics with targets
This incorporates all the architectural review feedback you provided, including the calibrated blast radius calculation with logarithmic scaling and importer-type weighting, explicit session coherence algorithms, and empirical data-driven optimization approaches.
