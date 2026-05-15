import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { LayoutManager } from './LayoutManager';
import type { GridDimensions } from './types';

/**
 * Feature: gridfinity-drawer-designer, Property 4: Overlap Detection Correctness
 *
 * For any two rectangular regions on a grid defined by their start and end cells,
 * `hasOverlap` SHALL return `true` if and only if the column ranges intersect AND
 * the row ranges intersect (i.e., the regions share at least one cell).
 *
 * **Validates: Requirements 3.4**
 */
describe('LayoutManager — Property 4: Overlap Detection Correctness', () => {
  // Use a reasonably sized grid for testing
  const gridArb = fc.record({
    columnsX: fc.integer({ min: 2, max: 20 }),
    rowsY: fc.integer({ min: 2, max: 20 }),
  });

  // Generate a valid rectangle within a grid
  const rectInGridArb = (grid: GridDimensions) => {
    return fc
      .record({
        col1: fc.integer({ min: 0, max: grid.columnsX - 1 }),
        row1: fc.integer({ min: 0, max: grid.rowsY - 1 }),
        col2: fc.integer({ min: 0, max: grid.columnsX - 1 }),
        row2: fc.integer({ min: 0, max: grid.rowsY - 1 }),
      })
      .map(({ col1, row1, col2, row2 }) => ({
        start: { col: Math.min(col1, col2), row: Math.min(row1, row2) },
        end: { col: Math.max(col1, col2), row: Math.max(row1, row2) },
      }));
  };

  // Generate two non-overlapping rectangles on a grid
  type RectPair = {
    grid: GridDimensions;
    rect1: { start: { col: number; row: number }; end: { col: number; row: number } };
    rect2: { start: { col: number; row: number }; end: { col: number; row: number } } | null;
  };

  const nonOverlappingRectsArb = gridArb.chain((grid) =>
    fc
      .record({
        rect1: rectInGridArb(grid),
        // Choose separation axis: 0 = separate on columns, 1 = separate on rows
        separationAxis: fc.integer({ min: 0, max: 1 }),
      })
      .chain(({ rect1, separationAxis }): fc.Arbitrary<RectPair> => {
        if (separationAxis === 0) {
          // Rect2 starts after rect1 ends on columns
          const minCol2 = rect1.end.col + 1;
          if (minCol2 > grid.columnsX - 1) {
            // Not enough space, place rect2 before rect1
            const maxCol2 = rect1.start.col - 1;
            if (maxCol2 < 0) {
              // Grid too small for non-overlapping on this axis, use row separation
              const minRow2 = rect1.end.row + 1;
              if (minRow2 > grid.rowsY - 1) {
                const maxRow2 = rect1.start.row - 1;
                if (maxRow2 < 0) {
                  return fc.constant({ grid, rect1, rect2: null });
                }
                return fc
                  .record({
                    col1: fc.integer({ min: 0, max: grid.columnsX - 1 }),
                    col2: fc.integer({ min: 0, max: grid.columnsX - 1 }),
                    row1: fc.integer({ min: 0, max: maxRow2 }),
                    row2: fc.integer({ min: 0, max: maxRow2 }),
                  })
                  .map(({ col1, col2, row1, row2 }) => ({
                    grid,
                    rect1,
                    rect2: {
                      start: { col: Math.min(col1, col2), row: Math.min(row1, row2) },
                      end: { col: Math.max(col1, col2), row: Math.max(row1, row2) },
                    },
                  }));
              }
              return fc
                .record({
                  col1: fc.integer({ min: 0, max: grid.columnsX - 1 }),
                  col2: fc.integer({ min: 0, max: grid.columnsX - 1 }),
                  row1: fc.integer({ min: minRow2, max: grid.rowsY - 1 }),
                  row2: fc.integer({ min: minRow2, max: grid.rowsY - 1 }),
                })
                .map(({ col1, col2, row1, row2 }) => ({
                  grid,
                  rect1,
                  rect2: {
                    start: { col: Math.min(col1, col2), row: Math.min(row1, row2) },
                    end: { col: Math.max(col1, col2), row: Math.max(row1, row2) },
                  },
                }));
            }
            return fc
              .record({
                col1: fc.integer({ min: 0, max: maxCol2 }),
                col2: fc.integer({ min: 0, max: maxCol2 }),
                row1: fc.integer({ min: 0, max: grid.rowsY - 1 }),
                row2: fc.integer({ min: 0, max: grid.rowsY - 1 }),
              })
              .map(({ col1, col2, row1, row2 }) => ({
                grid,
                rect1,
                rect2: {
                  start: { col: Math.min(col1, col2), row: Math.min(row1, row2) },
                  end: { col: Math.max(col1, col2), row: Math.max(row1, row2) },
                },
              }));
          }
          return fc
            .record({
              col1: fc.integer({ min: minCol2, max: grid.columnsX - 1 }),
              col2: fc.integer({ min: minCol2, max: grid.columnsX - 1 }),
              row1: fc.integer({ min: 0, max: grid.rowsY - 1 }),
              row2: fc.integer({ min: 0, max: grid.rowsY - 1 }),
            })
            .map(({ col1, col2, row1, row2 }) => ({
              grid,
              rect1,
              rect2: {
                start: { col: Math.min(col1, col2), row: Math.min(row1, row2) },
                end: { col: Math.max(col1, col2), row: Math.max(row1, row2) },
              },
            }));
        } else {
          // Rect2 starts after rect1 ends on rows
          const minRow2 = rect1.end.row + 1;
          if (minRow2 > grid.rowsY - 1) {
            const maxRow2 = rect1.start.row - 1;
            if (maxRow2 < 0) {
              return fc.constant({ grid, rect1, rect2: null });
            }
            return fc
              .record({
                col1: fc.integer({ min: 0, max: grid.columnsX - 1 }),
                col2: fc.integer({ min: 0, max: grid.columnsX - 1 }),
                row1: fc.integer({ min: 0, max: maxRow2 }),
                row2: fc.integer({ min: 0, max: maxRow2 }),
              })
              .map(({ col1, col2, row1, row2 }) => ({
                grid,
                rect1,
                rect2: {
                  start: { col: Math.min(col1, col2), row: Math.min(row1, row2) },
                  end: { col: Math.max(col1, col2), row: Math.max(row1, row2) },
                },
              }));
          }
          return fc
            .record({
              col1: fc.integer({ min: 0, max: grid.columnsX - 1 }),
              col2: fc.integer({ min: 0, max: grid.columnsX - 1 }),
              row1: fc.integer({ min: minRow2, max: grid.rowsY - 1 }),
              row2: fc.integer({ min: minRow2, max: grid.rowsY - 1 }),
            })
            .map(({ col1, col2, row1, row2 }) => ({
              grid,
              rect1,
              rect2: {
                start: { col: Math.min(col1, col2), row: Math.min(row1, row2) },
                end: { col: Math.max(col1, col2), row: Math.max(row1, row2) },
              },
            }));
        }
      })
  );

  // Generate two overlapping rectangles on a grid
  const overlappingRectsArb = gridArb.chain((grid) =>
    rectInGridArb(grid).chain((rect1) => {
      // Generate rect2 that shares at least one cell with rect1
      return fc
        .record({
          col1: fc.integer({ min: rect1.start.col, max: rect1.end.col }),
          row1: fc.integer({ min: rect1.start.row, max: rect1.end.row }),
          col2: fc.integer({ min: 0, max: grid.columnsX - 1 }),
          row2: fc.integer({ min: 0, max: grid.rowsY - 1 }),
        })
        .map(({ col1, row1, col2, row2 }) => ({
          grid,
          rect1,
          rect2: {
            start: { col: Math.min(col1, col2), row: Math.min(row1, row2) },
            end: { col: Math.max(col1, col2), row: Math.max(row1, row2) },
          },
        }));
    })
  );

  it('non-overlapping rectangles: hasOverlap returns false and both can be placed', () => {
    fc.assert(
      fc.property(nonOverlappingRectsArb, ({ grid, rect1, rect2 }) => {
        // Skip cases where we couldn't generate a valid second rectangle
        if (rect2 === null) return;

        const manager = new LayoutManager(grid);

        // Place the first rectangle
        const result1 = manager.placeBox(rect1.start, rect1.end);
        expect(result1.success).toBe(true);

        // hasOverlap should return false for the non-overlapping region
        expect(manager.hasOverlap(rect2.start, rect2.end)).toBe(false);

        // Second placement should succeed
        const result2 = manager.placeBox(rect2.start, rect2.end);
        expect(result2.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('overlapping rectangles: hasOverlap returns true and second placement fails', () => {
    fc.assert(
      fc.property(overlappingRectsArb, ({ grid, rect1, rect2 }) => {
        const manager = new LayoutManager(grid);

        // Place the first rectangle
        const result1 = manager.placeBox(rect1.start, rect1.end);
        expect(result1.success).toBe(true);

        // hasOverlap should return true for the overlapping region
        expect(manager.hasOverlap(rect2.start, rect2.end)).toBe(true);

        // Second placement should fail
        const result2 = manager.placeBox(rect2.start, rect2.end);
        expect(result2.success).toBe(false);
        expect(result2.error).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  it('overlap detection is symmetric: hasOverlap(A, B) implies hasOverlap(B, A)', () => {
    fc.assert(
      fc.property(
        gridArb.chain((grid) =>
          fc.record({
            grid: fc.constant(grid),
            rectA: rectInGridArb(grid),
            rectB: rectInGridArb(grid),
          })
        ),
        ({ grid, rectA, rectB }) => {
          // Check overlap mathematically (column ranges intersect AND row ranges intersect)
          const colOverlap =
            rectA.start.col <= rectB.end.col && rectA.end.col >= rectB.start.col;
          const rowOverlap =
            rectA.start.row <= rectB.end.row && rectA.end.row >= rectB.start.row;
          const expectedOverlap = colOverlap && rowOverlap;

          // Test A placed first, check B
          const managerAB = new LayoutManager(grid);
          managerAB.placeBox(rectA.start, rectA.end);
          const overlapAB = managerAB.hasOverlap(rectB.start, rectB.end);

          // Test B placed first, check A
          const managerBA = new LayoutManager(grid);
          managerBA.placeBox(rectB.start, rectB.end);
          const overlapBA = managerBA.hasOverlap(rectA.start, rectA.end);

          // Both should agree with the mathematical expectation
          expect(overlapAB).toBe(expectedOverlap);
          expect(overlapBA).toBe(expectedOverlap);

          // Symmetry: if one detects overlap, the other must too
          expect(overlapAB).toBe(overlapBA);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('adjacent rectangles sharing an edge but no cells do NOT overlap', () => {
    fc.assert(
      fc.property(
        gridArb
          .filter((g) => g.columnsX >= 2 || g.rowsY >= 2)
          .chain((grid) =>
            fc
              .record({
                // Choose adjacency type: 0 = horizontal, 1 = vertical
                adjacencyType: fc.integer({ min: 0, max: 1 }),
              })
              .chain(({ adjacencyType }) => {
                if (adjacencyType === 0 && grid.columnsX >= 2) {
                  // Horizontal adjacency: rect1 ends at some column, rect2 starts at next column
                  const splitCol = fc.integer({ min: 0, max: grid.columnsX - 2 });
                  return splitCol.chain((split) =>
                    fc
                      .record({
                        row1A: fc.integer({ min: 0, max: grid.rowsY - 1 }),
                        row1B: fc.integer({ min: 0, max: grid.rowsY - 1 }),
                        col1Start: fc.integer({ min: 0, max: split }),
                        row2A: fc.integer({ min: 0, max: grid.rowsY - 1 }),
                        row2B: fc.integer({ min: 0, max: grid.rowsY - 1 }),
                        col2End: fc.integer({ min: split + 1, max: grid.columnsX - 1 }),
                      })
                      .map(({ row1A, row1B, col1Start, row2A, row2B, col2End }) => ({
                        grid,
                        rect1: {
                          start: { col: col1Start, row: Math.min(row1A, row1B) },
                          end: { col: split, row: Math.max(row1A, row1B) },
                        },
                        rect2: {
                          start: { col: split + 1, row: Math.min(row2A, row2B) },
                          end: { col: col2End, row: Math.max(row2A, row2B) },
                        },
                      }))
                  );
                } else {
                  // Vertical adjacency: rect1 ends at some row, rect2 starts at next row
                  if (grid.rowsY < 2) {
                    // Fallback to horizontal if grid is too small vertically
                    const splitCol = fc.integer({ min: 0, max: grid.columnsX - 2 });
                    return splitCol.chain((split) =>
                      fc
                        .record({
                          row1A: fc.integer({ min: 0, max: grid.rowsY - 1 }),
                          row1B: fc.integer({ min: 0, max: grid.rowsY - 1 }),
                          col1Start: fc.integer({ min: 0, max: split }),
                          row2A: fc.integer({ min: 0, max: grid.rowsY - 1 }),
                          row2B: fc.integer({ min: 0, max: grid.rowsY - 1 }),
                          col2End: fc.integer({ min: split + 1, max: grid.columnsX - 1 }),
                        })
                        .map(({ row1A, row1B, col1Start, row2A, row2B, col2End }) => ({
                          grid,
                          rect1: {
                            start: { col: col1Start, row: Math.min(row1A, row1B) },
                            end: { col: split, row: Math.max(row1A, row1B) },
                          },
                          rect2: {
                            start: { col: split + 1, row: Math.min(row2A, row2B) },
                            end: { col: col2End, row: Math.max(row2A, row2B) },
                          },
                        }))
                    );
                  }
                  const splitRow = fc.integer({ min: 0, max: grid.rowsY - 2 });
                  return splitRow.chain((split) =>
                    fc
                      .record({
                        col1A: fc.integer({ min: 0, max: grid.columnsX - 1 }),
                        col1B: fc.integer({ min: 0, max: grid.columnsX - 1 }),
                        row1Start: fc.integer({ min: 0, max: split }),
                        col2A: fc.integer({ min: 0, max: grid.columnsX - 1 }),
                        col2B: fc.integer({ min: 0, max: grid.columnsX - 1 }),
                        row2End: fc.integer({ min: split + 1, max: grid.rowsY - 1 }),
                      })
                      .map(({ col1A, col1B, row1Start, col2A, col2B, row2End }) => ({
                        grid,
                        rect1: {
                          start: { col: Math.min(col1A, col1B), row: row1Start },
                          end: { col: Math.max(col1A, col1B), row: split },
                        },
                        rect2: {
                          start: { col: Math.min(col2A, col2B), row: split + 1 },
                          end: { col: Math.max(col2A, col2B), row: row2End },
                        },
                      }))
                  );
                }
              })
          ),
        ({ grid, rect1, rect2 }) => {
          const manager = new LayoutManager(grid);

          // Place the first rectangle
          const result1 = manager.placeBox(rect1.start, rect1.end);
          expect(result1.success).toBe(true);

          // Adjacent rectangles should NOT overlap
          expect(manager.hasOverlap(rect2.start, rect2.end)).toBe(false);

          // Second placement should succeed
          const result2 = manager.placeBox(rect2.start, rect2.end);
          expect(result2.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
