---
trigger: glob
glob:  `**/*.test.ts`, `**/*.spec.ts`, `**/__tests__/**/*.ts` 
---

# Vitest Testing Conventions

**Applies to:** `**/*.test.ts`, `**/*.spec.ts`, `**/__tests__/**/*.ts`
**Authority:** Workspace-wide testing standards
**Test Framework:** Vitest 3.2.4 with workspace configuration

---

## Workspace Configuration

### Root Configuration (`vitest.workspace.ts`)

```typescript
import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      include: ["{apps,packages}/**/*.{test,spec}.ts?(x)"]
    }
  }
]);
```

**Scans:**
- All packages: `packages/**/*.{test,spec}.ts`
- All apps: `apps/**/*.{test,spec}.ts`
- React components: `**/*.{test,spec}.tsx`

---

### Package-Specific Configs

**Node packages:**
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

**React apps:**
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

---

## Test Organization

### Standard Structure

```
packages/core/
├── src/
│   └── managers/
│       └── SnapshotManager.ts
└── test/
    └── managers/
        └── SnapshotManager.test.ts    # Mirrors src/
```

**Rules:**
1. **Mirror source structure** - `src/foo/bar.ts` → `test/foo/bar.test.ts`
2. **Use `test/` or `__tests__/` directory** - Never mix tests with source
3. **File naming:** `*.test.ts` for unit tests, `*.spec.ts` for integration tests

---

### Test File Template

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SnapshotManager } from "@/managers/SnapshotManager";

describe("SnapshotManager", () => {
  let manager: SnapshotManager;

  beforeEach(() => {
    manager = new SnapshotManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createSnapshot", () => {
    it("creates snapshot with valid file path", async () => {
      const result = await manager.createSnapshot("/valid/file.ts");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.id).toBeDefined();
        expect(result.value.filePath).toBe("/valid/file.ts");
      }
    });

    it("returns error for empty file path", async () => {
      const result = await manager.createSnapshot("");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Invalid file path");
      }
    });
  });
});
```

**Key Patterns:**
- **Arrange-Act-Assert** structure
- **Descriptive test names** (sentences, not "test1")
- **Type narrowing** with `if (result.success)` for Result types

---

## Mocking Strategies

### Pattern 1: Module Mocking

```typescript
import { vi } from "vitest";

// Mock entire module
vi.mock("@snapback/infrastructure", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Verify mock calls
import { logger } from "@snapback/infrastructure";

it("logs snapshot creation", async () => {
  await manager.createSnapshot("/file.ts");

  expect(logger.info).toHaveBeenCalledWith(
    "Snapshot created",
    expect.objectContaining({ snapshotId: expect.any(String) })
  );
});
```

---

### Pattern 2: File System Mocking (memfs)

```typescript
import { vi, beforeEach } from "vitest";
import { vol } from "memfs";

vi.mock("node:fs");
vi.mock("node:fs/promises");

beforeEach(() => {
  vol.reset();
  vol.fromJSON({
    "/project/file.ts": "export const x = 1;",
    "/project/package.json": JSON.stringify({ name: "test" }),
  });
});

it("reads file from virtual filesystem", async () => {
  const content = await fs.promises.readFile("/project/file.ts", "utf-8");
  expect(content).toBe("export const x = 1;");
});
```

---

### Pattern 3: API Mocking (MSW)

```typescript
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const server = setupServer(
  http.get("https://api.snapback.dev/snapshots", () => {
    return HttpResponse.json([
      { id: "snap-1", filePath: "/file1.ts" },
      { id: "snap-2", filePath: "/file2.ts" },
    ]);
  })
);

beforeAll(() => server.listen());
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

it("fetches snapshots from API", async () => {
  const snapshots = await fetchSnapshots();
  expect(snapshots).toHaveLength(2);
});
```

---

## Async Testing

### Pattern: Async/Await

```typescript
it("handles async operations", async () => {
  const result = await manager.createSnapshot("/file.ts");
  expect(result.success).toBe(true);
});

it("handles promise rejection", async () => {
  await expect(
    manager.createSnapshot("")
  ).rejects.toThrow("Invalid file path");
});
```

---

### Pattern: Fake Timers

```typescript
import { vi, beforeEach, afterEach } from "vitest";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-01-01"));
});

afterEach(() => {
  vi.useRealTimers();
});

it("waits for debounced operation", async () => {
  const callback = vi.fn();
  const debounced = debounce(callback, 1000);

  debounced();
  debounced();
  
  vi.advanceTimersByTime(1000);
  expect(callback).toHaveBeenCalledTimes(1);
});
```

---

## Test Doubles

### Stubs (Return Predefined Values)

```typescript
const storageStub = {
  save: vi.fn().mockResolvedValue({ id: "snap-123" }),
  get: vi.fn().mockResolvedValue({ id: "snap-123", filePath: "/file.ts" }),
  list: vi.fn().mockResolvedValue([]),
};

const manager = new SnapshotManager(storageStub);
```

---

### Spies (Track Calls)

```typescript
const loggerSpy = vi.spyOn(logger, "info");

await manager.createSnapshot("/file.ts");

expect(loggerSpy).toHaveBeenCalledWith(
  "Snapshot created",
  expect.objectContaining({ snapshotId: expect.any(String) })
);

loggerSpy.mockRestore();
```

---

## Coverage Requirements

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

**Running coverage:**

```bash
pnpm test:coverage
open coverage/index.html
```

---

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// ❌ BAD - Testing internal state
it("sets internal state correctly", () => {
  manager.createSnapshot("/file.ts");
  expect(manager._snapshots.size).toBe(1); // ❌ Internal
});

// ✅ GOOD - Testing behavior
it("retrieves created snapshot by ID", async () => {
  const created = await manager.createSnapshot("/file.ts");
  const retrieved = await manager.getSnapshot(created.value.id);

  expect(retrieved.success).toBe(true);
});
```

---

### 2. Use Descriptive Test Names

```typescript
// ❌ BAD
it("test1", () => { ... });

// ✅ GOOD
it("creates snapshot with valid file path", () => { ... });
it("deduplicates snapshots with identical file hashes", () => { ... });
```

---

### 3. Test Edge Cases

```typescript
describe("SnapshotManager.createSnapshot", () => {
  it("creates snapshot with valid input", async () => { ... });
  it("handles empty file path", async () => { ... });
  it("handles non-existent file", async () => { ... });
  it("handles binary files", async () => { ... });
  it("handles concurrent creation requests", async () => { ... });
});
```

---

### 4. Cleanup After Tests

```typescript
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vol.reset();
  vi.useRealTimers();
});
```

---

### 5. Avoid Test Interdependence

```typescript
// ❌ BAD - Tests depend on order
describe("SnapshotManager", () => {
  let snapshotId: string;

  it("creates snapshot", async () => {
    const result = await manager.createSnapshot("/file.ts");
    snapshotId = result.value.id; // ❌ Shared state
  });

  it("retrieves snapshot", async () => {
    const result = await manager.getSnapshot(snapshotId); // ❌ Depends on previous
    expect(result.success).toBe(true);
  });
});

// ✅ GOOD - Independent tests
it("creates and retrieves snapshot", async () => {
  const created = await manager.createSnapshot("/file.ts");
  const retrieved = await manager.getSnapshot(created.value.id);
  expect(retrieved.success).toBe(true);
});
```

---

## References

- **Workspace Config:** `/vitest.workspace.ts` (verified ✅)
- **Package Configs:** `packages/*/vitest.config.ts`, `apps/*/vitest.config.ts`
- **Vitest Docs:** https://vitest.dev
- **MSW Docs:** https://mswjs.io
- **memfs Docs:** https://github.com/streamich/memfs

**Last Updated:** 2025-11-18
**Reviewed By:** Testing team
