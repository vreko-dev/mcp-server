# Contributing to SnapBack

Thank you for your interest in contributing to SnapBack! This guide will help you get started with development, understand our workflow, and make successful contributions.

## Table of Contents

-   [Getting Started](#getting-started)
-   [Development Setup](#development-setup)
-   [Project Structure](#project-structure)
-   [Development Workflow](#development-workflow)
-   [Coding Standards](#coding-standards)
-   [Testing Guidelines](#testing-guidelines)
-   [Submitting Changes](#submitting-changes)
-   [Architecture Guidelines](#architecture-guidelines)
-   [Release Process](#release-process)

## Getting Started

### Prerequisites

-   **Node.js** >= 18.0.0
-   **pnpm** >= 8.0.0 (install via `npm install -g pnpm`)
-   **Git** >= 2.0.0
-   **Claude Desktop** (optional, for MCP testing)

### First-Time Setup

1. **Fork and clone the repository**

```
git clone https://github.com/YOUR_USERNAME/snapback.git
cd snapback
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your local configuration
```

4. **Build all packages**

```bash
pnpm build
```

5. **Run tests to verify setup**

```bash
pnpm test
```

## Development Setup

### Monorepo Structure

SnapBack is a pnpm workspace monorepo with the following structure:

```
snapback/
├── apps/
│   ├── web/          # Next.js web application (private)
│   └── mcp-server/   # MCP server (public - Apache-2.0)
├── packages/
│   ├── sdk/          # TypeScript SDK (public - Apache-2.0)
│   ├── core/         # Core functionality (public - Apache-2.0)
│   ├── contracts/    # Shared interfaces (public - Apache-2.0)
│   ├── api/          # API server (private)
│   ├── auth/         # Authentication (private)
│   ├── database/     # Database layer (private)
│   ├── logs/         # Logging system (private)
│   ├── mail/         # Email service (private)
│   ├── payments/     # Payment processing (private)
│   ├── analytics/    # Analytics (private)
│   ├── storage/      # Storage abstraction (private)
│   └── telemetry/    # Telemetry (private)
└── tooling/
    └── tsconfig/     # Shared TypeScript configs
```

### Public vs Private Packages

**Public Packages (Apache-2.0):**

-   `packages/sdk` - TypeScript SDK for consumers
-   `packages/core` - Core functionality and algorithms
-   `apps/mcp-server` - MCP protocol server
-   `packages/contracts` - Shared interfaces and types

**Private Packages (UNLICENSED):**

-   All other packages and apps

**Architecture Rule:** Public packages CANNOT import private packages.

### Running Development Servers

```bash
# Web app (Next.js)
pnpm --filter web dev

# MCP Server
pnpm --filter mcp-server dev

# API Server
pnpm --filter api dev

# All services
pnpm dev
```

### Working with Specific Packages

```bash
# Build a specific package
pnpm --filter @snapback/sdk build

# Test a specific package
pnpm --filter @snapback/core test

# Add dependency to a package
pnpm --filter @snapback/sdk add lodash

# Run any script in a package
pnpm --filter web build
```

## Project Structure

### Key Technologies

-   **Monorepo**: pnpm workspaces with Turborepo
-   **Frontend**: Next.js 14 (App Router), React 18, TypeScript
-   **Backend**: Node.js, Express, Prisma ORM
-   **Database**: PostgreSQL (production), SQLite (development)
-   **Testing**: Vitest (unit), Playwright (E2E)
-   **Linting/Formatting**: Biome
-   **Git Hooks**: Lefthook
-   **CI/CD**: GitHub Actions
-   **Versioning**: Changesets (public packages only)

### Important Files

-   `pnpm-workspace.yaml` - Workspace configuration
-   `turbo.json` - Task orchestration configuration
-   `biome.json` - Linting and formatting rules
-   `.lefthook.yml` - Git hooks configuration
-   `.github/workflows/` - CI/CD workflows
-   `.changeset/` - Changeset configurations

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:

-   `feature/` - New features
-   `fix/` - Bug fixes
-   `docs/` - Documentation changes
-   `refactor/` - Code refactoring
-   `test/` - Test additions/improvements
-   `chore/` - Maintenance tasks

### 2. Make Your Changes

-   Write clean, maintainable code following our [coding standards](#coding-standards)
-   Add tests for new functionality
-   Update documentation as needed
-   Follow TypeScript best practices

### 3. Run Quality Checks

```bash
# Lint and format
pnpm check

# Type checking
pnpm typecheck

# Run tests
pnpm test

# Run affected tests only (faster)
pnpm turbo test --filter=[HEAD]
```

### 4. Commit Your Changes

We use [Lefthook](https://github.com/evilmartians/lefthook) for git hooks that automatically:

-   Run linting on staged files
-   Type-check affected packages
-   Check for secrets and API keys
-   Warn about console.log statements
-   Enforce import boundaries

```bash
git add .
git commit -m "feat: add snapshot filtering by date range"
```

**Commit Message Format:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

-   `feat` - New feature
-   `fix` - Bug fix
-   `docs` - Documentation changes
-   `style` - Code style changes (formatting, etc.)
-   `refactor` - Code refactoring
-   `test` - Test additions/improvements
-   `chore` - Maintenance tasks
-   `perf` - Performance improvements

**Examples:**

```
feat(sdk): add snapshot filtering API

Add filterSnapshots() method to SDK with support for date ranges,
trigger types, and custom predicates.

Closes #123
```

### 5. Create a Changeset (for public packages only)

If you modified any public package (`sdk`, `core`, `mcp-server`, `contracts`):

```bash
pnpm changeset
```

Follow the prompts to:

1. Select which packages changed
2. Choose version bump type (major, minor, patch)
3. Write a user-facing changelog message

**Changeset guidelines:**

-   User-facing language (not technical details)
-   Explain impact to consumers
-   Include migration steps for breaking changes

**Example changeset:**

```
---
"@snapback/sdk": minor
---

Add snapshot filtering API with date range and trigger type support
```

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Open a pull request on GitHub with:

-   Clear title describing the change
-   Description of what changed and why
-   Link to related issues
-   Screenshots/videos for UI changes
-   Test plan and results

## Coding Standards

### TypeScript

```typescript
// ✅ Good
export interface SnapshotFilter {
	startDate?: Date;
	endDate?: Date;
	trigger?: TriggerType;
}

export async function filterSnapshots(
	filter: SnapshotFilter
): Promise<Snapshot[]> {
	// Implementation
}

// ❌ Bad
export function filter(opts: any): any {
	// Implementation
}
```

**Rules:**

-   Enable strict mode in tsconfig.json
-   Avoid `any` types - use `unknown` and type guards
-   Prefer interfaces over types for public APIs
-   Export types for public APIs
-   Use explicit return types for functions

### Code Organization

```
// File: packages/sdk/src/client.ts

// 1. Imports (external, then internal)
import { z } from "zod";
import type { Snapshot, SnapshotFilter } from "@snapback/contracts";
import { Guardian } from "@snapback/core";

// 2. Types and interfaces
export interface ClientOptions {
	apiKey: string;
	baseUrl?: string;
}

// 3. Implementation
export class SnapBackClient {
	private readonly apiKey: string;
	private readonly baseUrl: string;

	constructor(options: ClientOptions) {
		this.apiKey = options.apiKey;
		this.baseUrl = options.baseUrl ?? "https://api.snapback.ai";
	}

	async createSnapshot(): Promise<Snapshot> {
		// Implementation
	}
}
```

### Naming Conventions

-   **Files**: `kebab-case.ts` (e.g., `snapshot-manager.ts`)
-   **Classes**: `PascalCase` (e.g., `SnapshotManager`)
-   **Functions/Variables**: `camelCase` (e.g., `createSnapshot`)
-   **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_SNAPSHOT_SIZE`)
-   **Types/Interfaces**: `PascalCase` (e.g., `SnapshotFilter`)

### Error Handling

```
// ✅ Good - Custom error classes
export class SnapshotNotFoundError extends Error {
	constructor(id: string) {
		super(`Snapshot not found: ${id}`);
		this.name = "SnapshotNotFoundError";
	}
}

// ✅ Good - Proper error propagation
export async function getSnapshot(id: string): Promise<Snapshot> {
	const snapshot = await storage.get(id);
	if (!snapshot) {
		throw new SnapshotNotFoundError(id);
	}
	return snapshot;
}

// ❌ Bad - Silent failures
export async function getSnapshot(id: string): Promise<Snapshot | null> {
	try {
		return await storage.get(id);
	} catch {
		return null; // Lost error information!
	}
}
```

### Documentation

````typescript
/**
 * Analyzes code changes for potential risks.
 *
 * @param changes - File changes to analyze
 * @returns Risk assessment with score and recommendations
 * @throws {ValidationError} If changes are invalid
 *
 * @example
 * ```typescript
 * const risk = await guardian.analyze({
 *   files: [
 *     { path: "auth.ts", changeType: "modified" }
 *   ]
 * })
 * console.log(risk.severity) // "low" | "medium" | "high"
 * ```
 */
export async function analyze(changes: Changes): Promise<RiskAssessment> {
	// Implementation
}
````

## Testing Guidelines

### Unit Tests (Vitest)

```typescript
// File: packages/core/src/__tests__/guardian.test.ts
import { describe, it, expect } from "vitest";
import { Guardian } from "../guardian";

describe("Guardian", () => {
	it("should calculate risk score for file changes", () => {
		const guardian = new Guardian();
		const risk = guardian.analyze({
			files: [{ path: "auth.ts", changeType: "modified" }],
		});

		expect(risk.score).toBeGreaterThan(0);
		expect(risk.severity).toBe("medium");
	});

	it("should identify high-risk patterns", () => {
		const guardian = new Guardian();
		const risk = guardian.analyze({
			files: [
				{ path: "config.ts", changeType: "modified" },
				{ path: "auth.ts", changeType: "deleted" },
			],
		});

		expect(risk.severity).toBe("high");
	});
});
```

### Integration Tests

```typescript
// File: packages/sdk/src/__tests__/integration/client.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SnapBackClient } from "../../client";
import { setupTestServer, teardownTestServer } from "./test-utils";

describe("SnapBackClient Integration", () => {
	beforeAll(async () => {
		await setupTestServer();
	});

	afterAll(async () => {
		await teardownTestServer();
	});

	it("should create and retrieve snapshot", async () => {
		const client = new SnapBackClient({ apiKey: "test-key" });

		const created = await client.createCheckpoint();
		expect(created.id).toBeDefined();

		const retrieved = await client.getCheckpoint(created.id);
		expect(retrieved).toEqual(created);
	});
});
```

### E2E Tests (Playwright)

```typescript
// File: apps/web/tests/e2e/snapshot.spec.ts
import { test, expect } from "@playwright/test";

test("create snapshot from dashboard", async ({ page }) => {
	await page.goto("http://localhost:3000/dashboard");

	await page.click("button:text('Create Snapshot')");
	await page.fill("textarea[name='description']", "Test snapshot");
	await page.click("button:text('Save')");

	await expect(page.locator(".snapshot-card")).toContainText("Test snapshot");
});
```

### Test Coverage Requirements

-   **Unit Tests**: Minimum 80% coverage for core logic
-   **Integration Tests**: Critical user flows and API interactions
-   **E2E Tests**: Key user journeys in web app

```

# Contributing to SnapBack

Thank you for your interest in contributing to SnapBack! This guide will help you get started with development, understand our workflow, and make successful contributions.

## Table of Contents

-   [Getting Started](#getting-started)
-   [Development Setup](#development-setup)
-   [Project Structure](#project-structure)
-   [Development Workflow](#development-workflow)
-   [Coding Standards](#coding-standards)
-   [Testing Guidelines](#testing-guidelines)
-   [Submitting Changes](#submitting-changes)
-   [Architecture Guidelines](#architecture-guidelines)
-   [Release Process](#release-process)

## Getting Started

### Prerequisites

-   **Node.js** >= 18.0.0
-   **pnpm** >= 8.0.0 (install via `npm install -g pnpm`)
-   **Git** >= 2.0.0
-   **Claude Desktop** (optional, for MCP testing)

### First-Time Setup

1. **Fork and clone the repository**

```
git clone https://github.com/YOUR_USERNAME/snapback.git
cd snapback
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your local configuration
```

4. **Build all packages**

```bash
pnpm build
```

5. **Run tests to verify setup**

```bash
pnpm test
```

## Development Setup

### Monorepo Structure

SnapBack is a pnpm workspace monorepo with the following structure:

```
snapback/
├── apps/
│   ├── web/          # Next.js web application (private)
│   └── mcp-server/   # MCP server (public - Apache-2.0)
├── packages/
│   ├── sdk/          # TypeScript SDK (public - Apache-2.0)
│   ├── core/         # Core functionality (public - Apache-2.0)
│   ├── contracts/    # Shared interfaces (public - Apache-2.0)
│   ├── api/          # API server (private)
│   ├── auth/         # Authentication (private)
│   ├── database/     # Database layer (private)
│   ├── logs/         # Logging system (private)
│   ├── mail/         # Email service (private)
│   ├── payments/     # Payment processing (private)
│   ├── analytics/    # Analytics (private)
│   ├── storage/      # Storage abstraction (private)
│   └── telemetry/    # Telemetry (private)
└── tooling/
    └── tsconfig/     # Shared TypeScript configs
```

### Public vs Private Packages

**Public Packages (Apache-2.0):**

-   `packages/sdk` - TypeScript SDK for consumers
-   `packages/core` - Core functionality and algorithms
-   `apps/mcp-server` - MCP protocol server
-   `packages/contracts` - Shared interfaces and types

**Private Packages (UNLICENSED):**

-   All other packages and apps

**Architecture Rule:** Public packages CANNOT import private packages.

### Running Development Servers

```bash
# Web app (Next.js)
pnpm --filter web dev

# MCP Server
pnpm --filter mcp-server dev

# API Server
pnpm --filter api dev

# All services
pnpm dev
```

### Working with Specific Packages

```bash
# Build a specific package
pnpm --filter @snapback/sdk build

# Test a specific package
pnpm --filter @snapback/core test

# Add dependency to a package
pnpm --filter @snapback/sdk add lodash

# Run any script in a package
pnpm --filter web build
```

## Project Structure

### Key Technologies

-   **Monorepo**: pnpm workspaces with Turborepo
-   **Frontend**: Next.js 14 (App Router), React 18, TypeScript
-   **Backend**: Node.js, Express, Prisma ORM
-   **Database**: PostgreSQL (production), SQLite (development)
-   **Testing**: Vitest (unit), Playwright (E2E)
-   **Linting/Formatting**: Biome
-   **Git Hooks**: Lefthook
-   **CI/CD**: GitHub Actions
-   **Versioning**: Changesets (public packages only)

### Important Files

-   `pnpm-workspace.yaml` - Workspace configuration
-   `turbo.json` - Task orchestration configuration
-   `biome.json` - Linting and formatting rules
-   `.lefthook.yml` - Git hooks configuration
-   `.github/workflows/` - CI/CD workflows
-   `.changeset/` - Changeset configurations

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:

-   `feature/` - New features
-   `fix/` - Bug fixes
-   `docs/` - Documentation changes
-   `refactor/` - Code refactoring
-   `test/` - Test additions/improvements
-   `chore/` - Maintenance tasks

### 2. Make Your Changes

-   Write clean, maintainable code following our [coding standards](#coding-standards)
-   Add tests for new functionality
-   Update documentation as needed
-   Follow TypeScript best practices

### 3. Run Quality Checks

```bash
# Lint and format
pnpm check

# Type checking
pnpm typecheck

# Run tests
pnpm test

# Run affected tests only (faster)
pnpm turbo test --filter=[HEAD]
```

### 4. Commit Your Changes

We use [Lefthook](https://github.com/evilmartians/lefthook) for git hooks that automatically:

-   Run linting on staged files
-   Type-check affected packages
-   Check for secrets and API keys
-   Warn about console.log statements
-   Enforce import boundaries

```bash
git add .
git commit -m "feat: add snapshot filtering by date range"
```

**Commit Message Format:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

-   `feat` - New feature
-   `fix` - Bug fix
-   `docs` - Documentation changes
-   `style` - Code style changes (formatting, etc.)
-   `refactor` - Code refactoring
-   `test` - Test additions/improvements
-   `chore` - Maintenance tasks
-   `perf` - Performance improvements

**Examples:**

```
feat(sdk): add snapshot filtering API

Add filterSnapshots() method to SDK with support for date ranges,
trigger types, and custom predicates.

Closes #123
```

### 5. Create a Changeset (for public packages only)

If you modified any public package (`sdk`, `core`, `mcp-server`, `contracts`):

```
pnpm changeset
```

Follow the prompts to:

1. Select which packages changed
2. Choose version bump type (major, minor, patch)
3. Write a user-facing changelog message

**Changeset guidelines:**

-   User-facing language (not technical details)
-   Explain impact to consumers
-   Include migration steps for breaking changes

**Example changeset:**

```
---
"@snapback/sdk": minor
---

Add snapshot filtering API with date range and trigger type support
```

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Open a pull request on GitHub with:

-   Clear title describing the change
-   Description of what changed and why
-   Link to related issues
-   Screenshots/videos for UI changes
-   Test plan and results

## Coding Standards

### TypeScript

```typescript
// ✅ Good
export interface SnapshotFilter {
	startDate?: Date;
	endDate?: Date;
	trigger?: TriggerType;
}

export async function filterSnapshots(
	filter: SnapshotFilter
): Promise<Snapshot[]> {
	// Implementation
}

// ❌ Bad
export function filter(opts: any): any {
	// Implementation
}
```

**Rules:**

-   Enable strict mode in tsconfig.json
-   Avoid `any` types - use `unknown` and type guards
-   Prefer interfaces over types for public APIs
-   Export types for public APIs
-   Use explicit return types for functions

### Code Organization

```
// File: packages/sdk/src/client.ts

// 1. Imports (external, then internal)
import { z } from "zod";
import type { Snapshot, SnapshotFilter } from "@snapback/contracts";
import { Guardian } from "@snapback/core";

// 2. Types and interfaces
export interface ClientOptions {
	apiKey: string;
	baseUrl?: string;
};

// 3. Implementation
export class SnapBackClient {
	private readonly apiKey: string;
	private readonly baseUrl: string;

	constructor(options: ClientOptions) {
		this.apiKey = options.apiKey;
		this.baseUrl = options.baseUrl ?? "https://api.snapback.ai";
	}

	async createSnapshot(): Promise<Snapshot> {
		// Implementation
	}
}
```

### Naming Conventions

-   **Files**: `kebab-case.ts` (e.g., `snapshot-manager.ts`)
-   **Classes**: `PascalCase` (e.g., `SnapshotManager`)
-   **Functions/Variables**: `camelCase` (e.g., `createSnapshot`)
-   **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_SNAPSHOT_SIZE`)
-   **Types/Interfaces**: `PascalCase` (e.g., `SnapshotFilter`)

### Error Handling

```
// ✅ Good - Custom error classes
export class SnapshotNotFoundError extends Error {
	constructor(id: string) {
		super(`Snapshot not found: ${id}`);
		this.name = "SnapshotNotFoundError";
	}
}

// ✅ Good - Proper error propagation
export async function getSnapshot(id: string): Promise<Snapshot> {
	const snapshot = await storage.get(id);
	if (!snapshot) {
		throw new SnapshotNotFoundError(id);
	}
	return snapshot;
}

// ❌ Bad - Silent failures
export async function getSnapshot(id: string): Promise<Snapshot | null> {
	try {
		return await storage.get(id);
	} catch {
		return null; // Lost error information!
	}
}
```

### Documentation

````typescript
/**
 * Analyzes code changes for potential risks.
 *
 * @param changes - File changes to analyze
 * @returns Risk assessment with score and recommendations
 * @throws {ValidationError} If changes are invalid
 *
 * @example
 * ```typescript
 * const risk = await guardian.analyze({
 *   files: [
 *     { path: "auth.ts", changeType: "modified" }
 *   ]
 * })
 * console.log(risk.severity) // "low" | "medium" | "high"
 * ```
 */
export async function analyze(changes: Changes): Promise<RiskAssessment> {
	// Implementation
}
````

## Testing Guidelines

### Unit Tests (Vitest)

```typescript
// File: packages/core/src/__tests__/guardian.test.ts
import { describe, it, expect } from "vitest";
import { Guardian } from "../guardian";

describe("Guardian", () => {
	it("should calculate risk score for file changes", () => {
		const guardian = new Guardian();
		const risk = guardian.analyze({
			files: [{ path: "auth.ts", changeType: "modified" }],
		});

		expect(risk.score).toBeGreaterThan(0);
		expect(risk.severity).toBe("medium");
	});

	it("should identify high-risk patterns", () => {
		const guardian = new Guardian();
		const risk = guardian.analyze({
			files: [
				{ path: "config.ts", changeType: "modified" },
				{ path: "auth.ts", changeType: "deleted" },
			],
		});

		expect(risk.severity).toBe("high");
	});
});
```

### Integration Tests

``typescript
// File: packages/sdk/src/__tests__/integration/client.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SnapBackClient } from "../../client";
import { setupTestServer, teardownTestServer } from "./test-utils";

describe("SnapBackClient Integration", () => {
	beforeAll(async () => {
		await setupTestServer();
	});

	afterAll(async () => {
		await teardownTestServer();
	});

	it("should create and retrieve snapshot", async () => {
		const client = new SnapBackClient({ apiKey: "test-key" });

		const created = await client.createCheckpoint();
		expect(created.id).toBeDefined();

		const retrieved = await client.getCheckpoint(created.id);
		expect(retrieved).toEqual(created);
	});
});
```

### E2E Tests (Playwright)

``typescript
// File: apps/web/tests/e2e/snapshot.spec.ts
import { test, expect } from "@playwright/test";

test("create snapshot from dashboard", async ({ page }) => {
	await page.goto("http://localhost:3000/dashboard");

	await page.click("button:text('Create Snapshot')");
	await page.fill("textarea[name='description']", "Test snapshot");
	await page.click("button:text('Save')");

	await expect(page.locator(".snapshot-card")).toContainText("Test snapshot");
});
```

### Test Coverage Requirements

-   **Unit Tests**: Minimum 80% coverage for core logic
-   **Integration Tests**: Critical user flows and API interactions
-   **E2E Tests**: Key user journeys in web app

```

# Contributing to SnapBack

Thank you for your interest in contributing to SnapBack! This guide will help you get started with development, understand our workflow, and make successful contributions.

## Table of Contents

-   [Getting Started](#getting-started)
-   [Development Setup](#development-setup)
-   [Project Structure](#project-structure)
-   [Development Workflow](#development-workflow)
-   [Coding Standards](#coding-standards)
-   [Testing Guidelines](#testing-guidelines)
-   [Submitting Changes](#submitting-changes)
-   [Architecture Guidelines](#architecture-guidelines)
-   [Release Process](#release-process)

## Getting Started

### Prerequisites

-   **Node.js** >= 18.0.0
-   **pnpm** >= 8.0.0 (install via `npm install -g pnpm`)
-   **Git** >= 2.0.0
-   **Claude Desktop** (optional, for MCP testing)

### First-Time Setup

1. **Fork and clone the repository**

```
git clone https://github.com/YOUR_USERNAME/snapback.git
cd snapback
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your local configuration
```

4. **Build all packages**

```bash
pnpm build
```

5. **Run tests to verify setup**

```bash
pnpm test
```

## Development Setup

### Monorepo Structure

SnapBack is a pnpm workspace monorepo with the following structure:

```
snapback/
├── apps/
│   ├── web/          # Next.js web application (private)
│   └── mcp-server/   # MCP server (public - Apache-2.0)
├── packages/
│   ├── sdk/          # TypeScript SDK (public - Apache-2.0)
│   ├── core/         # Core functionality (public - Apache-2.0)
│   ├── contracts/    # Shared interfaces (public - Apache-2.0)
│   ├── api/          # API server (private)
│   ├── auth/         # Authentication (private)
│   ├── database/     # Database layer (private)
│   ├── logs/         # Logging system (private)
│   ├── mail/         # Email service (private)
│   ├── payments/     # Payment processing (private)
│   ├── analytics/    # Analytics (private)
│   ├── storage/      # Storage abstraction (private)
│   └── telemetry/    # Telemetry (private)
└── tooling/
    └── tsconfig/     # Shared TypeScript configs
```

### Public vs Private Packages

**Public Packages (Apache-2.0):**

-   `packages/sdk` - TypeScript SDK for consumers
-   `packages/core` - Core functionality and algorithms
-   `apps/mcp-server` - MCP protocol server
-   `packages/contracts` - Shared interfaces and types

**Private Packages (UNLICENSED):**

-   All other packages and apps

**Architecture Rule:** Public packages CANNOT import private packages.

### Running Development Servers

```bash
# Web app (Next.js)
pnpm --filter web dev

# MCP Server
pnpm --filter mcp-server dev

# API Server
pnpm --filter api dev

# All services
pnpm dev
```

### Working with Specific Packages

```bash
# Build a specific package
pnpm --filter @snapback/sdk build

# Test a specific package
pnpm --filter @snapback/core test

# Add dependency to a package
pnpm --filter @snapback/sdk add lodash

# Run any script in a package
pnpm --filter web build
```

## Project Structure

### Key Technologies

-   **Monorepo**: pnpm workspaces with Turborepo
-   **Frontend**: Next.js 14 (App Router), React 18, TypeScript
-   **Backend**: Node.js, Express, Prisma ORM
-   **Database**: PostgreSQL (production), SQLite (development)
-   **Testing**: Vitest (unit), Playwright (E2E)
-   **Linting/Formatting**: Biome
-   **Git Hooks**: Lefthook
-   **CI/CD**: GitHub Actions
-   **Versioning**: Changesets (public packages only)

### Important Files

-   `pnpm-workspace.yaml` - Workspace configuration
-   `turbo.json` - Task orchestration configuration
-   `biome.json` - Linting and formatting rules
-   `.lefthook.yml` - Git hooks configuration
-   `.github/workflows/` - CI/CD workflows
-   `.changeset/` - Changeset configurations

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:

-   `feature/` - New features
-   `fix/` - Bug fixes
-   `docs/` - Documentation changes
-   `refactor/` - Code refactoring
-   `test/` - Test additions/improvements
-   `chore/` - Maintenance tasks

### 2. Make Your Changes

-   Write clean, maintainable code following our [coding standards](#coding-standards)
-   Add tests for new functionality
-   Update documentation as needed
-   Follow TypeScript best practices

### 3. Run Quality Checks

```bash
# Lint and format
pnpm check

# Type checking
pnpm typecheck

# Run tests
pnpm test

# Run affected tests only (faster)
pnpm turbo test --filter=[HEAD]
```

### 4. Commit Your Changes

We use [Lefthook](https://github.com/evilmartians/lefthook) for git hooks that automatically:

-   Run linting on staged files
-   Type-check affected packages
-   Check for secrets and API keys
-   Warn about console.log statements
-   Enforce import boundaries

```
git add .
git commit -m "feat: add snapshot filtering by date range"
```

**Commit Message Format:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

-   `feat` - New feature
-   `fix` - Bug fix
-   `docs` - Documentation changes
-   `style` - Code style changes (formatting, etc.)
-   `refactor` - Code refactoring
-   `test` - Test additions/improvements
-   `chore` - Maintenance tasks
-   `perf` - Performance improvements

**Examples:**

```
feat(sdk): add snapshot filtering API

Add filterSnapshots() method to SDK with support for date ranges,
trigger types, and custom predicates.

Closes #123
```

### 5. Create a Changeset (for public packages only)

If you modified any public package (`sdk`, `core`, `mcp-server`, `contracts`):

```
pnpm changeset
```

Follow the prompts to:

1. Select which packages changed
2. Choose version bump type (major, minor, patch)
3. Write a user-facing changelog message

**Changeset guidelines:**

-   User-facing language (not technical details)
-   Explain impact to consumers
-   Include migration steps for breaking changes

**Example changeset:**

```
---
"@snapback/sdk": minor
---

Add snapshot filtering API with date range and trigger type support
```

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Open a pull request on GitHub with:

-   Clear title describing the change
-   Description of what changed and why
-   Link to related issues
-   Screenshots/videos for UI changes
-   Test plan and results

## Coding Standards

### TypeScript

```
// ✅ Good
export interface SnapshotFilter {
	startDate?: Date;
	endDate?: Date;
	trigger?: TriggerType;
}

export async function filterSnapshots(
	filter: SnapshotFilter
): Promise<Snapshot[]> {
	// Implementation
}

// ❌ Bad
export function filter(opts: any): any {
	// Implementation
}
```

**Rules:**

-   Enable strict mode in tsconfig.json
-   Avoid `any` types - use `unknown` and type guards
-   Prefer interfaces over types for public APIs
-   Export types for public APIs
-   Use explicit return types for functions

### Code Organization

```
// File: packages/sdk/src/client.ts

// 1. Imports (external, then internal)
import { z } from "zod";
import type { Snapshot, SnapshotFilter } from "@snapback/contracts";
import { Guardian } from "@snapback/core";

// 2. Types and interfaces
export interface ClientOptions {
	apiKey: string;
	baseUrl?: string;
};

// 3. Implementation
export class SnapBackClient {
	private readonly apiKey: string;
	private readonly baseUrl: string;

	constructor(options: ClientOptions) {
		this.apiKey = options.apiKey;
		this.baseUrl = options.baseUrl ?? "https://api.snapback.ai";
	}

	async createSnapshot(): Promise<Snapshot> {
		// Implementation
	}
}
```

### Naming Conventions

-   **Files**: `kebab-case.ts` (e.g., `snapshot-manager.ts`)
-   **Classes**: `PascalCase` (e.g., `SnapshotManager`)
-   **Functions/Variables**: `camelCase` (e.g., `createSnapshot`)
-   **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_SNAPSHOT_SIZE`)
-   **Types/Interfaces**: `PascalCase` (e.g., `SnapshotFilter`)

### Error Handling

```
// ✅ Good - Custom error classes
export class SnapshotNotFoundError extends Error {
	constructor(id: string) {
		super(`Snapshot not found: ${id}`);
		this.name = "SnapshotNotFoundError";
	}
}

// ✅ Good - Proper error propagation
export async function getSnapshot(id: string): Promise<Snapshot> {
	const snapshot = await storage.get(id);
	if (!snapshot) {
		throw new SnapshotNotFoundError(id);
	}
	return snapshot;
}

// ❌ Bad - Silent failures
export async function getSnapshot(id: string): Promise<Snapshot | null> {
	try {
		return await storage.get(id);
	} catch {
		return null; // Lost error information!
	}
}
```

### Documentation

````typescript
/**
 * Analyzes code changes for potential risks.
 *
 * @param changes - File changes to analyze
 * @returns Risk assessment with score and recommendations
 * @throws {ValidationError} If changes are invalid
 *
 * @example
 * ```typescript
 * const risk = await guardian.analyze({
 *   files: [
 *     { path: "auth.ts", changeType: "modified" }
 *   ]
 * })
 * console.log(risk.severity) // "low" | "medium" | "high"
 * ```
 */
export async function analyze(changes: Changes): Promise<RiskAssessment> {
	// Implementation
}
````

## Testing Guidelines

### Unit Tests (Vitest)

```typescript
// File: packages/core/src/__tests__/guardian.test.ts
import { describe, it, expect } from "vitest";
import { Guardian } from "../guardian";

describe("Guardian", () => {
	it("should calculate risk score for file changes", () => {
		const guardian = new Guardian();
		const risk = guardian.analyze({
			files: [{ path: "auth.ts", changeType: "modified" }],
		});

		expect(risk.score).toBeGreaterThan(0);
		expect(risk.severity).toBe("medium");
	});

	it("should identify high-risk patterns", () => {
		const guardian = new Guardian();
		const risk = guardian.analyze({
			files: [
				{ path: "config.ts", changeType: "modified" },
				{ path: "auth.ts", changeType: "deleted" },
			],
		});

		expect(risk.severity).toBe("high");
	});
});
```

### Integration Tests

```
// File: packages/sdk/src/__tests__/integration/client.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SnapBackClient } from "../../client";
import { setupTestServer, teardownTestServer } from "./test-utils";

describe("SnapBackClient Integration", () => {
	beforeAll(async () => {
		await setupTestServer();
	});

	afterAll(async () => {
		await teardownTestServer();
	});

	it("should create and retrieve snapshot", async () => {
		const client = new SnapBackClient({ apiKey: "test-key" });

		const created = await client.createCheckpoint();
		expect(created.id).toBeDefined();

		const retrieved = await client.getCheckpoint(created.id);
		expect(retrieved).toEqual(created);
	});
});
```

### E2E Tests (Playwright)

```
// File: apps/web/tests/e2e/snapshot.spec.ts
import { test, expect } from "@playwright/test";

test("create snapshot from dashboard", async ({ page }) => {
	await page.goto("http://localhost:3000/dashboard");

	await page.click("button:text('Create Snapshot')");
	await page.fill("textarea[name='description']", "Test snapshot");
	await page.click("button:text('Save')");

	await expect(page.locator(".snapshot-card")).toContainText("Test snapshot");
});
```

### Test Coverage Requirements

-   **Unit Tests**: Minimum 80% coverage for core logic
-   **Integration Tests**: Critical user flows and API interactions
-   **E2E Tests**: Key user journeys in web app

```

# Contributing to SnapBack

Thank you for your interest in contributing to SnapBack! This guide will help you get started with development, understand our workflow, and make successful contributions.

## Table of Contents

-   [Getting Started](#getting-started)
-   [Development Setup](#development-setup)
-   [Project Structure](#project-structure)
-   [Development Workflow](#development-workflow)
-   [Coding Standards](#coding-standards)
-   [Testing Guidelines](#testing-guidelines)
-   [Submitting Changes](#submitting-changes)
-   [Architecture Guidelines](#architecture-guidelines)
-   [Release Process](#release-process)

## Getting Started

### Prerequisites

-   **Node.js** >= 18.0.0
-   **pnpm** >= 8.0.0 (install via `npm install -g pnpm`)
-   **Git** >= 2.0.0
-   **Claude Desktop** (optional, for MCP testing)

### First-Time Setup

1. **Fork and clone the repository**

```
git clone https://github.com/YOUR_USERNAME/snapback.git
cd snapback
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your local configuration
```

4. **Build all packages**

```bash
pnpm build
```

5. **Run tests to verify setup**

```bash
pnpm test
```

## Development Setup

### Monorepo Structure

SnapBack is a pnpm workspace monorepo with the following structure:

```
snapback/
├── apps/
│   ├── web/          # Next.js web application (private)
│   └── mcp-server/   # MCP server (public - Apache-2.0)
├── packages/
│   ├── sdk/          # TypeScript SDK (public - Apache-2.0)
│   ├── core/         # Core functionality (public - Apache-2.0)
│   ├── contracts/    # Shared interfaces (public - Apache-2.0)
│   ├── api/          # API server (private)
│   ├── auth/         # Authentication (private)
│   ├── database/     # Database layer (private)
│   ├── logs/         # Logging system (private)
│   ├── mail/         # Email service (private)
│   ├── payments/     # Payment processing (private)
│   ├── analytics/    # Analytics (private)
│   ├── storage/      # Storage abstraction (private)
│   └── telemetry/    # Telemetry (private)
└── tooling/
    └── tsconfig/     # Shared TypeScript configs
```

### Public vs Private Packages

**Public Packages (Apache-2.0):**

-   `packages/sdk` - TypeScript SDK for consumers
-   `packages/core` - Core functionality and algorithms
-   `apps/mcp-server` - MCP protocol server
-   `packages/contracts` - Shared interfaces and types

**Private Packages (UNLICENSED):**

-   All other packages and apps

**Architecture Rule:** Public packages CANNOT import private packages.

### Running Development Servers

```bash
# Web app (Next.js)
pnpm --filter web dev

# MCP Server
pnpm --filter mcp-server dev

# API Server
pnpm --filter api dev

# All services
pnpm dev
```

### Working with Specific Packages

```bash
# Build a specific package
pnpm --filter @snapback/sdk build

# Test a specific package
pnpm --filter @snapback/core test

# Add dependency to a package
pnpm --filter @snapback/sdk add lodash

# Run any script in a package
pnpm --filter web build
```

## Project Structure

### Key Technologies

-   **Monorepo**: pnpm workspaces with Turborepo
-   **Frontend**: Next.js 14 (App Router), React 18, TypeScript
-   **Backend**: Node.js, Express, Prisma ORM
-   **Database**: PostgreSQL (production), SQLite (development)
-   **Testing**: Vitest (unit), Playwright (E2E)
-   **Linting/Formatting**: Biome
-   **Git Hooks**: Lefthook
-   **CI/CD**: GitHub Actions
-   **Versioning**: Changesets (public packages only)

### Important Files

-   `pnpm-workspace.yaml` - Workspace configuration
-   `turbo.json` - Task orchestration configuration
-   `biome.json` - Linting and formatting rules
-   `.lefthook.yml` - Git hooks configuration
-   `.github/workflows/` - CI/CD workflows
-   `.changeset/` - Changeset configurations

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:

-   `feature/` - New features
-   `fix/` - Bug fixes
-   `docs/` - Documentation changes
-   `refactor/` - Code refactoring
-   `test/` - Test additions/improvements
-   `chore/` - Maintenance tasks

### 2. Make Your Changes

-   Write clean, maintainable code following our [coding standards](#coding-standards)
-   Add tests for new functionality
-   Update documentation as needed
-   Follow TypeScript best practices

### 3. Run Quality Checks

```bash
# Lint and format
pnpm check

# Type checking
pnpm typecheck

# Run tests
pnpm test

# Run affected tests only (faster)
pnpm turbo test --filter=[HEAD]
```

### 4. Commit Your Changes

We use [Lefthook](https://github.com/evilmartians/lefthook) for git hooks that automatically:

-   Run linting on staged files
-   Type-check affected packages
-   Check for secrets and API keys
-   Warn about console.log statements
-   Enforce import boundaries

```
git add .
git commit -m "feat: add snapshot filtering by date range"
```

**Commit Message Format:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

-   `feat` - New feature
-   `fix` - Bug fix
-   `docs` - Documentation changes
-   `style` - Code style changes (formatting, etc.)
-   `refactor` - Code refactoring
-   `test` - Test additions/improvements
-   `chore` - Maintenance tasks
-   `perf` - Performance improvements

**Examples:**

```
feat(sdk): add snapshot filtering API

Add filterSnapshots() method to SDK with support for date ranges,
trigger types, and custom predicates.

Closes #123
```

### 5. Create a Changeset (for public packages only)

If you modified any public package (`sdk`, `core`, `mcp-server`, `contracts`):

```
pnpm changeset
```

Follow the prompts to:

1. Select which packages changed
2. Choose version bump type (major, minor, patch)
3. Write a user-facing changelog message

**Changeset guidelines:**

-   User-facing language (not technical details)
-   Explain impact to consumers
-   Include migration steps for breaking changes

**Example changeset:**

```
---
"@snapback/sdk": minor
---

Add snapshot filtering API with date range and trigger type support
```

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Open a pull request on GitHub with:

-   Clear title describing the change
-   Description of what changed and why
-   Link to related issues
-   Screenshots/videos for UI changes
-   Test plan and results

## Coding Standards

### TypeScript

```
// ✅ Good
export interface SnapshotFilter {
	startDate?: Date;
	endDate?: Date;
	trigger?: TriggerType;
}

export async function filterSnapshots(
	filter: SnapshotFilter
): Promise<Snapshot[]> {
	// Implementation
}

// ❌ Bad
export function filter(opts: any): any {
	// Implementation
}
```

**Rules:**

-   Enable strict mode in tsconfig.json
-   Avoid `any` types - use `unknown` and type guards
-   Prefer interfaces over types for public APIs
-   Export types for public APIs
-   Use explicit return types for functions

### Code Organization

```
// File: packages/sdk/src/client.ts

// 1. Imports (external, then internal)
import { z } from "zod";
import type { Snapshot, SnapshotFilter } from "@snapback/contracts";
import { Guardian } from "@snapback/core";

// 2. Types and interfaces
export interface ClientOptions {
	apiKey: string;
	baseUrl?: string;
};

// 3. Implementation
export class SnapBackClient {
	private readonly apiKey: string;
	private readonly baseUrl: string;

	constructor(options: ClientOptions) {
		this.apiKey = options.apiKey;
		this.baseUrl = options.baseUrl ?? "https://api.snapback.ai";
	}

	async createSnapshot(): Promise<Snapshot> {
		// Implementation
	}
}
```

### Naming Conventions

-   **Files**: `kebab-case.ts` (e.g., `snapshot-manager.ts`)
-   **Classes**: `PascalCase` (e.g., `SnapshotManager`)
-   **Functions/Variables**: `camelCase` (e.g., `createSnapshot`)
-   **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_SNAPSHOT_SIZE`)
-   **Types/Interfaces**: `PascalCase` (e.g., `SnapshotFilter`)

### Error Handling

```
// ✅ Good - Custom error classes
export class SnapshotNotFoundError extends Error {
	constructor(id: string) {
		super(`Snapshot not found: ${id}`);
		this.name = "SnapshotNotFoundError";
	}
}

// ✅ Good - Proper error propagation
export async function getSnapshot(id: string): Promise<Snapshot> {
	const snapshot = await storage.get(id);
	if (!snapshot) {
		throw new SnapshotNotFoundError(id);
	}
	return snapshot;
}

// ❌ Bad - Silent failures
export async function getSnapshot(id: string): Promise<Snapshot | null> {
	try {
		return await storage.get(id);
	} catch {
		return null; // Lost error information!
	}
}
```

### Documentation

````typescript
/**
 * Analyzes code changes for potential risks.
 *
 * @param changes - File changes to analyze
 * @returns Risk assessment with score and recommendations
 * @throws {ValidationError} If changes are invalid
 *
 * @example
 * ```typescript
 * const risk = await guardian.analyze({
 *   files: [
 *     { path: "auth.ts", changeType: "modified" }
 *   ]
 * })
 * console.log(risk.severity) // "low" | "medium" | "high"
 * ```
 */
export async function analyze(changes: Changes): Promise<RiskAssessment> {
	// Implementation
}
````

## Testing Guidelines

### Unit Tests (Vitest)

```typescript
// File: packages/core/src/__tests__/guardian.test.ts
import { describe, it, expect } from "vitest";
import { Guardian } from "../guardian";

describe("Guardian", () => {
	it("should calculate risk score for file changes", () => {
		const guardian = new Guardian();
		const risk = guardian.analyze({
			files: [{ path: "auth.ts", changeType: "modified" }],
		});

		expect(risk.score).toBeGreaterThan(0);
		expect(risk.severity).toBe("medium");
	});

	it("should identify high-risk patterns", () => {
		const guardian = new Guardian();
		const risk = guardian.analyze({
			files: [
				{ path: "config.ts", changeType: "modified" },
				{ path: "auth.ts", changeType: "deleted" },
			],
		});

		expect(risk.severity).toBe("high");
	});
});
```

### Integration Tests

```
// File: packages/sdk/src/__tests__/integration/client.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SnapBackClient } from "../../client";
import { setupTestServer, teardownTestServer } from "./test-utils";

describe("SnapBackClient Integration", () => {
	beforeAll(async () => {
		await setupTestServer();
	});

	afterAll(async () => {
		await teardownTestServer();
	});

	it("should create and retrieve snapshot", async () => {
		const client = new SnapBackClient({ apiKey: "test-key" });

		const created = await client.createCheckpoint();
		expect(created.id).toBeDefined();

		const retrieved = await client.getCheckpoint(created.id);
		expect(retrieved).toEqual(created);
	});
});
```

### E2E Tests (Playwright)

```
// File: apps/web/tests/e2e/snapshot.spec.ts
import { test, expect } from "@playwright/test";

test("create snapshot from dashboard", async ({ page }) => {
	await page.goto("http://localhost:3000/dashboard");

	await page.click("button:text('Create Snapshot')");
	await page.fill("textarea[name='description']", "Test snapshot");
	await page.click("button:text('Save')");

	await expect(page.locator(".snapshot-card")).toContainText("Test snapshot");
});
```

### Test Coverage Requirements

-   **Unit Tests**: Minimum 80% coverage for core logic
-   **Integration Tests**: Critical user flows and API interactions
-   **E2E Tests**: Key user journeys in web app

```

# Contributing to SnapBack

Thank you for your interest in contributing to SnapBack! This guide will help you get started with development, understand our workflow, and make successful contributions.

## Table of Contents

-   [Getting Started](#getting-started)
-   [Development Setup](#development-setup)
-   [Project Structure](#project-structure)
-   [Development Workflow](#development-workflow)
-   [Coding Standards](#coding-standards)
-   [Testing Guidelines](#testing-guidelines)
-   [Submitting Changes](#submitting-changes)
-   [Architecture Guidelines](#architecture-guidelines)
-   [Release Process](#release-process)

## Getting Started

### Prerequisites

-   **Node.js** >= 18.0.0
-   **pnpm** >= 8.0.0 (install via `npm install -g pnpm`)
-   **Git** >= 2.0.0
-   **Claude Desktop** (optional, for MCP testing)

### First-Time Setup

1. **Fork and clone the repository**

```
git clone https://github.com/YOUR_USERNAME/snapback.git
cd snapback
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your local configuration
```

4. **Build all packages**

```bash
pnpm build
```

5. **Run tests to verify setup**

```bash
pnpm test
```

## Development Setup

### Monorepo Structure

SnapBack is a pnpm workspace monorepo with the following structure:

```
snapback/
├── apps/
│   ├── web/          # Next.js web application (private)
│   └── mcp-server/   # MCP server (public - Apache-2.0)
├── packages/
│   ├── sdk/          # TypeScript SDK (public - Apache-2.0)
│   ├── core/         # Core functionality (public - Apache-2.0)
│   ├── contracts/    # Shared interfaces (public - Apache-2.0)
│   ├── api/          # API server (private)
│   ├── auth/         # Authentication (private)
│   ├── database/     # Database layer (private)
│   ├── logs/         # Logging system (private)
│   ├── mail/         # Email service (private)
│   ├── payments/     # Payment processing (private)
│   ├── analytics/    # Analytics (private)
│   ├── storage/      # Storage abstraction (private)
│   └── telemetry/    # Telemetry (private)
└── tooling/
    └── tsconfig/     # Shared TypeScript configs
```

### Public vs Private Packages

**Public Packages (Apache-2.0):**

-   `packages/sdk` - TypeScript SDK for consumers
-   `packages/core` - Core functionality and algorithms
-   `apps/mcp-server` - MCP protocol server
-   `packages/contracts` - Shared interfaces and types

**Private Packages (UNLICENSED):**

-   All other packages and apps

**Architecture Rule:** Public packages CANNOT import private packages.

### Running Development Servers

```bash
# Web app (Next.js)
pnpm --filter web dev

# MCP Server
pnpm --filter mcp-server dev

# API Server
pnpm --filter api dev

# All services
pnpm dev
```

### Working with Specific Packages

```bash
# Build a specific package
pnpm --filter @snapback/sdk build

# Test a specific package
pnpm --filter @snapback/core test

# Add dependency to a package
pnpm --filter @snapback/sdk add lodash

# Run any script in a package
pnpm --filter web build
```

## Project Structure

### Key Technologies

-   **Monorepo**: pnpm workspaces with Turborepo
-   **Frontend**: Next.js 14 (App Router), React 18, TypeScript
-   **Backend**: Node.js, Express, Prisma ORM
-   **Database**: PostgreSQL (production), SQLite (development)
-   **Testing**: Vitest (unit), Playwright (E2E)
-   **Linting/Formatting**: Biome
-   **Git Hooks**: Lefthook
-   **CI/CD**: GitHub Actions
-   **Versioning**: Changesets (public packages only)

### Important Files

-   `pnpm-workspace.yaml` - Workspace configuration
-   `turbo.json` - Task orchestration configuration
-   `biome.json` - Linting and formatting rules
-   `.lefthook.yml` - Git hooks configuration
-   `.github/workflows/` - CI/CD workflows
-   `.changeset/` - Changeset configurations

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:

-   `feature/` - New features
-   `fix/` - Bug fixes
-   `docs/` - Documentation changes
-   `refactor/` - Code refactoring
-   `test/` - Test additions/improvements
-   `chore/` - Maintenance tasks

### 2. Make Your Changes

-   Write clean, maintainable code following our [coding standards](#coding-standards)
-   Add tests for new functionality
-   Update documentation as needed
-   Follow TypeScript best practices

### 3. Run Quality Checks

```bash
# Lint and format
pnpm check

# Type checking
pnpm typecheck

# Run tests
pnpm test

# Run affected tests only (faster)
pnpm turbo test --filter=[HEAD]
```

### 4. Commit Your Changes

We use [Lefthook](https://github.com/evilmartians/lefthook) for git hooks that automatically:

-   Run linting on staged files
-   Type-check affected packages
-   Check for secrets and API keys
-   Warn about console.log statements
-   Enforce import boundaries

```
git add .
git commit -m "feat: add snapshot filtering by date range"
```

**Commit Message Format:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

-   `feat` - New feature
-   `fix` - Bug fix
-   `docs` - Documentation changes
-   `style` - Code style changes (formatting, etc.)
-   `refactor` - Code refactoring
-   `test` - Test additions/improvements
-   `chore` - Maintenance tasks
-   `perf` - Performance improvements

**Examples:**

```
feat(sdk): add snapshot filtering API

Add filterSnapshots() method to SDK with support for date ranges,
trigger types, and custom predicates.

Closes #123
```

### 5. Create a Changeset (for public packages only)

If you modified any public package (`sdk`, `core`, `mcp-server`, `contracts`):

```
pnpm changeset
```

Follow the prompts to:

1. Select which packages changed
2. Choose version bump type (major, minor, patch)
3. Write a user-facing changelog message

**Changeset guidelines:**

-   User-facing language (not technical details)
-   Explain impact to consumers
-   Include migration steps for breaking changes

**Example changeset:**

```
---
"@snapback/sdk": minor
---

Add snapshot filtering API with date range and trigger type support
```

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Open a pull request on GitHub with:

-   Clear title describing the change
-   Description of what changed and why
-   Link to related issues
-   Screenshots/videos for UI changes
-   Test plan and results

## Coding Standards

### TypeScript

```
// ✅ Good
export interface SnapshotFilter {
	startDate?: Date;
	endDate?: Date;
	trigger?: TriggerType;
}

export async function filterSnapshots(
	filter: SnapshotFilter
): Promise<Snapshot[]> {
	// Implementation
}

// ❌ Bad
export function filter(opts: any): any {
	// Implementation
}
```

**Rules:**

-   Enable strict mode in tsconfig.json
-   Avoid `any` types - use `unknown` and type guards
-   Prefer interfaces over types for public APIs
-   Export types for public APIs
-   Use explicit return types for functions

### Code Organization

```
// File: packages/sdk/src/client.ts

// 1. Imports (external, then internal)
import { z } from "zod";
import type { Snapshot, SnapshotFilter } from "@snapback/contracts";
import { Guardian } from "@snapback/core";

// 2. Types and interfaces
export interface ClientOptions {
	apiKey: string;
	baseUrl?: string;
};

// 3. Implementation
export class SnapBackClient {
	private readonly apiKey: string;
	private readonly baseUrl: string;

	constructor(options: ClientOptions) {
		this.apiKey = options.apiKey;
		this.baseUrl = options.baseUrl ?? "https://api.snapback.ai";
	}

	async createSnapshot(): Promise<Snapshot> {
		// Implementation
	}
}
```

### Naming Conventions

-   **Files**: `kebab-case.ts` (e.g., `snapshot-manager.ts`)
-   **Classes**: `PascalCase` (e.g., `SnapshotManager`)
-   **Functions/Variables**: `camelCase` (e.g., `createSnapshot`)
-   **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_SNAPSHOT_SIZE`)
-   **Types/Interfaces**: `PascalCase` (e.g., `SnapshotFilter`)

### Error Handling

```
// ✅ Good - Custom error classes
export class SnapshotNotFoundError extends Error {
	constructor(id: string) {
		super(`Snapshot not found: ${id}`);
		this.name = "SnapshotNotFoundError";
	}
}

// ✅ Good - Proper error propagation
export async function getSnapshot(id: string): Promise<Snapshot> {
	const snapshot = await storage.get(id);
	if (!snapshot) {
		throw new SnapshotNotFoundError(id);
	}
	return snapshot;
}

// ❌ Bad - Silent failures
export async function getSnapshot(id: string): Promise<Snapshot | null> {
	try {
		return await storage.get(id);
	} catch {
		return null; // Lost error information!
	}
}
```

### Documentation

````typescript
/**
 * Analyzes code changes for potential risks.
 *
 * @param changes - File changes to analyze
 * @returns Risk assessment with score and recommendations
 * @throws {ValidationError} If changes are invalid
 *
 * @example
 * ```typescript
 * const risk = await guardian.analyze({
 *   files: [
 *     { path: "auth.ts", changeType: "modified" }
 *   ]
 * })
 * console.log(risk.severity) // "low" | "medium" | "high"
 * ```
 */
export async function analyze(changes: Changes): Promise<RiskAssessment> {
	// Implementation
}
````

## Testing Guidelines

### Unit Tests (Vitest)

```
// File: packages/core/src/__tests__/guardian.test.ts
import { describe, it, expect } from "vitest";
import { Guardian } from "../guardian";

describe("Guardian", () => {
	it("should calculate risk score for file changes", () => {
		const guardian = new Guardian();
		const risk = guardian.analyze({
			files: [{ path: "auth.ts", changeType: "modified" }],
		});

		expect(risk.score).toBeGreaterThan(0);
		expect(risk.severity).toBe("medium");
	});

	it("should identify high-risk patterns", () => {
		const guardian = new Guardian();
		const risk = guardian.analyze({
			files: [
				{ path: "config.ts", changeType: "modified" },
				{ path: "auth.ts", changeType: "deleted" },
			],
		});

		expect(risk.severity).toBe("high");
	});
});
```

### Integration Tests

```
// File: packages/sdk/src/__tests__/integration/client.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SnapBackClient } from "../../client";
import { setupTestServer, teardownTestServer } from "./test-utils";

describe("SnapBackClient Integration", () => {
	beforeAll(async () => {
		await setupTestServer();
	});

	afterAll(async () => {
		await teardownTestServer();
	});

	it("should create and retrieve snapshot", async () => {
		const client = new SnapBackClient({ apiKey: "test-key" });

		const created = await client.createCheckpoint();
		expect(created.id).toBeDefined();

		const retrieved = await client.getCheckpoint(created.id);
		expect(retrieved).toEqual(created);
	});
});
```

### E2E Tests (Playwright)

```
// File: apps/web/tests/e2e/snapshot.spec.ts
import { test, expect } from "@playwright/test";

test("create snapshot from dashboard", async ({ page }) => {
	await page.goto("http://localhost:3000/dashboard");

	await page.click("button:text('Create Snapshot')");
	await page.fill("textarea[name='description']", "Test snapshot");
	await page.click("button:text('Save')");

	await expect(page.locator(".snapshot-card")).toContainText("Test snapshot");
});
```

### Test Coverage Requirements

-   **Unit Tests**: Minimum 80% coverage for core logic
-   **Integration Tests**: Critical user flows and API interactions
-   **E2E Tests**: Key user journeys in web app

```

# Contributing to SnapBack

Thank you for your interest in contributing to SnapBack! This guide will help you get started with development, understand our workflow, and make successful contributions.

## Table of Contents

-   [Getting Started](#getting-started)
-   [Development Setup](#development-setup)
-   [Project Structure](#project-structure)
-   [Development Workflow](#development-workflow)
-   [Coding Standards](#coding-standards)
-   [Testing Guidelines](#testing-guidelines)
-   [Submitting Changes](#submitting-changes)
-   [Architecture Guidelines](#architecture-guidelines)
-   [Release Process](#release-process)

## Getting Started

### Prerequisites

-   **Node.js** >= 18.0.0
-   **pnpm** >= 8.0.0 (install via `npm install -g pnpm`)
-   **Git** >= 2.0.0
-   **Claude Desktop** (optional, for MCP testing)

### First-Time Setup

1. **Fork and clone the repository**

```
git clone https://github.com/YOUR_USERNAME/snapback.git
cd snapback
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your local configuration
```

4. **Build all packages**

```bash
pnpm build
```

5. **Run tests to verify setup**

```bash
pnpm test
```

## Development Setup

### Monorepo Structure

SnapBack is a pnpm workspace monorepo with the following structure:

```
snapback/
├── apps/
│   ├── web/          # Next.js web application (private)
│   └── mcp-server/   # MCP server (public - Apache-2.0)
├── packages/
│   ├── sdk/          # TypeScript SDK (public - Apache-2.0)
│   ├── core/         # Core functionality (public - Apache-2.0)
│   ├── contracts/    # Shared interfaces (public - Apache-2.0)
│   ├── api/          # API server (private)
│   ├── auth/         # Authentication (private)
│   ├── database/     # Database layer (private)
│   ├── logs/         # Logging system (private)
│   ├── mail/         # Email service (private)
│   ├── payments/     # Payment processing (private)
│   ├── analytics/    # Analytics (private)
│   ├── storage/      # Storage abstraction (private)
│   └── telemetry/    # Telemetry (private)
└── tooling/
    └── tsconfig/     # Shared TypeScript configs
```

### Public vs Private Packages

**Public Packages (Apache-2.0):**

-   `packages/sdk` - TypeScript SDK for consumers
-   `packages/core` - Core functionality and algorithms
-   `apps/mcp-server` - MCP protocol server
-   `packages/contracts` - Shared interfaces and types

**Private Packages (UNLICENSED):**

-   All other packages and apps

**Architecture Rule:** Public packages CANNOT import private packages.

### Running Development Servers

```bash
# Web app (Next.js)
pnpm --filter web dev

# MCP Server
pnpm --filter mcp-server dev

# API Server
pnpm --filter api dev

# All services
pnpm dev
```

### Working with Specific Packages

```bash
# Build a specific package
pnpm --filter @snapback/sdk build

# Test a specific package
pnpm --filter @snapback/core test

# Add dependency to a package
pnpm --filter @snapback/sdk add lodash

# Run any script in a package
pnpm --filter web build
```

## Project Structure

### Key Technologies

-   **Monorepo**: pnpm workspaces with Turborepo
-   **Frontend**: Next.js 14 (App Router), React 18, TypeScript
-   **Backend**: Node.js, Express, Prisma ORM
-   **Database**: PostgreSQL (production), SQLite (development)
-   **Testing**: Vitest (unit), Playwright (E2E)
-   **Linting/Formatting**: Biome
-   **Git Hooks**: Lefthook
-   **CI/CD**: GitHub Actions
-   **Versioning**: Changesets (public packages only)

### Important Files

-   `pnpm-workspace.yaml` - Workspace configuration
-   `turbo.json` - Task orchestration configuration
-   `biome.json` - Linting and formatting rules
-   `.lefthook.yml` - Git hooks configuration
-   `.github/workflows/` - CI/CD workflows
-   `.changeset/` - Changeset configurations

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:

-   `feature/` - New features
-   `fix/` - Bug fixes
-   `docs/` - Documentation changes
-   `refactor/` - Code refactoring
-   `test/` - Test additions/improvements
-   `chore/` - Maintenance tasks

### 2. Make Your Changes

-   Write clean, maintainable code following our [coding standards](#coding-standards)
-   Add tests for new functionality
-   Update documentation as needed
-   Follow TypeScript best practices

### 3. Run Quality Checks

```bash
# Lint and format
pnpm check

# Type checking
pnpm typecheck

# Run tests
pnpm test

# Run affected tests only (faster)
pnpm turbo test --filter=[HEAD]
```

### 4. Commit Your Changes

We use [Lefthook](https://github.com/evilmartians/lefthook) for git hooks that automatically:

-   Run linting on staged files
-   Type-check affected packages
-   Check for secrets and API keys
-   Warn about console.log statements
-   Enforce import boundaries

```
git add .
git commit -m "feat: add snapshot filtering by date range"
```

**Commit Message Format:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

-   `feat` - New feature
-   `fix` - Bug fix
-   `docs` - Documentation changes
-   `style` - Code style changes (formatting, etc.)
-   `refactor` - Code refactoring
-   `test` - Test additions/improvements
-   `chore` - Maintenance tasks
-   `perf` - Performance improvements

**Examples:**

```
feat(sdk): add snapshot filtering API

Add filterSnapshots() method to SDK with support for date ranges,
trigger types, and custom predicates.

Closes #123
```

### 5. Create a Changeset (for public packages only)

If you modified any public package (`sdk`, `core`, `mcp-server`, `contracts`):

```
pnpm changeset
```

Follow the prompts to:

1. Select which packages changed
2. Choose version bump type (major, minor, patch)
3. Write a user-facing changelog message

**Changeset guidelines:**

-   User-facing language (not technical details)
-   Explain impact to consumers
-   Include migration steps for breaking changes

**Example changeset:**

```
---
"@snapback/sdk": minor
---

Add snapshot filtering API with date range and trigger type support
```

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Open a pull request on GitHub with:

-   Clear title describing the change
-   Description of what changed and why
-   Link to related issues
-   Screenshots/videos for UI changes
-   Test plan and results

## Coding Standards

### TypeScript

```
// ✅ Good
export interface SnapshotFilter {
	startDate?: Date;
	endDate?: Date;
	trigger?: TriggerType;
}

export async function filterSnapshots(
	filter: SnapshotFilter
): Promise<Snapshot[]> {
	// Implementation
}

// ❌ Bad
export function filter(opts: any): any {
	// Implementation
}
```

**Rules:**

-   Enable strict mode in tsconfig.json
-   Avoid `any` types - use `unknown` and type guards
-   Prefer interfaces over types for public APIs
-   Export types for public APIs
-   Use explicit return types for functions

### Code Organization

```
// File: packages/sdk/src/client.ts

// 1. Imports (external, then internal)
import { z } from "zod";
import type { Snapshot, SnapshotFilter } from "@snapback/contracts";
import { Guardian } from "@snapback/core";

// 2. Types and interfaces
export interface ClientOptions {
	apiKey: string;
	baseUrl?: string;
};

// 3. Implementation
export class SnapBackClient {
	private readonly apiKey: string;
	private readonly baseUrl: string;

	constructor(options: ClientOptions) {
		this.apiKey = options.apiKey;
		this.baseUrl = options.baseUrl ?? "https://api.snapback.ai";
	}

	async createSnapshot(): Promise<Snapshot> {
		// Implementation
	}
}
```

### Naming Conventions

-   **Files**: `kebab-case.ts` (e.g., `snapshot-manager.ts`)
-   **Classes**: `PascalCase` (e.g., `SnapshotManager`)
-   **Functions/Variables**: `camelCase` (e.g., `createSnapshot`)
-   **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_SNAPSHOT_SIZE`)
-   **Types/Interfaces**: `PascalCase` (e.g., `SnapshotFilter`)

### Error Handling

```
// ✅ Good - Custom error classes
export class SnapshotNotFoundError extends Error {
	constructor(id: string) {
		super(`Snapshot not found: ${id}`);
		this.name = "SnapshotNotFoundError";
	}
}

// ✅ Good - Proper error propagation
export async function getSnapshot(id: string): Promise<Snapshot> {
	const snapshot = await storage.get(id);
	if (!snapshot) {
		throw new SnapshotNotFoundError(id);
	}
	return snapshot;
}

// ❌ Bad - Silent failures
export async function getSnapshot(id: string): Promise<Snapshot | null> {
	try {
		return await storage.get(id);
	} catch {
		return null; // Lost error information!
	}
}
```

### Documentation

````typescript
/**
 * Analyzes code changes for potential risks.
 *
 * @param changes - File changes to analyze
 * @returns Risk assessment with score and recommendations
 * @throws {ValidationError} If changes are invalid
 *
 * @example
 * ```typescript
 * const risk = await guardian.analyze({
 *   files: [
 *     { path: "auth.ts", changeType: "modified" }
 *   ]
 * })
 * console.log(risk.severity) // "low" | "medium" | "high"
 * ```
 */
export async function analyze(changes: Changes): Promise<RiskAssessment> {
	// Implementation
}
````

## Testing Guidelines

### Unit Tests (Vitest)

```
// File: packages/core/src/__tests__/guardian.test.ts
import { describe, it, expect } from "vitest";
import { Guardian } from "../guardian";

describe("Guardian", () => {
	it("should calculate risk score for file changes", () => {
		const guardian = new Guardian();
		const risk = guardian.analyze({
			files: [{ path: "auth.ts", changeType: "modified" }],
		});

		expect(risk.score).toBeGreaterThan(0);
		expect(risk.severity).toBe("medium");
	});

	it("should identify high-risk patterns", () => {
		const guardian = new Guardian();
		const risk = guardian.analyze({
			files: [
				{ path: "config.ts", changeType: "modified" },
				{ path: "auth.ts", changeType: "deleted" },
			],
		});

		expect(risk.severity).toBe("high");
	});
});
```

### Integration Tests

```
// File: packages/sdk/src/__tests__/integration/client.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SnapBackClient } from "../../client";
import { setupTestServer, teardownTestServer } from "./test-utils";

describe("SnapBackClient Integration", () => {
	beforeAll(async () => {
		await setupTestServer();
	});

	afterAll(async () => {
		await teardownTestServer();
	});

	it("should create and retrieve snapshot", async () => {
		const client = new SnapBackClient({ apiKey: "test-key" });

		const created = await client.createCheckpoint();
		expect(created.id).toBeDefined();

		const retrieved = await client.getCheckpoint(created.id);
		expect(retrieved).toEqual(created);
	});
});
```

### E2E Tests (Playwright)

```
// File: apps/web/tests/e2e/snapshot.spec.ts
import { test, expect } from "@playwright/test";

test("create snapshot from dashboard", async ({ page }) => {
	await page.goto("http://localhost:3000/dashboard");

	await page.click("button:text('Create Snapshot')");
	await page.fill("textarea[name='description']", "Test snapshot");
	await page.click("button:text('Save')");

	await expect(page.locator(".snapshot-card")).toContainText("Test snapshot");
});
```

### Test Coverage Requirements

-   **Unit Tests**: Minimum 80% coverage for core logic
-   **Integration Tests**: Critical user flows and API interactions
-   **E2E Tests**: Key user journeys in web app

```

# Contributing to SnapBack

Thank you for your interest in contributing to SnapBack! This guide will help you get started with development, understand our workflow, and make successful contributions.

## Table of Contents

-   [Getting Started](#getting-started)
-   [Development Setup](#development-setup)
-   [Project Structure](#project-structure)
-   [Development Workflow](#development-workflow)
-   [Coding Standards](#coding-standards)
-   [Testing Guidelines](#testing-guidelines)
-   [Submitting Changes](#submitting-changes)
-   [Architecture Guidelines](#architecture-guidelines)
-   [Release Process](#release-process)

## Getting Started

### Prerequisites

-   **Node.js** >= 18.0.0
-   **pnpm** >= 8.0.0 (install via `npm install -g pnpm`)
-   **Git** >= 2.0.0
-   **Claude Desktop** (optional, for MCP testing)

### First-Time Setup

1. **Fork and clone the repository**

```
git clone https://github.com/YOUR_USERNAME/snapback.git
cd snapback
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your local configuration
```

4. **Build all packages**

```bash
pnpm build
```

5. **Run tests to verify setup**

```bash
pnpm test
```

## Development Setup

### Monorepo Structure

SnapBack is a pnpm workspace monorepo with the following structure:

```
snapback/
├── apps/
│   ├── web/          # Next.js web application (private)
│   └── mcp-server/   # MCP server (public - Apache-2.0)
├── packages/
│   ├── sdk/          # TypeScript SDK (public - Apache-2.0)
│   ├── core/         # Core functionality (public - Apache-2.0)
│   ├── contracts/    # Shared interfaces (public - Apache-2.0)
│   ├── api/          # API server (private)
│   ├── auth/         # Authentication (private)
│   ├── database/     # Database layer (private)
│   ├── logs
