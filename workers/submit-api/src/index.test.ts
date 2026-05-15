/**
 * Integration tests for the Email Submission API worker.
 *
 * Tests the worker with mocked Resend email service to verify:
 * - Successful email submission (Requirement 6.4, 6.5)
 * - Error handling for email service failures (Requirement 6.6)
 * - Timeout handling — 30 second timeout (Requirement 6.7)
 * - Input validation (missing fields, invalid email)
 * - HTTP method enforcement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import worker from './index';

const originalFetch = globalThis.fetch;

function createMockEnv(overrides: Partial<{ OPERATOR_EMAIL: string; RESEND_API_KEY: string; FROM_EMAIL: string }> = {}) {
  return {
    OPERATOR_EMAIL: 'operator@example.com',
    RESEND_API_KEY: 'test-api-key-123',
    FROM_EMAIL: 'noreply@gridfinity.test',
    ...overrides,
  };
}

function createSubmitRequest(body: unknown): Request {
  return new Request('https://worker.test/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validSpecFile = {
  baseplate: {
    gridWidth: 5,
    gridDepth: 4,
    totalWidthMm: 210,
    totalDepthMm: 168,
  },
  boxes: [
    {
      itemNumber: 1,
      gridPosition: { col: 0, row: 0 },
      sizeUnits: { width: 2, depth: 2 },
      heightUnits: 3,
    },
    {
      itemNumber: 2,
      gridPosition: { col: 2, row: 0 },
      sizeUnits: { width: 3, depth: 4 },
      heightUnits: 2,
      makerWorldModel: {
        name: 'Battery Organizer',
        platformId: 'mw-12345',
      },
    },
  ],
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

describe('Email Submission API Worker', () => {
  describe('Successful submission (Requirements 6.4, 6.5)', () => {
    it('sends spec file to operator email and returns success', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'email-id-123' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const env = createMockEnv();
      const request = createSubmitRequest({
        specFile: validSpecFile,
        contactEmail: 'user@example.com',
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(200);
      const data = await response.json() as { success: boolean; operatorEmail: string };
      expect(data.success).toBe(true);
      expect(data.operatorEmail).toBe('operator@example.com');
    });

    it('sends email via Resend API with correct payload', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'email-id-456' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const env = createMockEnv();
      const request = createSubmitRequest({
        specFile: validSpecFile,
        contactEmail: 'customer@test.com',
      });

      await worker.fetch(request, env, {} as ExecutionContext);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key-123',
          }),
        })
      );

      // Verify the email body contains the spec file and contact email
      const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const emailBody = JSON.parse(fetchCall[1].body as string);
      expect(emailBody.from).toBe('noreply@gridfinity.test');
      expect(emailBody.to).toEqual(['operator@example.com']);
      expect(emailBody.subject).toContain('customer@test.com');
      expect(emailBody.text).toContain('customer@test.com');
      expect(emailBody.text).toContain('gridWidth');
    });

    it('includes CORS headers in success response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'ok' }), { status: 200 })
      );

      const env = createMockEnv();
      const request = createSubmitRequest({
        specFile: validSpecFile,
        contactEmail: 'user@example.com',
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });

  describe('Email service failures (Requirement 6.6)', () => {
    it('returns 500 when Resend API returns non-200 status', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response('Rate limit exceeded', { status: 429 })
      );

      const env = createMockEnv();
      const request = createSubmitRequest({
        specFile: validSpecFile,
        contactEmail: 'user@example.com',
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(500);
      const data = await response.json() as { success: boolean; error: string };
      expect(data.success).toBe(false);
      expect(data.error).toContain('429');
    });

    it('returns 500 when network error occurs calling Resend', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const env = createMockEnv();
      const request = createSubmitRequest({
        specFile: validSpecFile,
        contactEmail: 'user@example.com',
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(500);
      const data = await response.json() as { success: boolean; error: string };
      expect(data.success).toBe(false);
      expect(data.error).toContain('Connection refused');
    });

    it('includes CORS headers in error responses', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('fail'));

      const env = createMockEnv();
      const request = createSubmitRequest({
        specFile: validSpecFile,
        contactEmail: 'user@example.com',
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('Timeout handling (Requirement 6.7)', () => {
    it('returns 500 with timeout error when email send exceeds 30 seconds', async () => {
      const abortError = new DOMException('The operation was aborted.', 'AbortError');
      globalThis.fetch = vi.fn().mockRejectedValue(abortError);

      const env = createMockEnv();
      const request = createSubmitRequest({
        specFile: validSpecFile,
        contactEmail: 'user@example.com',
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(500);
      const data = await response.json() as { success: boolean; error: string };
      expect(data.success).toBe(false);
      expect(data.error).toContain('timed out');
    });
  });

  describe('Input validation', () => {
    it('returns 400 when request body is not JSON', async () => {
      const request = new Request('https://worker.test/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      });

      const env = createMockEnv();
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(400);
      const data = await response.json() as { success: boolean; error: string };
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid JSON');
    });

    it('returns 400 when specFile is missing', async () => {
      const request = createSubmitRequest({
        contactEmail: 'user@example.com',
      });

      const env = createMockEnv();
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(400);
      const data = await response.json() as { success: boolean; error: string };
      expect(data.error).toContain('specFile');
    });

    it('returns 400 when contactEmail is missing', async () => {
      const request = createSubmitRequest({
        specFile: validSpecFile,
      });

      const env = createMockEnv();
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(400);
      const data = await response.json() as { success: boolean; error: string };
      expect(data.error).toContain('contactEmail');
    });

    it('returns 400 when contactEmail is invalid format', async () => {
      const request = createSubmitRequest({
        specFile: validSpecFile,
        contactEmail: 'not-an-email',
      });

      const env = createMockEnv();
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(400);
      const data = await response.json() as { success: boolean; error: string };
      expect(data.error).toContain('Invalid email');
    });

    it('returns 400 when request body is empty object', async () => {
      const request = createSubmitRequest({});

      const env = createMockEnv();
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(400);
    });

    it('trims whitespace from contactEmail', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'ok' }), { status: 200 })
      );

      const env = createMockEnv();
      const request = createSubmitRequest({
        specFile: validSpecFile,
        contactEmail: '  user@example.com  ',
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(200);

      // Verify trimmed email was used in the Resend call
      const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const emailBody = JSON.parse(fetchCall[1].body as string);
      expect(emailBody.subject).toContain('user@example.com');
      expect(emailBody.subject).not.toContain('  user@example.com');
    });
  });

  describe('HTTP method enforcement', () => {
    it('returns 405 for GET requests to /api/submit', async () => {
      const request = new Request('https://worker.test/api/submit', { method: 'GET' });

      const env = createMockEnv();
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(405);
      const data = await response.json() as { success: boolean; error: string };
      expect(data.success).toBe(false);
    });

    it('returns 404 for unknown paths', async () => {
      const request = new Request('https://worker.test/api/unknown', { method: 'POST' });

      const env = createMockEnv();
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(404);
    });

    it('handles CORS preflight OPTIONS request', async () => {
      const request = new Request('https://worker.test/api/submit', { method: 'OPTIONS' });

      const env = createMockEnv();
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    });
  });
});
