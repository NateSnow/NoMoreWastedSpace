/**
 * Spec File Generator for the Gridfinity Drawer Designer.
 *
 * Generates the output specification file containing baseplate dimensions
 * and all box specifications for submission to the Operator.
 */

import type { Box, GridDimensions, SpecBoxEntry, SpecFile } from './types';
import { GRID_BASE_MM } from './constants';
import { HeightManager } from './HeightManager';

/**
 * Generates a SpecFile from the current layout state.
 *
 * The SpecFile contains:
 * - Baseplate section with grid dimensions and total mm dimensions
 * - Box entries with item number, position, size, height, and optional MakerWorld reference
 *
 * @param grid - The computed grid dimensions (columnsX, rowsY)
 * @param boxes - All placed boxes in the layout
 * @param heightManager - HeightManager instance for resolving effective heights
 * @returns A complete SpecFile ready for submission
 */
export function generateSpecFile(
  grid: GridDimensions,
  boxes: Box[],
  heightManager: HeightManager
): SpecFile {
  const baseplate = {
    gridWidth: grid.columnsX,
    gridDepth: grid.rowsY,
    totalWidthMm: grid.columnsX * GRID_BASE_MM,
    totalDepthMm: grid.rowsY * GRID_BASE_MM,
  };

  const specBoxes: SpecBoxEntry[] = boxes.map((box) => {
    const entry: SpecBoxEntry = {
      itemNumber: box.itemNumber,
      gridPosition: { col: box.startCell.col, row: box.startCell.row },
      sizeUnits: { width: box.widthUnits, depth: box.depthUnits },
      heightUnits: heightManager.getEffectiveHeight(box),
    };

    if (box.isMakerWorldModel && box.makerWorldName && box.makerWorldId) {
      entry.makerWorldModel = {
        name: box.makerWorldName,
        platformId: box.makerWorldId,
      };
    }

    return entry;
  });

  return {
    baseplate,
    boxes: specBoxes,
  };
}
