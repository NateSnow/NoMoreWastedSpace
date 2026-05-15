import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MakerWorldSearchClient, truncateModelName } from './MakerWorldSearchClient';
import type { MakerWorldModel } from '../core/types';
import {
  MIN_SEARCH_KEYWORD_LENGTH,
  MAX_SEARCH_RESULTS,
  MAX_MODEL_NAME_LENGTH,
} from '../core/constants';

describe('MakerWorldSearchClient', () => {
  let client: MakerWorldSearchClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new MakerWorldSearchClient();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockModel(overrides: Partial<MakerWorldModel> = {}): MakerWorldModel {
    return {
      id: 'model-1',
      name: 'Test Model',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      gridWidth: 2,
      gridDepth: 1,
      ...overrides,
    };
  }

  function mockFetchSuccess(data: unknown) {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
    });
  }

  function mockFetchError(status: number) {
    fetchMock.mockResolvedValue({
      ok: false,
      status,
      json: () => Promise.resolve({ error: 'Server error' }),
    });
  }

  describe('keyword validation', () => {
    it('rejects keywords shorter than 2 characters', async () => {
      const result = await client.search('a');

      expect(result.models).toEqual([]);
      expect(result.error).toContain(`at least ${MIN_SEARCH_KEYWORD_LENGTH} characters`);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects empty keyword', async () => {
      const result = await client.search('');

      expect(result.models).toEqual([]);
      expect(result.error).toBeDefined();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('accepts keywords of exactly 2 characters', async () => {
      mockFetchSuccess([createMockModel()]);

      const result = await client.search('ab');

      expect(result.models).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  describe('successful search', () => {
    it('returns models from array response', async () => {
      const models = [createMockModel({ id: '1', name: 'Model A' })];
      mockFetchSuccess(models);

      const result = await client.search('test');

      expect(result.models).toHaveLength(1);
      expect(result.models[0].name).toBe('Model A');
      expect(result.error).toBeUndefined();
    });

    it('returns models from object response with models field', async () => {
      const models = [createMockModel({ id: '1', name: 'Model B' })];
      mockFetchSuccess({ models });

      const result = await client.search('test');

      expect(result.models).toHaveLength(1);
      expect(result.models[0].name).toBe('Model B');
    });

    it('limits results to top 10', async () => {
      const models = Array.from({ length: 15 }, (_, i) =>
        createMockModel({ id: `model-${i}`, name: `Model ${i}` })
      );
      mockFetchSuccess(models);

      const result = await client.search('test');

      expect(result.models).toHaveLength(MAX_SEARCH_RESULTS);
    });

    it('calls the correct proxy endpoint with encoded keyword', async () => {
      mockFetchSuccess([]);

      await client.search('test query');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/makerworld/search?keyword=test%20query',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });

  describe('name truncation', () => {
    it('truncates names longer than 60 characters', async () => {
      const longName = 'A'.repeat(80);
      mockFetchSuccess([createMockModel({ name: longName })]);

      const result = await client.search('test');

      expect(result.models[0].name).toHaveLength(MAX_MODEL_NAME_LENGTH + 3); // 60 + "..."
      expect(result.models[0].name).toBe('A'.repeat(60) + '...');
    });

    it('does not truncate names of exactly 60 characters', async () => {
      const exactName = 'B'.repeat(60);
      mockFetchSuccess([createMockModel({ name: exactName })]);

      const result = await client.search('test');

      expect(result.models[0].name).toBe(exactName);
    });

    it('does not truncate names shorter than 60 characters', async () => {
      const shortName = 'Short Model';
      mockFetchSuccess([createMockModel({ name: shortName })]);

      const result = await client.search('test');

      expect(result.models[0].name).toBe(shortName);
    });
  });

  describe('empty results', () => {
    it('returns error message for empty array response', async () => {
      mockFetchSuccess([]);

      const result = await client.search('nonexistent');

      expect(result.models).toEqual([]);
      expect(result.error).toBe('No results found');
    });

    it('returns error message for object with empty models array', async () => {
      mockFetchSuccess({ models: [] });

      const result = await client.search('nonexistent');

      expect(result.models).toEqual([]);
      expect(result.error).toBe('No results found');
    });
  });

  describe('error handling', () => {
    it('handles non-OK HTTP response', async () => {
      mockFetchError(500);

      const result = await client.search('test');

      expect(result.models).toEqual([]);
      expect(result.error).toBe('Search service temporarily unavailable');
    });

    it('handles network errors', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await client.search('test');

      expect(result.models).toEqual([]);
      expect(result.error).toBe('Search service temporarily unavailable');
    });

    it('handles timeout (AbortError)', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');
      fetchMock.mockRejectedValue(abortError);

      const result = await client.search('test');

      expect(result.models).toEqual([]);
      expect(result.error).toBe('Search timed out — please try again');
    });
  });

  describe('base URL configuration', () => {
    it('uses custom base URL when provided', async () => {
      const customClient = new MakerWorldSearchClient('https://api.example.com');
      mockFetchSuccess([createMockModel()]);

      await customClient.search('test');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/makerworld/search?keyword=test',
        expect.any(Object)
      );
    });
  });
});

describe('truncateModelName', () => {
  it('returns original name if <= 60 characters', () => {
    expect(truncateModelName('Short')).toBe('Short');
    expect(truncateModelName('A'.repeat(60))).toBe('A'.repeat(60));
  });

  it('truncates and appends "..." if > 60 characters', () => {
    const longName = 'X'.repeat(100);
    const result = truncateModelName(longName);
    expect(result).toBe('X'.repeat(60) + '...');
    expect(result.length).toBe(63);
  });

  it('handles empty string', () => {
    expect(truncateModelName('')).toBe('');
  });
});
