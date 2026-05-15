import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateSpecFile } from './SpecFileGenerator';
import { HeightManager } from './HeightManager';
import { GRID_UNIT_MM } from './constants';
import type { Box, GridDimensions } from './types';

/**
 * Feature: gridfinity-drawer-designer, Property 11: Spec File Completeness
 *
 * For any valid layout with a grid, at least one Box, and optional MakerWorld models,
 * the generated Spec_File SHALL contain:
 * - Baseplate section with gridWidth, gridDepth (in Grid_Units) and
 *   totalWidthMm = gridWidth × 42, totalDepthMm = gridDepth × 42
 * - For each Box: itemNumber, gridPosition, sizeUnits (width × depth), and heightUnits
 * - For each MakerWorld model Box: the model name and platform identifier
 *   in addition to standard Box fields
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 5.6**
 */
describe('SpecFileGenerator — Property 11: Spec File Completeness', () => {
  // Generator for valid grid dimensions (at least 1x1, up to 47x47 which is floor(2000/42))
  const gridArb: fc.Arbitrary<GridDimensions> = fc.record({
    columnsX: fc.integer({ min: 1, max: 47 }),
    rowsY: fc.integer({ min: 1, max: 47 }),
  });

  // Generator for a drawer height that gives at least 1 height unit
  const drawerHeightArb = fc.integer({ min: 7, max: 2000 });

  // Generator for a standard box within a given grid
  const standardBoxArb = (grid: GridDimensions): fc.Arbitrary<Box> =>
    fc.record({
      id: fc.uuid(),
      itemNumber: fc.integer({ min: 1, max: 50 }),
      startCell: fc.record({
        col: fc.integer({ min: 0, max: grid.columnsX - 1 }),
        row: fc.integer({ min: 0, max: grid.rowsY - 1 }),
      }),
      endCell: fc.record({
        col: fc.integer({ min: 0, max: grid.columnsX - 1 }),
        row: fc.integer({ min: 0, max: grid.rowsY - 1 }),
      }),
      widthUnits: fc.integer({ min: 1, max: grid.columnsX }),
      depthUnits: fc.integer({ min: 1, max: grid.rowsY }),
      heightUnits: fc.integer({ min: 1, max: 285 }),
      isMakerWorldModel: fc.constant(false),
      makerWorldName: fc.constant(undefined),
      makerWorldId: fc.constant(undefined),
      color: fc.constant(undefined),
    });

  // Generator for a MakerWorld box within a given grid
  const makerWorldBoxArb = (grid: GridDimensions): fc.Arbitrary<Box> =>
    fc.record({
      id: fc.uuid(),
      itemNumber: fc.integer({ min: 1, max: 50 }),
      startCell: fc.record({
        col: fc.integer({ min: 0, max: grid.columnsX - 1 }),
        row: fc.integer({ min: 0, max: grid.rowsY - 1 }),
      }),
      endCell: fc.record({
        col: fc.integer({ min: 0, max: grid.columnsX - 1 }),
        row: fc.integer({ min: 0, max: grid.rowsY - 1 }),
      }),
      widthUnits: fc.integer({ min: 1, max: grid.columnsX }),
      depthUnits: fc.integer({ min: 1, max: grid.rowsY }),
      heightUnits: fc.integer({ min: 1, max: 285 }),
      isMakerWorldModel: fc.constant(true),
      makerWorldName: fc.string({ minLength: 1, maxLength: 60 }),
      makerWorldId: fc.string({ minLength: 1, maxLength: 30 }),
      color: fc.constant(undefined),
    });

  // Generator for a mixed list of boxes (standard and MakerWorld)
  const mixedBoxesArb = (grid: GridDimensions): fc.Arbitrary<Box[]> =>
    fc.array(
      fc.oneof(standardBoxArb(grid), makerWorldBoxArb(grid)),
      { minLength: 1, maxLength: 10 }
    );

  it('baseplate totalWidthMm equals gridWidth * 42 and totalDepthMm equals gridDepth * 42', () => {
    fc.assert(
      fc.property(
        gridArb,
        drawerHeightArb,
        (grid, drawerHeight) => {
          const hm = new HeightManager(drawerHeight);
          const result = generateSpecFile(grid, [], hm);

          expect(result.baseplate.gridWidth).toBe(grid.columnsX);
          expect(result.baseplate.gridDepth).toBe(grid.rowsY);
          expect(result.baseplate.totalWidthMm).toBe(grid.columnsX * GRID_UNIT_MM);
          expect(result.baseplate.totalDepthMm).toBe(grid.rowsY * GRID_UNIT_MM);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('number of box entries in SpecFile equals the number of input boxes', () => {
    fc.assert(
      fc.property(
        gridArb.chain((grid) =>
          fc.tuple(fc.constant(grid), mixedBoxesArb(grid))
        ),
        drawerHeightArb,
        ([grid, boxes], drawerHeight) => {
          const hm = new HeightManager(drawerHeight);
          const result = generateSpecFile(grid, boxes, hm);

          expect(result.boxes.length).toBe(boxes.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('each box entry has a valid itemNumber, gridPosition, sizeUnits, and heightUnits', () => {
    fc.assert(
      fc.property(
        gridArb.chain((grid) =>
          fc.tuple(fc.constant(grid), mixedBoxesArb(grid))
        ),
        drawerHeightArb,
        ([grid, boxes], drawerHeight) => {
          const hm = new HeightManager(drawerHeight);
          hm.setVariableMode(true);
          const result = generateSpecFile(grid, boxes, hm);

          for (let i = 0; i < result.boxes.length; i++) {
            const entry = result.boxes[i];
            const inputBox = boxes[i];

            // itemNumber matches input
            expect(entry.itemNumber).toBe(inputBox.itemNumber);

            // gridPosition matches startCell
            expect(entry.gridPosition).toEqual({
              col: inputBox.startCell.col,
              row: inputBox.startCell.row,
            });

            // sizeUnits matches widthUnits and depthUnits
            expect(entry.sizeUnits).toEqual({
              width: inputBox.widthUnits,
              depth: inputBox.depthUnits,
            });

            // heightUnits is a positive integer
            expect(entry.heightUnits).toBeGreaterThanOrEqual(1);
            expect(Number.isInteger(entry.heightUnits)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('MakerWorld boxes have makerWorldModel populated; standard boxes do not', () => {
    fc.assert(
      fc.property(
        gridArb.chain((grid) =>
          fc.tuple(fc.constant(grid), mixedBoxesArb(grid))
        ),
        drawerHeightArb,
        ([grid, boxes], drawerHeight) => {
          const hm = new HeightManager(drawerHeight);
          const result = generateSpecFile(grid, boxes, hm);

          for (let i = 0; i < result.boxes.length; i++) {
            const entry = result.boxes[i];
            const inputBox = boxes[i];

            if (inputBox.isMakerWorldModel && inputBox.makerWorldName && inputBox.makerWorldId) {
              // MakerWorld boxes should have makerWorldModel populated
              expect(entry.makerWorldModel).toBeDefined();
              expect(entry.makerWorldModel!.name).toBe(inputBox.makerWorldName);
              expect(entry.makerWorldModel!.platformId).toBe(inputBox.makerWorldId);
            } else {
              // Standard boxes should not have makerWorldModel
              expect(entry.makerWorldModel).toBeUndefined();
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('heightUnits in the spec matches HeightManager getEffectiveHeight for each box', () => {
    fc.assert(
      fc.property(
        gridArb.chain((grid) =>
          fc.tuple(fc.constant(grid), mixedBoxesArb(grid))
        ),
        drawerHeightArb,
        fc.boolean(),
        ([grid, boxes], drawerHeight, variableMode) => {
          const hm = new HeightManager(drawerHeight);
          hm.setVariableMode(variableMode);
          const result = generateSpecFile(grid, boxes, hm);

          for (let i = 0; i < result.boxes.length; i++) {
            const entry = result.boxes[i];
            const inputBox = boxes[i];
            const expectedHeight = hm.getEffectiveHeight(inputBox);

            expect(entry.heightUnits).toBe(expectedHeight);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
