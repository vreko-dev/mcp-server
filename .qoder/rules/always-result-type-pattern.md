---
trigger: always_on
alwaysApply: true
---

# Result<T, E> Error Handling Pattern

**Applies to:** `apps/**/*.ts`, `apps/**/*.tsx`, `packages/**/*.ts`, `packages/**/*.tsx`
**Authority:** Workspace-wide error handling standard
**Enforcement:** Required for public APIs, recommended for internal logic

---

## Core Pattern

### Type Definition

```typescript
// apps/vscode/src/types/result.ts (verified ✅)
export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

// Constructors
export function Ok<T>(value: T): Result<T, never> {
  return { success: true, value };
}

export function Err<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}

// Type guards
export function isOk<T, E>(
  result: Result<T, E>
): result is { success: true; value: T } {
  return result.success === true;
}

export function isErr<T, E>(
  result: Result<T, E>
): result is { success: false; error: E } {
  return result.success === false;
}
```

**Verified:** 211 usages of `Result<` pattern found in codebase ✅

---

## When to Use Result<T, E>

### ✅ Use Result for:

1. **Expected failures** (user input validation, file not found, network timeout)
2. **Recoverable errors** (retry logic, fallback values)
3. **Public APIs** (SDK methods, VS Code commands, API endpoints)
4. **Chain-able operations** (snapshot create → validate → store)

```typescript
// ✅ GOOD - Expected failure
async function findSnapshot(id: string): Promise<Result<Snapshot, SnapshotNotFoundError>> {
  const snapshot = await storage.get(id);

  if (!snapshot) {
    return Err(new SnapshotNotFoundError(id));
  }

  return Ok(snapshot);
}
```

### ❌ Don't Use Result for:

1. **Programming errors** (null checks, type assertions, invariant violations)
2. **Initialization failures** (database connection, missing config)

```typescript
// ❌ BAD - Programming error should throw
function getFirstItem<T>(array: T[]): Result<T, Error> {
  if (!array) {
    return Err(new Error("Array is null")); // ❌ Should throw
  }
  return Ok(array[0]);
}

// ✅ GOOD - Programming error throws
function getFirstItem<T>(array: T[]): T {
  if (!array || array.length === 0) {
    throw new Error("Array is null or empty");
  }
  return array[0];
}
```

---

## Real-World Examples

### Example 1: Snapshot Creation (apps/vscode)

```typescript
// apps/vscode/src/managers/SnapshotManager.ts
async function createSnapshot(
  filePath: string
): Promise<Result<Snapshot, SnapshotCreationError>> {
  // Validate input
  if (!filePath || filePath.trim() === "") {
    return Err(
      new SnapshotCreationError("Invalid file path", filePath)
    );
  }

  // Read file content
  const contentResult = await fromPromise(
    fs.promises.readFile(filePath, "utf-8")
  );

  if (isErr(contentResult)) {
    return Err(
      new SnapshotCreationError(
        "Failed to read file",
        filePath,
        contentResult.error
      )
    );
  }

  // Create snapshot
  try {
    const snapshot = {
      id: generateId(),
      filePath,
      content: contentResult.value,
      timestamp: Date.now(),
    };

    await storage.save(snapshot);
    return Ok(snapshot);
  } catch (error) {
    return Err(
      new SnapshotCreationError(
        "Storage failed",
        filePath,
        toError(error)
      )
    );
  }
}

// Usage
const result = await createSnapshot("/path/to/file.ts");

if (isErr(result)) {
  logger.error("Snapshot creation failed", {
    error: result.error.message,
    filePath: result.error.filePath,
  });

  vscode.window.showErrorMessage(
    `Failed to create snapshot: ${result.error.message}`
  );
  return;
}

// Success path - TypeScript knows result.value exists
const snapshot = result.value;
logger.info("Snapshot created", { id: snapshot.id });
```

---

### Example 2: Resource Pattern (apps/web)

```typescript
// apps/web/lib/resource.ts (verified ✅)
type Resource<T, E = AppError> =
  | { state: "loading" }
  | { state: "empty" }
  | { state: "error"; error: E }
  | { state: "ready"; data: T };

// Pattern matching
function matchResource<T, E, R>(
  resource: Resource<T, E>,
  handlers: {
    loading: () => R;
    empty: () => R;
    error: (error: E) => R;
    ready: (data: T) => R;
  }
): R {
  switch (resource.state) {
    case "loading":
      return handlers.loading();
    case "empty":
      return handlers.empty();
    case "error":
      return handlers.error(resource.error);
    case "ready":
      return handlers.ready(resource.data);
  }
}

// Usage
const result = matchResource(snapshotResource, {
  loading: () => <LoadingSpinner />,
  empty: () => <EmptyState />,
  error: (error) => <ErrorMessage message={error.message} />,
  ready: (snapshot) => <SnapshotView snapshot={snapshot} />,
});
```

---

## Error Construction

### Pattern: Chained Errors

```typescript
// Preserve error context
export class SnapshotCreationError extends BaseError {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "SnapshotCreationError";
  }
}

// Usage - preserve error chain
try {
  await lowLevelOperation();
} catch (err) {
  return Err(
    new SnapshotCreationError(
      "High-level operation failed",
      filePath,
      toError(err) // Chain the original error
    )
  );
}
```

---

## Utility Functions

### Converting Promises to Results

```typescript
// apps/vscode/src/types/result.ts
export async function fromPromise<T>(
  promise: Promise<T>
): Promise<Result<T, Error>> {
  try {
    const value = await promise;
    return Ok(value);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
}

// Usage
const result = await fromPromise(
  fetch("https://api.example.com/data")
);

if (isOk(result)) {
  const response = result.value;
  const data = await response.json();
} else {
  logger.error("Fetch failed", result.error);
}
```

---

### Unwrapping Results

```typescript
// Throw if error
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.value;
  }
  if (result.error instanceof Error) {
    throw result.error;
  }
  throw new Error(String(result.error));
}

// Provide default
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (isOk(result)) {
    return result.value;
  }
  return defaultValue;
}
```

---

## Chaining Operations

### Pattern: Sequential Operations

```typescript
// Chain: create → validate → deduplicate → store
async function processSnapshot(
  filePath: string
): Promise<Result<string, Error>> {
  const createResult = await createSnapshot(filePath);
  if (isErr(createResult)) return createResult;

  const validateResult = validateSnapshot(createResult.value);
  if (isErr(validateResult)) return validateResult;

  const storeResult = await storeSnapshot(validateResult.value);
  if (isErr(storeResult)) return storeResult;

  return Ok(storeResult.value.id);
}

// Usage - single error handling point
const result = await processSnapshot("/path/to/file.ts");

if (isErr(result)) {
  logger.error("Snapshot processing failed", result.error);
  return;
}

const snapshotId = result.value;
```

---

## Error Propagation vs Recovery

### Propagate Up (Return Error)

```typescript
function readConfig(): Result<Config, ConfigError> {
  const content = fs.readFileSync(".snapbackrc", "utf-8");

  if (!content) {
    return Err(new ConfigError("Config file is empty"));
  }

  try {
    const config = JSON.parse(content);
    return Ok(config);
  } catch (err) {
    return Err(new ConfigError("Invalid JSON", toError(err)));
  }
}

// High-level function - propagate error up
function initialize(): Result<void, Error> {
  const configResult = readConfig();

  if (isErr(configResult)) {
    return Err(configResult.error); // Propagate
  }

  const config = configResult.value;
  return Ok(undefined);
}
```

---

### Recover Locally (Handle Error)

```typescript
// High-level function - recover from error
function initializeWithDefaults(): Config {
  const configResult = readConfig();

  if (isErr(configResult)) {
    logger.warn("Config load failed, using defaults", {
      error: configResult.error.message,
    });

    return getDefaultConfig(); // Recover
  }

  return configResult.value;
}
```

---

## Integration with Logging

```typescript
import { logger } from "@snapback/infrastructure";

const result = await createSnapshot(filePath);

if (isErr(result)) {
  logger.error("Snapshot creation failed", {
    errorType: result.error.name,
    message: result.error.message,
    filePath: result.error.filePath,
    stack: result.error.stack,
  });

  vscode.window.showErrorMessage(
    `Failed to create snapshot: ${result.error.message}`
  );

  return;
}

// Log success
logger.info("Snapshot created successfully", {
  snapshotId: result.value.id,
  filePath,
  size: result.value.content.length,
});
```

---

## Testing

For testing Result types, see `files-testing-vitest.md` rule.

---

## Best Practices

1. **Use discriminated unions** - `{ success: true; value: T }` vs `{ success: false; error: E }`
2. **Type guards for narrowing** - `isOk()` and `isErr()` provide type safety
3. **Chain operations** - Use sequential checks for multi-step logic
4. **Preserve error context** - Always chain errors with `cause`
5. **Log structured errors** - Include error type, message, and context
6. **Don't double-wrap** - If already using try/catch, don't also return Result
7. **Use specific error types** - `SnapshotNotFoundError` vs generic `Error`

---

## References

- **VSCode Result Implementation:** `apps/vscode/src/types/result.ts` (verified ✅)
- **Web App Resource Pattern:** `apps/web/lib/resource.ts` (verified ✅)
- **Discriminated Unions:** See `always-typescript-patterns.md` rule
- **Testing Result Types:** See `files-testing-vitest.md` rule
- **Rust Result Type:** https://doc.rust-lang.org/std/result/

**Last Updated:** 2025-11-18
**Reviewed By:** Architecture team
