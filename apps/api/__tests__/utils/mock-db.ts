/**
 * Mock Database Factory
 * Provides mocked database operations for testing
 */

import { vi } from 'vitest';

export interface MockDb {
  insert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
  prepare: ReturnType<typeof vi.fn>;
}

export function createMockDb(): MockDb {
  const mockChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    and: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
    run: vi.fn().mockResolvedValue({ lastID: 1, changes: 1 }),
    get: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue([]),
  };

  return {
    insert: vi.fn().mockReturnValue(mockChain),
    select: vi.fn().mockReturnValue(mockChain),
    update: vi.fn().mockReturnValue(mockChain),
    delete: vi.fn().mockReturnValue(mockChain),
    query: vi.fn().mockReturnValue(mockChain),
    execute: vi.fn().mockResolvedValue([]),
    prepare: vi.fn().mockReturnValue(mockChain),
  };
}

export const mockDb = createMockDb();
