# SnapBack VSCode Extension: Quick Smoke Test Checklist

This is a streamlined checklist for quickly validating the SnapBack VSCode extension's critical functionality.

## Quick Smoke Test (10-15 minutes)

### 1. Installation and Activation ✅
- [ ] Extension installs without errors
- [ ] Extension activates on VS Code startup
- [ ] No error notifications appear
- [ ] Extension icon visible in Activity Bar

### 2. Basic UI Verification ✅
- [ ] SnapBack view loads in Activity Bar
- [ ] Protected Files view accessible
- [ ] Status bar indicator present
- [ ] Command Palette shows SnapBack commands

### 3. Core Protection Functionality ✅
- [ ] Can protect a file (Watch level)
  - Right-click file → SnapBack: Protect File → Watch Level
  - Verify green badge appears on file
- [ ] Can protect a file (Warn level)
  - Right-click file → SnapBack: Protect File → Warn Level
  - Verify yellow badge appears on file
- [ ] Can protect a file (Block level)
  - Right-click file → SnapBack: Protect File → Block Level
  - Verify red badge appears on file

### 4. Snapshot Operations ✅
- [ ] Create manual snapshot
  - Right-click protected file → SnapBack: Create Snapshot
  - Verify snapshot appears in SnapBack view
- [ ] View snapshots
  - Click SnapBack icon in Activity Bar
  - Verify snapshots list displays correctly

### 5. Restore Functionality ✅
- [ ] Restore from snapshot
  - In SnapBack view, right-click snapshot → Snap Back
  - Verify file content is restored

### 6. Configuration Persistence ✅
- [ ] Settings persist
  - Change setting in VS Code Settings UI
  - Restart VS Code
  - Verify setting value persists

## PASS CRITERIA
✅ All checklist items completed successfully
✅ No errors or unexpected behavior
✅ UI elements display correctly
✅ Core functionality works as expected

## FAIL RESPONSE
If any item fails:
1. Document the specific failure
2. Check VS Code Developer Tools console for errors
3. Verify extension version and VS Code compatibility
4. Test in clean VS Code instance with no other extensions
