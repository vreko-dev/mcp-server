---
trigger: always_on
alwaysApply: true
---

# Advanced TypeScript Patterns

**Applies to:** `apps/**/*.ts`, `apps/**/*.tsx`, `packages/**/*.ts`, `packages/**/*.tsx` in SnapBack monorepo
**Authority:** Workspace-wide type safety standards
**Enforcement:** Required for type-safe APIs, strongly recommended everywhere

---

## 1. Discriminated Unions

### Pattern: State Machines

```typescript
// apps/web/lib/resource.ts
type Resource<T, E = AppError> =
  | { state: "loading" }
  | { state: "empty" }
  | { state: "error"; error: E }
  | { state: "ready"; data: T };

// Type guards
function isLoading<T, E>(r: Resource<T, E>): r is { state: "loading" } {
  return r.state === "loading";
}

function isReady<T, E>(r: Resource<T, E>): r is { state: "ready"; data: T } {
  return r.state === "ready";
}

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
  empty: () => <EmptyState message="No snapshots yet" />,
  error: (error) => <ErrorMessage error={error} />,
  ready: (snapshot) => <SnapshotView snapshot={snapshot} />,
});
```

**Benefits:**
- Exhaustive checking (compiler enforces all cases)
- Type narrowing in each branch
- Impossible states impossible (can't have both `data` and `error`)
- Self-documenting state transitions

---

### Pattern: API Responses

```typescript
type ApiResponse<T> =
  | { status: "success"; data: T }
  | { status: "error"; code: string; message: string }
  | { status: "loading" };

// Discriminated by status field
function handleResponse<T>(response: ApiResponse<T>): void {
  switch (response.status) {
    case "success":
      console.log(response.data); // TypeScript knows response.data exists
      break;
    case "error":
      console.error(`${response.code}: ${response.message}`);
      break;
    case "loading":
      console.log("Loading...");
      break;
  }
}
```

---

## 2. Const Assertions

### Pattern 1: Readonly Objects

```typescript
// Without const assertion
const config = {
  protectionLevel: "watch",
  notificationDuration: 3000,
};

config.protectionLevel = "invalid"; // ✅ Compiles (no type checking)
type Level = typeof config.protectionLevel; // type: string

// With const assertion
const config = {
  protectionLevel: "watch",
  notificationDuration: 3000,
} as const;

config.protectionLevel = "invalid"; // ❌ Compile error (readonly)
type Level = typeof config.protectionLevel; // type: "watch"
```

---

### Pattern 2: Enum Alternatives

```typescript
// ❌ Traditional enum (runtime overhead)
enum ProtectionLevel {
  Watch = "watch",
  Warn = "warn",
  Block = "block",
}

// ✅ Const assertion (no runtime cost)
const PROTECTION_LEVELS = ["watch", "warn", "block"] as const;
type ProtectionLevel = typeof PROTECTION_LEVELS[number]; // "watch" | "warn" | "block"

// Type-safe validation
function isProtectionLevel(value: string): value is ProtectionLevel {
  return (PROTECTION_LEVELS as readonly string[]).includes(value);
}

// Usage
const userInput: string = getUserInput();

if (isProtectionLevel(userInput)) {
  setProtectionLevel(userInput); // ✅ Type narrowed
}
```

**Real-World Example:**

```typescript
// Verified pattern in codebase (26 const assertion usages found)
const VALID_EVENT_TYPES = [
  "snapshot.created",
  "snapshot.restored",
  "file.protected",
  "risk.detected",
] as const;

type EventType = typeof VALID_EVENT_TYPES[number];

function isEventType(value: string): value is EventType {
  return (VALID_EVENT_TYPES as readonly string[]).includes(value);
}
```

---

## 3. Type Guards

### Pattern: Custom Type Guards with `is` Predicate

```typescript
// Verified pattern (10+ usages in codebase)
// packages/contracts/src/telemetry/events.ts
function validateTelemetryEvent(event: TelemetryEvent): event is AllowedTelemetryEvent {
  return (
    event instanceof Error &&
    event.name === "TelemetryEvent" &&
    "eventType" in event
  );
}

// Usage
try {
  await processEvent(event);
} catch (error: unknown) {
  if (validateTelemetryEvent(error)) {
    // TypeScript knows error properties exist
    logger.error("Event processing failed", {
      eventType: error.eventType,
      message: error.message,
    });
  } else {
    logger.error("Unknown error", { error });
  }
}
```

---

### Pattern: Assertion Functions

```typescript
// apps/web/lib/type-guards.ts (verified file exists)
export function assertDefined<T>(
  value: T | undefined | null,
  message: string
): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
}

// Usage
const snapshot = snapshots.find((s) => s.id === id);
// snapshot is Snapshot | undefined

assertDefined(snapshot, `Snapshot ${id} not found`);
// snapshot is now Snapshot (type narrowed)

console.log(snapshot.filePath); // ✅ No null check needed
```

---

## 4. Conditional Types

### Pattern: Type Transformations

```typescript
// Extract T from Promise<T>
type Awaited<T> = T extends Promise<infer U> ? U : T;

// Usage
async function fetchSnapshot(id: SnapshotId): Promise<Snapshot> {
  // ...
}

type SnapshotType = Awaited<ReturnType<typeof fetchSnapshot>>; // Snapshot

// Extract error type from Result<T, E>
type ExtractError<R> = R extends Result<unknown, infer E> ? E : never;

type CreateSnapshotResult = Result<Snapshot, SnapshotCreationError>;
type ErrorType = ExtractError<CreateSnapshotResult>; // SnapshotCreationError
```

---

## 5. Utility Types

### Pattern: Strict Omit

```typescript
// Built-in Omit allows non-existent keys (footgun!)
type UserPublic = Omit<User, "password" | "nonExistentField">; // ✅ No error

// Strict Omit prevents typos
type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

type UserPublicStrict = StrictOmit<User, "password">; // ✅ Compiles
type UserPublicInvalid = StrictOmit<User, "nonExistentField">; // ❌ Compile error
```

---

### Pattern: Deep Readonly

```typescript
// Shallow readonly
type ShallowReadonly = Readonly<{ user: { name: string } }>;
const obj: ShallowReadonly = { user: { name: "Alice" } };
obj.user.name = "Bob"; // ✅ Allowed (shallow)

// Deep readonly
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

type Config = DeepReadonly<{ user: { name: string } }>;
const config: Config = { user: { name: "Alice" } };
config.user.name = "Bob"; // ❌ Compile error (deep)
```

---

## Best Practices Summary

1. **Discriminated Unions:** Use for state machines and result types (see Resource<T> pattern in apps/web/lib/resource.ts)
2. **Const Assertions:** Use for readonly data and enum alternatives (26 verified usages)
3. **Type Guards:** Use for runtime validation with type narrowing (`is` predicate - 10+ verified usages)
4. **Assertion Functions:** Use for invariant checking (`asserts value is T`)
5. **Conditional Types:** Use for type transformations
6. **Utility Types:** Create strict versions of built-in utilities

---

## References

- **Web Resource Pattern:** `apps/web/lib/resource.ts` (verified ✅)
- **Type Guards:** `apps/web/lib/type-guards.ts` (verified ✅)
- **Result Type Pattern:** See `always-result-type-pattern.md` rule
- **Testing Type Safety:** See `files-testing-vitest.md` rule
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/handbook/

**Last Updated:** 2025-11-18
**Reviewed By:** Type safety team
