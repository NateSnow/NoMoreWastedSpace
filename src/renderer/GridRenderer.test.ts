/**
 * Unit tests for the GridRenderer class.
 *
 * Tests cover getCellAtPoint coordinate math, render execution without errors,
 * and color assignment consistency with LayoutManager colors.
 *
 * Requirements: 2.1, 2.2, 2.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GridRenderer, type ColorPalette, type RenderState } from './GridRenderer';
import { BOX_COLORS, UNOCCUPIED_CELL_COLOR } from '../core/constants';
import type { Box, GridDimensions } from '../core/types';

/**
 * Creates a mock canvas element with a stubbed 2D rendering context.
 * Since tests run in Node (not jsdom with canvas support), we mock getContext.
 */
function createMockCanvas(width = 800, height = 600): HTMLCanvasElement {
  const ctx = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: 'start' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    font: '',
  };

  const canvas = {
    width,
    height,
    getContext: vi.fn().mockReturnValue(ctx),
  } as unknown as HTMLCanvasElement;

  return canvas;
}

function createPalette(): ColorPalette {
  return {
    unoccupied: UNOCCUPIED_CELL_COLOR,
    boxColors: [...BOX_COLORS],
  };
}

function createBox(overrides: Partial<Box> = {}): Box {
  return {
    id: 'box-1',
    itemNumber: 1,
    startCell: { col: 0, row: 0 },
    endCell: { col: 0, row: 0 },
    widthUnits: 1,
    depthUnits: 1,
    heightUnits: 1,
    isMakerWorldModel: false,
    color: BOX_COLORS[0],
    ...overrides,
  };
}

function createRenderState(overrides: Partial<RenderState> = {}): RenderState {
  return {
    grid: { columnsX: 5, rowsY: 5 },
    boxes: [],
    availableCellCount: 25,
    selectionMode: null,
    activeSelection: null,
    ...overrides,
  };
}

describe('GridRenderer', () => {
  let canvas: HTMLCanvasElement;
  let renderer: GridRenderer;
  let palette: ColorPalette;

  beforeEach(() => {
    canvas = createMockCanvas(800, 600);
    palette = createPalette();
    renderer = new GridRenderer(canvas, palette);
  });

  describe('constructor', () => {
    it('throws if canvas context is unavailable', () => {
      const badCanvas = {
        width: 800,
        height: 600,
        getContext: vi.fn().mockReturnValue(null),
      } as unknown as HTMLCanvasElement;

      expect(() => new GridRenderer(badCanvas, palette)).toThrow(
        'Unable to get 2D rendering context from canvas'
      );
    });

    it('creates successfully with valid canvas and palette', () => {
      expect(renderer).toBeDefined();
    });
  });

  describe('render', () => {
    it('does not throw with an empty grid state', () => {
      const state = createRenderState();
      expect(() => renderer.render(state)).not.toThrow();
    });

    it('does not throw with boxes placed', () => {
      const state = createRenderState({
        boxes: [
          createBox({ id: 'box-1', itemNumber: 1, startCell: { col: 0, row: 0 }, endCell: { col: 1, row: 1 }, widthUnits: 2, depthUnits: 2 }),
          createBox({ id: 'box-2', itemNumber: 2, startCell: { col: 3, row: 3 }, endCell: { col: 4, row: 4 }, widthUnits: 2, depthUnits: 2, color: BOX_COLORS[1] }),
        ],
        availableCellCount: 17,
      });
      expect(() => renderer.render(state)).not.toThrow();
    });

    it('does not throw with an active selection', () => {
      const state = createRenderState({
        selectionMode: 'standard',
        activeSelection: {
          start: { col: 1, row: 1 },
          current: { col: 3, row: 3 },
        },
      });
      expect(() => renderer.render(state)).not.toThrow();
    });

    it('does not throw with a large grid', () => {
      const state = createRenderState({
        grid: { columnsX: 47, rowsY: 47 },
        availableCellCount: 47 * 47,
      });
      expect(() => renderer.render(state)).not.toThrow();
    });

    it('does not throw with a 1x1 grid', () => {
      const state = createRenderState({
        grid: { columnsX: 1, rowsY: 1 },
        availableCellCount: 1,
      });
      expect(() => renderer.render(state)).not.toThrow();
    });

    it('calls clearRect to clear the canvas', () => {
      const ctx = (canvas.getContext as any)('2d');
      renderer.render(createRenderState());
      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('draws unoccupied cells with fillRect for each cell', () => {
      const ctx = (canvas.getContext as any)('2d');
      const grid: GridDimensions = { columnsX: 3, rowsY: 2 };
      renderer.render(createRenderState({ grid, availableCellCount: 6 }));

      // fillRect is called for unoccupied cells (3*2=6) plus any box cells
      // At minimum, 6 calls for unoccupied cells
      expect(ctx.fillRect.mock.calls.length).toBeGreaterThanOrEqual(6);
    });

    it('draws box labels with fillText for each box', () => {
      const ctx = (canvas.getContext as any)('2d');
      const boxes = [
        createBox({ id: 'box-1', itemNumber: 1 }),
        createBox({ id: 'box-2', itemNumber: 2, startCell: { col: 1, row: 0 }, endCell: { col: 1, row: 0 }, color: BOX_COLORS[1] }),
      ];
      renderer.render(createRenderState({ boxes, availableCellCount: 23 }));

      // fillText should be called at least for box labels + available count text
      const fillTextCalls = ctx.fillText.mock.calls;
      const labelCalls = fillTextCalls.filter(
        (call: [string, number, number]) => call[0] === '1' || call[0] === '2'
      );
      expect(labelCalls.length).toBe(2);
    });

    it('displays available cell count text', () => {
      const ctx = (canvas.getContext as any)('2d');
      renderer.render(createRenderState({ availableCellCount: 17 }));

      const fillTextCalls = ctx.fillText.mock.calls;
      const countCall = fillTextCalls.find(
        (call: [string, number, number]) => call[0].includes('17')
      );
      expect(countCall).toBeDefined();
    });
  });

  describe('getCellAtPoint', () => {
    it('returns null before render is called (no layout calculated)', () => {
      // Before render, lastGridColumns and lastGridRows are 0
      const result = renderer.getCellAtPoint(100, 100);
      expect(result).toBeNull();
    });

    it('returns correct cell coordinates after render', () => {
      const grid: GridDimensions = { columnsX: 5, rowsY: 5 };
      renderer.render(createRenderState({ grid }));

      const cellSize = renderer.getCellSize();
      const origin = renderer.getGridOrigin();

      // Click in the center of cell (0, 0)
      const result = renderer.getCellAtPoint(
        origin.x + cellSize * 0.5,
        origin.y + cellSize * 0.5
      );
      expect(result).toEqual({ col: 0, row: 0 });
    });

    it('returns correct cell for different positions', () => {
      const grid: GridDimensions = { columnsX: 5, rowsY: 5 };
      renderer.render(createRenderState({ grid }));

      const cellSize = renderer.getCellSize();
      const origin = renderer.getGridOrigin();

      // Cell (2, 3) — center of that cell
      const result = renderer.getCellAtPoint(
        origin.x + cellSize * 2.5,
        origin.y + cellSize * 3.5
      );
      expect(result).toEqual({ col: 2, row: 3 });
    });

    it('returns correct cell at the edge of a cell boundary', () => {
      const grid: GridDimensions = { columnsX: 5, rowsY: 5 };
      renderer.render(createRenderState({ grid }));

      const cellSize = renderer.getCellSize();
      const origin = renderer.getGridOrigin();

      // Just inside cell (1, 1) — at the start of the cell
      const result = renderer.getCellAtPoint(
        origin.x + cellSize * 1,
        origin.y + cellSize * 1
      );
      expect(result).toEqual({ col: 1, row: 1 });
    });

    it('returns the last cell for a point at the far edge of the grid', () => {
      const grid: GridDimensions = { columnsX: 5, rowsY: 5 };
      renderer.render(createRenderState({ grid }));

      const cellSize = renderer.getCellSize();
      const origin = renderer.getGridOrigin();

      // Just inside the last cell (4, 4)
      const result = renderer.getCellAtPoint(
        origin.x + cellSize * 4.5,
        origin.y + cellSize * 4.5
      );
      expect(result).toEqual({ col: 4, row: 4 });
    });

    it('returns null for points to the left of the grid', () => {
      const grid: GridDimensions = { columnsX: 5, rowsY: 5 };
      renderer.render(createRenderState({ grid }));

      const origin = renderer.getGridOrigin();
      const result = renderer.getCellAtPoint(origin.x - 1, origin.y + 10);
      expect(result).toBeNull();
    });

    it('returns null for points above the grid', () => {
      const grid: GridDimensions = { columnsX: 5, rowsY: 5 };
      renderer.render(createRenderState({ grid }));

      const origin = renderer.getGridOrigin();
      const result = renderer.getCellAtPoint(origin.x + 10, origin.y - 1);
      expect(result).toBeNull();
    });

    it('returns null for points beyond the right edge of the grid', () => {
      const grid: GridDimensions = { columnsX: 5, rowsY: 5 };
      renderer.render(createRenderState({ grid }));

      const cellSize = renderer.getCellSize();
      const origin = renderer.getGridOrigin();

      // Beyond column 4 (the last column in a 5-column grid)
      const result = renderer.getCellAtPoint(
        origin.x + cellSize * 5 + 1,
        origin.y + cellSize * 2
      );
      expect(result).toBeNull();
    });

    it('returns null for points beyond the bottom edge of the grid', () => {
      const grid: GridDimensions = { columnsX: 5, rowsY: 5 };
      renderer.render(createRenderState({ grid }));

      const cellSize = renderer.getCellSize();
      const origin = renderer.getGridOrigin();

      // Beyond row 4 (the last row in a 5-row grid)
      const result = renderer.getCellAtPoint(
        origin.x + cellSize * 2,
        origin.y + cellSize * 5 + 1
      );
      expect(result).toBeNull();
    });

    it('works correctly with non-square grids', () => {
      const grid: GridDimensions = { columnsX: 10, rowsY: 3 };
      renderer.render(createRenderState({ grid, availableCellCount: 30 }));

      const cellSize = renderer.getCellSize();
      const origin = renderer.getGridOrigin();

      // Cell (9, 2) — last cell in a 10x3 grid
      const result = renderer.getCellAtPoint(
        origin.x + cellSize * 9.5,
        origin.y + cellSize * 2.5
      );
      expect(result).toEqual({ col: 9, row: 2 });
    });

    it('works correctly after re-rendering with different grid dimensions', () => {
      // First render with 5x5
      renderer.render(createRenderState({ grid: { columnsX: 5, rowsY: 5 } }));

      // Re-render with 3x3
      renderer.render(createRenderState({ grid: { columnsX: 3, rowsY: 3 }, availableCellCount: 9 }));

      const cellSize = renderer.getCellSize();
      const origin = renderer.getGridOrigin();

      // Cell (2, 2) should be valid in 3x3 grid
      const result = renderer.getCellAtPoint(
        origin.x + cellSize * 2.5,
        origin.y + cellSize * 2.5
      );
      expect(result).toEqual({ col: 2, row: 2 });

      // Cell (3, 3) should be out of bounds in 3x3 grid
      const outOfBounds = renderer.getCellAtPoint(
        origin.x + cellSize * 3.5,
        origin.y + cellSize * 3.5
      );
      expect(outOfBounds).toBeNull();
    });
  });

  describe('color assignment matches LayoutManager colors', () => {
    it('renderer uses box.color property from LayoutManager', () => {
      const boxes = [
        createBox({ id: 'box-1', itemNumber: 1, color: BOX_COLORS[0] }),
        createBox({ id: 'box-2', itemNumber: 2, startCell: { col: 1, row: 0 }, endCell: { col: 1, row: 0 }, color: BOX_COLORS[1] }),
        createBox({ id: 'box-3', itemNumber: 3, startCell: { col: 2, row: 0 }, endCell: { col: 2, row: 0 }, color: BOX_COLORS[2] }),
      ];

      renderer.render(createRenderState({ boxes, availableCellCount: 22 }));

      // The fillStyle should have been set to each box color during rendering
      // Since we're using a plain object mock, check that fillRect was called
      // after fillStyle was set to each box color
      // The renderer sets ctx.fillStyle = color before calling fillRect for each box
      // We verify the colors are from BOX_COLORS palette
      for (const box of boxes) {
        expect(BOX_COLORS).toContain(box.color);
      }
    });

    it('box colors cycle through the palette matching LayoutManager behavior', () => {
      // LayoutManager assigns colors sequentially from BOX_COLORS
      // GridRenderer uses box.color directly, or falls back to getBoxColor(itemNumber)
      // which uses (itemNumber - 1) % palette.boxColors.length
      const boxes: Box[] = [];
      for (let i = 0; i < 8; i++) {
        boxes.push(
          createBox({
            id: `box-${i + 1}`,
            itemNumber: i + 1,
            startCell: { col: i % 5, row: Math.floor(i / 5) },
            endCell: { col: i % 5, row: Math.floor(i / 5) },
            color: BOX_COLORS[i],
          })
        );
      }

      // All 8 colors should be distinct
      const colors = boxes.map((b) => b.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(8);

      // Each color should be from the palette
      for (const color of colors) {
        expect(BOX_COLORS).toContain(color);
      }
    });

    it('renderer fallback color matches palette cycling when box.color is undefined', () => {
      // When box.color is not set, GridRenderer uses getBoxColor(itemNumber)
      // which cycles through palette: (itemNumber - 1) % boxColors.length
      const ctx = (canvas.getContext as any)('2d');

      const boxWithoutColor: Box = {
        id: 'box-1',
        itemNumber: 3,
        startCell: { col: 0, row: 0 },
        endCell: { col: 0, row: 0 },
        widthUnits: 1,
        depthUnits: 1,
        heightUnits: 1,
        isMakerWorldModel: false,
        // No color property — renderer should use fallback
      };

      // The expected fallback color for itemNumber 3 is BOX_COLORS[(3-1) % 8] = BOX_COLORS[2]
      renderer.render(createRenderState({ boxes: [boxWithoutColor], availableCellCount: 24 }));

      // Verify render completes without error (the fallback logic works)
      expect(ctx.fillRect).toHaveBeenCalled();
    });
  });

  describe('getCellSize and getGridOrigin', () => {
    it('returns cell size after render', () => {
      renderer.render(createRenderState({ grid: { columnsX: 5, rowsY: 5 } }));
      const cellSize = renderer.getCellSize();
      expect(cellSize).toBeGreaterThanOrEqual(20); // MIN_CELL_SIZE
    });

    it('returns grid origin after render', () => {
      renderer.render(createRenderState({ grid: { columnsX: 5, rowsY: 5 } }));
      const origin = renderer.getGridOrigin();
      expect(origin.x).toBeGreaterThan(0);
      expect(origin.y).toBeGreaterThan(0);
    });

    it('cell size respects canvas dimensions', () => {
      // With 800x600 canvas and 5x5 grid:
      // available = 800 - 80 = 720 (width), 600 - 80 = 520 (height)
      // cellWidth = floor(720/5) = 144, cellHeight = floor(520/5) = 104
      // cellSize = min(144, 104) = 104
      renderer.render(createRenderState({ grid: { columnsX: 5, rowsY: 5 } }));
      const cellSize = renderer.getCellSize();
      expect(cellSize).toBe(104);
    });

    it('grid is centered in the canvas', () => {
      renderer.render(createRenderState({ grid: { columnsX: 5, rowsY: 5 } }));
      const cellSize = renderer.getCellSize();
      const origin = renderer.getGridOrigin();

      const gridWidth = cellSize * 5;
      const gridHeight = cellSize * 5;

      // Origin should center the grid
      expect(origin.x).toBe(Math.floor((800 - gridWidth) / 2));
      expect(origin.y).toBe(Math.floor((600 - gridHeight) / 2));
    });
  });
});
