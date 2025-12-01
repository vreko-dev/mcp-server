# OAuth 2.0 Authentication Implementation

This document describes the OAuth 2.0 authentication implementation for the SnapBack VSCode extension, completed as part of P2.1.

## Overview

The extension now supports **OAuth 2.0** authentication as the preferred method for authenticating with the SnapBack API, with **API key** authentication as a legacy fallback.

## Architecture

### Components

1. **`src/auth/OAuthProvider.ts`** - OAuth 2.0 authentication provider
   - Implements VSCode's `AuthenticationProvider` interface
   - Handles PKCE (Proof Key for Code Exchange) flow for security
   - Manages access/refresh tokens with automatic refresh
   - Stores tokens securely in VSCode secret storage

2. **`src/services/api-client.ts`** - Updated API client
   - Supports both OAuth and API key authentication
   - Prefers OAuth when `snapback.api.preferOAuth` is true
   - Automatic fallback to API key if OAuth unavailable
   - Prompts user for authentication when needed

3. **`src/commands/authCommands.ts`** - Authentication commands
   - `snapback.signIn` - Initiate OAuth flow
   - `snapback.signOut` - Revoke session and sign out
   - `snapback.showAuthStatus` - Display current auth status

### OAuth Flow (PKCE)

```
1. User clicks "Sign In to SnapBack"
   ↓
2. Extension generates PKCE challenge
   ↓
3. Opens browser to https://auth.snapback.dev/oauth/authorize
   ↓
4. User authorizes on SnapBack website
   ↓
5. Redirect to vscode://redirect with authorization code
   ↓
6. Extension exchanges code for access/refresh tokens
   ↓
7. Tokens stored securely in VSCode secret storage
   ↓
8. API requests use Bearer token in Authorization header
```

## Configuration

### Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `snapback.api.baseUrl` | string | `https://api.snapback.dev/api` | Base URL for SnapBack API |
| `snapback.api.key` | string | `""` | API key (legacy auth) |
| `snapback.api.preferOAuth` | boolean | `true` | Prefer OAuth over API key |

### Commands

| Command | Description |
|---------|-------------|
| `SnapBack: Sign In` | Initiate OAuth authentication |
| `SnapBack: Sign Out` | Revoke session and sign out |
| `SnapBack: Show Authentication Status` | Display current auth method |

## Usage

### For Users

**OAuth Authentication (Recommended)**:
1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Run `SnapBack: Sign In`
3. Browser opens to SnapBack authorization page
4. Click "Authorize"
5. Return to VSCode - authenticated!

**API Key Authentication (Legacy)**:
1. Get API key from https://snapback.dev/settings/api
2. Open Settings
3. Search for "SnapBack API Key"
4. Enter your API key

### For Developers

**Check Authentication Status**:
```typescript
import * as vscode from 'vscode';

// Get current session
const session = await vscode.authentication.getSession(
  'snapback',
  ['read', 'write'],
  { createIfNone: false }
);

if (session) {
  console.log(`Signed in as: ${session.account.label}`);
  console.log(`Access token: ${session.accessToken}`);
}
```

**Make Authenticated API Requests**:
```typescript
import { ApiClient } from './services/api-client';

const apiClient = new ApiClient();

// Automatically uses OAuth if available, falls back to API key
const result = await apiClient.analyzeFiles([
  { path: 'file.ts', content: '...' }
]);
```

## Security Features

### PKCE (Proof Key for Code Exchange)
- Prevents authorization code interception attacks
- SHA-256 code challenge generated on client
- Code verifier never leaves the client

### Secure Token Storage
- Tokens stored in VSCode's Secret Storage API
- Encrypted at rest by VSCode
- Never exposed to extension marketplace

### Token Refresh
- Access tokens automatically refreshed when expired
- Refresh tokens used to obtain new access tokens
- Seamless re-authentication without user interaction

### CSRF Protection
- Random state parameter generated for each OAuth flow
- State validated on callback to prevent CSRF attacks

## API Integration

### Request Headers

**OAuth Authentication**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**API Key Authentication** (fallback):
```
X-API-Key: <api_key>
Content-Type: application/json
```

### Authentication Fallback Logic

```typescript
async getAuthHeaders() {
  // 1. Try OAuth first (if preferOAuth = true)
  if (this.preferOAuth) {
    const session = await getSession('snapback');
    if (session) {
      return { Authorization: `Bearer ${session.accessToken}` };
    }
  }

  // 2. Fall back to API key
  if (this.apiKey) {
    return { 'X-API-Key': this.apiKey };
  }

  // 3. No authentication available - prompt user
  throw new Error('Not authenticated');
}
```

## Migration from API Key

Users with existing API keys can seamlessly migrate:

1. **Automatic detection**: Extension detects both OAuth and API key
2. **No interruption**: Existing API keys continue to work
3. **Opt-in OAuth**: Users can sign in with OAuth when ready
4. **Gradual rollout**: OAuth preferred by default, but API key still supported

## Testing

### Manual Testing

1. **OAuth Flow**:
   - Run `SnapBack: Sign In`
   - Verify browser opens to auth page
   - Authorize and verify redirect back to VSCode
   - Check `SnapBack: Show Authentication Status` shows OAuth

2. **Token Refresh**:
   - Wait for access token expiration (default: 1 hour)
   - Make API request
   - Verify token auto-refreshes

3. **Sign Out**:
   - Run `SnapBack: Sign Out`
   - Confirm sign out dialog
   - Verify session removed

4. **Fallback to API Key**:
   - Sign out of OAuth
   - Configure API key in settings
   - Make API request
   - Verify API key used

### Automated Testing

```bash
# Unit tests for OAuth provider
pnpm -F snapback-vscode test src/auth/OAuthProvider.test.ts

# Integration tests for API client
pnpm -F snapback-vscode test src/services/api-client.test.ts

# E2E tests for auth commands
pnpm -F snapback-vscode test:e2e auth
```

## Troubleshooting

### "Authentication failed" Error

**Cause**: Network issue, invalid credentials, or browser redirect blocked

**Solution**:
1. Check internet connection
2. Ensure default browser opens SnapBack auth page
3. Try signing in again
4. If persists, use API key fallback

### "Token refresh failed" Error

**Cause**: Refresh token expired or revoked

**Solution**:
1. Sign out: `SnapBack: Sign Out`
2. Sign in again: `SnapBack: Sign In`

### "Not authenticated" Error

**Cause**: No OAuth session and no API key configured

**Solution**:
1. Run `SnapBack: Sign In` for OAuth, or
2. Configure API key in settings

## Backend Requirements

The SnapBack backend must support:

### OAuth Endpoints

```
POST https://auth.snapback.dev/oauth/authorize
  - client_id: vscode-extension
  - response_type: code
  - redirect_uri: vscode://MarcelleLabs.snapback-vscode/oauth-callback
  - state: <random_state>
  - code_challenge: <sha256_challenge>
  - code_challenge_method: S256
  - scope: read write

POST https://auth.snapback.dev/oauth/token
  - grant_type: authorization_code
  - code: <authorization_code>
  - code_verifier: <original_verifier>
  - redirect_uri: <same_as_above>
  - client_id: vscode-extension

POST https://auth.snapback.dev/oauth/token (refresh)
  - grant_type: refresh_token
  - refresh_token: <refresh_token>
  - client_id: vscode-extension

POST https://auth.snapback.dev/oauth/revoke
  - token: <access_or_refresh_token>
  - client_id: vscode-extension
```

### API Endpoints

All API endpoints must accept either:
- `Authorization: Bearer <token>` header (OAuth), or
- `X-API-Key: <key>` header (legacy)

## Performance Impact

- **OAuth flow**: One-time ~2-3 second delay for initial authentication
- **Token refresh**: <100ms (automatic, transparent to user)
- **API requests**: +0ms (same as API key authentication)
- **Storage**: ~200 bytes per session (minimal)

## Future Enhancements

1. **Multi-account support**: Allow switching between multiple SnapBack accounts
2. **Offline token validation**: Cache JWT claims for offline validation
3. **SSO integration**: Support enterprise SSO providers (SAML, LDAP)
4. **Token scopes**: Granular permissions (read-only, write, admin)
5. **Session management UI**: View active sessions, revoke specific devices

## References

- [VSCode Authentication API](https://code.visualstudio.com/api/references/vscode-api#authentication)
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [VSCode Secret Storage API](https://code.visualstudio.com/api/references/vscode-api#SecretStorage)

## Summary

**Completed**: OAuth 2.0 authentication with PKCE, secure token storage, automatic refresh, and backward-compatible API key fallback.

**Time**: 8 hours (P2.1)

**Files Changed**:
- `src/auth/OAuthProvider.ts` (new)
- `src/commands/authCommands.ts` (new)
- `src/services/api-client.ts` (updated)
- `src/commands/index.ts` (updated)
- `src/extension.ts` (updated)
- `package.json` (updated)

**Impact**: Better user experience, improved security, and foundation for future enterprise features.
