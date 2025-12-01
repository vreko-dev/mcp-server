# SnapBack VSCode Extension: Test Scenarios for Smoke Testing and UAT

This document outlines test scenarios organized from broad to specific to efficiently catch issues along the critical path for the SnapBack VSCode extension.

## 1. Critical Path Smoke Tests (Must Pass for Basic Functionality)

### 1.1 Extension Installation and Activation
- [ ] Extension installs successfully from VSIX file
- [ ] Extension activates without errors on VS Code startup
- [ ] Extension icon appears in the Activity Bar
- [ ] Extension commands are available in Command Palette
- [ ] Extension properly initializes storage/database

### 1.2 Basic UI Elements
- [ ] SnapBack view appears in Activity Bar
- [ ] Protected Files view is accessible
- [ ] Status bar indicator shows correct status
- [ ] Welcome view displays correctly on first run

### 1.3 Core Protection Functionality
- [ ] Can protect a file with Watch level
- [ ] Can protect a file with Warn level
- [ ] Can protect a file with Block level
- [ ] Protected file badge appears in Explorer
- [ ] Protection context menu items work correctly

## 2. Core Feature Areas (Broad Coverage)

### 2.1 File Protection Management
- [ ] Change protection level from Watch to Warn
- [ ] Change protection level from Warn to Block
- [ ] Change protection level from Block to Watch
- [ ] Unprotect a protected file
- [ ] View all protected files in Protected Files view

### 2.2 Snapshot Creation and Management
- [ ] Create snapshot manually for protected file
- [ ] Automatic snapshot creation for Watch level files
- [ ] View snapshots in SnapBack view
- [ ] Delete a snapshot
- [ ] Rename a snapshot

### 2.3 Restore Functionality
- [ ] Restore file from snapshot
- [ ] Compare current file with snapshot
- [ ] Verify file content is correctly restored

### 2.4 Configuration and Settings
- [ ] Modify extension settings through VS Code settings UI
- [ ] Settings are persisted between sessions
- [ ] Default protection level setting works
- [ ] Offline mode setting functions correctly

## 3. Integration Points (Specific Scenarios)

### 3.1 SDK Integration
- [ ] SDK initializes without errors
- [ ] Storage adapter connects successfully
- [ ] Event bus communication works
- [ ] Thresholds are properly loaded from SDK

### 3.2 File System Operations
- [ ] Protection works with different file types
- [ ] Large files are handled correctly
- [ ] Files with special characters in names
- [ ] Nested directory structures
- [ ] Symbolic links and references

### 3.3 VS Code API Integration
- [ ] Commands register correctly
- [ ] Context menus appear in right locations
- [ ] File decorations show properly
- [ ] Status bar updates in real-time

## 4. Edge Cases and Error Conditions (Specific Failure Scenarios)

### 4.1 File Access Issues
- [ ] Read-only files
- [ ] Files with insufficient permissions
- [ ] Files that are locked by other processes
- [ ] Network drives and remote file systems

### 4.2 Storage and Database Issues
- [ ] Database corruption recovery
- [ ] Low disk space scenarios
- [ ] Concurrent access to storage
- [ ] Migration from old storage format

### 4.3 Network and Offline Scenarios
- [ ] Complete offline mode functionality
- [ ] Network interruption during operation
- [ ] API timeout handling
- [ ] Cache behavior in offline mode

## 5. Performance and Resource Usage (Specific Metrics)

### 5.1 Activation Performance
- [ ] Extension activates within 5 seconds
- [ ] Memory usage stays below 100MB after activation
- [ ] CPU usage returns to baseline after activation

### 5.2 File Operation Performance
- [ ] Snapshot creation for 1KB file < 100ms
- [ ] Snapshot creation for 1MB file < 1000ms
- [ ] Protection status update < 50ms
- [ ] File restore operation < 500ms

### 5.3 Memory and Resource Management
- [ ] No memory leaks during extended use
- [ ] File handles are properly closed
- [ ] Event listeners are properly disposed
- [ ] Background processes terminate correctly

## 6. User Experience Flows (End-to-End Scenarios)

### 6.1 First-Time User Experience
- [ ] Welcome view appears on first install
- [ ] Walkthrough guides function correctly
- [ ] Default settings are appropriate
- [ ] Critical file detection works

### 6.2 Daily Workflow
- [ ] Protect new file workflow
- [ ] Save protected file workflow
- [ ] Review snapshots workflow
- [ ] Restore from snapshot workflow

### 6.3 Team Collaboration
- [ ] .snapbackrc file loading
- [ ] Shared protection policies
- [ ] Multi-root workspace support
- [ ] Configuration synchronization

## 7. Platform-Specific Testing (Environment Variations)

### 7.1 Operating Systems
- [ ] Windows 10/11
- [ ] macOS (latest versions)
- [ ] Linux (Ubuntu LTS, Fedora)

### 7.2 VS Code Versions
- [ ] Minimum supported version (1.99.0)
- [ ] Latest stable version
- [ ] Insider builds

### 7.3 Workspace Configurations
- [ ] Single folder workspace
- [ ] Multi-root workspace
- [ ] Workspace with symbolic links
- [ ] Workspace with git submodules

## 8. Security and Privacy (Critical Validation)

### 8.1 Data Protection
- [ ] File contents are not transmitted externally
- [ ] Sensitive data is properly handled
- [ ] Encryption at rest functions correctly
- [ ] Access controls work as expected

### 8.2 Authentication and Authorization
- [ ] OAuth flow works correctly
- [ ] Session management
- [ ] Permission boundaries are enforced
- [ ] Credential storage security

## 9. Regression Test Suite (Previously Identified Issues)

### 9.1 Type Safety and Imports
- [ ] All SDK types resolve correctly
- [ ] No missing module errors
- [ ] Circular dependency resolution
- [ ] Export surface validation

### 9.2 Build and Deployment
- [ ] Extension compiles without errors
- [ ] Bundle includes all necessary files
- [ ] Source maps work correctly
- [ ] Extension loads in clean environment

## 10. Automation and Monitoring (Validation Checks)

### 10.1 Health Checks
- [ ] Extension health status reporting
- [ ] Error telemetry collection
- [ ] Performance metrics collection
- [ ] Resource usage monitoring

### 10.2 Diagnostic Capabilities
- [ ] Logging verbosity levels
- [ ] Debug mode functionality
- [ ] Diagnostic command output
- [ ] Error reporting mechanism

## Priority Testing Order

### Phase 1: Critical Path (Run First - Must Pass)
1. Extension Installation and Activation
2. Basic UI Elements
3. Core Protection Functionality

### Phase 2: Core Features (Run Second - High Priority)
1. File Protection Management
2. Snapshot Creation and Management
3. Restore Functionality

### Phase 3: Integration and Edge Cases (Run Third - Medium Priority)
1. SDK Integration
2. File System Operations
3. Error Conditions

### Phase 4: Performance and UX (Run Fourth - Lower Priority)
1. Performance Metrics
2. User Experience Flows
3. Platform Compatibility

## Test Execution Guidelines

### Quick Smoke Test (10-15 minutes)
1. Install extension
2. Activate and verify UI elements
3. Protect one file at each level
4. Create and restore a snapshot
5. Verify settings persistence

### Comprehensive UAT (1-2 hours)
1. Execute all Critical Path tests
2. Run Core Feature tests
3. Validate Integration Points
4. Test Edge Cases
5. Verify Performance Metrics

### Regression Test Suite (30-45 minutes)
1. Previously identified issues
2. Type safety validation
3. Build and deployment verification
4. Health check validation

## Success Criteria

A test scenario is considered passed when:
1. All steps execute without errors
2. Expected outcomes match actual results
3. No unexpected side effects occur
4. Performance meets defined thresholds
5. Error handling works as expected

## Failure Response Process

When a test fails:
1. Document the exact failure condition
2. Capture relevant logs and error messages
3. Identify if it's a blocker or non-blocker
4. Create issue with reproduction steps
5. Prioritize based on user impact
