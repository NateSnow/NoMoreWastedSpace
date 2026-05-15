import { describe, it, expect } from 'vitest';
import { HeightManager } from './HeightManager';
import type { Box } from './types';

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

describe('HeightManager', () => {
  describe('constructor', () => {
    it('computes maxHeight as floor(drawerHeightMm / 7)', () => {
      const hm = new HeightManager(70);
      expect(hm.getMaxHeight()).toBe(10);
    });

    it('floors non-exact divisions', () => {
      const hm = new HeightManager(50);
      expect(hm.getMaxHeight()).toBe(7); // floor(50/7) = 7
    });

    it('handles small drawer heights', () => {
      const hm = new HeightManager(7);
      expect(hm.getMaxHeight()).toBe(1);
    });

    it('handles drawer height less than one unit', () => {
      const hm = new HeightManager(6);
      expect(hm.getMaxHeight()).toBe(0);
    });
  });

  describe('setVariableMode / isVariableMode', () => {
    it('defaults to uniform mode (variable=false)', () => {
      const hm = new HeightManager(70);
      expect(hm.isVariableMode()).toBe(false);
    });

    it('can enable variable mode', () => {
      const hm = new HeightManager(70);
      hm.setVariableMode(true);
      expect(hm.isVariableMode()).toBe(true);
    });

    it('can disable variable mode', () => {
      const hm = new HeightManager(70);
      hm.setVariableMode(true);
      hm.setVariableMode(false);
      expect(hm.isVariableMode()).toBe(false);
    });
  });

  describe('defaultHeight', () => {
    it('defaults to 1 Height_Unit', () => {
      const hm = new HeightManager(70);
      expect(hm.getDefaultHeight()).toBe(1);
    });

    it('can be changed via setDefaultHeight', () => {
      const hm = new HeightManager(70);
      hm.setDefaultHeight(5);
      expect(hm.getDefaultHeight()).toBe(5);
    });
  });

  describe('validateHeight', () => {
    const hm = new HeightManager(70); // maxHeight = 10

    it('returns valid for height within range [1, maxHeight]', () => {
      expect(hm.validateHeight(1)).toEqual({ valid: true });
      expect(hm.validateHeight(5)).toEqual({ valid: true });
      expect(hm.validateHeight(10)).toEqual({ valid: true });
    });

    it('returns error for height less than 1', () => {
      const result = hm.validateHeight(0);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns error for negative height', () => {
      const result = hm.validateHeight(-3);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns error for non-integer height', () => {
      const result = hm.validateHeight(2.5);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns warning for height exceeding maxHeight', () => {
      const result = hm.validateHeight(11);
      expect(result.valid).toBe(true);
      expect(result.warning).toBeDefined();
    });

    it('returns warning for height far exceeding maxHeight', () => {
      const result = hm.validateHeight(100);
      expect(result.valid).toBe(true);
      expect(result.warning).toBeDefined();
    });
  });

  describe('getEffectiveHeight', () => {
    it('returns default height in uniform mode', () => {
      const hm = new HeightManager(70);
      const box = makeBox({ heightUnits: 5 });
      expect(hm.getEffectiveHeight(box)).toBe(1);
    });

    it('returns box heightUnits in variable mode', () => {
      const hm = new HeightManager(70);
      hm.setVariableMode(true);
      const box = makeBox({ heightUnits: 5 });
      expect(hm.getEffectiveHeight(box)).toBe(5);
    });

    it('uses updated default height in uniform mode', () => {
      const hm = new HeightManager(70);
      hm.setDefaultHeight(3);
      const box = makeBox({ heightUnits: 7 });
      expect(hm.getEffectiveHeight(box)).toBe(3);
    });

    it('ignores default height in variable mode', () => {
      const hm = new HeightManager(70);
      hm.setDefaultHeight(3);
      hm.setVariableMode(true);
      const box = makeBox({ heightUnits: 7 });
      expect(hm.getEffectiveHeight(box)).toBe(7);
    });
  });
});
