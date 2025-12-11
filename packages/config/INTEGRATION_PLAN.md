# ConfigStore v2 Integration Plan

## Overview

ConfigStore v2 is ready to replace three fragmented config systems in the VS Code Extension:
1. `vscode.workspace.getConfiguration('snapback')` (VSCode settings)
2. `SnapBackRCLoader` (.snapbackrc file loading)
3. `SettingsLoader` (AutoDecisionEngine + Snapshot settings)

This document maps integration points and dependencies.

---

## Current Fragmentation in VS Code Extension

### 1. VSCode Settings via `vscode.workspace.getConfiguration()`

**Files using this:**
- `apps/vscode/src/config.ts` (main config getter)
- `apps/vscode/src/config/settingsLoader.ts` (AutoDecisionEngine + Snapshot settings)
- `apps/vscode/src/config/runtime.ts` (Guardian config)
- `apps/vscode/src/commands/mcpCommands.ts` (AI monitoring toggle)
- `apps/vscode/src/onboarding/consent-modal.ts` (Privacy consent)
- `apps/vscode/src/services/api-client.ts` (API base URL, key)
- `apps/vscode/src/commands/explorerTree.ts` (Web base URL)
- `apps/vscode/src/services/MCPLifecycleManager.ts` (MCP server config)

**Issues:**
- Read from VSCode settings only (not .snapbackrc)
- No hot-reload support (requires VS Code event listeners)
- No type validation (ad-hoc defaults)
- Duplicated merger/getter logic

### 2. SnapBackRCLoader

**Files using this:**
- `apps/vscode/src/protection/SnapBackRCLoader.ts` (loads .snapbackrc + merges defaults)
- `apps/vscode/src/activation/phase2-storage.ts` (initialization)

**Issues:**
- Separate from VSCode settings
- v1 schema only
- Manual merging logic

### 3. SettingsLoader (AutoDecisionEngine)

**Files using this:**
- `apps/vscode/src/config/settingsLoader.ts`
- Tests in `apps/vscode/test/unit/config/configurationSettings.test.ts`

**Issues:**
- Only reads from VSCode settings
- Independent validation logic

---

## Integration Map

### Phase 1: Core Integration (ConfigStore → Extension)

#### Step 1: Replace `SnapBackRCLoader` with ConfigStore

**Before:**
```typescript
// apps/vscode/src/activation/phase2-storage.ts
const snapbackrcLoader = new SnapBackRCLoader(protectedFileRegistry, workspaceRoot);
await snapbackrcLoader.loadConfig();
snapbackrcLoader.watchConfigFile();
```

**After:**
```typescript
// apps/vscode/src/activation/phase2-storage.ts
import { getConfigStore } from "@snapback/config";

const configStore = await getConfigStore({ workspaceRoot });
configStore.watchForChanges();
```

**Changes Required:**
- Remove `SnapBackRCLoader` class
- Replace `.loadConfig()` → `getConfigStore().initialize()`
- Replace `.watchConfigFile()` → `configStore.watchForChanges()`
- Replace `.getMergedConfig()` → `configStore.getConfig()`

---

#### Step 2: Replace VSCode Settings Access with ConfigStore

**Affected Files:**

1. **apps/vscode/src/config.ts**
   - Current: `vscode.workspace.getConfiguration("snapback")`
   - New: `getConfigStore().getConfig()`

2. **apps/vscode/src/config/settingsLoader.ts**
   - Current: `vscode.workspace.getConfiguration("snapback")`
   - New: `getConfigStore().get<T>(path)`

3. **apps/vscode/src/commands/mcpCommands.ts**
   - Line 101: `const config = vscode.workspace.getConfiguration("snapback")`
   - New: `const config = configStore.get<boolean>("settings.aiDetectionEnabled")`

4. **apps/vscode/src/onboarding/consent-modal.ts**
   - Lines 103, 113, 132, 164, 191, 218: `vscode.workspace.getConfiguration("snapback.privacy")`
   - New: `configStore.get<ConsentSettings>("settings.privacy")`

5. **apps/vscode/src/services/api-client.ts**
   - Lines 18-19: API configuration
   - New: `configStore.get<string>("settings.api.baseUrl")`

6. **apps/vscode/src/commands/explorerTree.ts**
   - Line 112: Web URL
   - New: `configStore.get<string>("settings.webBaseUrl")`

7. **apps/vscode/src/services/MCPLifecycleManager.ts**
   - Lines 56-59, 81: MCP configuration
   - New: `configStore.get<string>("settings.mcp.serverUrl")`

---

### Phase 2: Settings Merge Strategy

ConfigStore v2 handles precedence: `.snapbackrc` > `SNAPBACK_CONFIG` env > `~/.snapback/config.json` > defaults

**Decision:** Keep VSCode settings as **user preference layer** for UI-only toggles (consent, themes).

**Mapping:**
- VSCode `snapback.*.enabled` → ConfigStore `settings.*.enabled`
- VSCode `snapback.privacy.*` → ConfigStore `settings.privacy.*`
- VSCode `snapback.ui.*` → ConfigStore `settings.ui.*` (optional, UI-only)
- `.snapbackrc` protection rules → ConfigStore `protections[]`

---

### Phase 3: Hot-Reload Integration

ConfigStore supports `onChange()` callbacks:

```typescript
configStore.onChange((newConfig) => {
  // Refresh UI components
  updateStatusBar(newConfig);
  reloadProtectionRules(newConfig);
  notifyListenersOfConfigChange();
});
```

**Replace VSCode listeners:**
```typescript
// OLD
vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration("snapback")) {
    updateSettings();
  }
});

// NEW
configStore.onChange((config) => {
  updateSettings(config);
});
```

---

## Implementation Checklist

### Pre-Integration Setup
- [ ] Add `@snapback/config` to VS Code Extension `package.json` dependencies
- [ ] Export ConfigStore from extension entry point

### Core Integration
- [ ] Replace `SnapBackRCLoader` usage in `phase2-storage.ts`
- [ ] Update `config.ts` to use `configStore.getConfig()`
- [ ] Update `settingsLoader.ts` to use `configStore.get<T>(path)`
- [ ] Replace all `vscode.workspace.getConfiguration("snapback")` calls with ConfigStore

### Settings Listeners
- [ ] Replace VSCode config change listeners with `configStore.onChange()`
- [ ] Update all config change handlers

### Tests
- [ ] Update/create integration tests with ConfigStore
- [ ] Mock `getConfigStore()` in unit tests
- [ ] Test hot-reload via `onChange()` callbacks

### Cleanup
- [ ] Remove `SnapBackRCLoader.ts`
- [ ] Remove `settingsLoader.ts` (if fully replaced)
- [ ] Remove redundant config types in extension
- [ ] Remove VSCode config schema (if not needed for UI)

---

## ConfigStore v2 API Cheat Sheet

### Initialization
```typescript
import { getConfigStore, ConfigStore } from "@snapback/config";

// With automatic initialization
const store = await getConfigStore({ workspaceRoot: vscode.workspace.rootPath });

// Or get singleton without initialization
const store = ConfigStore.getInstance();
```

### Reading Config
```typescript
// Full config
const config = store.getConfig();

// Dot notation access (recommended for extension)
const level: string = store.get<string>("settings.defaultProtectionLevel");
const maxSnapshots: number = store.get<number>("settings.maxSnapshots");
const blockCooldown: number = store.get<number>("engine.cooldowns.block");

// Protection rules
const protections = store.get<ProtectionRule[]>("protections");
```

### Watching for Changes
```typescript
// Subscribe to config changes
const unsubscribe = store.onChange((newConfig) => {
  console.log("Config updated:", newConfig);
});

// Watch file system for .snapbackrc changes
store.watchForChanges();

// Cleanup
unsubscribe();
store.stopWatching();
```

### Saving Config
```typescript
const newConfig = store.getConfig();
newConfig.settings.maxSnapshots = 50;
await store.saveSnapbackrc(newConfig);
// Triggers onChange() callbacks automatically
```

---

## Type Safety

ConfigStore v2 provides full type safety:

```typescript
import type {
  ConfigStoreV2,
  ProtectionLevel,
  ProtectionRule,
  EngineConfig,
  Settings,
} from "@snapback/config";

const config: ConfigStoreV2 = store.getConfig();
const level: ProtectionLevel = "watch" | "warn" | "block";
const rule: ProtectionRule = { pattern: "*.env", level: "block", precedence: 100 };
```

---

## Backward Compatibility

ConfigStore v2 is **fully backward compatible**:
- Existing `.snapbackrc` files continue to work
- Invalid configs fall back to defaults gracefully
- No breaking changes to protection rule format

---

## Integration Priority

1. **Phase2-Storage (Highest Impact)**: Replace `SnapBackRCLoader`
2. **API Client**: Use ConfigStore for API config
3. **Settings Loader**: Replace VSCode getter pattern
4. **Commands**: Update config access pattern
5. **Consent Modal**: Replace privacy settings
6. **MCP Manager**: Use ConfigStore for MCP config

---

## Testing Strategy

### Unit Tests
- Mock `getConfigStore()` in existing tests
- Test with different precedence scenarios

### Integration Tests
- Test hot-reload with `.snapbackrc` changes
- Test fallback to defaults on invalid config
- Test sub-10ms reads with large configs

### End-to-End Tests
- Test extension activation with ConfigStore
- Test protection rule application with merged config
- Test VSCode command integration

---

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking VSCode settings | Map old settings → new config paths |
| Performance regression | ConfigStore caches sub-10ms reads |
| Loss of VSCode UI | Keep UI-only settings in VSCode |
| Migration complexity | Backward compatible, staged rollout |

---

## Success Criteria

✅ All extension tests pass
✅ ConfigStore used for all config access
✅ Sub-10ms config reads verified
✅ Hot-reload working via `onChange()`
✅ Zero breaking changes to `.snapbackrc` files
✅ Reduced code duplication (~500 LOC removed)

---

## Next: CLI Integration

After extension integration:

```typescript
// apps/cli/src/config.ts
import { getConfigStore } from "@snapback/config";

const store = await getConfigStore({ 
  workspaceRoot: process.cwd() 
});

const config = store.getConfig();
// Use config for CLI operations
```

---

## Next: MCP Server Integration

```typescript
// apps/mcp-server/src/index.ts
import { getConfigStore } from "@snapback/config";

async function initializeMCP() {
  const store = await getConfigStore();
  
  store.onChange((config) => {
    // Reload MCP services if config changes
  });
}
```
