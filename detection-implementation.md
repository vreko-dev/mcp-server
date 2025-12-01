# SnapBack Detection Engine: Implementation Prompt

You are an elite TypeScript/VS Code extension engineer implementing a high-performance AI code detection system. This is a **critical production feature** that must be invisible, fast, and accurate.

## 🎯 Mission

Implement the **Pattern Detection System** for SnapBack - a VS Code extension that detects when AI coding assistants make potentially problematic changes (secrets, mocks in production, missing dependencies).

## 📋 Context & Constraints

**Project Structure:**
- Monorepo with `packages/core` (detection engine) and `apps/vscode` (extension)
- Zero new dependencies - use existing catalog only
- TypeScript strict mode, no `any` types
- Target: <200ms P95 latency, <100MB memory, >90% test coverage

**Available Libraries (Already in catalog):**
- `@typescript-eslint/parser` - TypeScript AST parsing
- `esprima` - JavaScript AST fallback
- `zod` - Schema validation
- `lru-cache` - Result caching
- `simple-git` - Git context
- `chokidar` - File watching
- `vitest` - Testing framework
- `memfs` - Mock FS for tests

**Existing Architecture:**
- `Guardian` class in `packages/core` - plugin system already exists
- `SaveHandler` in `apps/vscode/src/handlers` - handles file saves
- MCP server in `apps/mcp-server` - backend analysis

## 🚀 Your Mission: Red-Green-Refactor Implementation

### Phase 1: Deep Research & Planning (Use Sequential Thinking)

**BEFORE writing ANY code, complete this research phase:**

1. **Use context7 to research each library:**
   ```
   - @typescript-eslint/parser: AST node types, visitor patterns, performance characteristics
   - esprima: Fallback scenarios, tolerance mode, error handling
   - lru-cache: Optimal cache sizes, eviction strategies, memory profiling
   - simple-git: .gitignore integration, performance considerations
   ```

2. **Sequential thinking analysis:**
   - How does Guardian's plugin system work? (examine existing code)
   - What AST traversal patterns are already used in the codebase?
   - What are the performance bottlenecks in file watching/analysis?
   - How should errors propagate without breaking the extension?

3. **Design decisions to make:**
   - AST parser selection strategy (when TS vs JS?)
   - Cache invalidation strategy (file changes, memory pressure?)
   - Error boundaries (fail gracefully vs. halt analysis?)
   - Debouncing strategy (how long? per-file or global?)

4. **Add to internal todolist:**
   ```
   [ ] Phase 1: Core Infrastructure
     [ ] 1.1: Directory structure & types
     [ ] 1.2: Entropy calculator (20 lines, Shannon formula)
     [ ] 1.3: AST helpers (parser selection, import extraction)
     [ ] 1.4: Package.json finder (cache, traverse up)
   
   [ ] Phase 2: Secret Detection Plugin
     [ ] 2.1: RED - Write 20 failing tests
     [ ] 2.2: GREEN - Implement detection logic
     [ ] 2.3: REFACTOR - Optimize & document
   
   [ ] Phase 3: Mock Replacement Plugin
     [ ] 3.1: RED - Write 15 failing tests
     [ ] 3.2: GREEN - Implement detection logic
     [ ] 3.3: REFACTOR - Optimize & document
   
   [ ] Phase 4: Phantom Dependency Plugin
     [ ] 4.1: RED - Write 18 failing tests
     [ ] 4.2: GREEN - Implement detection logic
     [ ] 4.3: REFACTOR - Optimize & document
   
   [ ] Phase 5: Integration
     [ ] 5.1: MCP server hookup
     [ ] 5.2: VS Code SaveHandler integration
     [ ] 5.3: Diagnostics & quick fixes
   
   [ ] Phase 6: Performance & Polish
     [ ] 6.1: Performance profiling (<200ms target)
     [ ] 6.2: Memory profiling (<100MB target)
     [ ] 6.3: Documentation & examples
   ```

### Phase 2: RED - Tests First (Start Here)

**For EACH plugin, write comprehensive tests BEFORE implementation:**

#### Secret Detection Tests (20 tests minimum):
```typescript
describe('SecretDetectionPlugin', () => {
  // Positive cases (should detect)
  - AWS access keys (AKIA...)
  - GitHub tokens (ghp_...)
  - OpenAI API keys (sk-...)
  - JWT tokens
  - Private keys
  - Database connection strings
  - High entropy strings (>4.5)
  
  // Negative cases (should NOT flag)
  - UUIDs
  - Timestamps
  - .env.example files
  - Test files
  - Commented-out secrets
  - Placeholder values (<YOUR_KEY>)
  - Git-ignored files
  
  // Edge cases
  - Multiline strings
  - Template literals
  - Concatenated strings
  - Base64 encoded
});
```

#### Mock Replacement Tests (15 tests minimum):
```typescript
describe('MockReplacementPlugin', () => {
  // Positive cases
  - jest.mock() in src/
  - vi.mock() in production
  - @testing-library imports outside tests
  - Inline mock objects in services
  
  // Negative cases
  - Mocks in __tests__/
  - Mocks in .test.ts files
  - Legitimate factory patterns
  - Dependency injection patterns
  
  // Edge cases
  - Dynamic imports
  - Conditional mocking
  - Type-only imports
});
```

#### Phantom Dependency Tests (18 tests minimum):
```typescript
describe('PhantomDependencyPlugin', () => {
  // Positive cases
  - Import without package.json entry
  - Scoped packages (@org/pkg)
  - Subpath imports (lodash/map)
  
  // Negative cases
  - Node.js built-ins (fs, path, http)
  - Monorepo workspace packages (@snapback/*)
  - Type-only imports (@types/*)
  - DevDependencies in src/
  
  // Edge cases
  - Missing package.json
  - Malformed package.json
  - Dynamic imports
  - Relative imports
  - Nested dependencies
});
```

**Quality Standards for Tests:**
- Use descriptive test names: `it('should detect AWS access key in multiline string')`
- Test both success and failure paths
- Use `memfs` for file system mocking
- Include performance assertions: `expect(duration).toBeLessThan(100)`
- Test memory leaks: track cache sizes
- Use realistic code fixtures from the project documents

### Phase 3: GREEN - Minimal Implementation

**Implementation Principles:**
1. **Simplicity first** - No premature optimization
2. **Fail gracefully** - Return empty results on errors, never crash
3. **Type safety** - Strict TypeScript, no `any`
4. **Observable** - Log key decisions for debugging
5. **Testable** - Pure functions, dependency injection

#### Core Infrastructure:

**1. Entropy Calculator (`utils/entropy.ts`):**
```typescript
/**
 * Calculate Shannon entropy: -Σ(p(x) * log2(p(x)))
 * High entropy (>4.5) indicates randomness
 */
export function calculateEntropy(str: string): number {
  // 20 lines max - keep it simple
  // Handle empty string
  // Use Map for frequency counting
  // Return 0-8 range (theoretical max for byte entropy)
}
```

**2. AST Helpers (`utils/ast-helpers.ts`):**
```typescript
/**
 * Parse code with automatic TypeScript/JavaScript detection
 * Falls back gracefully on parse errors
 */
export function parseCode(
  content: string, 
  filePath: string
): AST | null {
  // Detect .ts/.tsx/.js/.jsx from extension
  // Try @typescript-eslint/parser first for TS
  // Fall back to esprima for JS
  // Return null on parse failure (don't throw)
  // Log parse failures for debugging
}

/**
 * Extract import specifiers from AST
 * Handles: import X from 'y'; import {A,B} from 'y'; import * as Y from 'y'
 */
export function extractImports(ast: AST): string[] {
  // Use visitor pattern
  // Support ImportDeclaration nodes
  // Extract module specifiers only
  // Handle dynamic imports? (TBD - may need to skip)
}

/**
 * Detect test files by path patterns
 */
export function isTestFile(filePath: string): boolean {
  // Match: __tests__/, *.test.*, *.spec.*, /tests/
}
```

**3. Package.json Finder (`utils/package-parser.ts`):**
```typescript
/**
 * Find nearest package.json by traversing up directory tree
 * Caches results by directory path
 */
const cache = new LRUCache<string, PackageJson>({ max: 100 });

export function findPackageJson(filePath: string): PackageJson | null {
  // Extract directory from filePath
  // Check cache first
  // Traverse up to root
  // Parse with try/catch
  // Cache valid results
  // Return null if not found
}
```

#### Plugin Implementations:

**Use this structure for ALL plugins:**
```typescript
export class XxxPlugin implements AnalysisPlugin {
  readonly name = 'PluginName';
  
  async analyze(
    content: string, 
    filePath?: string
  ): Promise<AnalysisResult> {
    // 1. Early exits (skip test files, etc.)
    
    // 2. Parse AST (with fallback)
    
    // 3. Run detection logic
    
    // 4. Calculate score (0-1 range)
    
    // 5. Determine severity (critical/high/medium/low)
    
    // 6. Return structured result
    return {
      score: Math.min(totalScore, 1.0),
      factors: [...],
      recommendations: [...],
      severity: '...'
    };
  }
  
  // Private helper methods
}
```

**Key Implementation Notes:**
- **Secret Detection**: Pattern matching + entropy analysis (Layer 1 + Layer 2)
- **Mock Replacement**: AST traversal for test framework imports + mock function calls
- **Phantom Dependency**: Import extraction + package.json comparison + built-in check

### Phase 4: REFACTOR - Optimize & Polish

**After tests pass, optimize for:**

1. **Performance:**
   - Add LRU caching for AST results (cache by file content hash)
   - Debounce analysis (500ms after last change)
   - Use WeakMap for memory management
   - Profile with `vitest --profile`

2. **Error Handling:**
   - Wrap all async operations in try/catch
   - Log errors without throwing
   - Provide fallback regex-based detection if AST fails
   - Implement circuit breaker pattern (skip after 3 consecutive failures)

3. **Code Quality:**
   - Extract magic numbers to constants
   - Add comprehensive JSDoc with examples
   - Use early returns for readability
   - Keep functions <50 lines
   - Extract complex conditions to named functions

4. **DX/UX:**
   - Provide actionable recommendations
   - Include "why" in factor descriptions
   - Make diagnostics dismissable
   - Add quick-fix code actions
   - Support configuration overrides

### Phase 5: Integration

**MCP Server (`apps/mcp-server/src/index.ts`):**
```typescript
// Initialize Guardian with all plugins
const guardian = new Guardian();
guardian.addPlugin(new SecretDetectionPlugin());
guardian.addPlugin(new MockReplacementPlugin());
guardian.addPlugin(new PhantomDependencyPlugin());

// Existing MCP tool remains unchanged
// Guardian.analyze() aggregates all plugin results
```

**VS Code Extension (`apps/vscode/src/handlers/SaveHandler.ts`):**
```typescript
export class SaveHandler {
  private guardian: Guardian;
  private diagnosticCollection: vscode.DiagnosticCollection;
  
  // On file save:
  // 1. Get document content
  // 2. Run guardian.analyze()
  // 3. Convert results to VS Code diagnostics
  // 4. Show in Problems panel
  // 5. Debounce (don't analyze on every keystroke)
}
```

**Code Action Provider (`apps/vscode/src/providers/PatternCodeActionProvider.ts`):**
```typescript
// Provide quick fixes:
// - "Add to package.json" for phantom dependencies
// - "Move to .env" for secrets
// - "Move to test directory" for mocks
```

## 🎯 Success Criteria

**Must achieve ALL of these:**

- [ ] All 53+ tests passing (20+15+18)
- [ ] >90% code coverage
- [ ] <200ms P95 analysis latency
- [ ] <100MB memory usage
- [ ] Zero crashes in 1000 file analysis
- [ ] False positive rate <5% (user testing)
- [ ] GitHub/Vercel code review approved
- [ ] Full JSDoc documentation
- [ ] Integration tests pass
- [ ] Works with real codebase

## 🚦 Execution Strategy

**Use this workflow:**

1. **Research Phase** (2 hours):
   - Use context7 to deeply understand each library
   - Use sequential thinking to design architecture
   - Update internal todolist with detailed tasks

2. **For Each Plugin** (RED → GREEN → REFACTOR):
   - RED: Write all tests first (1 hour)
   - GREEN: Minimal implementation (2 hours)
   - REFACTOR: Optimize & document (1 hour)
   - Total: ~4 hours per plugin

3. **Integration Phase** (2 hours):
   - Hook up to MCP server
   - Integrate with VS Code extension
   - Test end-to-end

4. **Performance Phase** (2 hours):
   - Profile and optimize
   - Memory leak testing
   - Load testing

5. **Documentation Phase** (1 hour):
   - Update README
   - Write usage examples
   - Document configuration

## 💡 Key Principles

**Invisible:** User should never notice the analysis happening
**Fast:** Strike within 200ms, show results instantly
**Smart:** High accuracy, low false positives
**Safe:** Never crash, always fail gracefully
**Simple:** Prefer clarity over cleverness
**Tested:** Every edge case covered

## 🎬 Start Command

Begin with:
1. Use context7 to research `@typescript-eslint/parser` API
2. Use sequential thinking to design AST traversal strategy
3. Add Phase 1 tasks to internal todolist
4. Start RED phase: Write first 5 tests for SecretDetectionPlugin

**Remember:** Tests first, always. No code without a failing test.

---

**Ready to build a world-class detection engine? Start your research phase now!** 🚀