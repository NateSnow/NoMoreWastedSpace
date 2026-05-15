import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { truncateModelName } from './MakerWorldSearchClient';
import { MAX_MODEL_NAME_LENGTH } from '../core/constants';

/**
 * Feature: gridfinity-drawer-designer, Property 10: Name Truncation
 *
 * For any string representing a MakerWorld model name, the displayed name SHALL be
 * the original string if its length is ≤ 60 characters, or the first 60 characters
 * of the original string followed by "..." if its length exceeds 60.
 *
 * **Validates: Requirements 5.3**
 */
describe('MakerWorldSearchClient — Property 10: Name Truncation', () => {
  it('returns the original string unchanged for any string of length <= 60', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: MAX_MODEL_NAME_LENGTH }),
        (name) => {
          const result = truncateModelName(name);
          expect(result).toBe(name);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns a string of exactly 63 characters for any string of length > 60', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: MAX_MODEL_NAME_LENGTH + 1, maxLength: 500 }),
        (name) => {
          const result = truncateModelName(name);
          expect(result.length).toBe(MAX_MODEL_NAME_LENGTH + 3);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('the truncated result always starts with the first 60 characters of the original', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: MAX_MODEL_NAME_LENGTH + 1, maxLength: 500 }),
        (name) => {
          const result = truncateModelName(name);
          expect(result.startsWith(name.slice(0, MAX_MODEL_NAME_LENGTH))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('the truncated result always ends with "..."', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: MAX_MODEL_NAME_LENGTH + 1, maxLength: 500 }),
        (name) => {
          const result = truncateModelName(name);
          expect(result.endsWith('...')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('the result never exceeds 63 characters for any input', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 1000 }),
        (name) => {
          const result = truncateModelName(name);
          expect(result.length).toBeLessThanOrEqual(MAX_MODEL_NAME_LENGTH + 3);
        }
      ),
      { numRuns: 100 }
    );
  });
});
