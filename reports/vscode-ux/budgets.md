# SnapBack UX Budgets

## Performance Budgets

| Metric | Budget | Rationale |
|--------|--------|-----------|
| UI Action Response Time | ≤ 300ms | Ensures responsive user experience |
| Analysis Kickoff Time | ≤ 200ms | Prevents noticeable delays in protection flow |
| Memory Peak Usage | ≤ 200MB | Maintains reasonable resource consumption |
| VSIX Package Size | ≤ 2MB | Ensures fast download and installation |

## UX Timing Requirements

### Critical Path Operations
1. **Save Handler Response**: Must complete within 200ms to avoid blocking user workflow
2. **Status Bar Updates**: Must reflect state changes within 200ms
3. **Dialog Presentation**: Should appear immediately upon triggering event
4. **Notification Deduplication**: Real-time processing to prevent spam

### Background Operations
1. **Snapshot Creation**: Can take longer but should show progress indicator
2. **File Watching**: Should not impact editor performance
3. **Configuration Loading**: Should be cached after initial load

## Network Policies

| Policy | Setting | Rationale |
|--------|---------|-----------|
| Networking | Blocked | Prevents accidental data leakage |
| Secrets Handling | Mock in tests | Ensures security compliance |
| Test Selection | Incremental | Optimizes test execution time |
| Cache Results | Enabled | Reduces redundant operations |

## Test Infrastructure

### Flake Detection
- **Enabled**: Yes
- **Retries**: 2
- **Report Location**: `apps/vscode/test/.flaky-tests.json`

### Matrix Testing
- **Tier 1**: Linux with Node 20
- **Fast Fail**: Enabled for CI builds

## Implementation Guidelines

### Performance Monitoring
- All UI actions must be instrumented with timing probes
- Memory usage should be monitored during integration tests
- Bundle size checked on every build

### Error Handling
- All network calls must have timeout safeguards
- UI failures should fallback to output channel logging
- Critical path errors should not block core functionality

### Accessibility
- All dialogs must include ARIA labels
- Focus traps required for modal interactions
- Keyboard navigation supported for all controls