/**
 * Grid Renderer for the Gridfinity Drawer Designer.
 *
 * Renders the visual grid on an HTML5 Canvas element with color-coded boxes,
 * item number labels, grid lines, and available cell count display.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.5
 */

import type { Box, CellCoordinate, GridDimensions } from '../core/types';

/** Selection mode types for placement interaction. */
export type SelectionMode = 'standard' | 'makerworld';

/** State passed to the renderer for each frame. */
export interface RenderState {
  /** Grid dimensions (columns and rows). */
  grid: GridDimensions;
  /** All currently placed boxes. */
  boxes: Box[];
  /** Number of available (unoccupied) cells. */
  availableCellCount: number;
  /** Current selection mode (null if not in placement mode). */
  selectionMode: SelectionMode | null;
  /** Active selection rectangle during placement (null if no selection in progress). */
  activeSelection: { start: CellCoordinate; current: CellCoordinate } | null;
}

/** Color palette configuration for the renderer. */
export interface ColorPalette {
  /** Background color for unoccupied cells. */
  unoccupied: string;
  /** Array of at least 8 distinct colors for box fills. */
  boxColors: string[];
}

/** Padding around the grid area in pixels. */
const GRID_PADDING = 40;

/** Font size for item number labels in pixels. */
const LABEL_FONT_SIZE = 14;

/** Font size for the available cell count display. */
const INFO_FONT_SIZE = 14;

/** Minimum cell size in pixels. */
const MIN_CELL_SIZE = 20;

/** Border color for grid lines. */
const DEFAULT_GRID_BORDER_COLOR = '#9E9E9E';

/** Selection highlight color (semi-transparent). */
const SELECTION_HIGHLIGHT_COLOR = 'rgba(33, 150, 243, 0.3)';

/** Selection border color. */
const SELECTION_BORDER_COLOR = 'rgba(33, 150, 243, 0.8)';

/**
 * Renders the Gridfinity grid layout on an HTML5 Canvas.
 *
 * Draws grid lines, fills unoccupied cells with a uniform color,
 * fills occupied cells with per-box colors, and labels boxes with item numbers.
 * Also displays the available cell count outside the grid area.
 */
export class GridRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private palette: ColorPalette;
  private cellSize: number = MIN_CELL_SIZE;
  private gridOriginX: number = GRID_PADDING;
  private gridOriginY: number = GRID_PADDING;
  private lastGridColumns: number = 0;
  private lastGridRows: number = 0;

  /**
   * Creates a new GridRenderer.
   *
   * @param canvas - The HTML5 Canvas element to render on
   * @param palette - Color palette with at least 8 distinct box colors
   */
  constructor(canvas: HTMLCanvasElement, palette: ColorPalette) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to get 2D rendering context from canvas');
    }
    this.ctx = ctx;
    this.palette = palette;
  }

  /**
   * Renders the complete grid state onto the canvas.
   *
   * Clears the canvas, draws unoccupied cells, draws occupied cells with
   * per-box colors, draws grid lines, labels boxes with item numbers,
   * highlights active selection, and displays available cell count.
   *
   * Updates are synchronous and complete within 1 frame (well under 1 second).
   *
   * @param state - The current render state including grid, boxes, and selection
   */
  render(state: RenderState): void {
    const { grid, boxes, availableCellCount, activeSelection } = state;

    this.calculateLayout(grid);
    this.clearCanvas();
    this.drawUnoccupiedCells(grid);
    this.drawOccupiedCells(boxes);
    this.drawGridLines(grid);
    this.drawBoxLabels(boxes);

    if (activeSelection) {
      this.drawSelectionHighlight(activeSelection.start, activeSelection.current, grid);
    }

    this.drawAvailableCellCount(availableCellCount, grid);
  }

  /**
   * Converts pixel coordinates to cell coordinates.
   *
   * Accounts for canvas padding/offset and cell size to determine
   * which grid cell a given pixel position falls within.
   *
   * @param x - X pixel coordinate relative to the canvas
   * @param y - Y pixel coordinate relative to the canvas
   * @returns The cell coordinate at the given point, or null if outside the grid
   */
  getCellAtPoint(x: number, y: number): CellCoordinate | null {
    const cellX = x - this.gridOriginX;
    const cellY = y - this.gridOriginY;

    if (cellX < 0 || cellY < 0) {
      return null;
    }

    const col = Math.floor(cellX / this.cellSize);
    const row = Math.floor(cellY / this.cellSize);

    // Check bounds against the last rendered grid dimensions
    if (col < 0 || row < 0 || col >= this.lastGridColumns || row >= this.lastGridRows) {
      return null;
    }

    return { col, row };
  }

  /**
   * Returns the current cell size in pixels.
   * Useful for external components that need to know the rendering scale.
   */
  getCellSize(): number {
    return this.cellSize;
  }

  /**
   * Returns the grid origin coordinates in pixels.
   * Useful for external components that need to align with the grid.
   */
  getGridOrigin(): { x: number; y: number } {
    return { x: this.gridOriginX, y: this.gridOriginY };
  }

  /**
   * Calculates the cell size and grid origin based on canvas dimensions and grid size.
   */
  private calculateLayout(grid: GridDimensions): void {
    this.lastGridColumns = grid.columnsX;
    this.lastGridRows = grid.rowsY;

    const availableWidth = this.canvas.width - GRID_PADDING * 2;
    const availableHeight = this.canvas.height - GRID_PADDING * 2;

    const cellWidth = Math.floor(availableWidth / grid.columnsX);
    const cellHeight = Math.floor(availableHeight / grid.rowsY);

    this.cellSize = Math.max(MIN_CELL_SIZE, Math.min(cellWidth, cellHeight));

    // Center the grid within the canvas
    const gridWidth = this.cellSize * grid.columnsX;
    const gridHeight = this.cellSize * grid.rowsY;
    this.gridOriginX = Math.floor((this.canvas.width - gridWidth) / 2);
    this.gridOriginY = Math.floor((this.canvas.height - gridHeight) / 2);
  }

  /**
   * Clears the entire canvas.
   */
  private clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draws all unoccupied cells with the uniform background color.
   */
  private drawUnoccupiedCells(grid: GridDimensions): void {
    this.ctx.fillStyle = this.palette.unoccupied;

    for (let row = 0; row < grid.rowsY; row++) {
      for (let col = 0; col < grid.columnsX; col++) {
        const x = this.gridOriginX + col * this.cellSize;
        const y = this.gridOriginY + row * this.cellSize;
        this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
      }
    }
  }

  /**
   * Draws all occupied cells with their respective box colors.
   */
  private drawOccupiedCells(boxes: Box[]): void {
    for (const box of boxes) {
      const color = box.color || this.getBoxColor(box.itemNumber);
      this.ctx.fillStyle = color;

      for (let row = box.startCell.row; row <= box.endCell.row; row++) {
        for (let col = box.startCell.col; col <= box.endCell.col; col++) {
          const x = this.gridOriginX + col * this.cellSize;
          const y = this.gridOriginY + row * this.cellSize;
          this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
        }
      }
    }
  }

  /**
   * Draws grid lines (borders) for all cells.
   * Thin lines for 21mm cell boundaries, thick lines for 42mm unit boundaries.
   */
  private drawGridLines(grid: GridDimensions): void {
    const gridWidth = grid.columnsX * this.cellSize;
    const gridHeight = grid.rowsY * this.cellSize;

    // Draw thin lines for all 21mm cell boundaries
    this.ctx.strokeStyle = '#D0D0D0';
    this.ctx.lineWidth = 0.5;

    for (let col = 0; col <= grid.columnsX; col++) {
      const x = this.gridOriginX + col * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(x + 0.5, this.gridOriginY);
      this.ctx.lineTo(x + 0.5, this.gridOriginY + gridHeight);
      this.ctx.stroke();
    }

    for (let row = 0; row <= grid.rowsY; row++) {
      const y = this.gridOriginY + row * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(this.gridOriginX, y + 0.5);
      this.ctx.lineTo(this.gridOriginX + gridWidth, y + 0.5);
      this.ctx.stroke();
    }

    // Draw thick lines every 2 cells (42mm Gridfinity unit boundaries)
    this.ctx.strokeStyle = DEFAULT_GRID_BORDER_COLOR;
    this.ctx.lineWidth = 2;

    for (let col = 0; col <= grid.columnsX; col += 2) {
      const x = this.gridOriginX + col * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(x + 0.5, this.gridOriginY);
      this.ctx.lineTo(x + 0.5, this.gridOriginY + gridHeight);
      this.ctx.stroke();
    }

    for (let row = 0; row <= grid.rowsY; row += 2) {
      const y = this.gridOriginY + row * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(this.gridOriginX, y + 0.5);
      this.ctx.lineTo(this.gridOriginX + gridWidth, y + 0.5);
      this.ctx.stroke();
    }

    // Draw outer border
    this.ctx.strokeStyle = '#333333';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(
      this.gridOriginX,
      this.gridOriginY,
      gridWidth,
      gridHeight
    );
  }

  /**
   * Draws item number labels centered within each box's area.
   */
  private drawBoxLabels(boxes: Box[]): void {
    this.ctx.fillStyle = '#000000';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const fontSize = Math.max(10, Math.min(LABEL_FONT_SIZE, this.cellSize * 0.4));
    this.ctx.font = `bold ${fontSize}px sans-serif`;

    for (const box of boxes) {
      // Calculate the center of the box's area
      const startX = this.gridOriginX + box.startCell.col * this.cellSize;
      const startY = this.gridOriginY + box.startCell.row * this.cellSize;
      const boxWidth = box.widthUnits * this.cellSize;
      const boxHeight = box.depthUnits * this.cellSize;

      const centerX = startX + boxWidth / 2;
      const centerY = startY + boxHeight / 2;

      this.ctx.fillText(`${box.itemNumber}`, centerX, centerY);
    }
  }

  /**
   * Draws the selection highlight rectangle during placement mode.
   */
  private drawSelectionHighlight(
    start: CellCoordinate,
    current: CellCoordinate,
    grid: GridDimensions
  ): void {
    const minCol = Math.max(0, Math.min(start.col, current.col));
    const maxCol = Math.min(grid.columnsX - 1, Math.max(start.col, current.col));
    const minRow = Math.max(0, Math.min(start.row, current.row));
    const maxRow = Math.min(grid.rowsY - 1, Math.max(start.row, current.row));

    const x = this.gridOriginX + minCol * this.cellSize;
    const y = this.gridOriginY + minRow * this.cellSize;
    const width = (maxCol - minCol + 1) * this.cellSize;
    const height = (maxRow - minRow + 1) * this.cellSize;

    // Fill with semi-transparent highlight
    this.ctx.fillStyle = SELECTION_HIGHLIGHT_COLOR;
    this.ctx.fillRect(x, y, width, height);

    // Draw selection border
    this.ctx.strokeStyle = SELECTION_BORDER_COLOR;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
  }

  /**
   * Displays the available cell count outside the grid area.
   */
  private drawAvailableCellCount(count: number, grid: GridDimensions): void {
    const gridBottom =
      this.gridOriginY + grid.rowsY * this.cellSize;

    this.ctx.fillStyle = '#333333';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.font = `${INFO_FONT_SIZE}px sans-serif`;

    const text = `Available cells: ${count}`;
    this.ctx.fillText(text, this.gridOriginX, gridBottom + 10);
  }

  /**
   * Gets a color for a box based on its item number using the palette.
   * Falls back to cycling through palette colors.
   */
  private getBoxColor(itemNumber: number): string {
    const index = (itemNumber - 1) % this.palette.boxColors.length;
    return this.palette.boxColors[index];
  }
}
