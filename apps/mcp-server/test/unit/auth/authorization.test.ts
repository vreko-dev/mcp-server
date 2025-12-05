/**
 * MCP Server Authorization Tests
 *
 * Test ID: MCP-AUTH-002
 * Category: Security - Authorization & Access Control
 * Coverage Target: 95%
 *
 * Tests tier-based authorization following test_coverage.md spec:
 * - Free tier tool access restrictions
 * - Pro tier tool access
 * - Enterprise tier unlimited access
 * - Rate limiting per tier
 * - Tool permission mapping
 *
 * CRITICAL: Prevents unauthorized access to premium features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hasPermission, hasToolAccess, AuthResult } from '../../../src/auth.js';
import { hasPermissionForTier, getRateLimitForTier } from '@snapback/auth/lib/tier-utils';

// Mock @snapback/infrastructure to avoid database initialization
vi.mock('@snapback/infrastructure', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock @snapback/auth to avoid database connection
vi.mock('@snapback/auth', () => ({
  auth: {
    api: {
      verifyApiKey: vi.fn(),
    },
  },
}));

describe('MCP Authorization - Security Critical', () => {
  describe('Free Tier Access Control', () => {
    let freeAuthResult: AuthResult;

    beforeEach(() => {
      freeAuthResult = {
        valid: true,
        tier: 'free',
        scopes: ['analyze'],
        userId: 'user_free_123',
      };
    });

    // Test ID: MCP-AUTH-002-001
    it('should allow free tier access to basic tools', () => {
      // GIVEN: Free tier user

      // WHEN: Checking access to basic tool
      const canAnalyze = hasToolAccess(freeAuthResult, 'snapback.analyze_risk');

      // THEN: Should have access
      expect(canAnalyze).toBe(true);
    });

    // Test ID: MCP-AUTH-002-002
    it('should reject free tier from Pro tools - create_snapshot', () => {
      // GIVEN: Free tier user

      // WHEN: Checking access to Pro tool
      const canCreateSnapshot = hasToolAccess(freeAuthResult, 'snapback.create_snapshot');

      // THEN: Should be rejected
      expect(canCreateSnapshot).toBe(false);
    });

    // Test ID: MCP-AUTH-002-003
    it('should reject free tier from Pro tools - checkpoint', () => {
      // GIVEN: Free tier user

      // WHEN: Checking access to checkpoint tools
      const canListSnapshots = hasToolAccess(freeAuthResult, 'snapback.list_snapshots');
      const canRestoreSnapshot = hasToolAccess(freeAuthResult, 'snapback.restore_snapshot');

      // THEN: Should be rejected
      expect(canListSnapshots).toBe(false);
      expect(canRestoreSnapshot).toBe(false);
    });

    // Test ID: MCP-AUTH-002-004
    it('should reject free tier from Context7 tools', () => {
      // GIVEN: Free tier user

      // WHEN: Checking access to Context7 tools
      const canResolveLibrary = hasToolAccess(freeAuthResult, 'ctx7.resolve-library-id');
      const canGetDocs = hasToolAccess(freeAuthResult, 'ctx7.get-library-docs');

      // THEN: Should be rejected
      expect(canResolveLibrary).toBe(false);
      expect(canGetDocs).toBe(false);
    });

    // Test ID: MCP-AUTH-002-005
    it('should have correct rate limits for free tier', () => {
      // GIVEN: Free tier

      // WHEN: Getting rate limits
      const limits = getRateLimitForTier('free');

      // THEN: Should match free tier limits (100 req/hour)
      expect(limits).toEqual({
        window: 3600, // 1 hour
        max: 100,
      });
    });
  });

  describe('Pro Tier Access Control', () => {
    let proAuthResult: AuthResult;

    beforeEach(() => {
      proAuthResult = {
        valid: true,
        tier: 'pro',
        scopes: ['analyze', 'checkpoint', 'context'],
        userId: 'user_pro_456',
        organizationId: 'org_123',
      };
    });

    // Test ID: MCP-AUTH-002-006
    it('should allow pro tier access to all tools', () => {
      // GIVEN: Pro tier user

      // WHEN: Checking access to all tools
      const canAnalyze = hasToolAccess(proAuthResult, 'snapback.analyze_risk');
      const canCreateSnapshot = hasToolAccess(proAuthResult, 'snapback.create_snapshot');
      const canListSnapshots = hasToolAccess(proAuthResult, 'snapback.list_snapshots');
      const canResolveLibrary = hasToolAccess(proAuthResult, 'ctx7.resolve-library-id');

      // THEN: Should have access to all
      expect(canAnalyze).toBe(true);
      expect(canCreateSnapshot).toBe(true);
      expect(canListSnapshots).toBe(true);
      expect(canResolveLibrary).toBe(true);
    });

    // Test ID: MCP-AUTH-002-007
    it('should have correct rate limits for pro tier', () => {
      // GIVEN: Pro tier

      // WHEN: Getting rate limits
      const limits = getRateLimitForTier('pro');

      // THEN: Should match pro tier limits (1000 req/hour)
      expect(limits).toEqual({
        window: 3600,
        max: 1000,
      });
    });

    // Test ID: MCP-AUTH-002-008
    it('should allow pro tier to bypass free tier restrictions', () => {
      // GIVEN: Pro tier user

      // WHEN: Checking permissions
      const hasSnapshotPermission = hasPermission(proAuthResult, 'snapback:snapshot');
      const hasContextPermission = hasPermission(proAuthResult, 'snapback:context');

      // THEN: Should have both Pro permissions
      expect(hasSnapshotPermission).toBe(true);
      expect(hasContextPermission).toBe(true);
    });
  });

  describe('Admin Tier Access Control', () => {
    let adminAuthResult: AuthResult;

    beforeEach(() => {
      adminAuthResult = {
        valid: true,
        tier: 'admin',
        scopes: ['analyze', 'checkpoint', 'context', 'admin'],
        userId: 'user_admin_789',
      };
    });

    // Test ID: MCP-AUTH-002-009
    it('should allow admin tier unlimited access', () => {
      // GIVEN: Admin tier user

      // WHEN: Checking access to all tools
      const canAnalyze = hasToolAccess(adminAuthResult, 'snapback.analyze_risk');
      const canCreateSnapshot = hasToolAccess(adminAuthResult, 'snapback.create_snapshot');
      const canResolveLibrary = hasToolAccess(adminAuthResult, 'ctx7.resolve-library-id');

      // THEN: Should have access to everything
      expect(canAnalyze).toBe(true);
      expect(canCreateSnapshot).toBe(true);
      expect(canResolveLibrary).toBe(true);
    });

    // Test ID: MCP-AUTH-002-010
    it('should have highest rate limits for admin tier', () => {
      // GIVEN: Admin tier

      // WHEN: Getting rate limits
      const limits = getRateLimitForTier('admin');

      // THEN: Should match admin tier limits (10k req/hour)
      expect(limits).toEqual({
        window: 3600,
        max: 10000,
      });
    });
  });

  describe('Permission Validation', () => {
    // Test ID: MCP-AUTH-002-011
    it('should reject invalid auth results', () => {
      // GIVEN: Invalid auth result
      const invalidAuthResult: AuthResult = {
        valid: false,
        tier: 'free',
        error: 'Invalid API key',
      };

      // WHEN: Checking any permission
      const hasAnyPermission = hasPermission(invalidAuthResult, 'snapback:analyze');
      const hasToolAccessResult = hasToolAccess(invalidAuthResult, 'snapback.analyze_risk');

      // THEN: Should reject all access
      expect(hasAnyPermission).toBe(false);
      expect(hasToolAccessResult).toBe(false);
    });

    // Test ID: MCP-AUTH-002-012
    it('should use tier-based permission mapping correctly', () => {
      // GIVEN: Different tiers
      const freeTier = 'free';
      const proTier = 'pro';

      // WHEN: Checking analyze permission
      const freeCanAnalyze = hasPermissionForTier(freeTier, 'snapback:analyze');
      const proCanSnapshot = hasPermissionForTier(proTier, 'snapback:snapshot');
      const freeCannotSnapshot = hasPermissionForTier(freeTier, 'snapback:snapshot');

      // THEN: Should match tier capabilities
      expect(freeCanAnalyze).toBe(true);
      expect(proCanSnapshot).toBe(true);
      expect(freeCannotSnapshot).toBe(false);
    });

    // Test ID: MCP-AUTH-002-013
    it('should handle unknown tools gracefully', () => {
      // GIVEN: Pro tier user
      const proAuthResult: AuthResult = {
        valid: true,
        tier: 'pro',
        scopes: ['analyze', 'checkpoint'],
        userId: 'user_pro',
      };

      // WHEN: Checking access to unknown tool
      const canAccessUnknown = hasToolAccess(proAuthResult, 'unknown.tool');

      // THEN: Should allow by default (no specific permission required)
      expect(canAccessUnknown).toBe(true);
    });
  });

  describe('Tool Permission Mapping', () => {
    // Test ID: MCP-AUTH-002-014
    it('should map analyze_risk to analyze permission', () => {
      // GIVEN: User with analyze permission
      const authResult: AuthResult = {
        valid: true,
        tier: 'free',
        scopes: ['analyze'],
        userId: 'user_test',
      };

      // WHEN: Checking analyze_risk tool access
      const canAccess = hasToolAccess(authResult, 'snapback.analyze_risk');

      // THEN: Should have access
      expect(canAccess).toBe(true);
    });

    // Test ID: MCP-AUTH-002-015
    it('should map snapshot tools to snapshot permission', () => {
      // GIVEN: User with snapshot permission
      const authResult: AuthResult = {
        valid: true,
        tier: 'pro',
        scopes: ['analyze', 'snapshot'],
        userId: 'user_pro',
      };

      // WHEN: Checking snapshot tools
      const canCreate = hasToolAccess(authResult, 'snapback.create_snapshot');
      const canList = hasToolAccess(authResult, 'snapback.list_snapshots');
      const canRestore = hasToolAccess(authResult, 'snapback.restore_snapshot');

      // THEN: Should have access to all snapshot tools
      expect(canCreate).toBe(true);
      expect(canList).toBe(true);
      expect(canRestore).toBe(true);
    });

    // Test ID: MCP-AUTH-002-016
    it('should map Context7 tools to context permission', () => {
      // GIVEN: User with context permission
      const authResult: AuthResult = {
        valid: true,
        tier: 'pro',
        scopes: ['analyze', 'context'],
        userId: 'user_pro',
      };

      // WHEN: Checking Context7 tools
      const canResolve = hasToolAccess(authResult, 'ctx7.resolve-library-id');
      const canGetDocs = hasToolAccess(authResult, 'ctx7.get-library-docs');

      // THEN: Should have access to Context7 tools
      expect(canResolve).toBe(true);
      expect(canGetDocs).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    // Test ID: MCP-AUTH-002-017
    it('should handle missing scopes gracefully', () => {
      // GIVEN: Auth result without scopes
      const authResult: AuthResult = {
        valid: true,
        tier: 'free',
        userId: 'user_no_scopes',
        // scopes undefined
      };

      // WHEN: Checking tool access
      const canAnalyze = hasToolAccess(authResult, 'snapback.analyze_risk');

      // THEN: Should use tier-based permissions
      expect(canAnalyze).toBe(true);
    });

    // Test ID: MCP-AUTH-002-018
    it('should handle organizationId in auth context', () => {
      // GIVEN: Pro tier with organization
      const authResult: AuthResult = {
        valid: true,
        tier: 'pro',
        scopes: ['analyze', 'checkpoint'],
        userId: 'user_org',
        organizationId: 'org_enterprise_123',
      };

      // WHEN: Checking access
      const canAccess = hasToolAccess(authResult, 'snapback.create_snapshot');

      // THEN: Should have access (org context preserved)
      expect(canAccess).toBe(true);
      expect(authResult.organizationId).toBe('org_enterprise_123');
    });
  });
});
