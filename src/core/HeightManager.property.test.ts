import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { HeightManager } from './HeightManager';
import { HEIGHT_UNIT_MM } from './constants';

/**
 * Feature: gridfinity-drawer-designer, Property 8: Height Validation Correctness
 *
 * For any drawer height and height input value, the height validator SHALL:
 * - Accept the value if it is a positive integer in [1, floor(drawerHeight / 7)]
 * - Produce a warning (but accept) if the value is a positive integer greater than floor(drawerHeight / 7)
 * - Reject with an error if the value is less than 1, non-integer, or non-numeric
 *
 * **Validates: Requirements 4.5, 4.6, 4.7**
 */
describe('HeightManager — Property 8: Height Validation Correctness', () => {
  // Generator for valid drawer heights that produce at least maxHeight >= 1
  // Minimum drawerHeightMm = 7 (so maxHeight = 1)
  const drawerHeightArb = fc.integer({ min: 7, max: 2000 });

  it('accepts any positive integer in [1, maxHeight] with valid=true and no error/warning', () => {
    fc.assert(
      fc.property(drawerHeightArb, (drawerHeightMm) => {
        const hm = new HeightManager(drawerHeightMm);
        const maxHeight = hm.getMaxHeight();

        // Generate a valid height in [1, maxHeight]
        fc.assert(
          fc.property(fc.integer({ min: 1, max: maxHeight }), (units) => {
            const result = hm.validateHeight(units);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
            expect(result.warning).toBeUndefined();
          }),
          { numRuns: 20 }
        );
      }),
      { numRuns: 100 }
    );
  });

  it('accepts any positive integer > maxHeight with valid=true and warning defined', () => {
    fc.assert(
      fc.property(drawerHeightArb, (drawerHeightMm) => {
        const hm = new HeightManager(drawerHeightMm);
        const maxHeight = hm.getMaxHeight();

        // Generate a height exceeding maxHeight
        fc.assert(
          fc.property(fc.integer({ min: maxHeight + 1, max: maxHeight + 1000 }), (units) => {
            const result = hm.validateHeight(units);
            expect(result.valid).toBe(true);
            expect(result.warning).toBeDefined();
            expect(result.error).toBeUndefined();
          }),
          { numRuns: 20 }
        );
      }),
      { numRuns: 100 }
    );
  });

  it('rejects any value <= 0 with valid=false and error defined', () => {
    fc.assert(
      fc.property(
        drawerHeightArb,
        fc.integer({ min: -1000, max: 0 }),
        (drawerHeightMm, units) => {
          const hm = new HeightManager(drawerHeightMm);
          const result = hm.validateHeight(units);
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects any non-integer (fractional) value with valid=false and error defined', () => {
    fc.assert(
      fc.property(
        drawerHeightArb,
        fc.double({ min: 0.01, max: 1000, noNaN: true, noDefaultInfinity: true }).filter(
          (v) => !Number.isInteger(v)
        ),
        (drawerHeightMm, units) => {
          const hm = new HeightManager(drawerHeightMm);
          const result = hm.validateHeight(units);
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('maxHeight is always floor(drawerHeightMm / 7)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2000 }),
        (drawerHeightMm) => {
          const hm = new HeightManager(drawerHeightMm);
          expect(hm.getMaxHeight()).toBe(Math.floor(drawerHeightMm / HEIGHT_UNIT_MM));
        }
      ),
      { numRuns: 100 }
    );
  });
});
