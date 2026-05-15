import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { SubmissionManager } from './SubmissionManager';
import type { SpecFile } from '../core/types';
import {
  MAX_SUBMIT_RETRIES,
  SUBMIT_COOLDOWN_MS,
} from '../core/constants';

/**
 * Feature: gridfinity-drawer-designer, Property 13: Submit Enablement Invariant
 *
 * For any layout state, the submit action SHALL be enabled if and only if the layout
 * contains at least one placed Box (boxes.length >= 1) AND the retry cooldown is not active.
 *
 * **Validates: Requirements 8.4, 8.5**
 */
describe('SubmissionManager — Property 13: Submit Enablement Invariant', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
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
        gridWidth: 2,
        gridDepth: 2,
        totalWidthMm: 84,
        totalDepthMm: 84,
      },
      boxes: [
        {
          itemNumber: 1,
          gridPosition: { col: 0, row: 0 },
          sizeUnits: { width: 1, depth: 1 },
          heightUnits: 1,
        },
      ],
    };
  }

  function mockFetchFailure() {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    });
  }

  async function submitFailure(manager: SubmissionManager): Promise<void> {
    mockFetchFailure();
    await manager.submit(createMockSpecFile(), 'user@test.com');
  }

  it('canSubmit returns false for any boxCount < 1 (0, negative)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 0 }),
        (boxCount) => {
          const manager = new SubmissionManager();
          expect(manager.canSubmit(boxCount)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('canSubmit returns true for any boxCount >= 1 when no cooldown is active', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (boxCount) => {
          const manager = new SubmissionManager();
          // No failures, no cooldown
          expect(manager.canSubmit(boxCount)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('canSubmit returns false for any boxCount when cooldown IS active', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1000 }),
        async (boxCount) => {
          const baseTime = 1_000_000;
          vi.setSystemTime(new Date(baseTime));

          const manager = new SubmissionManager();

          // Trigger cooldown by causing MAX_SUBMIT_RETRIES consecutive failures
          for (let i = 0; i < MAX_SUBMIT_RETRIES; i++) {
            await submitFailure(manager);
          }

          // Cooldown is now active — canSubmit should be false regardless of boxCount
          expect(manager.canSubmit(boxCount)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('canSubmit returns true after cooldown expires (time >= cooldownUntil)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 0, max: 120_000 }),
        async (boxCount, extraMs) => {
          const baseTime = 1_000_000;
          vi.setSystemTime(new Date(baseTime));

          const manager = new SubmissionManager();

          // Trigger cooldown
          for (let i = 0; i < MAX_SUBMIT_RETRIES; i++) {
            await submitFailure(manager);
          }

          // Confirm cooldown is active
          expect(manager.canSubmit(boxCount)).toBe(false);

          // Advance time to exactly cooldown expiry + extraMs
          vi.setSystemTime(new Date(baseTime + SUBMIT_COOLDOWN_MS + extraMs));

          // After cooldown expires, canSubmit should return true for valid boxCount
          expect(manager.canSubmit(boxCount)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
