/**
 * Input Sanitization Security Tests
 * 
 * Test ID: MCP-SEC-002
 * Category: Security - Input Validation
 * Coverage Target: 95%
 * 
 * Tests PII stripping, Zod schema validation, payload size limits,
 * and error message sanitization following test_coverage.md spec.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';

// TDD RED PHASE: Define expected behavior before implementation exists
describe('Input Sanitization - Security Critical', () => {
  describe('PII Stripping', () => {
    it('should strip email addresses from inputs', async () => {
      // Test ID: MCP-SEC-002-001
      // GIVEN: Input containing email address
      const input = {
        code: 'const email = "user@example.com";',
        message: 'Contact admin@snapback.dev for help'
      };

      // WHEN: Sanitizing input (function doesn't exist yet - RED)
      const { sanitizeInput } = await import('../../../src/utils/input-sanitizer.js');
      const sanitized = sanitizeInput(input);

      // THEN: Emails should be redacted
      expect(sanitized.code).not.toContain('user@example.com');
      expect(sanitized.code).toContain('[EMAIL]');
      expect(sanitized.message).not.toContain('admin@snapback.dev');
    });

    it('should strip file paths from inputs', async () => {
      // Test ID: MCP-SEC-002-002
      // GIVEN: Input containing absolute file paths
      const input = {
        code: 'fs.readFile("/home/user/secrets.txt")',
        error: 'File not found: /Users/bob/project/config.json'
      };

      // WHEN: Sanitizing input
      const { sanitizeInput } = await import('../../../src/utils/input-sanitizer.js');
      const sanitized = sanitizeInput(input);

      // THEN: Paths should be redacted
      expect(sanitized.code).not.toContain('/home/user/secrets.txt');
      expect(sanitized.code).toContain('[PATH]');
      expect(sanitized.error).not.toContain('/Users/bob/project');
    });

    it('should strip IP addresses from inputs', async () => {
      // Test ID: MCP-SEC-002-003
      // GIVEN: Input containing IP addresses
      const input = {
        logs: 'Connection from 192.168.1.100 failed',
        config: 'api_endpoint: http://10.0.0.5:8080'
      };

      // WHEN: Sanitizing input
      const { sanitizeInput } = await import('../../../src/utils/input-sanitizer.js');
      const sanitized = sanitizeInput(input);

      // THEN: IPs should be redacted
      expect(sanitized.logs).toContain('[IP]');
      expect(sanitized.logs).not.toContain('192.168.1.100');
      expect(sanitized.config).not.toContain('10.0.0.5');
    });

    it('should strip user IDs from inputs', async () => {
      // Test ID: MCP-SEC-002-004
      // GIVEN: Input containing user identifiers
      const input = {
        query: 'SELECT * FROM users WHERE id = "user_12345abc"',
        log: 'User auth_token_xyz logged in'
      };

      // WHEN: Sanitizing input
      const { sanitizeInput } = await import('../../../src/utils/input-sanitizer.js');
      const sanitized = sanitizeInput(input);

      // THEN: User IDs should be redacted
      expect(sanitized.query).not.toContain('user_12345abc');
      expect(sanitized.query).toContain('[USER_ID]');
      expect(sanitized.log).not.toContain('auth_token_xyz');
    });
  });

  describe('Zod Schema Validation', () => {
    it('should validate string length strictly', () => {
      // Test ID: MCP-SEC-002-005
      // GIVEN: Schema with max length constraint
      const CodeSchema = z.string().max(1_000_000);

      // WHEN: Validating oversized input
      const oversizedCode = 'x'.repeat(1_000_001);

      // THEN: Should reject with validation error
      expect(() => CodeSchema.parse(oversizedCode)).toThrow(z.ZodError);
    });

    it('should validate required fields strictly', () => {
      // Test ID: MCP-SEC-002-006
      // GIVEN: Schema with required fields
      const AnalysisSchema = z.object({
        code: z.string().min(1),
        language: z.string().min(1)
      });

      // WHEN: Missing required field
      const invalidInput = { code: 'test' };

      // THEN: Should reject with validation error
      expect(() => AnalysisSchema.parse(invalidInput)).toThrow(z.ZodError);
    });

    it('should validate enum values strictly', () => {
      // Test ID: MCP-SEC-002-007
      // GIVEN: Schema with enum constraint
      const LanguageSchema = z.enum(['javascript', 'typescript', 'python']);

      // WHEN: Invalid enum value
      const invalidLanguage = 'ruby';

      // THEN: Should reject
      expect(() => LanguageSchema.parse(invalidLanguage)).toThrow(z.ZodError);
    });
  });

  describe('Payload Size Limits', () => {
    it('should reject oversized code payloads', () => {
      // Test ID: MCP-SEC-002-008
      // GIVEN: Code exceeding 1MB limit
      const MAX_CODE_SIZE = 1_000_000; // 1MB
      const oversizedCode = 'x'.repeat(MAX_CODE_SIZE + 1);

      const CodeSchema = z.string().max(MAX_CODE_SIZE, 'Code exceeds 1MB limit');

      // WHEN: Validating oversized code
      // THEN: Should reject
      expect(() => CodeSchema.parse(oversizedCode)).toThrow('Code exceeds 1MB limit');
    });

    it('should reject oversized context payloads', () => {
      // Test ID: MCP-SEC-002-009
      // GIVEN: Context exceeding 100KB limit
      const MAX_CONTEXT_SIZE = 100_000; // 100KB
      const oversizedContext = 'x'.repeat(MAX_CONTEXT_SIZE + 1);

      const ContextSchema = z.string().max(MAX_CONTEXT_SIZE);

      // WHEN: Validating oversized context
      // THEN: Should reject
      expect(() => ContextSchema.parse(oversizedContext)).toThrow();
    });

    it('should reject file paths exceeding 4KB', () => {
      // Test ID: MCP-SEC-002-010
      // GIVEN: File path exceeding reasonable length
      const MAX_PATH_LENGTH = 4096; // 4KB
      const oversizedPath = '/'.repeat(MAX_PATH_LENGTH + 1);

      const PathSchema = z.string().max(MAX_PATH_LENGTH);

      // WHEN: Validating oversized path
      // THEN: Should reject
      expect(() => PathSchema.parse(oversizedPath)).toThrow();
    });
  });

  describe('Error Message Sanitization (Production)', () => {
    beforeEach(() => {
      // Simulate production environment
      process.env.NODE_ENV = 'production';
    });

    it('should sanitize stack traces in production', async () => {
      // Test ID: MCP-SEC-002-011
      // GIVEN: Error with full stack trace
      const error = new Error('Database connection failed');
      error.stack = `Error: Database connection failed
    at Connection.connect (/home/user/project/db.js:42:15)
    at async main (/home/user/project/index.js:10:3)`;

      // WHEN: Sanitizing error for client response
      const { sanitizeError } = await import('../../../src/utils/input-sanitizer.js');
      const sanitized = sanitizeError(error);

      // THEN: Stack trace should be removed in production
      expect(sanitized.message).toBe('Database connection failed');
      expect(sanitized.stack).toBeUndefined();
      expect(sanitized.logId).toBeDefined(); // For support lookup
    });

    it('should use generic messages for unexpected errors', async () => {
      // Test ID: MCP-SEC-002-012
      // GIVEN: Unexpected error with internal details
      const error = new Error('PostgreSQL password authentication failed for user "admin"');

      // WHEN: Sanitizing error
      const { sanitizeError } = await import('../../../src/utils/input-sanitizer.js');
      const sanitized = sanitizeError(error);

      // THEN: Should return generic message
      expect(sanitized.message).toBe('An unexpected error occurred');
      expect(sanitized.message).not.toContain('PostgreSQL');
      expect(sanitized.message).not.toContain('admin');
    });

    it('should preserve allowed error types in production', async () => {
      // Test ID: MCP-SEC-002-013
      // GIVEN: Known safe error types
      const validationError = new z.ZodError([]);
      const securityError = new Error('Path traversal detected');
      securityError.name = 'SecurityError';

      // WHEN: Sanitizing these errors
      const { sanitizeError } = await import('../../../src/utils/input-sanitizer.js');
      const sanitizedValidation = sanitizeError(validationError);
      const sanitizedSecurity = sanitizeError(securityError);

      // THEN: Safe error types should preserve messages
      expect(sanitizedValidation.type).toBe('VALIDATION_ERROR');
      expect(sanitizedSecurity.type).toBe('SECURITY_ERROR');
    });
  });
});
