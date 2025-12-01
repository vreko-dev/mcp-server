# TypeScript Project References - TDD Implementation Plan

## Executive Summary

**Goal**: Implement TypeScript Project References across the monorepo for 30-40% faster incremental builds

**Approach**: Test-Driven Development with multi-agent collaboration

-   System Architect: Design dependency graph and reference structure
-   DevOps Architect: Optimize build pipeline and Turbo integration
-   Quality Engineer: Create validation tests for build correctness
-   Context7: Official TypeScript patterns and best practices

**Expected Outcome**:

-   Incremental compilation (only rebuild changed packages)
-   Faster type checking
-   Better IDE performance
-   Proper dependency tracking

---

## Phase 1: Discovery & Planning (TDD Red Phase)

### 1.1 Understand Current State

**Owner**: System Architect

**Tasks**:

-   [ ] Map current package dependency graph
-   [ ] Identify compilation bottlenecks
-   [ ] Document current build times (baseline metrics)
-   [ ] Analyze tsconfig inheritance structure

**Success Criteria**:

-   Dependency graph visualization created
-   Baseline build metrics documented
-   Bottlenecks identified and prioritized

### 1.2 Design Reference Architecture

**Owner**: System Architect + Context7

**Tasks**:

-   [ ] Get TypeScript official documentation on project references
-   [ ] Design optimal reference structure for 23 packages
-   [ ] Plan incremental rollout strategy
-   [ ] Define validation criteria for each phase

**Success Criteria**:

-   Reference structure documented
-   Migration order determined (leaf packages → root)
-   Rollback plan defined

### 1.3 Create Validation Tests (TDD - Write Tests First)

**Owner**: Quality Engineer

**Tasks**:

-   [ ] Create build correctness tests
-   [ ] Create type checking validation tests
-   [ ] Create incremental build verification tests
-   [ ] Create IDE integration tests
-   [ ] Set up performance benchmarking

**Test Suite**:

```typescript
// tests/project-references/build-validation.test.ts
describe("TypeScript Project References", () => {
	test("should build all packages successfully", async () => {
		const result = await runCommand("tsc --build");
		expect(result.exitCode).toBe(0);
	});

	test("should only rebuild changed packages", async () => {
		// Baseline build
		await runCommand("tsc --build");

		// Change single file in leaf package
		await modifyFile("packages/utils/src/index.ts");

		// Rebuild and measure
		const { rebuiltPackages, duration } = await runBuildWithMetrics();

		expect(rebuiltPackages).toContain("@snapback/utils");
		expect(rebuiltPackages.length).toBeLessThan(5); // Should not rebuild all 23
		expect(duration).toBeLessThan(baselineDuration * 0.6); // At least 40% faster
	});

	test("should generate correct declaration files", async () => {
		await runCommand("tsc --build");

		// Verify .d.ts files exist
		expect(fs.existsSync("packages/utils/dist/index.d.ts")).toBe(true);

		// Verify declaration maps exist
		expect(fs.existsSync("packages/utils/dist/index.d.ts.map")).toBe(true);
	});

	test("should maintain type safety across packages", async () => {
		// Introduce type error in leaf package
		await introduceTypeError("packages/utils/src/index.ts");

		// Build should fail with clear error
		const result = await runCommand("tsc --build");
		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("Type error in @snapback/utils");
	});

	test("should clean build artifacts correctly", async () => {
		await runCommand("tsc --build");
		await runCommand("tsc --build --clean");

		expect(fs.existsSync("packages/utils/dist")).toBe(false);
		expect(fs.existsSync("packages/utils/tsconfig.tsbuildinfo")).toBe(
			false
		);
	});
});

// tests/project-references/performance.test.ts
describe("Build Performance", () => {
	let baselineMetrics: BuildMetrics;

	beforeAll(async () => {
		baselineMetrics = await measureCurrentBuildPerformance();
	});

	test("full rebuild should be similar to baseline", async () => {
		const metrics = await measureFullRebuild();
		expect(metrics.duration).toBeLessThanOrEqual(
			baselineMetrics.duration * 1.1
		);
	});

	test("incremental rebuild should be 30-40% faster", async () => {
		await runCommand("tsc --build"); // Initial build
		await modifyFile("packages/utils/src/helper.ts");

		const metrics = await measureIncrementalRebuild();
		const improvement =
			(baselineMetrics.duration - metrics.duration) /
			baselineMetrics.duration;

		expect(improvement).toBeGreaterThanOrEqual(0.3); // At least 30% faster
		expect(metrics.rebuiltPackages.length).toBeLessThan(10);
	});

	test("IDE type checking should be faster", async () => {
		// Simulate IDE type checking (tsserver)
		const metrics = await measureTypeCheckingSpeed();
		expect(metrics.averageResponseTime).toBeLessThan(500); // ms
	});
});
```

**Success Criteria**:

-   All tests written and failing (Red phase)
-   Test coverage includes: correctness, performance, incremental builds
-   Baseline metrics captured

---

## Phase 2: Implementation (TDD Green Phase)

### 2.1 Configure Root Project

**Owner**: DevOps Architect

**Tasks**:

-   [ ] Update root tsconfig.json with project references
-   [ ] Configure solution-style tsconfig
-   [ ] Set up clean/build scripts

**Implementation**:

```json
// tsconfig.json (root)
{
	"files": [],
	"references": [
		{ "path": "./config" },
		{ "path": "./packages/utils" },
		{ "path": "./packages/logs" },
		{ "path": "./packages/database" },
		{ "path": "./packages/storage" },
		{ "path": "./packages/auth" },
		{ "path": "./packages/payments" },
		{ "path": "./packages/mail" },
		{ "path": "./packages/api" },
		{ "path": "./apps/web" },
		{ "path": "./apps/cli" },
		{ "path": "./apps/vscode" }
	]
}
```

**Validation**: Run tests - should still fail but with different errors

### 2.2 Configure Leaf Packages (No Dependencies)

**Owner**: DevOps Architect
**Priority**: Phase 1 (Start here)

**Packages**:

-   `config`
-   `packages/utils`
-   `packages/logs`
-   `packages/contracts`

**Implementation Pattern**:

```json
// packages/utils/tsconfig.json
{
	"extends": "@snapback/tsconfig/base.json",
	"compilerOptions": {
		"composite": true,
		"declaration": true,
		"declarationMap": true,
		"sourceMap": true,
		"outDir": "./dist",
		"rootDir": "./src",
		"tsBuildInfoFile": "./tsconfig.tsbuildinfo"
	},
	"include": ["src/**/*"],
	"exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

**Validation**:

-   Run tests for leaf packages
-   Verify .d.ts and .d.ts.map files generated
-   Check tsbuildinfo file created

### 2.3 Configure Mid-Level Packages (1-2 Dependencies)

**Owner**: DevOps Architect
**Priority**: Phase 2

**Packages**:

-   `packages/storage` (depends on: config, logs)
-   `packages/database` (depends on: config)
-   `packages/i18n` (depends on: config) [if exists]

**Implementation Pattern**:

```json
// packages/storage/tsconfig.json
{
	"extends": "@snapback/tsconfig/base.json",
	"compilerOptions": {
		"composite": true,
		"declaration": true,
		"declarationMap": true,
		"outDir": "./dist",
		"rootDir": "./src"
	},
	"include": ["src/**/*"],
	"references": [{ "path": "../config" }, { "path": "../logs" }]
}
```

**Validation**:

-   Run tests for mid-level packages
-   Verify incremental builds work
-   Check only changed packages rebuild

### 2.4 Configure High-Level Packages (3+ Dependencies)

**Owner**: DevOps Architect
**Priority**: Phase 3

**Packages**:

-   `packages/auth` (depends on: config, database, logs, mail, payments, utils)
-   `packages/api` (depends on: ai, auth, config, database, logs, mail, payments, storage, utils)
-   `packages/mail` (depends on: config, logs)
-   `packages/payments` (depends on: config, database, logs)

**Implementation Pattern**:

```json
// packages/auth/tsconfig.json
{
	"extends": "@snapback/tsconfig/base.json",
	"compilerOptions": {
		"composite": true,
		"declaration": true,
		"declarationMap": true,
		"outDir": "./dist",
		"rootDir": "./src"
	},
	"include": ["src/**/*"],
	"references": [
		{ "path": "../config" },
		{ "path": "../database" },
		{ "path": "../logs" },
		{ "path": "../mail" },
		{ "path": "../payments" },
		{ "path": "../utils" }
	]
}
```

### 2.5 Configure Application Packages

**Owner**: DevOps Architect + Frontend Architect (for apps/web)
**Priority**: Phase 4

**Packages**:

-   `apps/web` (Next.js - special handling)
-   `apps/cli`
-   `apps/vscode`

**Next.js Special Handling**:

```json
// apps/web/tsconfig.json
{
	"extends": "@snapback/tsconfig/nextjs.json",
	"compilerOptions": {
		"composite": true,
		"declaration": true,
		"declarationMap": true,
		"outDir": "./dist",
		"rootDir": "./"
	},
	"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
	"references": [
		{ "path": "../../config" },
		{ "path": "../../packages/api" },
		{ "path": "../../packages/auth" },
		{ "path": "../../packages/database" },
		{ "path": "../../packages/logs" },
		{ "path": "../../packages/mail" },
		{ "path": "../../packages/payments" },
		{ "path": "../../packages/storage" },
		{ "path": "../../packages/utils" }
	]
}
```

### 2.6 Update Build Scripts

**Owner**: DevOps Architect

**Package.json Updates**:

```json
{
	"scripts": {
		"build": "tsc --build",
		"build:watch": "tsc --build --watch",
		"clean": "tsc --build --clean",
		"type-check": "tsc --build --noEmit"
	}
}
```

**Turbo Integration**:

```json
// turbo.json - already optimized, just verify compatibility
{
	"tasks": {
		"build": {
			"outputs": [
				"dist/**",
				"*.tsbuildinfo" // Add this
			]
		}
	}
}
```

---

## Phase 3: Validation & Refinement (TDD Green → Refactor)

### 3.1 Run Test Suite

**Owner**: Quality Engineer

**Tasks**:

-   [ ] Run all project reference tests
-   [ ] Verify all tests pass (Green phase achieved)
-   [ ] Document any failing tests and fixes needed

### 3.2 Performance Benchmarking

**Owner**: DevOps Architect + Quality Engineer

**Metrics to Collect**:

```bash
# Baseline (before project references)
time pnpm type-check  # Record time
time pnpm build       # Record time

# After project references
time pnpm type-check  # Should be similar or faster
time pnpm build       # Should be similar

# Incremental (the real test)
# 1. Full build
time pnpm build

# 2. Modify single file in leaf package
echo "// comment" >> packages/utils/src/index.ts

# 3. Rebuild
time pnpm build  # Should be 30-40% faster

# 4. Modify file in mid-level package
echo "// comment" >> packages/database/src/index.ts

# 5. Rebuild
time pnpm build  # Should rebuild only dependent packages
```

**Success Criteria**:

-   Full rebuild: ≤10% slower than baseline (acceptable tradeoff)
-   Incremental rebuild: ≥30% faster than baseline
-   Only changed packages + dependents rebuild

### 3.3 IDE Integration Verification

**Owner**: Quality Engineer

**Tasks**:

-   [ ] Test VSCode TypeScript integration
-   [ ] Verify go-to-definition works across packages
-   [ ] Verify auto-imports work correctly
-   [ ] Check error reporting is accurate
-   [ ] Measure IDE responsiveness

### 3.4 CI/CD Integration

**Owner**: DevOps Architect

**Tasks**:

-   [ ] Update CI build scripts
-   [ ] Configure caching for .tsbuildinfo files
-   [ ] Verify CI builds are faster
-   [ ] Test clean builds in CI environment

---

## Phase 4: Optimization & Documentation (TDD Refactor)

### 4.1 Optimize tsconfig Settings

**Owner**: DevOps Architect + Context7

**Tasks**:

-   [ ] Review TypeScript compiler options for composite projects
-   [ ] Optimize incremental build settings
-   [ ] Configure proper source maps
-   [ ] Set up declaration map generation

### 4.2 Documentation

**Owner**: System Architect

**Tasks**:

-   [ ] Update CLAUDE.md with project references info
-   [ ] Document build commands
-   [ ] Create troubleshooting guide
-   [ ] Update developer onboarding docs

**Documentation Template**:

```markdown
## Building with Project References

### Full Build

\`\`\`bash
pnpm build # Uses tsc --build
\`\`\`

### Incremental Build

\`\`\`bash

# Just run build again - only changed packages rebuild

pnpm build
\`\`\`

### Clean Build

\`\`\`bash
pnpm clean # Removes dist/ and .tsbuildinfo files
pnpm build
\`\`\`

### Watch Mode

\`\`\`bash
pnpm build:watch # Rebuilds on file changes
\`\`\`

### Troubleshooting

**Issue**: "Cannot find module" errors
**Solution**: Run `pnpm build` to generate declaration files

**Issue**: Stale type definitions
**Solution**: Run `pnpm clean && pnpm build`

**Issue**: Circular dependency error
**Solution**: Check tsconfig references - they must form a DAG
\`\`\`
```

### 4.3 Performance Report

**Owner**: Quality Engineer + DevOps Architect

**Tasks**:

-   [ ] Compare before/after metrics
-   [ ] Create performance dashboard
-   [ ] Document improvements achieved
-   [ ] Identify further optimization opportunities

**Report Template**:

```markdown
## TypeScript Project References - Performance Report

### Build Performance

-   **Full Build**: X.Xs (baseline: Y.Ys) - Z% change
-   **Incremental Build**: X.Xs (baseline: Y.Ys) - Z% faster ✅
-   **Type Check**: X.Xs (baseline: Y.Ys) - Z% change

### Developer Experience

-   **IDE Responsiveness**: Improved ✅
-   **Error Detection**: Faster ✅
-   **Go-to-Definition**: Works across packages ✅

### Build Efficiency

-   **Average Files Rebuilt**: X/23 packages
-   **Cache Hit Rate**: Y%
-   **Disk Space (.tsbuildinfo)**: XMB

### Recommendations

-   [Any additional optimizations discovered]
    \`\`\`
```

---

## Risk Mitigation

### Rollback Plan

**If implementation fails**:

1. Revert all tsconfig.json changes
2. Remove `composite: true` from package configs
3. Remove references from root tsconfig
4. Restore original build scripts
5. Clear any .tsbuildinfo files

**Rollback Command**:

```bash
git checkout HEAD -- '**/tsconfig.json' turbo.json
pnpm clean
pnpm install
```

### Known Risks

**Risk 1**: Next.js compatibility with composite projects

-   **Mitigation**: Test apps/web separately in isolated branch
-   **Fallback**: Keep apps/web out of project references initially

**Risk 2**: Circular dependencies

-   **Mitigation**: System architect maps dependency graph first
-   **Detection**: TypeScript will error on circular references

**Risk 3**: CI/CD cache issues

-   **Mitigation**: Document .tsbuildinfo caching strategy
-   **Fallback**: Disable incremental builds in CI if needed

---

## Success Metrics

### Must Have (MVP)

-   [ ] All packages build successfully with `tsc --build`
-   [ ] Incremental builds are ≥30% faster than baseline
-   [ ] All existing tests pass
-   [ ] IDE integration works correctly

### Should Have

-   [ ] Full rebuild time ≤ baseline time
-   [ ] Clear error messages for type errors
-   [ ] Documentation complete
-   [ ] CI/CD integrated

### Nice to Have

-   [ ] Performance dashboard
-   [ ] Automated performance regression tests
-   [ ] Further optimization opportunities identified

---

## Agent Responsibilities

### System Architect

-   Design dependency graph
-   Plan migration order
-   Document architecture decisions
-   Review final implementation

### DevOps Architect

-   Implement tsconfig changes
-   Update build scripts
-   Integrate with Turbo
-   Optimize CI/CD pipeline

### Frontend Architect

-   Handle apps/web Next.js specifics
-   Verify client-side build optimization
-   Test development experience

### Quality Engineer

-   Write validation tests (TDD)
-   Create performance benchmarks
-   Verify correctness
-   Generate performance reports

### Backend Architect

-   Review API package configuration
-   Verify server-side build correctness
-   Test package dependency resolution

---

## Timeline

**Total Estimated Time**: 3-4 hours

-   **Phase 1** (Discovery): 30 minutes
-   **Phase 2** (Implementation): 1.5 hours
    -   Leaf packages: 20 min
    -   Mid-level: 30 min
    -   High-level: 30 min
    -   Apps: 30 min
-   **Phase 3** (Validation): 45 minutes
-   **Phase 4** (Optimization): 45 minutes

**Incremental Delivery**:

-   After Phase 2.2: Leaf packages working (can commit)
-   After Phase 2.3: Mid-level packages working (can commit)
-   After Phase 2.4: High-level packages working (can commit)
-   After Phase 2.5: Full system working (final commit)

---

## Next Steps

1. **Get Context7 TypeScript documentation** on project references
2. **Launch system-architect** to map dependency graph
3. **Launch quality-engineer** to create test suite
4. **Launch devops-architect** to implement incrementally
5. **Validate and iterate** until all tests pass

**Ready to proceed with TDD implementation?**
