# Phase S2: Extension Audit

## Extension Information
- **Name**: snapback-vscode
- **Version**: 1.2.5
- **Display Name**: SnapBack - Code Safety Net
- **Publisher**: MarcelleLabs

## Activation Events
The extension activates under three conditions:

1. **onStartupFinished**: Extension activates when VS Code startup is finished
2. **onCommand:snapback.***: Extension activates when any snapback command is executed
3. **workspaceContains:.snapbackrc**: Extension activates when workspace contains a .snapbackrc file

## Bundler Configuration
- **Tool**: esbuild
- **Config File**: esbuild.config.cjs
- **Entry Point**: ./src/extension.ts
- **Format**: cjs
- **Minification**: Enabled for production builds
- **Target**: node20
- **Output File**: dist/extension.js
- **External Dependencies**: 
  - vscode (VS Code API)
  - better-sqlite3 (Native module that should not be bundled)

## Bundle Size
- **Limit**: 1MB
- **Check Script**: scripts/check-bundle-size.js
- **Estimated Size**: TBD - Would need to build and check actual size

## Telemetry Implementation
- **Implementation**: VSCodeTelemetry class
- **File**: src/telemetry.ts
- **Client**: PostHog
- **Proxy**: TelemetryProxy
- **Event Bus**: SnapBackEventBus
- **Feature Flags**: Yes, with detailed telemetry control

## First-Run Wizard
- **Implementation**: WelcomeView class
- **File**: src/welcomeView.ts
- **Type**: Webview
- **Features**:
  - Initialize SnapBack
  - Protect Entire Repository
  - Documentation links

## Heavy Dependencies
1. **better-sqlite3**: Native module for database operations (marked as external)
2. **simple-git**: Git operations integration

## Error Surfaces
1. **UI Level**: Uses inline CodeLens + status-bar toast instead of modal dialogs for MVP (src/notificationManager.ts)
2. **Logging**: Comprehensive error logging with Logger class (src/utils/logger.ts)
3. **Save Handler**: Error handling in save operations with restoration fallback (src/handlers/SaveHandler.ts)

## Offline Queue Implementation
The extension has partial offline support:

- **Offline Mode Configuration**: Available through settings
- **RulesManager**: Respects offline mode setting
- **StorageBroker**: Provides queuing mechanism for database operations
- **Limitation**: No explicit telemetry event queue for offline scenarios

Key files:
- src/commands/offlineModeCommands.ts
- src/rules/RulesManager.ts
- packages/sdk/src/storage/StorageBroker.ts