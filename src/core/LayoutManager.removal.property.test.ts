import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { LayoutManager } from './LayoutManager';
import type { CellCoordinate, GridDimensions } from './types';

/**
 * Feature: gridfinity-drawer-designer, Property 5: Box Removal Restores Availability
 *
 * For any layout containing at least one Box, removing that Box SHALL decrease
 * the box count by exactly 1 and make all cells previously occupied by that Box
 * available for new placement (i.e., hasOverlap returns false for a region
 * covering exactly those cells).
 *
 * **Validates: Requirements 3.6**
 */
describe('LayoutManager — Property 5: Box Removal Restores Availability', () => {
  // Generator for a grid with reasonable dimensions (2–10 columns/rows)
  const gridArb = fc.record({
    columnsX: fc.integer({ min: 2, max: 10 }),
    rowsY: fc.integer({ min: 2, max: 10 }),
  });

  // Generator for a valid non-overlapping box placement within a grid
  const boxPlacementArb = (grid: GridDimensions) =>
    fc.record({
      startCol: fc.integer({ min: 0, max: grid.columnsX - 1 }),
      startRow: fc.integer({ min: 0, max: grid.rowsY - 1 }),
      endCol: fc.integer({ min: 0, max: grid.columnsX - 1 }),
      endRow: fc.integer({ min: 0, max: grid.rowsY - 1 }),
    });

  it('removing a box increases available cell count by exactly the removed box area', () => {
    fc.assert(
      fc.property(gridArb, (grid) => {
        const manager = new LayoutManager(grid);

        // Place a box covering the top-left quadrant
        const start: CellCoordinate = { col: 0, row: 0 };
        const end: CellCoordinate = {
          col: Math.min(1, grid.columnsX - 1),
          row: Math.min(1, grid.rowsY - 1),
        };

        const result = manager.placeBox(start, end);
        if (!result.success || !result.box) return; // skip if placement fails

        const box = result.box;
        const boxArea = box.widthUnits * box.depthUnits;
        const availableBefore = manager.getAvailableCellCount();

        manager.removeBox(box.id);

        const availableAfter = manager.getAvailableCellCount();
        expect(availableAfter - availableBefore).toBe(boxArea);
      }),
      { numRuns: 100 }
    );
  });

  it('removing a box from a sequence of placements increases available count by exactly that box area', () => {
    fc.assert(
      fc.property(
        gridArb.chain((grid) =>
          fc.record({
            grid: fc.constant(grid),
            placements: fc.array(boxPlacementArb(grid), { minLength: 1, maxLength: 5 }),
            removeIndex: fc.nat(),
          })
        ),
        ({ grid, placements, removeIndex }) => {
          const manager = new LayoutManager(grid);

          // Place boxes, collecting successful ones
          const placedBoxes: { id: string; area: number }[] = [];
          for (const p of placements) {
            const start: CellCoordinate = { col: p.startCol, row: p.startRow };
            const end: CellCoordinate = { col: p.endCol, row: p.endRow };
            const result = manager.placeBox(start, end);
            if (result.success && result.box) {
              placedBoxes.push({
                id: result.box.id,
                area: result.box.widthUnits * result.box.depthUnits,
              });
            }
          }

          // Need at least one placed box to test removal
          if (placedBoxes.length === 0) return;

          // Pick a box to remove
          const targetIndex = removeIndex % placedBoxes.length;
          const target = placedBoxes[targetIndex];

          const availableBefore = manager.getAvailableCellCount();
          manager.removeBox(target.id);
          const availableAfter = manager.getAvailableCellCount();

          expect(availableAfter - availableBefore).toBe(target.area);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('after removing a box, a new box can be placed in the same region', () => {
    fc.assert(
      fc.property(
        gridArb.chain((grid) =>
          fc.record({
            grid: fc.constant(grid),
            placement: boxPlacementArb(grid),
          })
        ),
        ({ grid, placement }) => {
          const manager = new LayoutManager(grid);

          const start: CellCoordinate = { col: placement.startCol, row: placement.startRow };
          const end: CellCoordinate = { col: placement.endCol, row: placement.endRow };

          // Place a box
          const result = manager.placeBox(start, end);
          if (!result.success || !result.box) return;

          const box = result.box;

          // Remove the box
          manager.removeBox(box.id);

          // Verify the region is no longer overlapping
          expect(manager.hasOverlap(start, end)).toBe(false);

          // Place a new box in the same region — should succeed
          const replaceResult = manager.placeBox(start, end);
          expect(replaceResult.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('removing all boxes restores available cell count to total grid size', () => {
    fc.assert(
      fc.property(
        gridArb.chain((grid) =>
          fc.record({
            grid: fc.constant(grid),
            placements: fc.array(boxPlacementArb(grid), { minLength: 1, maxLength: 8 }),
          })
        ),
        ({ grid, placements }) => {
          const manager = new LayoutManager(grid);
          const totalCells = grid.columnsX * grid.rowsY;

          // Place boxes, collecting successful ones
          const placedBoxIds: string[] = [];
          for (const p of placements) {
            const start: CellCoordinate = { col: p.startCol, row: p.startRow };
            const end: CellCoordinate = { col: p.endCol, row: p.endRow };
            const result = manager.placeBox(start, end);
            if (result.success && result.box) {
              placedBoxIds.push(result.box.id);
            }
          }

          // Need at least one placed box
          if (placedBoxIds.length === 0) return;

          // Remove all boxes one by one
          for (const id of placedBoxIds) {
            manager.removeBox(id);
          }

          // Available count should equal total grid size
          expect(manager.getAvailableCellCount()).toBe(totalCells);
          expect(manager.getBoxCount()).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
