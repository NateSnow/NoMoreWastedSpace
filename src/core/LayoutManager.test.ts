/**
 * Unit tests for the LayoutManager class.
 *
 * Tests cover box placement, overlap detection, removal, color assignment,
 * available cell count, box limit, and MakerWorld model placement.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LayoutManager } from './LayoutManager';
import { BOX_COLORS, MAX_BOXES_PER_LAYOUT } from './constants';
import type { GridDimensions, MakerWorldModel } from './types';

describe('LayoutManager', () => {
  let manager: LayoutManager;
  const grid: GridDimensions = { columnsX: 5, rowsY: 5 };

  beforeEach(() => {
    manager = new LayoutManager(grid);
  });

  describe('placeBox', () => {
    it('places a 1x1 box successfully', () => {
      const result = manager.placeBox({ col: 0, row: 0 }, { col: 0, row: 0 });

      expect(result.success).toBe(true);
      expect(result.box).toBeDefined();
      expect(result.box!.widthUnits).toBe(1);
      expect(result.box!.depthUnits).toBe(1);
      expect(result.box!.itemNumber).toBe(1);
      expect(result.box!.isMakerWorldModel).toBe(false);
    });

    it('places a multi-cell box successfully', () => {
      const result = manager.placeBox({ col: 1, row: 1 }, { col: 3, row: 2 });

      expect(result.success).toBe(true);
      expect(result.box!.widthUnits).toBe(3);
      expect(result.box!.depthUnits).toBe(2);
    });

    it('normalizes coordinates so startCell is top-left', () => {
      // Pass bottom-right first, top-left second
      const result = manager.placeBox({ col: 3, row: 2 }, { col: 1, row: 0 });

      expect(result.success).toBe(true);
      expect(result.box!.startCell).toEqual({ col: 1, row: 0 });
      expect(result.box!.endCell).toEqual({ col: 3, row: 2 });
    });

    it('assigns sequential item numbers', () => {
      const r1 = manager.placeBox({ col: 0, row: 0 }, { col: 0, row: 0 });
      const r2 = manager.placeBox({ col: 1, row: 0 }, { col: 1, row: 0 });
      const r3 = manager.placeBox({ col: 2, row: 0 }, { col: 2, row: 0 });

      expect(r1.box!.itemNumber).toBe(1);
      expect(r2.box!.itemNumber).toBe(2);
      expect(r3.box!.itemNumber).toBe(3);
    });

    it('assigns unique IDs to each box', () => {
      const r1 = manager.placeBox({ col: 0, row: 0 }, { col: 0, row: 0 });
      const r2 = manager.placeBox({ col: 1, row: 0 }, { col: 1, row: 0 });

      expect(r1.box!.id).not.toBe(r2.box!.id);
    });

    it('prevents placement on occupied cells', () => {
      manager.placeBox({ col: 0, row: 0 }, { col: 2, row: 2 });
      const result = manager.placeBox({ col: 1, row: 1 }, { col: 3, row: 3 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already occupied');
    });

    it('sets default heightUnits to 1', () => {
      const result = manager.placeBox({ col: 0, row: 0 }, { col: 0, row: 0 });
      expect(result.box!.heightUnits).toBe(1);
    });
  });

  describe('placeMakerWorldModel', () => {
    const model: MakerWorldModel = {
      id: 'mw-123',
      name: 'Battery Holder',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      gridWidth: 2,
      gridDepth: 1,
    };

    it('places a MakerWorld model with metadata', () => {
      const result = manager.placeMakerWorldModel(
        { col: 0, row: 0 },
        { col: 1, row: 0 },
        model
      );

      expect(result.success).toBe(true);
      expect(result.box!.isMakerWorldModel).toBe(true);
      expect(result.box!.makerWorldName).toBe('Battery Holder');
      expect(result.box!.makerWorldId).toBe('mw-123');
    });

    it('prevents overlapping MakerWorld model placement', () => {
      manager.placeBox({ col: 0, row: 0 }, { col: 1, row: 0 });
      const result = manager.placeMakerWorldModel(
        { col: 1, row: 0 },
        { col: 2, row: 0 },
        model
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('already occupied');
    });
  });

  describe('removeBox', () => {
    it('removes a box by ID', () => {
      const result = manager.placeBox({ col: 0, row: 0 }, { col: 1, row: 1 });
      expect(manager.getBoxCount()).toBe(1);

      manager.removeBox(result.box!.id);
      expect(manager.getBoxCount()).toBe(0);
    });

    it('frees cells after removal allowing new placement', () => {
      const result = manager.placeBox({ col: 0, row: 0 }, { col: 2, row: 2 });
      manager.removeBox(result.box!.id);

      // Should now be able to place in the same area
      const newResult = manager.placeBox({ col: 0, row: 0 }, { col: 2, row: 2 });
      expect(newResult.success).toBe(true);
    });

    it('does nothing if box ID does not exist', () => {
      manager.placeBox({ col: 0, row: 0 }, { col: 0, row: 0 });
      manager.removeBox('nonexistent-id');
      expect(manager.getBoxCount()).toBe(1);
    });
  });

  describe('hasOverlap', () => {
    it('returns false for empty grid', () => {
      expect(manager.hasOverlap({ col: 0, row: 0 }, { col: 2, row: 2 })).toBe(false);
    });

    it('returns true when regions share cells', () => {
      manager.placeBox({ col: 0, row: 0 }, { col: 2, row: 2 });
      expect(manager.hasOverlap({ col: 2, row: 2 }, { col: 4, row: 4 })).toBe(true);
    });

    it('returns false for adjacent non-overlapping regions', () => {
      manager.placeBox({ col: 0, row: 0 }, { col: 1, row: 1 });
      expect(manager.hasOverlap({ col: 2, row: 0 }, { col: 3, row: 1 })).toBe(false);
    });

    it('excludes a specific box from overlap check', () => {
      const result = manager.placeBox({ col: 0, row: 0 }, { col: 2, row: 2 });
      // Should not overlap with itself when excluded
      expect(
        manager.hasOverlap({ col: 0, row: 0 }, { col: 2, row: 2 }, result.box!.id)
      ).toBe(false);
    });

    it('normalizes coordinates before checking', () => {
      manager.placeBox({ col: 0, row: 0 }, { col: 2, row: 2 });
      // Pass end before start — should still detect overlap
      expect(manager.hasOverlap({ col: 2, row: 2 }, { col: 0, row: 0 })).toBe(true);
    });
  });

  describe('isRectangular', () => {
    it('always returns true for two-corner selection', () => {
      expect(manager.isRectangular({ col: 0, row: 0 }, { col: 3, row: 3 })).toBe(true);
      expect(manager.isRectangular({ col: 4, row: 4 }, { col: 0, row: 0 })).toBe(true);
    });
  });

  describe('getAvailableCellCount', () => {
    it('returns total cells for empty grid', () => {
      expect(manager.getAvailableCellCount()).toBe(25); // 5x5
    });

    it('decreases after placing a box', () => {
      manager.placeBox({ col: 0, row: 0 }, { col: 1, row: 1 }); // 2x2 = 4 cells
      expect(manager.getAvailableCellCount()).toBe(21);
    });

    it('increases after removing a box', () => {
      const result = manager.placeBox({ col: 0, row: 0 }, { col: 1, row: 1 });
      manager.removeBox(result.box!.id);
      expect(manager.getAvailableCellCount()).toBe(25);
    });
  });

  describe('canPlaceMore', () => {
    it('returns true when under the limit', () => {
      expect(manager.canPlaceMore()).toBe(true);
    });

    it('returns false when at the 50-box limit', () => {
      // Use a 10x10 grid to have enough cells
      const largeManager = new LayoutManager({ columnsX: 50, rowsY: 50 });
      for (let i = 0; i < MAX_BOXES_PER_LAYOUT; i++) {
        largeManager.placeBox({ col: i, row: 0 }, { col: i, row: 0 });
      }
      expect(largeManager.canPlaceMore()).toBe(false);
    });

    it('returns error when trying to place beyond limit', () => {
      const largeManager = new LayoutManager({ columnsX: 50, rowsY: 50 });
      for (let i = 0; i < MAX_BOXES_PER_LAYOUT; i++) {
        largeManager.placeBox({ col: i, row: 0 }, { col: i, row: 0 });
      }
      const result = largeManager.placeBox({ col: 0, row: 1 }, { col: 0, row: 1 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum');
    });
  });

  describe('clearAll', () => {
    it('removes all boxes', () => {
      manager.placeBox({ col: 0, row: 0 }, { col: 0, row: 0 });
      manager.placeBox({ col: 1, row: 0 }, { col: 1, row: 0 });
      manager.clearAll();

      expect(manager.getBoxCount()).toBe(0);
      expect(manager.getAvailableCellCount()).toBe(25);
    });

    it('resets item numbering after clear', () => {
      manager.placeBox({ col: 0, row: 0 }, { col: 0, row: 0 });
      manager.clearAll();
      const result = manager.placeBox({ col: 0, row: 0 }, { col: 0, row: 0 });

      expect(result.box!.itemNumber).toBe(1);
    });
  });

  describe('color assignment', () => {
    it('assigns colors from BOX_COLORS palette', () => {
      const result = manager.placeBox({ col: 0, row: 0 }, { col: 0, row: 0 });
      expect(BOX_COLORS).toContain(result.box!.color);
    });

    it('assigns distinct colors for first 8 boxes', () => {
      const colors: string[] = [];
      for (let i = 0; i < 8; i++) {
        const result = manager.placeBox({ col: i, row: 0 }, { col: i, row: 0 });
        colors.push(result.box!.color!);
      }

      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(8);
    });

    it('cycles colors after exhausting the palette', () => {
      // Place 9 boxes — the 9th should reuse the first color
      for (let i = 0; i < 8; i++) {
        manager.placeBox({ col: i, row: 0 }, { col: i, row: 0 });
      }
      const result = manager.placeBox({ col: 0, row: 1 }, { col: 0, row: 1 });
      expect(result.box!.color).toBe(BOX_COLORS[0]);
    });
  });

  describe('getBoxes', () => {
    it('returns a copy of the boxes array', () => {
      manager.placeBox({ col: 0, row: 0 }, { col: 0, row: 0 });
      const boxes = manager.getBoxes();
      boxes.pop(); // Mutate the returned array
      expect(manager.getBoxCount()).toBe(1); // Original unaffected
    });
  });
});
