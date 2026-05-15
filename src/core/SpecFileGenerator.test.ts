import { describe, it, expect } from 'vitest';
import { generateSpecFile } from './SpecFileGenerator';
import { HeightManager } from './HeightManager';
import type { Box, GridDimensions } from './types';

function makeBox(overrides: Partial<Box> = {}): Box {
  return {
    id: 'box-1',
    itemNumber: 1,
    startCell: { col: 0, row: 0 },
    endCell: { col: 0, row: 0 },
    widthUnits: 1,
    depthUnits: 1,
    heightUnits: 1,
    isMakerWorldModel: false,
    ...overrides,
  };
}

describe('SpecFileGenerator', () => {
  describe('baseplate dimensions', () => {
    it('computes totalWidthMm as gridWidth * 42', () => {
      const grid: GridDimensions = { columnsX: 5, rowsY: 3 };
      const hm = new HeightManager(70);
      const result = generateSpecFile(grid, [], hm);

      expect(result.baseplate.gridWidth).toBe(5);
      expect(result.baseplate.totalWidthMm).toBe(210); // 5 * 42
    });

    it('computes totalDepthMm as gridDepth * 42', () => {
      const grid: GridDimensions = { columnsX: 5, rowsY: 3 };
      const hm = new HeightManager(70);
      const result = generateSpecFile(grid, [], hm);

      expect(result.baseplate.gridDepth).toBe(3);
      expect(result.baseplate.totalDepthMm).toBe(126); // 3 * 42
    });

    it('handles a 1x1 grid', () => {
      const grid: GridDimensions = { columnsX: 1, rowsY: 1 };
      const hm = new HeightManager(70);
      const result = generateSpecFile(grid, [], hm);

      expect(result.baseplate.gridWidth).toBe(1);
      expect(result.baseplate.gridDepth).toBe(1);
      expect(result.baseplate.totalWidthMm).toBe(42);
      expect(result.baseplate.totalDepthMm).toBe(42);
    });

    it('handles a large grid', () => {
      const grid: GridDimensions = { columnsX: 47, rowsY: 47 };
      const hm = new HeightManager(2000);
      const result = generateSpecFile(grid, [], hm);

      expect(result.baseplate.gridWidth).toBe(47);
      expect(result.baseplate.gridDepth).toBe(47);
      expect(result.baseplate.totalWidthMm).toBe(1974); // 47 * 42
      expect(result.baseplate.totalDepthMm).toBe(1974);
    });
  });

  describe('box entries', () => {
    it('returns empty boxes array when no boxes provided', () => {
      const grid: GridDimensions = { columnsX: 5, rowsY: 3 };
      const hm = new HeightManager(70);
      const result = generateSpecFile(grid, [], hm);

      expect(result.boxes).toEqual([]);
    });

    it('maps a single standard box correctly', () => {
      const grid: GridDimensions = { columnsX: 5, rowsY: 3 };
      const hm = new HeightManager(70);
      const box = makeBox({
        itemNumber: 1,
        startCell: { col: 1, row: 2 },
        endCell: { col: 2, row: 2 },
        widthUnits: 2,
        depthUnits: 1,
        heightUnits: 3,
      });

      hm.setVariableMode(true);
      const result = generateSpecFile(grid, [box], hm);

      expect(result.boxes).toHaveLength(1);
      expect(result.boxes[0]).toEqual({
        itemNumber: 1,
        gridPosition: { col: 1, row: 2 },
        sizeUnits: { width: 2, depth: 1 },
        heightUnits: 3,
      });
    });

    it('maps multiple boxes preserving order', () => {
      const grid: GridDimensions = { columnsX: 5, rowsY: 5 };
      const hm = new HeightManager(70);
      hm.setVariableMode(true);

      const boxes: Box[] = [
        makeBox({ id: 'b1', itemNumber: 1, startCell: { col: 0, row: 0 }, endCell: { col: 1, row: 1 }, widthUnits: 2, depthUnits: 2, heightUnits: 2 }),
        makeBox({ id: 'b2', itemNumber: 2, startCell: { col: 3, row: 0 }, endCell: { col: 4, row: 0 }, widthUnits: 2, depthUnits: 1, heightUnits: 5 }),
        makeBox({ id: 'b3', itemNumber: 3, startCell: { col: 0, row: 3 }, endCell: { col: 0, row: 4 }, widthUnits: 1, depthUnits: 2, heightUnits: 1 }),
      ];

      const result = generateSpecFile(grid, boxes, hm);

      expect(result.boxes).toHaveLength(3);
      expect(result.boxes[0].itemNumber).toBe(1);
      expect(result.boxes[1].itemNumber).toBe(2);
      expect(result.boxes[2].itemNumber).toBe(3);
    });

    it('uses gridPosition from startCell (top-left corner)', () => {
      const grid: GridDimensions = { columnsX: 10, rowsY: 10 };
      const hm = new HeightManager(70);
      const box = makeBox({
        startCell: { col: 3, row: 5 },
        endCell: { col: 6, row: 8 },
        widthUnits: 4,
        depthUnits: 4,
      });

      const result = generateSpecFile(grid, [box], hm);

      expect(result.boxes[0].gridPosition).toEqual({ col: 3, row: 5 });
    });

    it('uses sizeUnits from widthUnits and depthUnits', () => {
      const grid: GridDimensions = { columnsX: 10, rowsY: 10 };
      const hm = new HeightManager(70);
      const box = makeBox({
        widthUnits: 3,
        depthUnits: 4,
      });

      const result = generateSpecFile(grid, [box], hm);

      expect(result.boxes[0].sizeUnits).toEqual({ width: 3, depth: 4 });
    });
  });

  describe('height resolution via HeightManager', () => {
    it('uses default height in uniform mode', () => {
      const grid: GridDimensions = { columnsX: 5, rowsY: 5 };
      const hm = new HeightManager(70);
      // uniform mode (default), default height = 1
      const box = makeBox({ heightUnits: 7 });

      const result = generateSpecFile(grid, [box], hm);

      expect(result.boxes[0].heightUnits).toBe(1); // default height
    });

    it('uses box heightUnits in variable mode', () => {
      const grid: GridDimensions = { columnsX: 5, rowsY: 5 };
      const hm = new HeightManager(70);
      hm.setVariableMode(true);
      const box = makeBox({ heightUnits: 7 });

      const result = generateSpecFile(grid, [box], hm);

      expect(result.boxes[0].heightUnits).toBe(7);
    });

    it('uses updated default height in uniform mode', () => {
      const grid: GridDimensions = { columnsX: 5, rowsY: 5 };
      const hm = new HeightManager(70);
      hm.setDefaultHeight(4);
      const box = makeBox({ heightUnits: 7 });

      const result = generateSpecFile(grid, [box], hm);

      expect(result.boxes[0].heightUnits).toBe(4);
    });
  });

  describe('MakerWorld model references', () => {
    it('includes makerWorldModel for MakerWorld boxes', () => {
      const grid: GridDimensions = { columnsX: 5, rowsY: 5 };
      const hm = new HeightManager(70);
      const box = makeBox({
        isMakerWorldModel: true,
        makerWorldName: 'Battery Organizer',
        makerWorldId: 'mw-12345',
      });

      const result = generateSpecFile(grid, [box], hm);

      expect(result.boxes[0].makerWorldModel).toEqual({
        name: 'Battery Organizer',
        platformId: 'mw-12345',
      });
    });

    it('does not include makerWorldModel for standard boxes', () => {
      const grid: GridDimensions = { columnsX: 5, rowsY: 5 };
      const hm = new HeightManager(70);
      const box = makeBox({ isMakerWorldModel: false });

      const result = generateSpecFile(grid, [box], hm);

      expect(result.boxes[0].makerWorldModel).toBeUndefined();
    });

    it('does not include makerWorldModel when name is missing', () => {
      const grid: GridDimensions = { columnsX: 5, rowsY: 5 };
      const hm = new HeightManager(70);
      const box = makeBox({
        isMakerWorldModel: true,
        makerWorldName: undefined,
        makerWorldId: 'mw-12345',
      });

      const result = generateSpecFile(grid, [box], hm);

      expect(result.boxes[0].makerWorldModel).toBeUndefined();
    });

    it('does not include makerWorldModel when id is missing', () => {
      const grid: GridDimensions = { columnsX: 5, rowsY: 5 };
      const hm = new HeightManager(70);
      const box = makeBox({
        isMakerWorldModel: true,
        makerWorldName: 'Battery Organizer',
        makerWorldId: undefined,
      });

      const result = generateSpecFile(grid, [box], hm);

      expect(result.boxes[0].makerWorldModel).toBeUndefined();
    });

    it('handles mixed standard and MakerWorld boxes', () => {
      const grid: GridDimensions = { columnsX: 5, rowsY: 5 };
      const hm = new HeightManager(70);
      hm.setVariableMode(true);

      const boxes: Box[] = [
        makeBox({ id: 'b1', itemNumber: 1, heightUnits: 2, isMakerWorldModel: false }),
        makeBox({
          id: 'b2',
          itemNumber: 2,
          heightUnits: 3,
          isMakerWorldModel: true,
          makerWorldName: 'Pen Holder',
          makerWorldId: 'mw-99',
          startCell: { col: 2, row: 0 },
          endCell: { col: 3, row: 1 },
          widthUnits: 2,
          depthUnits: 2,
        }),
        makeBox({ id: 'b3', itemNumber: 3, heightUnits: 1, isMakerWorldModel: false }),
      ];

      const result = generateSpecFile(grid, boxes, hm);

      expect(result.boxes[0].makerWorldModel).toBeUndefined();
      expect(result.boxes[1].makerWorldModel).toEqual({
        name: 'Pen Holder',
        platformId: 'mw-99',
      });
      expect(result.boxes[2].makerWorldModel).toBeUndefined();
    });
  });
});
