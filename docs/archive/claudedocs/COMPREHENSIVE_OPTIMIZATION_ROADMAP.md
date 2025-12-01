# Comprehensive Turborepo/PNPM Optimization Roadmap

## Executive Summary

This roadmap consolidates architectural analyses from 5 specialized perspectives (backend, frontend, devops, quality, VSCode extension) into a prioritized implementation plan. The goal is to reduce complexity, improve performance, and eliminate technical debt across the SnapBack monorepo.

**Expected Impact**:

-   **Bundle Size Reduction**: 9.8MB → 2.5MB (74% reduction) for web app
-   **VSCode Extension**: 780KB → 280KB (64% reduction)
-   **Build Performance**: 30-40% faster with optimized Turbo cache + TypeScript project references
-   **Test Quality**: Eliminate anti-patterns, reduce flakiness, improve maintainability
-   **Developer Experience**: Simpler architecture, fewer abstractions, better type safety

---

## Phase 1: Critical Foundation (High Impact, Low Effort)

### 1.1 Resolve Dependency Management Issues

**Priority**: 🔴 Critical
**Effort**: Low (30 minutes)
**Impact**: Unblocks all other work

**Tasks**:

-   [ ] Fix `tsx` catalog entry in pnpm-workspace.yaml
-   [ ] Run `pnpm install` successfully
-   [ ] Verify all workspace dependencies resolve correctly
-   [ ] Document any version conflicts found

**Implementation**:

```yaml
# pnpm-workspace.yaml - add missing catalog entry
tsx: 4.19.2 # or appropriate version
```

### 1.2 Clean Up Workspace Hygiene

**Priority**: 🟡 Important
**Effort**: Low (15 minutes)
**Impact**: Prevents confusion, reduces clutter

**Tasks**:

-   [ ] Remove temporary summary files from root:
    -   COMPLETE_FIX_SUMMARY.md
    -   CONVERSION_OPTIMIZATION_README.md
    -   FIXES_SUMMARY.md, FIX_SUMMARY.md
    -   MIGRATION_STATUS.md, MIGRATION_SUMMARY.md
    -   MIGRATION_TEST_PLAN.md
    -   MONOREPO_FLATTENING_IMPLEMENTATION_SUMMARY.md
    -   SHARED_INFRASTRUCTURE_OPTIMIZATION_PLAN.md
    -   TDD_MONOREPO_FLATTENING_SUMMARY.md
    -   TESTING_IMPROVEMENTS_SUMMARY.md, TESTING_SUMMARY.md
    -   all-tests-results.txt, rate-limiter-results.txt, test-results.txt
-   [ ] Move relevant content to claudedocs/ if needed
-   [ ] Update .gitignore to prevent future clutter

### 1.3 Flatten Next.js Route Structure (Post-i18n Removal)

**Priority**: 🟡 Important
**Effort**: Medium (2 hours)
**Impact**: Simpler routing, better SEO, clearer architecture

**Current Structure** (unnecessary nesting after i18n removal):

```
apps/web/app/
├── (marketing)/
│   └── [locale]/          ← No longer needed
│       ├── (home)/
│       ├── blog/
│       ├── docs/
│       └── legal/
└── (saas)/
    └── app/
```

**Target Structure**:

```
apps/web/app/
├── (marketing)/
│   ├── page.tsx           ← Home
│   ├── blog/
│   ├── docs/
│   └── legal/
└── (saas)/
    └── app/
```

**Implementation Steps**:

1. Move all files from `(marketing)/[locale]/*` up one level
2. Update imports and route references
3. Remove `[locale]` dynamic segment directory
4. Update middleware.ts if needed
5. Test all marketing routes
6. Update any hardcoded route references

**Files to Update**:

-   All files in apps/web/app/(marketing)/[locale]/ → move to (marketing)/
-   apps/web/modules/i18n/routing.ts → simplify or remove
-   Any route helper functions

---

## Phase 2: Backend Architecture Simplification (High Impact, Medium Effort)

### 2.1 Replace oRPC/HONO with Next.js Server Actions

**Priority**: 🟡 Important
**Effort**: High (8-16 hours)
**Impact**: 9.8MB → 2.5MB bundle, simpler architecture, better Next.js integration

**Current Issues**:

-   Over-engineered API layer with oRPC + HONO
-   Duplicate type systems (oRPC schemas + Zod)
-   Large bundle size from API abstractions
-   Complexity in client-server communication

**Benefits of Server Actions**:

-   Native Next.js feature, zero client bundle
-   Direct function calls with type safety
-   Built-in form integration and progressive enhancement
-   Simpler error handling and validation
-   No separate API route layer needed

**Migration Strategy**:

**Phase 2.1a: Audit & Categorize**

-   [ ] Inventory all oRPC procedures in packages/api/modules/
-   [ ] Categorize by type:
    -   **Data Mutations**: Create, Update, Delete operations → Server Actions
    -   **Data Queries**: Read operations → Server Components or Server Actions
    -   **External API Integrations**: Keep as API routes (webhooks, OAuth callbacks)
-   [ ] Identify shared validation logic to preserve

**Phase 2.1b: Migrate High-Value Procedures**

Start with frequently-used mutations:

```typescript
// BEFORE (oRPC):
// packages/api/modules/contact/procedures/submit-contact-form.ts
import { publicProcedure } from "@/orpc/procedures";
import { z } from "zod";

export const submitContactForm = publicProcedure
	.input(
		z.object({
			email: z.string().email(),
			name: z.string(),
			message: z.string(),
		})
	)
	.route({
		method: "POST",
		path: "/contact/submit",
	})
	.handler(async ({ input: { email, name, message } }) => {
		// ... implementation
	});

// AFTER (Server Action):
// apps/web/app/(marketing)/contact/actions.ts
("use server");

import { z } from "zod";

const contactFormSchema = z.object({
	email: z.string().email(),
	name: z.string(),
	message: z.string(),
});

export async function submitContactForm(formData: FormData) {
	const rawData = {
		email: formData.get("email"),
		name: formData.get("name"),
		message: formData.get("message"),
	};

	const validatedData = contactFormSchema.parse(rawData);

	// ... implementation (same logic)

	return { success: true };
}

// Usage in component:
// apps/web/app/(marketing)/contact/page.tsx
import { submitContactForm } from "./actions";

export default function ContactPage() {
	return (
		<form action={submitContactForm}>
			<input name="email" type="email" required />
			<input name="name" required />
			<textarea name="message" required />
			<button type="submit">Send</button>
		</form>
	);
}
```

**Priority Migration Order**:

1. **Contact form** (simple, public, low risk)
2. **Payment operations** (createCustomerPortalLink, handleCheckout)
3. **Organization management** (createOrganization, updateSettings)
4. **User settings** (updateProfile, changePassword)

**Keep as API Routes**:

-   Webhook handlers (Stripe, payment providers)
-   OAuth callbacks (GitHub, Google)
-   Third-party integrations (HubSpot)
-   Public APIs for external consumption

**Phase 2.1c: Update Client Code**

```typescript
// BEFORE (oRPC client):
import { orpcClient } from "@/lib/orpc-client";

const { data } = await orpcClient.contact.submit.mutate({
	email: "user@example.com",
	name: "User",
	message: "Hello",
});

// AFTER (Server Action with React 19 useActionState):
import { useActionState } from "react";
import { submitContactForm } from "./actions";

const [state, formAction, isPending] = useActionState(submitContactForm, null);

<form action={formAction}>{/* form fields */}</form>;
```

**Phase 2.1d: Cleanup**

-   [ ] Remove oRPC dependencies from package.json
-   [ ] Remove HONO dependencies
-   [ ] Delete packages/api/orpc/ directory
-   [ ] Update documentation

**Testing**:

-   [ ] Write integration tests for each migrated Server Action
-   [ ] Test form submissions with JavaScript disabled (progressive enhancement)
-   [ ] Verify error handling and validation messages
-   [ ] Load test critical paths (payments, auth)

### 2.2 Consolidate Database Layer

**Priority**: 🟢 Recommended
**Effort**: Medium (4 hours)
**Impact**: Simpler architecture, single source of truth

**Current Issue**: Dual ORM setup (Drizzle + Supabase client)

**Decision Required**: Choose one:

**Option A: Pure Drizzle** (Recommended)

-   Keep Drizzle ORM as single data layer
-   Remove Supabase client dependencies
-   Migrate any Supabase-specific queries to Drizzle
-   Benefits: Type safety, full control, simpler stack

**Option B: Hybrid** (If using Supabase features)

-   Keep Supabase for: Realtime, Storage, Auth (if migrating from Better Auth)
-   Use Drizzle for: All data queries
-   Clear separation: Supabase = services, Drizzle = data

**Implementation** (Option A):

```typescript
// BEFORE:
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(url, key);
const { data } = await supabase.from("users").select("*");

// AFTER:
import { db } from "@snapback/database";
import { users } from "@snapback/database/schema";
const data = await db.select().from(users);
```

**Tasks**:

-   [ ] Audit all Supabase client usage
-   [ ] Migrate queries to Drizzle
-   [ ] Remove @supabase/supabase-js if unused
-   [ ] Update connection configuration

---

## Phase 3: Frontend Optimization (High Impact, Medium Effort)

### 3.1 Optimize Server Component Usage

**Priority**: 🟡 Important
**Effort**: Medium (4 hours)
**Impact**: Reduced client bundle, faster page loads

**Current Issue**: Many pages could be pure Server Components but use client-side data fetching

**Audit Pages** for Server Component opportunities:

```bash
# Find pages with "use client" that might not need it
grep -r "use client" apps/web/app/ --include="*.tsx"
```

**Migration Pattern**:

```typescript
// BEFORE (Client Component with useEffect):
"use client";

import { useEffect, useState } from "react";
import { orpcClient } from "@/lib/orpc-client";

export default function DashboardPage() {
	const [data, setData] = useState(null);

	useEffect(() => {
		orpcClient.dashboard.getData.query().then(setData);
	}, []);

	return <div>{data?.stats}</div>;
}

// AFTER (Server Component):
import { db } from "@snapback/database";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
	const data = await db.query.dashboardStats.findFirst();

	return <DashboardClient initialData={data} />;
}

// dashboard-client.tsx (only if interactivity needed):
("use client");

export function DashboardClient({ initialData }) {
	// Only client logic here (interactions, animations)
	return <div>{initialData.stats}</div>;
}
```

**Pages to Audit**:

-   [ ] apps/web/app/(saas)/app/dashboard/page.tsx
-   [ ] apps/web/app/(saas)/app/(account)/page.tsx
-   [ ] apps/web/app/(marketing)/ pages (most should be Server Components)

### 3.2 Remove Unnecessary Webpack Aliases

**Priority**: 🟢 Recommended
**Effort**: Low (1 hour)
**Impact**: Simpler config, better Next.js optimization

**Current**: apps/web/next.config.ts has custom webpack path aliases

**Review and Remove**:

```typescript
// next.config.ts - audit each alias
webpack: (config) => {
	config.resolve.alias = {
		...config.resolve.alias,
		// Keep only if absolutely necessary
		// Most can be handled by tsconfig.json paths
	};
	return config;
};
```

**Prefer**: Use tsconfig.json paths (already configured):

```json
{
	"paths": {
		"@/*": ["./apps/web/*"],
		"@snapback/*": ["../../packages/*"]
	}
}
```

**Tasks**:

-   [ ] Audit each webpack alias for necessity
-   [ ] Move to tsconfig paths where possible
-   [ ] Remove custom webpack config if empty
-   [ ] Test build succeeds

---

## Phase 4: DevOps & Build Optimization (Medium Impact, Medium Effort)

### 4.1 Optimize Turbo Cache Configuration

**Priority**: 🟡 Important
**Effort**: Low (1 hour)
**Impact**: 20-30% faster builds

**Current Issues** in turbo.json:

-   Missing input/output specifications
-   Global env passthrough too permissive
-   No dependency-based invalidation

**Optimized Configuration**:

```json
{
	"$schema": "https://turbo.build/schema.json",
	"tasks": {
		"build": {
			"dependsOn": ["^build"],
			"inputs": [
				"$TURBO_DEFAULT$",
				".env.production.local",
				".env.local",
				".env.production",
				".env"
			],
			"outputs": [".next/**", "!.next/cache/**", "dist/**"],
			"env": ["NEXT_PUBLIC_*", "DATABASE_URL", "NODE_ENV"]
		},
		"dev": {
			"cache": false,
			"persistent": true
		},
		"lint": {
			"inputs": [
				"**/*.ts",
				"**/*.tsx",
				"**/*.js",
				"**/*.jsx",
				"biome.json",
				"package.json"
			],
			"outputs": []
		},
		"type-check": {
			"dependsOn": ["^build"],
			"inputs": ["**/*.ts", "**/*.tsx", "tsconfig.json", "package.json"],
			"outputs": []
		},
		"test": {
			"inputs": [
				"**/*.test.ts",
				"**/*.test.tsx",
				"**/*.spec.ts",
				"vitest.config.ts"
			],
			"outputs": ["coverage/**"]
		}
	}
}
```

**Benefits**:

-   Precise cache invalidation
-   Only necessary env vars exposed
-   Better parallelization
-   Faster CI builds

### 4.2 Enable TypeScript Project References

**Priority**: 🟢 Recommended
**Effort**: Medium (3 hours)
**Impact**: 30-40% faster incremental builds, better IDE performance

**Current**: All packages compile independently, no incremental benefits

**Target**: Composite projects with project references

**Implementation**:

**Step 1**: Update root tsconfig.json

```json
{
	"files": [],
	"references": [
		{ "path": "./apps/web" },
		{ "path": "./packages/api" },
		{ "path": "./packages/database" },
		{ "path": "./packages/auth" },
		{ "path": "./packages/payments" },
		{ "path": "./packages/mail" },
		{ "path": "./packages/storage" },
		{ "path": "./packages/ai" },
		{ "path": "./packages/utils" },
		{ "path": "./packages/logs" },
		{ "path": "./config" }
	]
}
```

**Step 2**: Update each package tsconfig.json

```json
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
	"references": [{ "path": "../database" }, { "path": "../utils" }]
}
```

**Step 3**: Update build scripts

```json
{
	"scripts": {
		"build": "tsc --build",
		"clean": "tsc --build --clean"
	}
}
```

**Step 4**: Add to Turbo pipeline

```json
{
	"tasks": {
		"build": {
			"dependsOn": ["^build"],
			"outputs": ["dist/**", "*.tsbuildinfo"]
		}
	}
}
```

**Benefits**:

-   Incremental compilation (only rebuild changed packages)
-   Faster type checking in IDE
-   Better dependency tracking
-   Reduced CI build times

### 4.3 Optimize PNPM Catalog Usage

**Priority**: 🟢 Recommended
**Effort**: Low (30 minutes)
**Impact**: Version consistency, easier updates

**Review Current Catalog**:

-   [ ] Ensure all shared dependencies use catalog:
-   [ ] Add missing common packages (tsx, etc.)
-   [ ] Document catalog usage in CLAUDE.md

**Add to pnpm-workspace.yaml**:

```yaml
catalogs:
    default:
        # ... existing entries
        tsx: 4.19.2
        # Add other commonly used versions
```

**Enforce Catalog Usage**:

```json
// .npmrc or pnpm config
strict-peer-dependencies=false
prefer-workspace-packages=true
```

---

## Phase 5: Test Quality Improvements (Medium Impact, High Effort)

### 5.1 Fix Excessive Mocking Anti-Pattern

**Priority**: 🟡 Important
**Effort**: High (8 hours)
**Impact**: Reliable tests, catch real bugs

**Current Issues**:

-   Over-reliance on mocks instead of real implementations
-   Tests pass but code fails in production
-   Difficult to refactor (brittle mocks)

**Examples to Fix**:

```typescript
// BEFORE (Mock-heavy):
import { vi } from "vitest";

vi.mock("@snapback/database", () => ({
	db: {
		query: {
			users: {
				findFirst: vi
					.fn()
					.mockResolvedValue({ id: 1, email: "test@example.com" }),
			},
		},
	},
}));

test("getUserProfile returns user", async () => {
	const result = await getUserProfile(1);
	expect(result.email).toBe("test@example.com");
});

// AFTER (Real database with test fixtures):
import { db } from "@snapback/database";
import { createTestUser, cleanupTestData } from "./test-helpers";

beforeEach(async () => {
	await cleanupTestData();
});

test("getUserProfile returns user", async () => {
	// Use real database with test data
	const user = await createTestUser({ email: "test@example.com" });

	const result = await getUserProfile(user.id);

	expect(result.email).toBe("test@example.com");
	expect(result.id).toBe(user.id);
});
```

**Create Test Infrastructure**:

```typescript
// packages/database/__tests__/helpers/test-db.ts
import { db } from "@snapback/database";
import { users, organizations } from "@snapback/database/schema";

export async function cleanupTestData() {
	await db.delete(users).where(/* test user conditions */);
	await db.delete(organizations).where(/* test org conditions */);
}

export async function createTestUser(data: Partial<User>) {
	const [user] = await db
		.insert(users)
		.values({
			email: data.email ?? "test@example.com",
			name: data.name ?? "Test User",
			// ... defaults
		})
		.returning();
	return user;
}

export async function createTestOrganization(userId: string) {
	// ... similar pattern
}
```

**Migration Strategy**:

1. [ ] Create test helper functions for common setup
2. [ ] Set up test database (separate from dev/prod)
3. [ ] Migrate one test file at a time
4. [ ] Start with core domain logic (users, organizations)
5. [ ] Keep mocks only for external services (Stripe, email)

**Files to Fix** (from quality engineer analysis):

-   [ ] apps/web/tests/integration/api-keys.test.ts
-   [ ] apps/web/tests/integration/rate-limiter.test.ts
-   [ ] packages/api tests (check for excessive mocking)

### 5.2 Fix Integration Test Anti-Patterns

**Priority**: 🟡 Important
**Effort**: Medium (4 hours)
**Impact**: Reliable integration tests

**Current Issue**: Mock-based "integration" tests that don't actually integrate

**Example Fix**:

```typescript
// BEFORE (not really integration):
vi.mock("@snapback/database");
vi.mock("@snapback/auth");

test("API endpoint works", async () => {
	const response = await request(app).get("/api/users");
	// This doesn't test real database or auth!
});

// AFTER (real integration):
import { testDb } from "./helpers/test-db";
import { createTestSession } from "./helpers/test-auth";

beforeAll(async () => {
	await testDb.setup();
});

afterAll(async () => {
	await testDb.teardown();
});

test("API endpoint returns real user data", async () => {
	// Real test user in test database
	const user = await createTestUser();
	const session = await createTestSession(user);

	const response = await request(app)
		.get("/api/users")
		.set("Cookie", session.cookie);

	expect(response.body).toMatchObject({
		id: user.id,
		email: user.email,
	});
});
```

### 5.3 Remove Skipped Tests

**Priority**: 🔴 Critical
**Effort**: Low (1 hour)
**Impact**: Actually run all tests

**Tasks**:

-   [ ] Find all skipped tests: `grep -r "test.skip\|it.skip\|describe.skip" apps/ packages/`
-   [ ] For each skipped test:
    -   Fix the underlying issue, OR
    -   Remove the test if no longer relevant, OR
    -   Document why it's skipped with ticket reference

**Never ship skipped tests to main branch**

### 5.4 Establish Testing Standards

**Priority**: 🟡 Important
**Effort**: Low (1 hour)
**Impact**: Prevent future anti-patterns

**Create**: `TESTING.md` in root

```markdown
# Testing Standards

## When to Use Mocks

-   External APIs (Stripe, email providers, OAuth)
-   Time-dependent functions (Date.now(), timers)
-   File system operations (when not testing file I/O)

## When NOT to Use Mocks

-   Internal packages (@snapback/\*)
-   Database operations (use test database)
-   Authentication logic (use test fixtures)

## Test Types

-   **Unit**: Pure functions, business logic (mock external deps)
-   **Integration**: API routes, database operations (real DB, mock external APIs)
-   **E2E**: Full user flows (Playwright, real environment)

## Test Database Setup

-   Use separate test database: `DATABASE_URL_TEST`
-   Clean up after each test
-   Use transactions for isolation
-   Seed with realistic fixtures
```

---

## Phase 6: VSCode Extension Optimization (Medium Impact, Medium Effort)

### 6.1 Split or Tree-Shake @snapback/core Package

**Priority**: 🟡 Important
**Effort**: Medium (4 hours)
**Impact**: 780KB → 280KB bundle (64% reduction)

**Current Issue**: @snapback/core has 20+ dependencies, many unnecessary for VSCode

**Unnecessary Dependencies for VSCode**:

```json
{
	"inquirer": "CLI prompts - VSCode has UI",
	"mermaid": "Diagram generation - 5MB+ unused",
	"madge": "Dependency graphs - dev tool",
	"jscpd": "Code duplication - analyzer",
	"yargs": "CLI argument parsing - N/A",
	"listr2": "CLI task lists - VSCode progress API",
	"pino-pretty": "Pretty logging - dev tool"
}
```

**Option A: Split Package** (Recommended)

```
packages/
├── core/              # Shared core logic
├── core-cli/          # CLI-specific features
└── core-vscode/       # VSCode-specific features
```

**Option B: Enable Tree-Shaking**

```json
// packages/core/package.json
{
	"sideEffects": false,
	"exports": {
		".": {
			"import": "./dist/index.mjs",
			"require": "./dist/index.cjs"
		},
		"./cli": {
			"import": "./dist/cli.mjs"
		},
		"./vscode": {
			"import": "./dist/vscode.mjs"
		}
	}
}
```

Then in VSCode extension:

```typescript
// Only import what's needed
import { coreFeatures } from "@snapback/core/vscode";
```

**Implementation** (Option A - Split Package):

1. [ ] Create new package: `packages/core-cli/`
2. [ ] Move CLI dependencies to core-cli:
    - inquirer, yargs, listr2, pino-pretty
3. [ ] Update VSCode extension to use `@snapback/core` only
4. [ ] Rebuild and measure bundle size
5. [ ] Update documentation

### 6.2 Review VSCode Extension Dependencies

**Priority**: 🟢 Recommended
**Effort**: Low (1 hour)
**Impact**: Smaller bundle, fewer vulnerabilities

**Audit Direct Dependencies**:

```json
{
	"dependencies": {
		"async-lock": "Keep - concurrency control",
		"conf": "Keep - settings storage",
		"inquirer": "❌ Remove - use VSCode UI instead",
		"node-notifier": "Keep - notifications",
		"@snapback/storage": "Review - might be unused",
		"@snapback/telemetry": "Keep - analytics"
	}
}
```

**Replace inquirer with VSCode APIs**:

```typescript
// BEFORE:
import inquirer from "inquirer";

const { choice } = await inquirer.prompt([
	{
		type: "list",
		name: "choice",
		message: "Select option:",
		choices: ["A", "B", "C"],
	},
]);

// AFTER:
import * as vscode from "vscode";

const choice = await vscode.window.showQuickPick(["A", "B", "C"], {
	placeHolder: "Select option:",
});
```

---

## Phase 7: Documentation & Knowledge Transfer

### 7.1 Update CLAUDE.md

**Priority**: 🟡 Important
**Effort**: Low (30 minutes)
**Impact**: Better AI assistance

**Tasks**:

-   [ ] Document namespace change (@repo → @snapback)
-   [ ] Document i18n removal
-   [ ] Update architecture section if oRPC removed
-   [ ] Add testing standards reference
-   [ ] Update build commands if changed

### 7.2 Create Migration Guides

**Priority**: 🟢 Recommended
**Effort**: Low (1 hour)

**Create**:

-   [ ] `docs/migrations/orpc-to-server-actions.md` (if Phase 2 completed)
-   [ ] `docs/migrations/route-structure.md` (if Phase 1.3 completed)
-   [ ] `docs/architecture/testing-strategy.md`

---

## Implementation Timeline

### Week 1: Foundation & Quick Wins

-   ✅ Day 1-2: Phase 1 (dependency fixes, cleanup, route flattening)
-   ✅ Day 3-4: Phase 4.1 (Turbo optimization)
-   ✅ Day 5: Phase 3.2 (webpack cleanup)

### Week 2-3: Backend Migration

-   Day 1-2: Phase 2.1a-b (audit, migrate contact form)
-   Day 3-5: Phase 2.1b cont. (migrate payments, orgs)
-   Day 6-8: Phase 2.1c (update client code)
-   Day 9-10: Phase 2.1d (cleanup, testing)

### Week 4: Frontend & Tests

-   Day 1-2: Phase 3.1 (Server Components)
-   Day 3-5: Phase 5.1-5.3 (test quality)
-   Day 6-7: Phase 5.4 (testing standards)

### Week 5: DevOps & VSCode

-   Day 1-3: Phase 4.2 (TypeScript project references)
-   Day 4-5: Phase 6 (VSCode optimization)
-   Day 6-7: Phase 7 (documentation)

---

## Success Metrics

### Performance

-   [ ] Web bundle size: <3MB (currently 9.8MB)
-   [ ] VSCode extension: <300KB (currently 780KB)
-   [ ] CI build time: <5 minutes (measure current baseline)
-   [ ] Type check time: <30 seconds (measure current)

### Quality

-   [ ] Test coverage: >80%
-   [ ] No skipped tests in main branch
-   [ ] Zero mock-based integration tests
-   [ ] All E2E tests passing

### Developer Experience

-   [ ] `pnpm install` completes without errors
-   [ ] Clear error messages for catalog issues
-   [ ] Documentation up to date
-   [ ] All team members onboarded to new patterns

---

## Risk Mitigation

### High-Risk Changes

1. **oRPC → Server Actions migration**

    - Mitigation: Migrate one module at a time, keep both systems temporarily
    - Rollback: Feature flag to switch back to oRPC

2. **Route structure flattening**

    - Mitigation: Set up redirects from old routes
    - Rollback: Git revert if SEO issues detected

3. **Database consolidation**
    - Mitigation: Test extensively in staging
    - Rollback: Keep Supabase dependencies for 1 sprint

### Testing Strategy

-   Run full E2E suite after each phase
-   Manual QA on staging after Phases 2, 3, 5
-   Performance benchmarks before/after major changes
-   User acceptance testing for Phase 2 (API changes)

---

## Appendix: Analysis Sources

This roadmap consolidates findings from:

-   **Backend Architect**: API simplification, Server Actions migration
-   **Frontend Architect**: Server Components, route optimization
-   **DevOps Architect**: Turbo cache, TypeScript project references
-   **Quality Engineer**: Test anti-patterns, mocking issues
-   **VSCode Extension Analysis**: Bundle optimization, dependency review

All detailed analyses available in `claudedocs/` directory.
