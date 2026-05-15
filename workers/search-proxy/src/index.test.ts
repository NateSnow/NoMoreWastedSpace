/**
 * Integration tests for the MakerWorld Search Proxy worker.
 *
 * Tests the worker with mocked MakerWorld API responses to verify:
 * - Successful search proxying (Requirement 5.2)
 * - Error handling for service unavailability (Requirement 5.8)
 * - Timeout handling (Requirement 5.2 — 10 second timeout)
 * - Input validation (missing/empty keyword)
 * - HTTP method enforcement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import worker from './index';

// Mock the global fetch used by the worker to call the MakerWorld API
const originalFetch = globalThis.fetch;

function createMockEnv(overrides: Partial<{ MAKERWORLD_API_BASE: string; CACHE_TTL_SECONDS: string }> = {}) {
  return {
    MAKERWORLD_API_BASE: 'https://mock-makerworld.test',
    CACHE_TTL_SECONDS: '300',
    ...overrides,
  };
}

function createRequest(url: string, method = 'GET'): Request {
  return new Request(url, { method });
}

// Mock the Cache API (not available in Node)
const mockCache = {
  match: vi.fn().mockResolvedValue(undefined),
  put: vi.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  vi.useFakeTimers();
  // Mock caches.default
  (globalThis as unknown as { caches: { default: typeof mockCache } }).caches = {
    default: mockCache,
  };
  mockCache.match.mockResolvedValue(undefined);
  mockCache.put.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

describe('MakerWorld Search Proxy Worker', () => {
  describe('Successful search (Requirement 5.2)', () => {
    it('returns top 10 models from MakerWorld API', async () => {
      const mockModels = Array.from({ length: 12 }, (_, i) => ({
        id: `model-${i}`,
        title: `Test Model ${i}`,
        cover: `https://img.test/model-${i}.jpg`,
        gridWidth: 2,
        gridDepth: 3,
      }));

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ hits: mockModels }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const env = createMockEnv();
      const request = createRequest('https://worker.test/api/makerworld/search?keyword=gridfinity');
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(200);
      const data = await response.json() as { models: unknown[] };
      expect(data.models).toHaveLength(10);
      expect(data.models[0]).toEqual({
        id: 'model-0',
        name: 'Test Model 0',
        thumbnailUrl: 'https://img.test/model-0.jpg',
        gridWidth: 2,
        gridDepth: 3,
      });
    });

    it('forwards keyword to MakerWorld API with correct URL encoding', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ hits: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const env = createMockEnv();
      const request = createRequest('https://worker.test/api/makerworld/search?keyword=battery%20holder');
      await worker.fetch(request, env, {} as ExecutionContext);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('keyword=battery%20holder'),
        expect.any(Object)
      );
    });

    it('handles response with "models" key instead of "hits"', async () => {
      const mockModels = [
        { id: '1', title: 'Model A', cover: 'https://img.test/a.jpg', gridWidth: 1, gridDepth: 1 },
      ];

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ models: mockModels }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const env = createMockEnv();
      const request = createRequest('https://worker.test/api/makerworld/search?keyword=bin');
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(200);
      const data = await response.json() as { models: unknown[] };
      expect(data.models).toHaveLength(1);
    });

    it('handles response with "data" key', async () => {
      const mockModels = [
        { designId: '99', name: 'Alt Model', thumbnail: 'https://img.test/alt.jpg', dimensions: { width: 3, depth: 2 } },
      ];

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: mockModels }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const env = createMockEnv();
      const request = createRequest('https://worker.test/api/makerworld/search?keyword=organizer');
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(200);
      const data = await response.json() as { models: Array<{ id: string; name: string; thumbnailUrl: string; gridWidth: number; gridDepth: number }> };
      expect(data.models[0]).toEqual({
        id: '99',
        name: 'Alt Model',
        thumbnailUrl: 'https://img.test/alt.jpg',
        gridWidth: 3,
        gridDepth: 2,
      });
    });

    it('returns empty models array when no results found', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ hits: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const env = createMockEnv();
      const request = createRequest('https://worker.test/api/makerworld/search?keyword=xyznonexistent');
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(200);
      const data = await response.json() as { models: unknown[] };
      expect(data.models).toHaveLength(0);
    });

    it('includes CORS headers in successful response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ hits: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const env = createMockEnv();
      const request = createRequest('https://worker.test/api/makerworld/search?keyword=test');
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('Cache behavior', () => {
    it('returns cached response when available', async () => {
      const cachedBody = JSON.stringify({ models: [{ id: 'cached', name: 'Cached', thumbnailUrl: '', gridWidth: 1, gridDepth: 1 }] });
      mockCache.match.mockResolvedValue(
        new Response(cachedBody, { status: 200, headers: { 'Content-Type': 'application/json' } })
      );

      globalThis.fetch = vi.fn();

      const env = createMockEnv();
      const request = createRequest('https://worker.test/api/makerworld/search?keyword=cached');
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(200);
      const data = await response.json() as { models: Array<{ id: string }> };
      expect(data.models[0].id).toBe('cached');
      // Should not have called the upstream API
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('stores response in cache after successful fetch', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ hits: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const env = createMockEnv();
      const request = createRequest('https://worker.test/api/makerworld/search?keyword=store');
      await worker.fetch(request, env, {} as ExecutionContext);

      expect(mockCache.put).toHaveBeenCalled();
    });
  });

  describe('Timeout handling (Requirement 5.2)', () => {
    it('returns 504 when upstream request times out', async () => {
      // Simulate an AbortError (what happens when AbortController.abort() is called)
      const abortError = new DOMException('The operation was aborted.', 'AbortError');
      globalThis.fetch = vi.fn().mockRejectedValue(abortError);

      const env = createMockEnv();
      const request = createRequest('https://worker.test/api/makerworld/search?keyword=timeout');
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(504);
      const data = await response.json() as { error: string };
      expect(data.error).toContain('timed out');
    });
  });

  describe('Service unavailability (Requirement 5.8)', () => {
    it('returns 502 when MakerWorld API returns non-200 status', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response('Internal Server Error', { status: 500 })
      );

      const env = createMockEnv();
      const request = createRequest('https://worker.test/api/makerworld/search?keyword=error');
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(502);
      const data = await response.json() as { error: string };
      expect(data.error).toContain('temporarily unavailable');
    });

    it('returns 502 when network error occurs', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const env = createMockEnv();
      const request = createRequest('https://worker.test/api/makerworld/search?keyword=network');
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(502);
      const data = await response.json() as { error: string };
      expect(data.error).toContain('temporarily unavailable');
    });

    it('includes CORS headers in error responses', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('fail'));

      const env = createMockEnv();
      const request = createRequest('https://worker.test/api/makerworld/search?keyword=cors');
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('Input validation', () => {
    it('returns 400 when keyword is missing', async () => {
      const env = createMockEnv();
      const request = createRequest('https://worker.test/api/makerworld/search');
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(400);
      const data = await response.json() as { error: string };
      expect(data.error).toContain('keyword');
    });

    it('returns 400 when keyword is empty string', async () => {
      const env = createMockEnv();
      const request = createRequest('https://worker.test/api/makerworld/search?keyword=');
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(400);
    });

    it('returns 400 when keyword is only whitespace', async () => {
      const env = createMockEnv();
      const request = createRequest('https://worker.test/api/makerworld/search?keyword=%20%20');
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(400);
    });
  });

  describe('HTTP method enforcement', () => {
    it('returns 405 for POST requests', async () => {
      const env = createMockEnv();
      const request = createRequest('https://worker.test/api/makerworld/search?keyword=test', 'POST');
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(405);
    });

    it('returns 404 for unknown paths', async () => {
      const env = createMockEnv();
      const request = createRequest('https://worker.test/api/unknown');
      const response = await worker.fetch(request, env, {} as ExecutionContext);

      expect(response.status).toBe(404);
    });
  });
});
