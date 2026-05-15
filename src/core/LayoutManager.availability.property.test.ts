import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { LayoutManager } from './LayoutManager';
import type { CellCoordinate, GridDimensions } from './types';

/**
 * Feature: gridfinity-drawer-designer, Property 6: Available Cell Count Invariant
 *
 * For any grid with dimensions (columnsX × rowsY) and any set of non-overlapping
 * placed Boxes, the available cell count SHALL equal
 * (columnsX * rowsY) - sum(box.widthUnits * box.depthUnits for each box).
 *
 * **Validates: Requirements 2.5**
 */
describe('LayoutManager — Property 6: Available Cell Count Invariant', () => {
  // Generator for small grid dimensions (keep small to allow meaningful placements)
  const gridArb = fc.record({
    columnsX: fc.integer({ min: 1, max: 10 }),
    rowsY: fc.integer({ min: 1, max: 10 }),
  });

  // Generator for a valid box placement within a grid
  const boxPlacementArb = (grid: GridDimensions) =>
    fc.record({
      startCol: fc.integer({ min: 0, max: grid.columnsX - 1 }),
      startRow: fc.integer({ min: 0, max: grid.rowsY - 1 }),
      endCol: fc.integer({ min: 0, max: grid.columnsX - 1 }),
      endRow: fc.integer({ min: 0, max: grid.rowsY - 1 }),
    });

  it('available cell count is always >= 0', () => {
    fc.assert(
      fc.property(gridArb, (grid) => {
        const manager = new LayoutManager(grid);

        // Place boxes until we can't anymore (up to 10 attempts)
        for (let i = 0; i < 10; i++) {
          const start: CellCoordinate = { col: 0, row: i % grid.rowsY };
          const end: CellCoordinate = { col: 0, row: i % grid.rowsY };
          manager.placeBox(start, end);
        }

        expect(manager.getAvailableCellCount()).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });

  it('available cell count is always <= total grid cells (columnsX * rowsY)', () => {
    fc.assert(
      fc.property(gridArb, (grid) => {
        const manager = new LayoutManager(grid);
        const totalCells = grid.columnsX * grid.rowsY;

        // Place some random boxes
        for (let i = 0; i < 5; i++) {
          const col = i % grid.columnsX;
          const row = Math.floor(i / grid.columnsX) % grid.rowsY;
          manager.placeBox({ col, row }, { col, row });
        }

        expect(manager.getAvailableCellCount()).toBeLessThanOrEqual(totalCells);
      }),
      { numRuns: 100 }
    );
  });

  it('available cell count = total cells - sum of all placed box areas', () => {
    fc.assert(
      fc.property(
        gridArb.chain((grid) =>
          fc.tuple(
            fc.constant(grid),
            fc.array(boxPlacementArb(grid), { minLength: 0, maxLength: 8 })
          )
        ),
        ([grid, placements]) => {
          const manager = new LayoutManager(grid);
          const totalCells = grid.columnsX * grid.rowsY;

          // Place boxes (some may fail due to overlap, that's fine)
          for (const placement of placements) {
            const start: CellCoordinate = { col: placement.startCol, row: placement.startRow };
            const end: CellCoordinate = { col: placement.endCol, row: placement.endRow };
            manager.placeBox(start, end);
          }

          // Calculate expected available count from placed boxes
          const boxes = manager.getBoxes();
          const occupiedCells = boxes.reduce(
            (sum, box) => sum + box.widthUnits * box.depthUnits,
            0
          );

          expect(manager.getAvailableCellCount()).toBe(totalCells - occupiedCells);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('available cell count is monotonically decreasing with each successful placement (no removal)', () => {
    fc.assert(
      fc.property(
        gridArb.chain((grid) =>
          fc.tuple(
            fc.constant(grid),
            fc.array(boxPlacementArb(grid), { minLength: 1, maxLength: 10 })
          )
        ),
        ([grid, placements]) => {
          const manager = new LayoutManager(grid);
          let previousCount = manager.getAvailableCellCount();

          for (const placement of placements) {
            const start: CellCoordinate = { col: placement.startCol, row: placement.startRow };
            const end: CellCoordinate = { col: placement.endCol, row: placement.endRow };
            const result = manager.placeBox(start, end);

            const currentCount = manager.getAvailableCellCount();

            if (result.success) {
              // After a successful placement, available count must strictly decrease
              expect(currentCount).toBeLessThan(previousCount);
            } else {
              // After a failed placement, available count must remain unchanged
              expect(currentCount).toBe(previousCount);
            }

            previousCount = currentCount;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty grid has available count equal to total cells', () => {
    fc.assert(
      fc.property(gridArb, (grid) => {
        const manager = new LayoutManager(grid);
        const totalCells = grid.columnsX * grid.rowsY;
        expect(manager.getAvailableCellCount()).toBe(totalCells);
      }),
      { numRuns: 100 }
    );
  });
});
