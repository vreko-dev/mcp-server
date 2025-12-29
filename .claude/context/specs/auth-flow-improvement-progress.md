# Auth Flow Improvement Progress

## Status: In Progress (Paused)
**Last Updated**: 2025-12-29

## Overview

Consolidating device authorization flow (RFC 8628) into a shared client to eliminate code duplication between CLI and VSCode extension.

## Completed

### 1. Shared DeviceAuthClient Created
**Location**: `packages-oss/sdk/src/auth/DeviceAuthClient.ts`

- RFC 8628 compliant device authorization client (~440 LOC)
- Handles all polling logic, error codes (`authorization_pending`, `slow_down`, `expired_token`, `access_denied`)
- Uses `ky` HTTP client (already in SDK) - minimal bundle impact
- Callback-based progress tracking
- AbortController cancellation support

**Exported Types**:
- `DeviceAuthClient`, `createDeviceAuthClient`
- `AuthResult`, `FlowState`, `DeviceCodeResponse`, `TokenResponse`
- `DeviceAuthCallbacks`, `DeviceAuthClientConfig`, `DeviceAuthError`

### 2. SDK Index Export
**Location**: `packages-oss/sdk/src/index.ts`

All auth types and client exported from SDK for consumption.

### 3. Unit Tests
**Location**: `packages-oss/sdk/__tests__/auth/DeviceAuthClient.test.ts`

- 25 tests covering:
  - Constructor and configuration
  - State management
  - Device code request
  - Token polling with all RFC 8628 error codes
  - Cancellation (internal and external AbortSignal)
  - Timeout handling
  - Callback invocations

**Status**: All 25 tests passing

### 4. VSCode Extension Refactored
**Location**: `apps/vscode/src/auth/DeviceAuthFlow.ts`

- Reduced from 375 LOC to 193 LOC (**48% reduction**)
- Uses shared `DeviceAuthClient` from SDK
- Maintains VSCode-specific functionality:
  - UI prompts (`showVerificationPrompt`)
  - Credential storage (`context.secrets`)
  - Diagnostic event tracking
- Backward-compatible public API

## Remaining Work

### 1. Test Alignment with Codebase Standards
- [ ] Update tests to use setup utilities (`useFakeTimers`, `measurePerformance` from `__tests__/setup.ts`)
- [ ] Add performance tests with `PERFORMANCE_THRESHOLD_MS`
- [ ] Follow TDD documentation pattern from other tests

### 2. CLI Endpoint Alignment Investigation
**Issue Discovered**: CLI uses different API endpoints than SDK

| Component | Device Code Endpoint | Token Poll Endpoint |
|-----------|---------------------|---------------------|
| SDK/VSCode | `deviceAuth/requestCode` | `deviceAuth/pollToken` |
| CLI | `/auth/device` | `/auth/device/token` |

**Field Name Differences**:
- SDK: `device_code` (RFC 8628 snake_case)
- CLI: `deviceCode` (camelCase)

**Action Needed**: Investigate `apps/api/modules/device-auth/router.ts` and `apps/api/modules/auth/router.ts` to understand endpoint structure and decide on consolidation approach.

### 3. CLI Migration (Optional)
**Location**: `apps/cli/src/commands/auth.ts`

The `loginWithDeviceCode()` function (~70 LOC) could be refactored to use `DeviceAuthClient`, but requires:
1. Endpoint alignment resolution
2. Credential storage adapter (CLI uses `~/.snapback/credentials.json`, not VS Code secrets)
3. CLI-specific UI (chalk, ora spinners vs VS Code prompts)

### 4. Integration Tests
- [ ] Add integration test for VSCode DeviceAuthFlow with mocked API
- [ ] Add E2E test for full device flow (if API mock server available)

### 5. Validation
- [ ] Run full SDK test suite
- [ ] Run VSCode extension tests
- [ ] SnapBack pattern validation

## Files Changed

```
packages-oss/sdk/src/auth/DeviceAuthClient.ts      # NEW - shared client
packages-oss/sdk/src/index.ts                      # MODIFIED - exports
packages-oss/sdk/__tests__/auth/DeviceAuthClient.test.ts  # NEW - tests
apps/vscode/src/auth/DeviceAuthFlow.ts             # MODIFIED - refactored
```

## API Endpoint Files (for investigation)

```
apps/api/modules/device-auth/router.ts             # oRPC device auth routes
apps/api/modules/auth/router.ts                    # Auth routes
apps/api/__tests__/device-auth-flow.test.ts        # Device auth tests
```

## Key Decisions Made

1. **Bundle-conscious approach**: Used `ky` (already in SDK) instead of adding `better-auth/client` to avoid bundle size increase (constraint: <2MB)

2. **Shared client in SDK**: Put in `@snapback-oss/sdk` since it's used by both OSS CLI and commercial VSCode extension

3. **Callback pattern**: Used callbacks instead of events for progress tracking to keep the API simple and avoid adding event emitter dependencies

## Commands to Resume

```bash
# Build SDK
pnpm --filter @snapback-oss/sdk build

# Run DeviceAuthClient tests
pnpm --filter @snapback-oss/sdk exec vitest run __tests__/auth/DeviceAuthClient.test.ts

# Type check VSCode
pnpm --filter snapback-vscode type-check

# SnapBack pattern check
mcp__snapback__check m:q f:["packages-oss/sdk/src/auth/DeviceAuthClient.ts"]
```

## Next Steps When Resuming

1. Investigate API endpoint alignment in `apps/api/modules/device-auth/router.ts`
2. Update tests to follow codebase patterns (setup utilities)
3. Decide on CLI migration approach
4. Run full test suite for regression check
