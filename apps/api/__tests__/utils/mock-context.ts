/**
 * Mock Context Factory
 * Provides mock Hono Context for testing request handlers and middleware
 */

import { vi } from 'vitest';

export interface MockContextType {
  req: {
    method: string;
    url: string;
    header: (name: string) => string | undefined;
    headers: Map<string, string>;
  };
  res: {
    setHeader: (name: string, value: string) => void;
  };
  get: (key: string) => any;
  set: (key: string, value: any) => void;
  json: (data: any, status?: number) => Response;
  text: (text: string, status?: number) => Response;
  status: (code: number) => { json: (data: any) => Response };
  header: (name: string, value?: string) => any;
  env: Record<string, any>;
}

export function createMockContext(overrides?: Partial<MockContextType>): MockContextType {
  const store = new Map<string, any>();
  const headers = new Map<string, string>();

  return {
    req: {
      method: 'GET',
      url: 'http://localhost:3001/api/test',
      header: (name: string) => headers.get(name.toLowerCase()),
      headers,
    },
    res: {
      setHeader: vi.fn(),
    },
    get: (key: string) => store.get(key),
    set: (key: string, value: any) => {
      store.set(key, value);
    },
    json: (data: any, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    },
    text: (text: string, status = 200) => {
      return new Response(text, { status });
    },
    status: (code: number) => ({
      json: (data: any) => {
        return new Response(JSON.stringify(data), {
          status: code,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    }),
    header: (name: string, value?: string) => {
      if (value) {
        headers.set(name.toLowerCase(), value);
      }
      return headers.get(name.toLowerCase());
    },
    env: {},
    ...overrides,
  };
}
