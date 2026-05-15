import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { SubmissionManager } from './SubmissionManager';
import type { SpecFile } from '../core/types';
import {
  MAX_SUBMIT_RETRIES,
  SUBMIT_COOLDOWN_MS,
} from '../core/constants';

/**
 * Feature: gridfinity-drawer-designer, Property 12: Retry Cooldown State Machine
 *
 * For any sequence of submission attempts, after 3 consecutive failures the submit
 * action SHALL be disabled, and it SHALL remain disabled until 60 seconds have elapsed.
 * A successful submission at any point SHALL reset the consecutive failure count to 0.
 *
 * **Validates: Requirements 6.8**
 */
describe('SubmissionManager — Property 12: Retry Cooldown State Machine', () => {
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

  function mockFetchSuccess() {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ operatorEmail: 'op@example.com' }),
    });
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

  async function submitSuccess(manager: SubmissionManager): Promise<void> {
    mockFetchSuccess();
    await manager.submit(createMockSpecFile(), 'user@test.com');
  }

  it('for any N consecutive failures where N < MAX_SUBMIT_RETRIES: cooldown is NOT active', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: MAX_SUBMIT_RETRIES - 1 }),
        async (failureCount) => {
          vi.setSystemTime(new Date(1_000_000));
          const manager = new SubmissionManager();

          for (let i = 0; i < failureCount; i++) {
            await submitFailure(manager);
          }

          expect(manager.getCooldownUntil()).toBeNull();
          expect(manager.getConsecutiveFailures()).toBe(failureCount);
          // canSubmit should be true (with at least 1 box)
          expect(manager.canSubmit(1)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('for any N consecutive failures where N >= MAX_SUBMIT_RETRIES: cooldown IS active', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: MAX_SUBMIT_RETRIES, max: 10 }),
        async (failureCount) => {
          vi.setSystemTime(new Date(1_000_000));
          const manager = new SubmissionManager();

          for (let i = 0; i < failureCount; i++) {
            await submitFailure(manager);
          }

          expect(manager.getCooldownUntil()).not.toBeNull();
          expect(manager.getConsecutiveFailures()).toBe(failureCount);
          // canSubmit should be false during cooldown
          expect(manager.canSubmit(1)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('the cooldown duration is always exactly SUBMIT_COOLDOWN_MS (60000ms)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: MAX_SUBMIT_RETRIES, max: 10 }),
        async (failureCount) => {
          const baseTime = 1_000_000;
          vi.setSystemTime(new Date(baseTime));

          const manager = new SubmissionManager();

          for (let i = 0; i < failureCount; i++) {
            await submitFailure(manager);
          }

          // Cooldown should be active
          const cooldownUntil = manager.getCooldownUntil();
          expect(cooldownUntil).not.toBeNull();

          // The cooldown duration should be exactly SUBMIT_COOLDOWN_MS from the
          // time the last failure triggered it. Since each failure updates cooldownUntil,
          // the final value should be Date.now() + SUBMIT_COOLDOWN_MS at the time of the
          // last failure that triggered/refreshed cooldown.
          expect(cooldownUntil).toBe(baseTime + SUBMIT_COOLDOWN_MS);

          // 1ms before cooldown expires: still disabled
          vi.setSystemTime(new Date(baseTime + SUBMIT_COOLDOWN_MS - 1));
          expect(manager.canSubmit(1)).toBe(false);

          // Exactly at cooldown expiry: enabled
          vi.setSystemTime(new Date(baseTime + SUBMIT_COOLDOWN_MS));
          expect(manager.canSubmit(1)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('a success at any point resets the failure count to 0 and clears cooldown', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (failureCount) => {
          vi.setSystemTime(new Date(1_000_000));
          const manager = new SubmissionManager();

          // Accumulate failures
          for (let i = 0; i < failureCount; i++) {
            await submitFailure(manager);
          }

          expect(manager.getConsecutiveFailures()).toBe(failureCount);

          // A success resets everything
          await submitSuccess(manager);

          expect(manager.getConsecutiveFailures()).toBe(0);
          expect(manager.getCooldownUntil()).toBeNull();
          expect(manager.canSubmit(1)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
