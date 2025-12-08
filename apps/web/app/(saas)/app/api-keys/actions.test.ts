
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiKeyAction } from './actions';
import { ORPCError } from '@orpc/client';

// Mock getSession
vi.mock('@saas/auth/lib/server', () => ({
  getSession: vi.fn(),
}));

import { getSession } from '@saas/auth/lib/server';

// Mock ORPC client
vi.mock('@/modules/shared/lib/orpc-client', () => ({
  orpcClient: {
    apiKeys: {
      create: vi.fn(),
    },
  },
}));

import { orpcClient } from '@/modules/shared/lib/orpc-client';

describe('createApiKeyAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('throws unauthorized when no session', async () => {
      (getSession as any).mockResolvedValue(null);
      await expect(createApiKeyAction('test-key')).rejects.toThrow('Unauthorized');
    });
  });

  describe('success path', () => {
    it('calls ORPC apiKeys.create with correct params', async () => {
      (getSession as any).mockResolvedValue({ user: { id: 'user_1' } });
      (orpcClient.apiKeys.create as any).mockResolvedValue({
        apiKey: { id: 'key_1', name: 'test-key', key: 'sb_test', createdAt: new Date() },
        message: 'Success'
      });

      const result = await createApiKeyAction('test-key');

      expect(orpcClient.apiKeys.create).toHaveBeenCalledWith({ name: 'test-key' });
      expect(result.name).toBe('test-key');
    });
  });
});
