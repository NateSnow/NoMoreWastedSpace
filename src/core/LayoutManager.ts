/**
 * Layout Manager for the Gridfinity Drawer Designer.
 *
 * Manages all placed boxes on the grid, validates placement operations,
 * handles overlap detection, color assignment, and box removal.
 */

import type { Box, CellCoordinate, GridDimensions, MakerWorldModel } from './types';
import { BOX_COLORS, MAX_BOXES_PER_LAYOUT } from './constants';

/** Result of a box placement operation. */
export interface PlacementResult {
  success: boolean;
  box?: Box;
  error?: string;
}

/**
 * Manages the layout of boxes on a Gridfinity grid.
 *
 * Handles placement, removal, overlap detection, color assignment,
 * and availability tracking for all boxes in a single layout.
 */
export class LayoutManager {
  private grid: GridDimensions;
  private boxes: Box[] = [];
  private nextItemNumber = 1;
  private nextId = 0;
  private colorIndex = 0;

  constructor(grid: GridDimensions) {
    this.grid = grid;
  }

  /**
   * Places a standard box on the grid.
   *
   * Normalizes start/end so startCell is top-left and endCell is bottom-right.
   * Validates overlap and box limit before placement.
   *
   * @param start - First corner cell selected by the user
   * @param end - Second corner cell selected by the user
   * @returns Placement result with the created box or an error
   */
  placeBox(start: CellCoordinate, end: CellCoordinate): PlacementResult {
    if (!this.canPlaceMore()) {
      return {
        success: false,
        error: `Maximum of ${MAX_BOXES_PER_LAYOUT} boxes reached`,
      };
    }

    // Normalize coordinates so startCell is top-left, endCell is bottom-right
    const normalized = this.normalizeCoordinates(start, end);

    if (this.hasOverlap(normalized.start, normalized.end)) {
      return {
        success: false,
        error: 'Grid units already occupied by another box',
      };
    }

    const widthUnits = normalized.end.col - normalized.start.col + 1;
    const depthUnits = normalized.end.row - normalized.start.row + 1;

    const box: Box = {
      id: this.generateId(),
      itemNumber: this.nextItemNumber++,
      startCell: normalized.start,
      endCell: normalized.end,
      widthUnits,
      depthUnits,
      heightUnits: 1,
      isMakerWorldModel: false,
      color: this.assignColor(),
    };

    this.boxes.push(box);

    return { success: true, box };
  }

  /**
   * Places a MakerWorld model on the grid.
   *
   * Same as placeBox but includes MakerWorld metadata on the created box.
   *
   * @param start - First corner cell selected by the user
   * @param end - Second corner cell selected by the user
   * @param model - MakerWorld model metadata
   * @returns Placement result with the created box or an error
   */
  placeMakerWorldModel(
    start: CellCoordinate,
    end: CellCoordinate,
    model: MakerWorldModel
  ): PlacementResult {
    if (!this.canPlaceMore()) {
      return {
        success: false,
        error: `Maximum of ${MAX_BOXES_PER_LAYOUT} boxes reached`,
      };
    }

    const normalized = this.normalizeCoordinates(start, end);

    if (this.hasOverlap(normalized.start, normalized.end)) {
      return {
        success: false,
        error: 'Grid units already occupied by another box',
      };
    }

    const widthUnits = normalized.end.col - normalized.start.col + 1;
    const depthUnits = normalized.end.row - normalized.start.row + 1;

    const box: Box = {
      id: this.generateId(),
      itemNumber: this.nextItemNumber++,
      startCell: normalized.start,
      endCell: normalized.end,
      widthUnits,
      depthUnits,
      heightUnits: 1,
      isMakerWorldModel: true,
      makerWorldName: model.name,
      makerWorldId: model.id,
      color: this.assignColor(),
    };

    this.boxes.push(box);

    return { success: true, box };
  }

  /**
   * Removes a box by its unique ID.
   *
   * Frees the cells previously occupied by the box.
   *
   * @param boxId - The unique identifier of the box to remove
   */
  removeBox(boxId: string): void {
    this.boxes = this.boxes.filter((box) => box.id !== boxId);
  }

  /**
   * Checks whether a rectangular region overlaps any existing boxes.
   *
   * Two rectangles overlap if their column ranges intersect AND their row ranges intersect.
   *
   * @param start - Top-left corner of the region to check
   * @param end - Bottom-right corner of the region to check
   * @param excludeBoxId - Optional box ID to exclude from overlap check (for move operations)
   * @returns True if the region overlaps with any existing box
   */
  hasOverlap(start: CellCoordinate, end: CellCoordinate, excludeBoxId?: string): boolean {
    const normalized = this.normalizeCoordinates(start, end);
    const minCol = normalized.start.col;
    const maxCol = normalized.end.col;
    const minRow = normalized.start.row;
    const maxRow = normalized.end.row;

    return this.boxes.some((box) => {
      if (excludeBoxId && box.id === excludeBoxId) {
        return false;
      }

      // Two rectangles overlap if their projections overlap on both axes
      const colOverlap = minCol <= box.endCell.col && maxCol >= box.startCell.col;
      const rowOverlap = minRow <= box.endCell.row && maxRow >= box.startCell.row;

      return colOverlap && rowOverlap;
    });
  }

  /**
   * Checks if a selection defined by two corners forms a valid rectangle.
   *
   * For two-corner selection, this is always true since any two points
   * define a unique rectangle.
   *
   * @param _start - First corner cell
   * @param _end - Second corner cell
   * @returns Always true for two-corner selection
   */
  isRectangular(_start: CellCoordinate, _end: CellCoordinate): boolean {
    return true;
  }

  /**
   * Returns the number of unoccupied cells on the grid.
   *
   * Calculated as total grid cells minus the sum of all placed box areas.
   *
   * @returns Number of available (unoccupied) cells
   */
  getAvailableCellCount(): number {
    const totalCells = this.grid.columnsX * this.grid.rowsY;
    const occupiedCells = this.boxes.reduce(
      (sum, box) => sum + box.widthUnits * box.depthUnits,
      0
    );
    return totalCells - occupiedCells;
  }

  /**
   * Checks whether more boxes can be placed (under the 50-box limit).
   *
   * @returns True if fewer than MAX_BOXES_PER_LAYOUT boxes are placed
   */
  canPlaceMore(): boolean {
    return this.boxes.length < MAX_BOXES_PER_LAYOUT;
  }

  /**
   * Removes all boxes from the layout, resetting to empty state.
   */
  clearAll(): void {
    this.boxes = [];
    this.nextItemNumber = 1;
    this.colorIndex = 0;
  }

  /**
   * Returns all currently placed boxes.
   *
   * @returns Array of all placed boxes
   */
  getBoxes(): Box[] {
    return [...this.boxes];
  }

  /**
   * Returns the current number of placed boxes.
   *
   * @returns Box count
   */
  getBoxCount(): number {
    return this.boxes.length;
  }

  /**
   * Normalizes two corner coordinates so that start is top-left and end is bottom-right.
   */
  private normalizeCoordinates(
    start: CellCoordinate,
    end: CellCoordinate
  ): { start: CellCoordinate; end: CellCoordinate } {
    return {
      start: {
        col: Math.min(start.col, end.col),
        row: Math.min(start.row, end.row),
      },
      end: {
        col: Math.max(start.col, end.col),
        row: Math.max(start.row, end.row),
      },
    };
  }

  /**
   * Generates a unique ID for a new box.
   */
  private generateId(): string {
    return `box-${++this.nextId}`;
  }

  /**
   * Assigns the next color from the BOX_COLORS palette, cycling through.
   */
  private assignColor(): string {
    const color = BOX_COLORS[this.colorIndex % BOX_COLORS.length];
    this.colorIndex++;
    return color;
  }
}
