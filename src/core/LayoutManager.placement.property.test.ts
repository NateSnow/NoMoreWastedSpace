import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { LayoutManager } from './LayoutManager';
import type { CellCoordinate } from './types';

/**
 * Feature: gridfinity-drawer-designer, Property 3: Box Placement Cell Coverage
 *
 * For any two valid cell coordinates (start and end) within a grid, creating a Box
 * SHALL produce a Box whose occupied cells are exactly the rectangular set of all cells
 * (col, row) where min(start.col, end.col) ≤ col ≤ max(start.col, end.col) and
 * min(start.row, end.row) ≤ row ≤ max(start.row, end.row), with widthUnits and
 * depthUnits matching the rectangle dimensions.
 *
 * **Validates: Requirements 3.3**
 */
describe('LayoutManager — Property 3: Box Placement Cell Coverage', () => {
  // Generator that produces a grid and a valid placement within that grid
  const gridAndPlacementArb = fc
    .record({
      columnsX: fc.integer({ min: 1, max: 10 }),
      rowsY: fc.integer({ min: 1, max: 10 }),
    })
    .chain((grid) =>
      fc.record({
        grid: fc.constant(grid),
        startCol: fc.integer({ min: 0, max: grid.columnsX - 1 }),
        startRow: fc.integer({ min: 0, max: grid.rowsY - 1 }),
        endCol: fc.integer({ min: 0, max: grid.columnsX - 1 }),
        endRow: fc.integer({ min: 0, max: grid.rowsY - 1 }),
      })
    );

  it('box occupies exactly (endCol - startCol + 1) * (endRow - startRow + 1) cells', () => {
    fc.assert(
      fc.property(gridAndPlacementArb, ({ grid, startCol, startRow, endCol, endRow }) => {
        const manager = new LayoutManager(grid);
        const start: CellCoordinate = { col: startCol, row: startRow };
        const end: CellCoordinate = { col: endCol, row: endRow };

        const result = manager.placeBox(start, end);
        expect(result.success).toBe(true);
        expect(result.box).toBeDefined();

        const box = result.box!;
        const expectedWidth = Math.abs(endCol - startCol) + 1;
        const expectedDepth = Math.abs(endRow - startRow) + 1;
        const expectedArea = expectedWidth * expectedDepth;

        expect(box.widthUnits * box.depthUnits).toBe(expectedArea);
      }),
      { numRuns: 100 }
    );
  });

  it('widthUnits matches the rectangle column span', () => {
    fc.assert(
      fc.property(gridAndPlacementArb, ({ grid, startCol, startRow, endCol, endRow }) => {
        const manager = new LayoutManager(grid);
        const start: CellCoordinate = { col: startCol, row: startRow };
        const end: CellCoordinate = { col: endCol, row: endRow };

        const result = manager.placeBox(start, end);
        expect(result.success).toBe(true);

        const box = result.box!;
        const expectedWidth = Math.abs(endCol - startCol) + 1;
        expect(box.widthUnits).toBe(expectedWidth);
      }),
      { numRuns: 100 }
    );
  });

  it('depthUnits matches the rectangle row span', () => {
    fc.assert(
      fc.property(gridAndPlacementArb, ({ grid, startCol, startRow, endCol, endRow }) => {
        const manager = new LayoutManager(grid);
        const start: CellCoordinate = { col: startCol, row: startRow };
        const end: CellCoordinate = { col: endCol, row: endRow };

        const result = manager.placeBox(start, end);
        expect(result.success).toBe(true);

        const box = result.box!;
        const expectedDepth = Math.abs(endRow - startRow) + 1;
        expect(box.depthUnits).toBe(expectedDepth);
      }),
      { numRuns: 100 }
    );
  });

  it('after placement, getAvailableCellCount decreases by exactly the box area', () => {
    fc.assert(
      fc.property(gridAndPlacementArb, ({ grid, startCol, startRow, endCol, endRow }) => {
        const manager = new LayoutManager(grid);
        const start: CellCoordinate = { col: startCol, row: startRow };
        const end: CellCoordinate = { col: endCol, row: endRow };

        const availableBefore = manager.getAvailableCellCount();
        const result = manager.placeBox(start, end);
        expect(result.success).toBe(true);

        const box = result.box!;
        const boxArea = box.widthUnits * box.depthUnits;
        const availableAfter = manager.getAvailableCellCount();

        expect(availableAfter).toBe(availableBefore - boxArea);
      }),
      { numRuns: 100 }
    );
  });
});
