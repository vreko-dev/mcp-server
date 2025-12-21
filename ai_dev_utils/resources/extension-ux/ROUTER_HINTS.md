# Router Implementation Hints

**Purpose**: Quick reference for AI implementing the Extension UX specification.

---

## File Locations

```
apps/vscode/src/ui/
├── ux-types.ts              # ✅ CREATED - All type definitions
├── StatusBarManager.ts      # ✅ CREATED - Status bar state machine
├── StatusBarManager.test.ts # ✅ CREATED - Test stubs
└── sections/
    ├── index.ts             # ✅ CREATED - Exports
    ├── ActivitySection.ts   # ✅ CREATED - Event log section
    ├── ActivitySection.test.ts
    ├── HistorySection.ts    # ✅ CREATED - Sessions section
    ├── HistorySection.test.ts
    ├── ProtectedSection.ts  # ✅ CREATED - Protected files section
    └── ProtectedSection.test.ts
```

---

## Implementation Priority

### Phase 1: Complete Test Stubs (1-2 hours)
All test files have `expect(true).toBe(true)` placeholders. Replace with real assertions.

**Pattern:**
```typescript
// BEFORE
it('should show checkpoint count', () => {
  expect(true).toBe(true); // TODO: Implement
});

// AFTER
it('should show checkpoint count', () => {
  statusBar.updateStats({ checkpointsToday: 5 });
  statusBar.showIdle();
  expect(statusBar['item'].text).toContain('5 checkpoints');
});
```

### Phase 2: Wire Up Integration Points (2-3 hours)
Each section has TODO comments marking integration points:

1. **StatusBarManager**
   - Wire `recordCheckpoint()` to SnapshotStore events
   - Wire `showAISession()` to SessionCoordinator AI detection

2. **ActivitySection**
   - Subscribe to SnapshotStore `onSnapshot` event
   - Subscribe to RestoreService `onRestore` event

3. **HistorySection**
   - Load from SessionStore on activation
   - Subscribe to SessionCoordinator events

4. **ProtectedSection**
   - Load from ProtectionConfigManager
   - Subscribe to config changes

### Phase 3: Update Main TreeDataProvider (2-3 hours)
Modify `apps/vscode/src/views/snapBackTreeProvider.ts` to use new sections.

---

## Critical Gotchas

### 1. Icon Semantics (VERY IMPORTANT)
```typescript
// ❌ WRONG - Source as icon
const icon = event.source === 'Cursor' ? '🔵' : '🟢';

// ✅ CORRECT - Type as icon, source in tooltip
const icon = EVENT_ICONS[event.type]; // ✨ for all AI edits
item.tooltip = `Source: ${event.source}`; // Cursor in tooltip
```

### 2. Time Formatting (CAUSES UI JUMPING)
```typescript
// ❌ WRONG - Dynamic labels cause tree items to jump on refresh
return `${formatRelativeTime(timestamp)} ago`; // "2 hours ago" → "3 hours ago"

// ✅ CORRECT - Stable compact format
return formatCompactTime(timestamp); // "2h" stays "2h"
```

### 3. Date Grouping Keys
```typescript
// ❌ WRONG - Date string changes at midnight
const key = date.toLocaleDateString(); // "12/20/2024"

// ✅ CORRECT - Stable group names
const key: ActivityGroup = isSameDay(date, today) ? 'Today' : 
           isSameDay(date, yesterday) ? 'Yesterday' : 'Earlier';
```

### 4. Empty Sections
```typescript
// ❌ WRONG - Shows ghost sections
groups.set('WARN', []); // Shows "WARN (0)"

// ✅ CORRECT - Only add if has items
if (warnFiles.length > 0) {
  groups.set('WARN', warnFiles);
}
```

### 5. Timeout Cleanup
```typescript
// ❌ WRONG - Memory leak
showAISession() {
  setTimeout(() => this.showIdle(), 5000);
}

// ✅ CORRECT - Clear previous timeout
showAISession() {
  this.clearTransitionTimeout(); // Always clear first!
  this.transitionTimeout = setTimeout(() => this.showIdle(), 5000);
}
```

### 6. Singular/Plural
```typescript
// ❌ WRONG
return `${count} files`;

// ✅ CORRECT
return `${count} file${count !== 1 ? 's' : ''}`;
```

---

## Package.json Changes Required

Add to `apps/vscode/package.json`:

```json
{
  "contributes": {
    "menus": {
      "view/title": [
        {
          "command": "snapback.undoAISession",
          "when": "view == snapback.mainView",
          "group": "navigation@1"
        },
        {
          "command": "snapback.createSnapshot",
          "when": "view == snapback.mainView",
          "group": "navigation@2"
        },
        {
          "command": "snapback.browseSnapshots",
          "when": "view == snapback.mainView",
          "group": "navigation@3"
        }
      ],
      "view/item/context": [
        {
          "command": "snapback.restore",
          "when": "viewItem == session-restorable",
          "group": "1_actions@1"
        },
        {
          "command": "snapback.changeLevel",
          "when": "viewItem == protected-file",
          "group": "1_actions@1"
        }
      ]
    },
    "commands": [
      {
        "command": "snapback.undoAISession",
        "title": "Undo AI Session",
        "icon": "$(discard)"
      },
      {
        "command": "snapback.createSnapshot",
        "title": "Create Snapshot",
        "icon": "$(device-camera)"
      },
      {
        "command": "snapback.browseSnapshots",
        "title": "Browse Snapshots",
        "icon": "$(history)"
      }
    ]
  }
}
```

---

## Testing Commands

```bash
# Run all UI tests
pnpm --filter @snapback/vscode test -- --grep "StatusBarManager|ActivitySection|HistorySection|ProtectedSection"

# Run with coverage
pnpm --filter @snapback/vscode test:coverage
```

---

## Mock Data for Development

All sections have `createMock*` functions for testing without wiring up data sources:

```typescript
import { createMockEvents } from './sections/ActivitySection';
import { createMockSessions } from './sections/HistorySection';
import { createMockProtectedFiles } from './sections/ProtectedSection';

// Use in development
const events = createMockEvents();
const sessions = createMockSessions();
const files = createMockProtectedFiles();
```

---

## Verification Checklist

Before considering Phase 1 complete:

- [ ] All test stubs replaced with real assertions
- [ ] All tests pass (`pnpm test`)
- [ ] No TypeScript errors (`pnpm type-check`)
- [ ] No ESLint errors (`pnpm lint`)

Before considering Phase 2 complete:

- [ ] StatusBarManager integrated with SnapshotStore
- [ ] ActivitySection shows real events
- [ ] HistorySection loads real sessions
- [ ] ProtectedSection shows real protected files
- [ ] All change listeners fire `_onDidChange`

Before considering Phase 3 complete:

- [ ] TreeDataProvider uses new sections
- [ ] Toolbar actions work
- [ ] Context menus work
- [ ] Keyboard shortcuts work
- [ ] No regressions in existing functionality

---

## Reference Documents

- `ai_dev_utils/resources/extension-ux/EXTENSION_UX_SPEC.md` - Master UX spec
- `ai_dev_utils/resources/extension-ux/QUICK_REFERENCE.md` - Code snippets
- `ai_dev_utils/resources/vitals/VITALS_INSTRUCTIONS.md` - Vitals integration

---

*Last updated: December 2024*
