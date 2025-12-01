# SnapBack TODO - Detailed Comparison Table

## All TODOs with Status & Evidence

| # | File | Line | TODO Text | Status | Priority | Est. Hours | Evidence | Impact |
|---|------|------|-----------|--------|----------|------------|----------|--------|
| 1 | apps/vscode/src/views/SessionsTreeProvider.ts | 21 | Implement actual session storage retrieval | INCOMPLETE | CRITICAL | 2 | Tree loads empty array on init | Session timeline broken |
| 2 | apps/vscode/src/views/SessionsTreeProvider.ts | 47 | Retrieve actual sessions from storage | INCOMPLETE | CRITICAL | 1 | Only uses in-memory array | Historical sessions not displayed |
| 3 | apps/vscode/src/views/SnapshotsTreeProvider.ts | 42 | Listen for other snapshot events (delete, restore) | INCOMPLETE | CRITICAL | 1 | Only listens to 'snapshot-created' | Delete/restore don't update UI |
| 4 | apps/vscode/src/services/SnapshotService.ts | 126 | Delete associated file data | INCOMPLETE | CRITICAL | 2 | Deletes metadata only, not files | 10GB+ disk space leak |
| 5 | apps/vscode/src/services/SnapshotService.ts | 151 | Implement actual file data saving | INCOMPLETE | CRITICAL | 3 | Reads files but doesn't persist | Snapshots cannot be restored |
| 6 | apps/web/middleware.ts | 70 | Implement nonce-based CSP | DESIGN_PHASE | HIGH | 8 | Uses 'unsafe-inline' in CSP | XSS vulnerability |
| 7 | apps/web/middleware/auth.ts | 1 | Re-enable when argon2 build resolved | INCOMPLETE | HIGH | 6 | Argon2 disabled, returns 501 | Password hashing impossible |
| 8 | apps/web/middleware/auth.ts | 6 | Re-enable API key verification | INCOMPLETE | HIGH | 2 | Code commented out | API authentication broken |
| 9 | apps/web/middleware/auth.ts | 9 | Implement organization membership | INCOMPLETE | HIGH | 4 | Returns hardcoded empty array | Multi-tenant features blocked |
| 10 | apps/web/middleware/auth.ts | 129 | Re-enable API key db lookup | INCOMPLETE | HIGH | 1 | Code commented, returns 501 | REST API cannot auth |
| 11 | apps/web/middleware/auth.ts | 272 | Org membership retrieval | INCOMPLETE | HIGH | 2 | Returns empty | No org context in auth |
| 12 | apps/web/modules/saas/onboarding/components/OnboardingForm.tsx | 4 | Re-enable authClient import | INCOMPLETE | MEDIUM | 1 | Commented (schema incomplete) | Onboarding not tracked |
| 13 | apps/web/modules/saas/onboarding/components/OnboardingForm.tsx | 7 | Re-enable multi-step navigation | INCOMPLETE | MEDIUM | 2 | Commented | Only step 1 implemented |
| 14 | apps/web/modules/saas/onboarding/components/OnboardingForm.tsx | 30 | Update onboardingComplete field | INCOMPLETE | MEDIUM | 2 | Commented | Cannot track completion |
| 15 | apps/vscode/src/ui/fileDecorations.ts | 47 | Integrate with ProtectedFileRegistry | INCOMPLETE | MEDIUM | 1 | Returns undefined always | No protection badges shown |
| 16 | apps/vscode/src/ui/SnapBackCodeLensProvider.ts | 185 | Implement mark wrong logic | INCOMPLETE | MEDIUM | 2 | Shows message, does nothing | Feedback loop broken |
| 17 | apps/mcp-server/src/client/snapback-api.ts | ? | Implement state access | INCOMPLETE | HIGH | 1 | Hardcoded return 'closed' | Circuit breaker status unknown |
| 18-22 | packages/core/src/session/__tests__/SessionManager.test.ts | 11-31 | Session manager tests (5 placeholders) | TEST_ONLY | MEDIUM | 4 | expect(true).toBe(true) | No test coverage |
| 23-31 | packages/sdk/tests/e2e/error-handling.e2e.test.ts | 3-52 | Error handling E2E (9 placeholders) | TEST_ONLY | MEDIUM | 8 | expect(true).toBe(true) | No error recovery tests |
| 32-40 | packages/sdk/tests/e2e/privacy.e2e.test.ts | 3-51 | Privacy compliance (9 placeholders) | TEST_ONLY | MEDIUM | 8 | expect(true).toBe(true) | GDPR/CCPA untested |
| 41-49 | packages/sdk/tests/integration/cache.test.ts | 3-52 | Cache integration (9 placeholders) | TEST_ONLY | MEDIUM | 8 | expect(true).toBe(true) | Cache behavior untested |
| 50+ | apps/web/modules/saas/* (various) | Various | Future features (40+ items) | STALE/DESIGN | LOW | 100+ | Commented code, design phase | Nice-to-have only |

## Critical Path (Must Fix)

```
WEEK 1:
  1. apps/vscode/src/services/SnapshotService.ts:151 - Save file data (3h)
  2. apps/vscode/src/services/SnapshotService.ts:126 - Delete file data (2h)
  3. apps/vscode/src/views/SessionsTreeProvider.ts:21 - Load sessions (2h)
  4. apps/vscode/src/views/SnapshotsTreeProvider.ts:42 - Event listeners (1h)
  Subtotal: 8 hours

WEEK 2:
  5. apps/web/middleware/auth.ts:1 - Fix argon2 (6h) [parallel to others]
  6. apps/web/middleware/auth.ts:129 - API key auth (2h)
  7. apps/web/middleware/auth.ts:272 - Org membership (4h)
  8. apps/mcp-server/src/client/snapback-api.ts - Circuit breaker (1h)
  Subtotal: 13 hours (6h parallel)

SPRINT 2:
  9. apps/vscode/src/ui/fileDecorations.ts - Decorations (1h)
  10. apps/vscode/src/ui/SnapBackCodeLensProvider.ts:185 - Mark wrong (2h)
  11. apps/web/modules/saas/onboarding - Multi-step (4h)
  12. Test stubs (27 items) - Implement real tests (30-40h)
  Subtotal: 37-40 hours
```

## By Completion Status

### INCOMPLETE (15 items - MUST FIX)
- Core functionality missing/partially implemented
- Blocks production features
- Requires code implementation

### TEST_ONLY (27 items - SHOULD DO)
- Test scaffolding exists, no implementation
- Acceptable for MVP, but needed for Phase 2
- Good for parallel work streams

### STALE/DESIGN (53 items - CAN DEFER)
- Design phase items
- Commented code with prerequisites missing
- Future phases (nice-to-have)

## Blocking Dependencies

```
Issue #7 (argon2) blocks:
  └─ Issue #8 (API key verification)
  └─ Issue #10 (org membership)

Issue #5 (snapshot file saving) blocks:
  └─ Restore functionality
  └─ Session replay

Issue #12-14 (onboarding) blocks:
  └─ Waiting for auth schema changes
  └─ Can be unblocked by auth package update

Issue #32-40 (privacy tests) blocks:
  └─ GDPR/CCPA certifications
```

## Risk Assessment

| Issue | Risk Level | Mitigation |
|-------|-----------|-----------|
| Snapshot file data not saving | CRITICAL | Users cannot restore - feature broken |
| Snapshot file data not deleting | CRITICAL | Disk space leak - grows 1-10MB per snapshot |
| Session tree not loading | CRITICAL | Session feature appears empty |
| Argon2 build issue | HIGH | Consider bcrypt fallback |
| API key verification | HIGH | REST API unusable |
| Org membership missing | HIGH | Multi-tenant features blocked |
| Error handling untested | MEDIUM | Regressions possible in edge cases |
| Privacy tests missing | MEDIUM | GDPR/CCPA compliance unverified |

## Effort Breakdown

```
Implementation (15 items):
  CRITICAL (4): 8 hours
  HIGH (4): 13 hours
  MEDIUM (3): 6 hours
  MEDIUM tests (27): 30-40 hours
  STALE/Design (53): 100+ hours
  
Total: 157-170 hours
Immediate: 40-60 hours (first sprint)
Can defer: 100+ hours (future phases)
```

