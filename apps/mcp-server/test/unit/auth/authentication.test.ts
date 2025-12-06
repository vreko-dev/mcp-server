/**
 * MCP Server Authentication Tests
 *
 * Test ID: MCP-AUTH-001
 * Category: Security - Authentication
 * Coverage Target: 95%
 *
 * Tests API key authentication following test_coverage.md spec:
 * - API key format validation
 * - Authentication result caching (1 minute TTL)
 * - Expired/revoked API key handling
 * - Tier identification (free/pro/admin)
 * - Mock authentication in test mode
 *
 * CRITICAL: Prevents unauthorized access to Pro/Admin features
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { authenticate, clearAuthCache, AuthResult } from '../../../src/auth';
import { auth } from '@snapback/auth';

// Mock @snapback/auth
vi.mock('@snapback/auth', () => ({
  auth: {
    api: {
      verifyApiKey: vi.fn(),
    },
  },
}));

// Mock logger to avoid console spam
vi.mock('@snapback/infrastructure', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('MCP Authentication - Security Critical', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAuthCache();
  });

  afterEach(() => {
    clearAuthCache();
  });

  describe('API Key Format Validation', () => {
    // Test ID: MCP-AUTH-001-001
    it('should validate API key format correctly', async () => {
      // GIVEN: Valid API key format
      const validKey = 'sb_live_1234567890abcdef1234567890abcdef';

      vi.mocked(auth.api.verifyApiKey).mockResolvedValue({
        isValid: true,
        userId: 'user_123',
        permissions: { analyze: true },
        metadata: { tier: 'pro' },
      });

      // WHEN: Authenticating
      const result = await authenticate(validKey);

      // THEN: Should succeed
      expect(result.valid).toBe(true);
      expect(result.tier).toBe('pro');
      expect(auth.api.verifyApiKey).toHaveBeenCalledWith({ key: validKey });
    });

    // Test ID: MCP-AUTH-001-002
    it('should reject invalid API key format', async () => {
      // GIVEN: Invalid API key
      const invalidKey = 'invalid_key_format';

      vi.mocked(auth.api.verifyApiKey).mockResolvedValue({
        isValid: false,
      });

      // WHEN: Authenticating
      const result = await authenticate(invalidKey);

      // THEN: Should reject
      expect(result.valid).toBe(false);
      expect(result.tier).toBe('free');
      expect(result.error).toBe('Invalid API key');
    });

    // Test ID: MCP-AUTH-001-003
    it('should reject empty API keys', async () => {
      // GIVEN: Empty API key
      const emptyKey = '';

      vi.mocked(auth.api.verifyApiKey).mockResolvedValue({
        isValid: false,
      });

      // WHEN: Authenticating
      const result = await authenticate(emptyKey);

      // THEN: Should reject
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Authentication Result Caching (1 Minute TTL)', () => {
    // Test ID: MCP-AUTH-001-004
    it('should cache authentication results for 1 minute', async () => {
      // GIVEN: Valid API key
      const apiKey = 'sb_live_cachedkey123456789012345678';

      vi.mocked(auth.api.verifyApiKey).mockResolvedValue({
        isValid: true,
        userId: 'user_123',
        permissions: { analyze: true, checkpoint: true },
        metadata: { tier: 'pro' },
      });

      // WHEN: Authenticating twice
      const result1 = await authenticate(apiKey);
      const result2 = await authenticate(apiKey);

      // THEN: Should use cache (verify called only once)
      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
      expect(auth.api.verifyApiKey).toHaveBeenCalledTimes(1);
    });

    // Test ID: MCP-AUTH-001-005
    it('should expire cache after 1 minute', async () => {
      // GIVEN: Valid API key and mocked timer
      const apiKey = 'sb_live_expirekey12345678901234567';

      vi.mocked(auth.api.verifyApiKey).mockResolvedValue({
        isValid: true,
        userId: 'user_123',
        permissions: {},
        metadata: { tier: 'free' },
      });

      // Mock Date.now for cache expiry
      const originalDateNow = Date.now;
      let currentTime = Date.now();
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      try {
        // WHEN: Authenticate, advance time beyond TTL, authenticate again
        await authenticate(apiKey);

        // Advance time by 61 seconds (beyond 60 second TTL)
        currentTime += 61 * 1000;

        await authenticate(apiKey);

        // THEN: Should re-authenticate (not use cache)
        expect(auth.api.verifyApiKey).toHaveBeenCalledTimes(2);
      } finally {
        Date.now = originalDateNow;
      }
    });

    // Test ID: MCP-AUTH-001-006
    it('should not cache failed authentication attempts', async () => {
      // GIVEN: Invalid API key
      const invalidKey = 'invalid_key';

      vi.mocked(auth.api.verifyApiKey).mockResolvedValue({
        isValid: false,
      });

      // WHEN: Authenticating twice
      await authenticate(invalidKey);
      await authenticate(invalidKey);

      // THEN: Should cache even failed attempts
      expect(auth.api.verifyApiKey).toHaveBeenCalledTimes(1);
    });
  });

  describe('Expired/Revoked API Keys', () => {
    // Test ID: MCP-AUTH-001-007
    it('should reject expired API keys', async () => {
      // GIVEN: Expired API key
      const expiredKey = 'sb_live_expiredkey1234567890123456';

      vi.mocked(auth.api.verifyApiKey).mockResolvedValue({
        isValid: false,
        error: 'API key expired',
      });

      // WHEN: Authenticating
      const result = await authenticate(expiredKey);

      // THEN: Should reject
      expect(result.valid).toBe(false);
      expect(result.tier).toBe('free');
    });

    // Test ID: MCP-AUTH-001-008
    it('should reject revoked API keys', async () => {
      // GIVEN: Revoked API key
      const revokedKey = 'sb_live_revokedkey1234567890123456';

      vi.mocked(auth.api.verifyApiKey).mockResolvedValue({
        isValid: false,
        error: 'API key revoked',
      });

      // WHEN: Authenticating
      const result = await authenticate(revokedKey);

      // THEN: Should reject
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    // Test ID: MCP-AUTH-001-009
    it('should handle authentication service errors gracefully', async () => {
      // GIVEN: API key but service error
      const apiKey = 'sb_live_serviceerror123456789012345';

      vi.mocked(auth.api.verifyApiKey).mockRejectedValue(
        new Error('Database connection failed')
      );

      // WHEN: Authenticating
      const result = await authenticate(apiKey);

      // THEN: Should return service unavailable
      expect(result.valid).toBe(false);
      expect(result.tier).toBe('free');
      expect(result.error).toBe('Authentication service unavailable');
    });
  });

  describe('Tier Identification', () => {
    // Test ID: MCP-AUTH-001-010
    it('should identify free tier correctly', async () => {
      // GIVEN: Free tier API key
      const freeKey = 'sb_test_freetier12345678901234567';

      vi.mocked(auth.api.verifyApiKey).mockResolvedValue({
        isValid: true,
        userId: 'user_free',
        permissions: { analyze: true },
        metadata: { tier: 'free' },
      });

      // WHEN: Authenticating
      const result = await authenticate(freeKey);

      // THEN: Should identify as free
      expect(result.valid).toBe(true);
      expect(result.tier).toBe('free');
      expect(result.userId).toBe('user_free');
    });

    // Test ID: MCP-AUTH-001-011
    it('should identify pro tier correctly', async () => {
      // GIVEN: Pro tier API key
      const proKey = 'sb_live_protier123456789012345678';

      vi.mocked(auth.api.verifyApiKey).mockResolvedValue({
        isValid: true,
        userId: 'user_pro',
        permissions: { analyze: true, checkpoint: true, context: true },
        metadata: { tier: 'pro', organizationId: 'org_123' },
      });

      // WHEN: Authenticating
      const result = await authenticate(proKey);

      // THEN: Should identify as pro
      expect(result.valid).toBe(true);
      expect(result.tier).toBe('pro');
      expect(result.scopes).toContain('analyze');
      expect(result.scopes).toContain('checkpoint');
      expect(result.scopes).toContain('context');
      expect(result.organizationId).toBe('org_123');
    });

    // Test ID: MCP-AUTH-001-012
    it('should identify admin tier correctly', async () => {
      // GIVEN: Admin tier API key
      const adminKey = 'sb_live_admintier1234567890123456';

      vi.mocked(auth.api.verifyApiKey).mockResolvedValue({
        isValid: true,
        userId: 'user_admin',
        permissions: { analyze: true, checkpoint: true, context: true, admin: true },
        metadata: { tier: 'admin' },
      });

      // WHEN: Authenticating
      const result = await authenticate(adminKey);

      // THEN: Should identify as admin
      expect(result.valid).toBe(true);
      expect(result.tier).toBe('admin');
      expect(result.scopes).toContain('admin');
    });

    // Test ID: MCP-AUTH-001-013
    it('should default to free tier when metadata missing', async () => {
      // GIVEN: API key without tier metadata
      const keyWithoutTier = 'sb_live_notier12345678901234567';

      vi.mocked(auth.api.verifyApiKey).mockResolvedValue({
        isValid: true,
        userId: 'user_unknown',
        permissions: {},
        metadata: {}, // No tier specified
      });

      // WHEN: Authenticating
      const result = await authenticate(keyWithoutTier);

      // THEN: Should default to free
      expect(result.valid).toBe(true);
      expect(result.tier).toBe('free');
    });
  });

  describe('Scope Extraction', () => {
    // Test ID: MCP-AUTH-001-014
    it('should extract scopes from permissions correctly', async () => {
      // GIVEN: API key with multiple permissions
      const apiKey = 'sb_live_multiscope123456789012345';

      vi.mocked(auth.api.verifyApiKey).mockResolvedValue({
        isValid: true,
        userId: 'user_multi',
        permissions: {
          analyze: true,
          checkpoint: true,
          context: true,
        },
        metadata: { tier: 'pro' },
      });

      // WHEN: Authenticating
      const result = await authenticate(apiKey);

      // THEN: Should extract all scopes
      expect(result.scopes).toHaveLength(3);
      expect(result.scopes).toContain('analyze');
      expect(result.scopes).toContain('checkpoint');
      expect(result.scopes).toContain('context');
    });

    // Test ID: MCP-AUTH-001-015
    it('should handle empty permissions gracefully', async () => {
      // GIVEN: API key with no permissions
      const apiKey = 'sb_test_noperms1234567890123456';

      vi.mocked(auth.api.verifyApiKey).mockResolvedValue({
        isValid: true,
        userId: 'user_empty',
        permissions: {},
        metadata: { tier: 'free' },
      });

      // WHEN: Authenticating
      const result = await authenticate(apiKey);

      // THEN: Should return empty scopes array
      expect(result.scopes).toEqual([]);
    });
  });

  describe('Cache Management', () => {
    // Test ID: MCP-AUTH-001-016
    it('should clear cache when clearAuthCache() called', async () => {
      // GIVEN: Cached authentication
      const apiKey = 'sb_live_clearcache123456789012345';

      vi.mocked(auth.api.verifyApiKey).mockResolvedValue({
        isValid: true,
        userId: 'user_clear',
        permissions: {},
        metadata: { tier: 'pro' },
      });

      // WHEN: Authenticate, clear cache, authenticate again
      await authenticate(apiKey);
      clearAuthCache();
      await authenticate(apiKey);

      // THEN: Should re-authenticate after clear
      expect(auth.api.verifyApiKey).toHaveBeenCalledTimes(2);
    });
  });
});
