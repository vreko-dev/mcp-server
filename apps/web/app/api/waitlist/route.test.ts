
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { http, HttpResponse } from 'msw';
import { server } from '@snapback/testing/msw/server';

// Mock the dependencies
vi.mock('@snapback/platform', () => ({
  db: {
    query: {
      waitlist: {
        findFirst: vi.fn(),
      },
      waitlistReferrals: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => [{ count: 1233 }]), // Mock returning 1233 existing, so next is 1234
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => [{
            id: 'waitlist_123',
            queuePosition: 1234,
            referralCode: 'ref_123'
        }]),
      })),
    })),
    transaction: vi.fn((cb) => cb({
        query: {
            waitlist: {
                findFirst: vi.fn(),
            }
        },
        select: vi.fn(() => ({
             from: vi.fn(() => [{ count: 1233 }]),
        })),
        insert: vi.fn(() => ({
            values: vi.fn(() => ({
                returning: vi.fn(() => [{
                    id: 'waitlist_123',
                    queuePosition: 1234,
                    referralCode: 'ref_123'
                }]),
            })),
        })),
    })),
  },
  waitlist: {
    email: { name: 'email' },
    status: { name: 'status' },
    queuePosition: { name: 'queue_position' },
    referralCode: { name: 'referral_code' }
  },
  waitlistReferrals: {
     referrerId: { name: 'referrer_id' },
     referredEmail: { name: 'referred_email' },
  }
}));

// Mock process.env
vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret');

describe('POST /api/waitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.resetHandlers();
  });

  describe('validation', () => {
    it('rejects missing email', async () => {
      const req = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({ turnstileToken: 'token' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects invalid email format', async () => {
      const req = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email', turnstileToken: 'token' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects missing turnstile token', async () => {
      const req = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects invalid turnstile token', async () => {
      server.use(
        http.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', () => {
          return HttpResponse.json({ success: false });
        })
      );

      const req = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', turnstileToken: 'invalid' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Turnstile/);
    });
  });

  describe('success path', () => {
    it('creates waitlist entry with correct queue position', async () => {
       // Mock Turnstile success
      server.use(
        http.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', () => {
          return HttpResponse.json({ success: true });
        })
      );

      // Request
      const req = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@example.com', turnstileToken: 'valid' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.queuePosition).toBe(1234);
      expect(data.referralCode).toBe('ref_123');
    });
  });
});

