import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { HeightManager } from './HeightManager';
import type { Box } from './types';

/**
 * Feature: gridfinity-drawer-designer, Property 9: Height Resolution
 *
 * For any set of Boxes in a layout:
 * - When variable height mode is disabled, the effective height of every Box SHALL
 *   equal the default height (1 Height_Unit), regardless of any individually assigned height
 * - When variable height mode is enabled, the effective height of a Box SHALL equal
 *   its individually assigned height if set, or the default height if not set
 *
 * **Validates: Requirements 4.3, 4.8**
 */
describe('HeightManager — Property 9: Height Resolution', () => {
  // Generator for a valid drawer height in mm (at least 7mm so maxHeight >= 1)
  const drawerHeightArb = fc.integer({ min: 7, max: 2000 });

  // Generator for a positive integer heightUnits for a box
  const heightUnitsArb = fc.integer({ min: 1, max: 285 }); // max: floor(2000/7)

  // Generator for a Box with arbitrary heightUnits
  const boxArb = (heightUnits: fc.Arbitrary<number>): fc.Arbitrary<Box> =>
    fc.record({
      id: fc.uuid(),
      itemNumber: fc.integer({ min: 1, max: 100 }),
      startCell: fc.record({ col: fc.integer({ min: 0, max: 47 }), row: fc.integer({ min: 0, max: 47 }) }),
      endCell: fc.record({ col: fc.integer({ min: 0, max: 47 }), row: fc.integer({ min: 0, max: 47 }) }),
      widthUnits: fc.integer({ min: 1, max: 48 }),
      depthUnits: fc.integer({ min: 1, max: 48 }),
      heightUnits,
      isMakerWorldModel: fc.boolean(),
      makerWorldName: fc.constant(undefined),
      makerWorldId: fc.constant(undefined),
      color: fc.constant(undefined),
    });

  it('in uniform mode (variableMode=false): getEffectiveHeight always returns the default height regardless of box.heightUnits', () => {
    fc.assert(
      fc.property(
        drawerHeightArb,
        heightUnitsArb,
        boxArb(heightUnitsArb),
        (drawerHeight, _unusedHeight, box) => {
          const hm = new HeightManager(drawerHeight);
          // Uniform mode is the default (variableMode=false)
          expect(hm.isVariableMode()).toBe(false);
          expect(hm.getEffectiveHeight(box)).toBe(hm.getDefaultHeight());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('in variable mode (variableMode=true): getEffectiveHeight always returns box.heightUnits', () => {
    fc.assert(
      fc.property(
        drawerHeightArb,
        boxArb(heightUnitsArb),
        (drawerHeight, box) => {
          const hm = new HeightManager(drawerHeight);
          hm.setVariableMode(true);
          expect(hm.getEffectiveHeight(box)).toBe(box.heightUnits);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('switching modes changes the effective height resolution behavior', () => {
    fc.assert(
      fc.property(
        drawerHeightArb,
        boxArb(fc.integer({ min: 2, max: 285 })), // heightUnits >= 2 so it differs from default of 1
        (drawerHeight, box) => {
          const hm = new HeightManager(drawerHeight);

          // In uniform mode, effective height is the default (1)
          expect(hm.getEffectiveHeight(box)).toBe(1);

          // Switch to variable mode
          hm.setVariableMode(true);
          expect(hm.getEffectiveHeight(box)).toBe(box.heightUnits);

          // Switch back to uniform mode
          hm.setVariableMode(false);
          expect(hm.getEffectiveHeight(box)).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('default height is initially 1', () => {
    fc.assert(
      fc.property(
        drawerHeightArb,
        (drawerHeight) => {
          const hm = new HeightManager(drawerHeight);
          expect(hm.getDefaultHeight()).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
