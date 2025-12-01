# SnapBack VS Code Extension Troubleshooting Guide

This guide helps diagnose and resolve common issues with the SnapBack VS Code extension, particularly related to SQLite storage initialization and snapshot functionality.

## Common Issues and Solutions

### 1. "list() must be implemented by subclass" Error

This error indicates that the storage system has fallen back to the base `FileSystemStorage` class, which means the preferred SQLite storage is not available.

#### Symptoms:
- Error message: "list() must be implemented by subclass"
- Error message: "create() must be implemented by subclass"
- SnapBack functionality is limited or not working

#### Root Cause:
The `better-sqlite3` native module is not properly installed or cannot be loaded in the VS Code extension environment.

#### Debugging Steps:

1. **Check Extension Logs**:
   - Open VS Code Output panel (View → Output)
   - Select "SnapBack" from the dropdown
   - Look for error messages related to better-sqlite3 loading

2. **Verify better-sqlite3 Installation**:
   ```bash
   # Navigate to the VS Code extension directory
   cd apps/vscode

   # Check if better-sqlite3 is installed
   ls node_modules/better-sqlite3

   # Check if the native binding exists
   ls node_modules/better-sqlite3/build/Release/
   ```

3. **Rebuild better-sqlite3**:
   ```bash
   # Navigate to the VS Code extension directory
   cd apps/vscode

   # Rebuild the native module
   cd node_modules/better-sqlite3
   npm run install
   ```

4. **Check Platform Compatibility**:
   - Ensure you're using the correct Node.js version for VS Code
   - Check that the better-sqlite3 binary matches your platform (Windows, macOS, Linux)

#### Solution:
The extension includes a postinstall script that should automatically rebuild better-sqlite3:

```json
"postinstall": "cd node_modules/better-sqlite3 && npm run install || true"
```

If this fails, you can manually run:
```bash
cd apps/vscode
pnpm rebuild better-sqlite3
```

### 2. "Compare with Snapshot" Command Not Working

#### Symptoms:
- Command fails with storage errors
- Command is not available in context menu
- "At least two snapshots are required" error when snapshots exist

#### Debugging Steps:

1. **Check Snapshot Count**:
   - Open the SnapBack sidebar view
   - Verify snapshots exist for the file you're trying to compare
   - Ensure there are at least 2 snapshots for the same file

2. **Check Command Enablement**:
   - The "Compare with Snapshot" command should be grayed out when:
     - There are fewer than 2 snapshots for the current file
     - Storage is not properly initialized
     - No file is selected

3. **Verify Context Keys**:
   - Open VS Code Developer Tools (Help → Toggle Developer Tools)
   - In the console, check the context key:
     ```javascript
     vscode.commands.executeCommand('getContext', 'snapback.canCompareWithSnapshot')
     ```

### 3. Storage Initialization Failures

#### Symptoms:
- SnapBack shows limited functionality mode
- Snapshot creation fails
- Error messages about storage not being available

#### Debugging Steps:

1. **Check Workspace Trust**:
   - VS Code may run extensions in limited mode for untrusted workspaces
   - Look for workspace trust notifications
   - Trust the workspace if needed

2. **Verify .snapback Directory**:
   - Check if `.snapback` directory exists in your workspace
   - Ensure it's writable by the extension

3. **Check Permissions**:
   - Ensure the extension has read/write permissions to the workspace
   - Check if any antivirus software is blocking file access

## Advanced Debugging

### Enable Detailed Logging

To get more detailed logs from the extension:

1. Open VS Code Settings (Ctrl/Cmd + ,)
2. Search for "snapback.logLevel"
3. Set it to "debug"

Or add this to your settings.json:
```json
{
  "snapback.logLevel": "debug"
}
```

### Check Native Module Loading

If you're still having issues with better-sqlite3, you can test it directly:

```javascript
// In VS Code Developer Console (Help → Toggle Developer Tools)
try {
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  console.log('better-sqlite3 loaded successfully');
  db.close();
} catch (error) {
  console.error('Failed to load better-sqlite3:', error);
}
```

## Known Limitations

1. **Electron/Node.js ABI Compatibility**:
   - VS Code uses Electron which has its own Node.js version
   - better-sqlite3 must be compiled against the same Node.js version as VS Code's Electron

2. **Cross-Platform Issues**:
   - Native modules must be compiled for the specific platform
   - Issues may occur when developing on one platform and running on another

3. **Workspace Trust**:
   - Limited functionality in untrusted workspaces
   - Some features may be disabled for security reasons

## Getting Help

If you're still experiencing issues:

1. Check the extension logs in VS Code Output panel
2. Verify your environment matches the requirements
3. Try reinstalling the extension
4. File an issue on the SnapBack GitHub repository with:
   - Extension version
   - VS Code version
   - Operating system
   - Error messages from the logs
   - Steps to reproduce the issue
