---
description: "VS Code extension development patterns"
globs:
  - "apps/vscode/**/*.ts"
  - "apps/vscode/**/*.tsx"
alwaysApply: false
---

# VS Code Extension Rules

**Applies to:** `apps/vscode/**`
**Performance Budget:** 500ms activation time

---

## Activation Phases

| Phase | File | Responsibility | Target |
|-------|------|----------------|--------|
| 1 | phase1-services.ts | Core service lazy loading | <10ms |
| 2 | phase2-storage.ts | Storage & configuration | <100ms |
| 3 | phase3-managers.ts | Business logic managers | <200ms |
| 4 | phase4-providers.ts | VS Code providers | <150ms |
| 5 | phase5-registration.ts | Command registration | <50ms |

---

## Performance Patterns

### Fire-and-Forget IPC
```typescript
// ❌ WRONG - Awaiting serializes IPC calls (100ms each)
async (key, value) => {
  await vscode.commands.executeCommand("setContext", key, value);
}

// ✅ CORRECT - Fire-and-forget for performance
(key, value) => {
  vscode.commands.executeCommand("setContext", key, value);
  return Promise.resolve();
}
```

### Deferred Initialization
```typescript
// ⚡ Defer non-critical work after activation
setImmediate(() => {
  protectionService.auditRepo().catch(logger.error);
});
```

---

## Common Pitfalls

- **Duplicate Service Instances**: Search for `new ServiceName(` across phase files
- **Blocking IPC**: Never `await` setContext during activation
- **Synchronous FS Ops**: Use async or defer to background
- **Missing Budget Validation**: Profile against 500ms budget

---

## Constructor Changes (ExtensionContext)

When adding `ExtensionContext` as constructor parameter:

1. **Update ALL test files** - Search for `new ProviderName(`
2. **Add mockContext**:
```typescript
const mockContext = {
  globalState: {
    get: vi.fn().mockReturnValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
  },
  subscriptions: { push: vi.fn() },
};
```

---

## TreeView/TreeDataProvider

- Navigate by `item.data.type` not `item.label` in tests
- Group keys are hyphenated (`this-week`) not camelCase
- Create helper functions like `getSnapshotItemsFromGroup(groupKey)`
