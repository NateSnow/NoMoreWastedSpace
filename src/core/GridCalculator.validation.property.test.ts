/**
 * Feature: gridfinity-drawer-designer, Property 2: Dimension Validation Correctness
 *
 * Validates: Requirements 1.4, 1.5, 1.6
 *
 * For any string input to a dimension field, the validator SHALL:
 * - Reject with a format error if the value is non-numeric, zero, or negative
 * - Reject with a "too small" error if width or depth is numeric but less than 42mm
 * - Reject with a "too large" error if width or depth is numeric but greater than 2000mm
 * - Accept as valid if the value is numeric, positive, in [42, 2000] for width/depth, and in (0, 2000] for height
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateDimensions } from './GridCalculator';

describe('GridCalculator — Property 2: Dimension Validation Correctness', () => {
  /**
   * **Validates: Requirements 1.4**
   * For any width < 42: validateDimensions returns invalid with "too small" error
   */
  it('rejects width less than 42mm with "too small" error', () => {
    fc.assert(
      fc.property(
        // Width: positive number less than 42
        fc.double({ min: 0.01, max: 41.99, noNaN: true }),
        // Depth and height: valid values
        fc.double({ min: 42, max: 2000, noNaN: true }),
        fc.double({ min: 0.01, max: 2000, noNaN: true }),
        (width, depth, height) => {
          const result = validateDimensions({
            width: width.toString(),
            depth: depth.toString(),
            height: height.toString(),
          });
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.toLowerCase().includes('too small'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.4**
   * For any depth < 42: validateDimensions returns invalid with "too small" error
   */
  it('rejects depth less than 42mm with "too small" error', () => {
    fc.assert(
      fc.property(
        // Width: valid value
        fc.double({ min: 42, max: 2000, noNaN: true }),
        // Depth: positive number less than 42
        fc.double({ min: 0.01, max: 41.99, noNaN: true }),
        // Height: valid value
        fc.double({ min: 0.01, max: 2000, noNaN: true }),
        (width, depth, height) => {
          const result = validateDimensions({
            width: width.toString(),
            depth: depth.toString(),
            height: height.toString(),
          });
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.toLowerCase().includes('too small'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.6**
   * For any width > 2000: validateDimensions returns invalid with "exceeds maximum" error
   */
  it('rejects width greater than 2000mm with "exceeds maximum" error', () => {
    fc.assert(
      fc.property(
        // Width: greater than 2000
        fc.double({ min: 2000.01, max: 100000, noNaN: true }),
        // Depth and height: valid values
        fc.double({ min: 42, max: 2000, noNaN: true }),
        fc.double({ min: 0.01, max: 2000, noNaN: true }),
        (width, depth, height) => {
          const result = validateDimensions({
            width: width.toString(),
            depth: depth.toString(),
            height: height.toString(),
          });
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.toLowerCase().includes('exceeds maximum'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.6**
   * For any depth > 2000: validateDimensions returns invalid with "exceeds maximum" error
   */
  it('rejects depth greater than 2000mm with "exceeds maximum" error', () => {
    fc.assert(
      fc.property(
        // Width: valid value
        fc.double({ min: 42, max: 2000, noNaN: true }),
        // Depth: greater than 2000
        fc.double({ min: 2000.01, max: 100000, noNaN: true }),
        // Height: valid value
        fc.double({ min: 0.01, max: 2000, noNaN: true }),
        (width, depth, height) => {
          const result = validateDimensions({
            width: width.toString(),
            depth: depth.toString(),
            height: height.toString(),
          });
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.toLowerCase().includes('exceeds maximum'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.4, 1.5, 1.6**
   * For any valid dimensions (width/depth in [42, 2000], height in (0, 2000]):
   * validateDimensions returns valid
   */
  it('accepts valid dimensions: width/depth in [42, 2000], height in (0, 2000]', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 42, max: 2000, noNaN: true }),
        fc.double({ min: 42, max: 2000, noNaN: true }),
        fc.double({ min: 0.01, max: 2000, noNaN: true }),
        (width, depth, height) => {
          const result = validateDimensions({
            width: width.toString(),
            depth: depth.toString(),
            height: height.toString(),
          });
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.5**
   * For zero or negative values: validateDimensions returns invalid
   */
  it('rejects zero or negative values for all dimensions', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -10000, max: 0, noNaN: true }),
        fc.double({ min: -10000, max: 0, noNaN: true }),
        fc.double({ min: -10000, max: 0, noNaN: true }),
        (width, depth, height) => {
          const result = validateDimensions({
            width: width.toString(),
            depth: depth.toString(),
            height: height.toString(),
          });
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.5**
   * For non-numeric strings: validateDimensions returns invalid
   */
  it('rejects non-numeric string inputs', () => {
    // Generate strings that are definitely not valid numbers
    const nonNumericArb = fc.oneof(
      fc.stringMatching(/^[a-zA-Z]+$/),  // alphabetic strings
      fc.constant(''),                    // empty string
      fc.constant('abc'),
      fc.constant('twelve'),
      fc.constant('1.2.3'),
      fc.constant('--5'),
      fc.constant('NaN'),
      fc.constant('Infinity'),
    );

    fc.assert(
      fc.property(nonNumericArb, (nonNumeric) => {
        // Test with non-numeric width
        const result = validateDimensions({
          width: nonNumeric,
          depth: '100',
          height: '50',
        });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});
