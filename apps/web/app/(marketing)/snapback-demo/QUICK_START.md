# SnapBack Demo Quick Start Guide

## Overview

This guide will help you quickly get started with the SnapBack interactive demo. The demo showcases all the core features of SnapBack in a browser-based environment that mirrors the VS Code extension experience.

## Prerequisites

-   Node.js 18+
-   pnpm package manager

## Installation

1. Clone the repository (if not already done)
2. Navigate to the web app directory:
    ```bash
    cd apps/web
    ```
3. Install dependencies:
    ```bash
    pnpm install
    ```

## Running the Demo

1. Start the development server:
    ```bash
    pnpm dev
    ```
2. Open your browser to [http://localhost:3000/marketing/snapback-demo](http://localhost:3000/marketing/snapback-demo)

## Key Features to Try

### 1. File Protection

-   Open the File Explorer panel
-   Select a file to edit
-   Change the protection level using the dropdown next to the file
-   Try setting a file to "Block" level and then attempting to save changes

### 2. Snapshots

-   Make changes to a file
-   Click the save button (or Ctrl+S)
-   View snapshots in the bottom panel under the "Snapshots" tab
-   Restore a previous snapshot to see the content rollback

### 3. AI Monitoring

-   Toggle AI monitoring on/off using the Status Bar
-   Make risky changes to trigger AI suggestions (e.g., add `rm -rf /` to a file)
-   Respond to AI suggestions to upgrade protection or create checkpoints

### 4. Policies

-   The demo simulates policy file changes
-   Watch the Status Bar for policy reload notifications
-   See how policies automatically apply protection to matching files

### 5. Notifications

-   Observe toast notifications for various actions
-   Click "Show History" to view all notifications
-   Clear notifications using the "Clear All" button

## Editor Options

The demo supports two editor implementations:

### Monaco Editor (Default)

-   Full VS Code-like editing experience
-   Syntax highlighting
-   IntelliSense-like features

### Sandpack Editor (Fallback)

-   Simplified editor with bundling
-   No worker configuration required
-   Switch by setting `USE_SANDBOX_EDITOR = true` in [SnapBackDemo.tsx](components/SnapBackDemo.tsx)

## Testing

Run the comprehensive test suite:

```bash
pnpm test
```

Run tests with coverage reporting:

```bash
pnpm test:coverage
```

## Customization

You can customize the demo behavior by modifying settings in the [settings.ts](domain/settings.ts) file:

-   Protection level defaults
-   Notification durations
-   AI detection parameters
-   Checkpoint intervals

## Troubleshooting

-   If the editor doesn't load, check the browser console for errors
-   If IndexedDB operations fail, try clearing browser data for the site
-   For Monaco Editor issues, try switching to the Sandpack fallback

## Feedback

Please report any issues or suggestions on the project's GitHub repository.
