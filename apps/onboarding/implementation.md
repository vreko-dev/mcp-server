# SnapBack Onboarding: Quick Reference & Implementation Timeline

## One-Pager Summary

### **The Problem You're Solving**
Multiple entry points (landing page, extension install, extension signup) creating decision complexity and defect opportunities. Need single, frictionless "just works" onboarding.

### **The Solution: Converged Flow**
- **Single auth method:** Magic links only (no passwords, passwordless)
- **Three entry points:** All converge on same magic link email
- **Context-aware routing:** After auth, route to console or extension based on IDE detection
- **MCP broker:** Standardized communication between thin clients and backend

### **Why This Works**
âœ… Fewer code branches = fewer bugs
âœ… Magic links proven for developer SaaS (Slack, Medium, GitHub)
âœ… No password reset complexity for beta users
âœ… Context detection happens AFTER auth (simple routing, not complex logic)
âœ… MCP pattern scales to any thin client (extension, console, CLI, Cursor IDE, Windsurf, etc)

---

## Entry Points & Where They Converge

```
Landing Page                Extension 1              Extension 2
(HubSpot form)         (Signup via form)         (Already installed)
     â†“                        â†“                           â†“
Email submitted         Email input               Sign in button
     â†“                        â†“                           â†“
HubSpot approval        Direct submission         Opens form
     â†“                        â†“                           â†“
     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â†’ MAGIC LINK EMAIL â†â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                          (Converged point)
                                â†“
                    User clicks link
                                â†“
                    console.snapback.dev/auth/verify?token=...
                                â†“
                    Context detection engine
                                â†“
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â†“           â†“           â†“
                IDE detected  Clean browser Extension first
                    â†“           â†“           â†“
              Console +     Console +      Extension setup
              Back to IDE   Intro tour     (Get API key)
```

---

## Implementation Phases

### **Phase 1: Foundation (Week 1-2)**
**Goal:** Working magic link authentication

- [ ] Implement token generation (secure, 24-hour TTL, one-time use)
- [ ] Create `/auth/verify?token=...` endpoint
- [ ] Wire HubSpot form to email trigger (Resend.io or Loops.so)
- [ ] Create email template (mobile-optimized)
- [ ] Test magic link â†’ verified session locally

**Deliverable:** User can sign up via landing page and land on console

---

### **Phase 2: Console Integration (Week 3)**
**Goal:** IDE context detection and routing

- [ ] Detect VS Code context (localStorage, sessionStorage, window.opener)
- [ ] Implement context-aware routing after `/auth/verify`
- [ ] Build "Back to [IDE]" button UI
- [ ] Test with VS Code extension running in background
- [ ] Test with clean browser (no IDE)

**Deliverable:** Users see "Back to VS Code" button when IDE is active

---

### **Phase 3: Extension Entry Points (Week 4)**
**Goal:** Extension can request magic link directly

- [ ] Add email input modal to extension sidebar
- [ ] Extension â†’ Email service (direct link request)
- [ ] Encode `extension_id` in magic link URL
- [ ] Console detects `extension_id` in URL, routes to extension setup
- [ ] Extension receives auth token via localStorage sync

**Deliverable:** User can sign up entirely within extension UI

---

### **Phase 4: MCP Communication (Week 5-6)**
**Goal:** Thin clients communicate with backend through MCP

- [ ] Implement local MCP server (Node.js) in extension
- [ ] Implement `tools/call` for: `backup_file`, `restore_file`
- [ ] Implement `resources/read` for: `workspace_metadata`
- [ ] Add HTTP+SSE remote MCP server at `api.snapback.dev/mcp`
- [ ] Test token passing through MCP (automatic refresh on 401)

**Deliverable:** Extension can create backups through MCP server

---

### **Phase 5: Polish & Resilience (Week 7-8)**
**Goal:** Production-ready error handling and edge cases

- [ ] Token refresh before expiry (automatic, transparent)
- [ ] Network interruption queue (local IndexedDB)
- [ ] MCP server crash recovery (auto-restart)
- [ ] Email link expiry handling (resend button)
- [ ] Session revocation on logout (all clients sync)

**Deliverable:** All six flow combinations tested, edge cases handled

---

## Key Technical Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| **Auth method** | Magic links | Simplicity + developer adoption + no password burden |
| **Email provider** | Resend.io or Loops | Best for dev communities + good deliverability |
| **Token TTL** | 24 hours | Generous for work-hour auth, reduces resend requests |
| **IDE detection** | localStorage flag | Lightweight, no extension-to-browser bridge needed |
| **MCP transport (local)** | STDIO | Optimal performance, no network overhead |
| **MCP transport (remote)** | HTTP + SSE | Browser can't use stdio, SSE for streaming |
| **Session storage** | HttpOnly cookies + localStorage | Security + context detection |
| **Token refresh** | Automatic, before expiry | User never sees "session expired" |

---

## Database Schema (Minimal)

### **Users Table**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

### **Magic Tokens Table**
```sql
CREATE TABLE magic_tokens (
  id VARCHAR(32) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  purpose VARCHAR(50),
  issued_at TIMESTAMP,
  expires_at TIMESTAMP,
  consumed_at TIMESTAMP NULL,
  ip_address INET,
  user_agent TEXT
);
```

### **Sessions Table**
```sql
CREATE TABLE sessions (
  id VARCHAR(32) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  issued_at TIMESTAMP,
  expires_at TIMESTAMP,
  refresh_token VARCHAR(255) UNIQUE,
  ide_context JSONB,
  revoked_at TIMESTAMP NULL
);
```

### **Indexes** (for performance)
```sql
CREATE INDEX idx_magic_tokens_user_id ON magic_tokens(user_id);
CREATE INDEX idx_magic_tokens_expires_at ON magic_tokens(expires_at);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

---

## API Endpoints (Backend)

### **Authentication**
```
POST /auth/request-magic-link
  Input: { email, entryPoint: "landing_page|extension|direct" }
  Output: { status: "sent", expiresIn: 86400 }

GET /auth/verify?token=...&extension_id=...&ide_context=...
  Input: Magic token in URL
  Output: { sessionToken, refreshToken, expiresIn, user: {...} }
          Set-Cookie: sessionId=...; HttpOnly; Secure

POST /auth/refresh
  Input: { refreshToken }
  Output: { sessionToken, expiresIn }

POST /auth/logout
  Input: (authenticated)
  Output: { status: "logged_out" }
```

### **IDE Context**
```
POST /ide-context
  Input: { ide, version, workspace, extensionVersion }
  Output: { status: "registered" }

GET /ide-context/:userId
  Output: { ide, version, workspace, lastSeen: timestamp }
```

### **Backups** (via MCP)
```
POST /backups
  Input: { filePath, content, language, workspaceId, timestamp }
  Output: { id, status, size, createdAt }

GET /backups
  Input: { limit, offset }
  Output: [{ id, filePath, size, createdAt }, ...]

GET /backups/:backupId
  Output: { id, filePath, content, language, createdAt }

POST /restore
  Input: { backupId, targetPath }
  Output: { status, completedAt }
```

---

## Metrics to Track (Monitoring)

### **Signup Funnel**
- `signup.landing_page.started` - User views landing page
- `signup.landing_page.form_submitted` - Email submitted via form
- `signup.magic_link.sent` - Email sent successfully
- `signup.magic_link.clicked` - User clicks link
- `signup.magic_link.verified` - Token validated
- `signup.console.loaded` - User lands on console
- `signup.extension.setup_completed` - Extension configured

### **Error Tracking**
- `auth.magic_link.expired` - User attempts expired token
- `auth.magic_link.failed_delivery` - Email bounced
- `auth.token.refresh_failed` - Token refresh failure
- `auth.session.revoked` - User logged out
- `mcp.server.crashed` - Extension MCP server crashed
- `backup.network_timeout` - Backup failed (network)
- `backup.storage_failed` - Backup failed (storage)

### **Performance**
- `magic_link.delivery_time` - Email sent (p50, p95, p99)
- `auth.verification_time` - Token validation time
- `mcp.call_latency` - MCP request â†’ response time
- `backup.upload_time` - Time to upload backup
- `session.duration` - How long users stay logged in

---

## Testing Checklist

### **Magic Link Flow**
- [ ] Token generated with correct entropy
- [ ] Email sent within 2 seconds
- [ ] Link works immediately after generation
- [ ] Link expires after 24 hours
- [ ] Link cannot be used twice
- [ ] Wrong token returns 400 Bad Request
- [ ] Expired token returns 410 Gone
- [ ] Resend button sends new token
- [ ] Mobile email clients (Gmail, Outlook) handle link correctly

### **IDE Detection**
- [ ] VS Code active â†’ "Back to VS Code" button shows
- [ ] VS Code not active â†’ button hidden
- [ ] Switching IDEs updates context correctly
- [ ] Multiple VS Code windows â†’ uses active window

### **MCP Communication**
- [ ] Extension â†’ MCP â†’ Backend call succeeds
- [ ] Token refresh happens automatically on 401
- [ ] Large file backup (>100MB) doesn't timeout
- [ ] Network interruption queues backup
- [ ] MCP server restart doesn't lose state

### **Edge Cases**
- [ ] User signs up twice (same email) â†’ reuses account
- [ ] User closes browser during backup â†’ retries on next session
- [ ] User logout â†’ all sessions revoked
- [ ] Token expired mid-backup â†’ refresh + retry transparent

---

## Deployment Notes

### **HubSpot Integration**
1. Create "Magic Link" email template
2. Create workflow: "User submits form" â†’ "Send email" â†’ "Mark as pioneer"
3. Test workflow with test email address
4. Set up forwarding to email provider (Resend.io)

### **Email Domain Setup**
1. Verify domain (snapback.dev or company domain)
2. Add DKIM, SPF, DMARC records
3. Test with mail-tester.com (aim for >90 score)
4. Monitor bounce rate in email provider dashboard

### **Backend Deployment**
1. Set env vars: `MAGIC_LINK_TTL`, `TOKEN_SECRET`, `EMAIL_API_KEY`
2. Run migrations for users, magic_tokens, sessions tables
3. Set up Redis for token storage (TTL auto-expiry)
4. Test /auth endpoints in staging first

### **Extension Deployment**
1. Install MCP SDK: `npm install @modelcontextprotocol/sdk`
2. Implement local MCP server spawning
3. Test in development extension (F5 debug)
4. Publish to VS Code Marketplace with beta tag

---

## FAQ & Troubleshooting

**Q: User says they didn't receive the email**
- Check: Email provider bounce logs (Resend.io dashboard)
- Check: Gmail promotions tab, spam folder
- Solution: Resend button generates new token + email

**Q: Link worked on desktop, not on mobile**
- Issue: Deep link handling in VS Code iOS
- Solution: Direct HTTP link to console works on mobile (both trigger auth)

**Q: Token refresh failed, user got logged out**
- Issue: Refresh token expired (should happen rarely)
- Solution: User clicks "Sign in again", gets new magic link

**Q: Extension MCP server keeps crashing**
- Issue: Out of memory (large backups), or unhandled exception
- Solution: Implement process monitoring + auto-restart with exponential backoff

**Q: How do I test with localhost?**
- Edit `/etc/hosts`: `127.0.0.1 console.snapback.local`
- Use HTTPS for localhost (mkcert for self-signed cert)
- Set INSECURE_COOKIE=true in dev environment

---

## Files You Need to Create

1. **Backend**
   - `src/auth/magic-link.service.ts` - Token generation/validation
   - `src/auth/session.service.ts` - Session lifecycle
   - `src/mcp/mcp.controller.ts` - MCP HTTP endpoint
   - `src/ide/ide-context.service.ts` - IDE registration

2. **Extension**
   - `src/mcp/mcp-server.js` - Local MCP server
   - `src/auth/auth.manager.ts` - Auth token lifecycle
   - `src/ui/signin-modal.ts` - Email input UI
   - `src/backup/backup.service.ts` - File backup logic

3. **Console (Next.js)**
   - `pages/auth/verify.tsx` - Magic link verification page
   - `lib/auth.ts` - Client-side auth state
   - `hooks/useIdeContext.ts` - IDE detection hook
   - `components/BackToIDEButton.tsx` - IDE redirect button

---

## Next Steps

1. **Review this document** with your team (architecture decisions, timeline)
2. **Create GitHub issues** for each phase (Foundation, Integration, etc)
3. **Set up HubSpot workflow** (email â†’ magic link trigger)
4. **Start Phase 1** (magic link token generation)
5. **Test locally** before deploying to staging

This approach gets you from "multiple flows = bugs" to "one clean flow = confidence."
