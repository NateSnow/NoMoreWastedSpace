import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SubmissionManager } from './SubmissionManager';
import type { SpecFile } from '../core/types';
import {
  SUBMIT_COOLDOWN_MS,
} from '../core/constants';

describe('SubmissionManager', () => {
  let manager: SubmissionManager;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    manager = new SubmissionManager();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function createMockSpecFile(): SpecFile {
    return {
      baseplate: {
        gridWidth: 3,
        gridDepth: 2,
        totalWidthMm: 126,
        totalDepthMm: 84,
      },
      boxes: [
        {
          itemNumber: 1,
          gridPosition: { col: 0, row: 0 },
          sizeUnits: { width: 2, depth: 1 },
          heightUnits: 3,
        },
      ],
    };
  }

  function mockFetchSuccess(operatorEmail: string = 'operator@example.com') {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ operatorEmail }),
    });
  }

  function mockFetchError(status: number = 500) {
    fetchMock.mockResolvedValue({
      ok: false,
      status,
      json: () => Promise.resolve({ error: 'Server error' }),
    });
  }

  describe('submit', () => {
    it('POSTs specFile and contactEmail to /api/submit', async () => {
      mockFetchSuccess();
      const specFile = createMockSpecFile();

      await manager.submit(specFile, 'user@example.com');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/submit',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ specFile, contactEmail: 'user@example.com' }),
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('returns success with operatorEmail on successful response', async () => {
      mockFetchSuccess('print@operator.com');
      const specFile = createMockSpecFile();

      const result = await manager.submit(specFile, 'user@example.com');

      expect(result.success).toBe(true);
      expect(result.operatorEmail).toBe('print@operator.com');
      expect(result.error).toBeUndefined();
    });

    it('returns failure on non-OK HTTP response', async () => {
      mockFetchError(500);
      const specFile = createMockSpecFile();

      const result = await manager.submit(specFile, 'user@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns failure on network error', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      const specFile = createMockSpecFile();

      const result = await manager.submit(specFile, 'user@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns timeout error on AbortError', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');
      fetchMock.mockRejectedValue(abortError);
      const specFile = createMockSpecFile();

      const result = await manager.submit(specFile, 'user@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });

    it('uses custom base URL when provided', async () => {
      const customManager = new SubmissionManager('https://api.example.com');
      mockFetchSuccess();
      const specFile = createMockSpecFile();

      await customManager.submit(specFile, 'user@example.com');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/submit',
        expect.any(Object)
      );
    });
  });

  describe('consecutive failure tracking', () => {
    it('increments failure count on each failure', async () => {
      mockFetchError();
      const specFile = createMockSpecFile();

      await manager.submit(specFile, 'user@example.com');
      expect(manager.getConsecutiveFailures()).toBe(1);

      await manager.submit(specFile, 'user@example.com');
      expect(manager.getConsecutiveFailures()).toBe(2);
    });

    it('resets failure count on success', async () => {
      mockFetchError();
      const specFile = createMockSpecFile();

      // Fail twice
      await manager.submit(specFile, 'user@example.com');
      await manager.submit(specFile, 'user@example.com');
      expect(manager.getConsecutiveFailures()).toBe(2);

      // Succeed
      mockFetchSuccess();
      await manager.submit(specFile, 'user@example.com');
      expect(manager.getConsecutiveFailures()).toBe(0);
    });

    it('activates cooldown after 3 consecutive failures', async () => {
      mockFetchError();
      const specFile = createMockSpecFile();

      vi.setSystemTime(new Date(1000000));

      await manager.submit(specFile, 'user@example.com');
      await manager.submit(specFile, 'user@example.com');
      expect(manager.getCooldownUntil()).toBeNull();

      await manager.submit(specFile, 'user@example.com');
      expect(manager.getCooldownUntil()).toBe(1000000 + SUBMIT_COOLDOWN_MS);
    });

    it('does not activate cooldown before 3 failures', async () => {
      mockFetchError();
      const specFile = createMockSpecFile();

      await manager.submit(specFile, 'user@example.com');
      await manager.submit(specFile, 'user@example.com');

      expect(manager.getCooldownUntil()).toBeNull();
    });
  });

  describe('canSubmit', () => {
    it('returns false when boxCount is 0', () => {
      expect(manager.canSubmit(0)).toBe(false);
    });

    it('returns false when boxCount is negative', () => {
      expect(manager.canSubmit(-1)).toBe(false);
    });

    it('returns true when boxCount >= 1 and no cooldown', () => {
      expect(manager.canSubmit(1)).toBe(true);
      expect(manager.canSubmit(5)).toBe(true);
    });

    it('returns false during cooldown period', async () => {
      mockFetchError();
      const specFile = createMockSpecFile();

      vi.setSystemTime(new Date(1000000));

      // Trigger cooldown with 3 failures
      await manager.submit(specFile, 'user@example.com');
      await manager.submit(specFile, 'user@example.com');
      await manager.submit(specFile, 'user@example.com');

      expect(manager.canSubmit(1)).toBe(false);
    });

    it('returns true after cooldown expires', async () => {
      mockFetchError();
      const specFile = createMockSpecFile();

      vi.setSystemTime(new Date(1000000));

      // Trigger cooldown
      await manager.submit(specFile, 'user@example.com');
      await manager.submit(specFile, 'user@example.com');
      await manager.submit(specFile, 'user@example.com');

      expect(manager.canSubmit(1)).toBe(false);

      // Advance past cooldown
      vi.setSystemTime(new Date(1000000 + SUBMIT_COOLDOWN_MS));
      expect(manager.canSubmit(1)).toBe(true);
    });

    it('returns false during cooldown even with many boxes', async () => {
      mockFetchError();
      const specFile = createMockSpecFile();

      vi.setSystemTime(new Date(1000000));

      await manager.submit(specFile, 'user@example.com');
      await manager.submit(specFile, 'user@example.com');
      await manager.submit(specFile, 'user@example.com');

      expect(manager.canSubmit(50)).toBe(false);
    });

    it('clears cooldown state after expiry', async () => {
      mockFetchError();
      const specFile = createMockSpecFile();

      vi.setSystemTime(new Date(1000000));

      await manager.submit(specFile, 'user@example.com');
      await manager.submit(specFile, 'user@example.com');
      await manager.submit(specFile, 'user@example.com');

      // Advance past cooldown
      vi.setSystemTime(new Date(1000000 + SUBMIT_COOLDOWN_MS + 1));
      manager.canSubmit(1);

      expect(manager.getCooldownUntil()).toBeNull();
    });
  });

  describe('cooldown reset on success', () => {
    it('clears cooldown when a submission succeeds', async () => {
      mockFetchError();
      const specFile = createMockSpecFile();

      vi.setSystemTime(new Date(1000000));

      // Trigger cooldown
      await manager.submit(specFile, 'user@example.com');
      await manager.submit(specFile, 'user@example.com');
      await manager.submit(specFile, 'user@example.com');

      expect(manager.getCooldownUntil()).not.toBeNull();

      // Succeed (simulating a retry after cooldown)
      mockFetchSuccess();
      await manager.submit(specFile, 'user@example.com');

      expect(manager.getConsecutiveFailures()).toBe(0);
      expect(manager.getCooldownUntil()).toBeNull();
    });
  });
});
