import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateGrid } from './GridCalculator';
import { GRID_UNIT_MM } from './constants';

/**
 * Feature: gridfinity-drawer-designer, Property 1: Grid Calculation Correctness
 *
 * For any valid drawer dimensions (width/depth in [42, 2000]), the Grid Calculator
 * SHALL produce columnsX equal to Math.floor(width / 42) and rowsY equal to
 * Math.floor(depth / 42), where both values are at least 1.
 *
 * **Validates: Requirements 1.2, 1.3**
 */
describe('GridCalculator — Property 1: Grid Calculation Correctness', () => {
  // Generator for valid drawer dimensions: width and depth in [42, 2000], height in (0, 2000]
  const validDimensionsArb = fc.record({
    width: fc.integer({ min: 42, max: 2000 }),
    depth: fc.integer({ min: 42, max: 2000 }),
    height: fc.integer({ min: 1, max: 2000 }),
  });

  it('columnsX equals Math.floor(width / 42) for any valid dimensions', () => {
    fc.assert(
      fc.property(validDimensionsArb, (dimensions) => {
        const result = calculateGrid(dimensions);
        expect(result.columnsX).toBe(Math.floor(dimensions.width / GRID_UNIT_MM));
      }),
      { numRuns: 100 }
    );
  });

  it('rowsY equals Math.floor(depth / 42) for any valid dimensions', () => {
    fc.assert(
      fc.property(validDimensionsArb, (dimensions) => {
        const result = calculateGrid(dimensions);
        expect(result.rowsY).toBe(Math.floor(dimensions.depth / GRID_UNIT_MM));
      }),
      { numRuns: 100 }
    );
  });

  it('columnsX is always at least 1 for valid dimensions', () => {
    fc.assert(
      fc.property(validDimensionsArb, (dimensions) => {
        const result = calculateGrid(dimensions);
        expect(result.columnsX).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });

  it('rowsY is always at least 1 for valid dimensions', () => {
    fc.assert(
      fc.property(validDimensionsArb, (dimensions) => {
        const result = calculateGrid(dimensions);
        expect(result.rowsY).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });

  it('grid fits within drawer: columnsX * 42 <= width', () => {
    fc.assert(
      fc.property(validDimensionsArb, (dimensions) => {
        const result = calculateGrid(dimensions);
        expect(result.columnsX * GRID_UNIT_MM).toBeLessThanOrEqual(dimensions.width);
      }),
      { numRuns: 100 }
    );
  });

  it('grid fits within drawer: rowsY * 42 <= depth', () => {
    fc.assert(
      fc.property(validDimensionsArb, (dimensions) => {
        const result = calculateGrid(dimensions);
        expect(result.rowsY * GRID_UNIT_MM).toBeLessThanOrEqual(dimensions.depth);
      }),
      { numRuns: 100 }
    );
  });

  it('no room for another column: (columnsX + 1) * 42 > width', () => {
    fc.assert(
      fc.property(validDimensionsArb, (dimensions) => {
        const result = calculateGrid(dimensions);
        expect((result.columnsX + 1) * GRID_UNIT_MM).toBeGreaterThan(dimensions.width);
      }),
      { numRuns: 100 }
    );
  });

  it('no room for another row: (rowsY + 1) * 42 > depth', () => {
    fc.assert(
      fc.property(validDimensionsArb, (dimensions) => {
        const result = calculateGrid(dimensions);
        expect((result.rowsY + 1) * GRID_UNIT_MM).toBeGreaterThan(dimensions.depth);
      }),
      { numRuns: 100 }
    );
  });
});
