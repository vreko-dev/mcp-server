# SnapBack Interactive Demo

This is a marketing-site quality interactive demo that mirrors the SnapBack VS Code Extension experience. It demonstrates all the core features of SnapBack in a browser-based environment.

## Features Demonstrated

### 1. Snapshot Safety Net

-   Auto snapshot on save with levels: Watch (silent), Warn (non-modal prompt), Block (modal required)
-   Manual snapshot, restore latest, view timeline, compare (stub), details (stub), rename/delete (stubs OK)
-   Deduplication: if content unchanged, don't add a new snapshot
-   Store snapshots in IndexedDB via Dexie
-   Keep a notification history (in-memory + persisted list)

### 2. Adaptive Protection Levels

-   Per-file levels with badges in Explorer, editor glyph margin, and Status Bar
-   Quick-set menu in editor context menu and Explorer
-   Persist protection registry (IndexedDB)

### 3. Ambient AI & Workflow Automation (stubbed)

-   AI monitoring toggle + confidence-scored suggestions (fake heuristics)
-   When confidence ≥ 0.8, auto-suggest upgrade level or checkpoint before risky save, with actionable rich notifications

### 4. Team Policies & Auto-detection

-   Parse and apply .snapbackprotected, .snapbackignore, optional .snapbackrc
-   Hot-reload policies with debounce; surface a status bar prompt when policies change

### 5. Views & Commands

-   Activity Bar: Snapshots tree, Protected Files list, Getting Started
-   Timeline/Navigator: list snapshots for current file; restore; view details
-   Commands (palette or buttons):
    -   snapback.initialize
    -   snapback.createCheckpoint
    -   snapback.snapBack
    -   snapback.viewCheckpoint
    -   snapback.showAllCheckpoints
    -   snapback.compareWithCheckpoint (stub compares)
    -   snapback.protectFile
    -   snapback.changeProtectionLevel
    -   quick sets (watch/warn/block)
    -   snapback.unprotectFile
    -   snapback.toggleAiMonitoring
    -   snapback.showAiMonitoringStatus

### 6. Enhanced Notifications

-   Rich toasts with icons, actions, durations; history panel; configurable defaults

## Technical Implementation

### Architecture

-   Next.js 15 (app router)
-   TypeScript with strict mode
-   Tailwind CSS for styling
-   React context + reducer for state management
-   Dexie.js for IndexedDB persistence
-   Monaco Editor for code editing (with Sandpack fallback)

### Project Structure

```
snapback-demo/
├── domain/              # Pure functions and types
├── persistence/         # Dexie-based repositories
├── context/             # React context and reducer
├── components/          # UI components
├── commands/            # Command registry
├── hooks/               # Custom hooks
├── tests/               # Unit and integration tests
└── styles/              # CSS styles
```

### Domain Layer

The domain layer contains pure functions that implement the core logic:

-   Protection level management
-   Snapshot creation with deduplication and debounce logic
-   Policy parsing with support for both "pattern" and "@level pattern" syntax
-   AI risk detection heuristics

### Persistence Layer

The persistence layer uses Dexie.js to provide an IndexedDB interface:

-   Snapshot repository
-   Protection repository
-   Notification repository
-   Policy repository

### UI Components

The UI is built with React components that consume the context:

-   ActivityBar: Navigation between views
-   FileExplorer: File tree with protection badges
-   StatusBar: Protection level and AI status
-   SnapshotTimeline: View and restore snapshots
-   ProtectionPrompt: Warn/Block prompts
-   NotificationSystem: Toasts and history panel

## Getting Started

1. Install dependencies:

    ```bash
    pnpm install
    ```

2. Run the development server:

    ```bash
    pnpm dev
    ```

3. Open [http://localhost:3000/marketing/snapback-demo](http://localhost:3000/marketing/snapback-demo) in your browser

## Testing

Run the test suite:

```bash
pnpm test
```

Run tests with coverage:

```bash
pnpm test:coverage
```

## Configuration

The demo uses the following default settings:

-   Default protection level: watch
-   Notification duration: 3000ms
-   AI detection: enabled
-   Checkpoint interval: 300000ms (5 minutes)

These can be configured through the settings interface.

## Editor Options

The demo supports two editor implementations:

1. Monaco Editor (default) - Full VS Code-like experience
2. Sandpack Editor (fallback) - Simplified editor with bundling

To switch to Sandpack, set `USE_SANDBOX_EDITOR = true` in [SnapBackDemo.tsx](components/SnapBackDemo.tsx).

## Implementation Notes

### Fixed Issues

1. **Policy Parser**: Now correctly handles both "pattern" and "@level pattern" syntax
2. **Save Behavior**: Editor now only updates buffer on change; save action triggered separately
3. **Deduplication & Debounce**: Implemented content hashing and time-based debouncing
4. **Persistence**: Fully integrated Dexie repositories for all data types
5. **Commands**: Centralized command registry in commands/index.ts
6. **Policy Hot-reload**: Simulated file watching with debounce and status prompts
7. **Notification History**: Full persistence and filterable view
8. **Editor Bridge**: Unified API for Monaco and Sandpack editors

### Additional Improvements

1. **IndexedDB Fallback**: Automatic fallback to in-memory storage with user warning
2. **Enhanced Accessibility**: Proper ARIA attributes and keyboard handling
3. **Snapshot Retention**: Configurable cleanup policy to prevent unbounded growth
4. **Comprehensive Testing**: Additional edge case coverage for all core functionality
