import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { LayoutManager } from './LayoutManager';
import { BOX_COLORS } from './constants';

/**
 * Feature: gridfinity-drawer-designer, Property 7: Color Assignment Uniqueness
 *
 * For any sequence of Box placements (up to 8 boxes), each Box SHALL be assigned
 * a color that is distinct from all other currently placed Boxes' colors.
 * After 8 boxes, colors may repeat.
 *
 * **Validates: Requirements 2.4**
 */
describe('LayoutManager — Property 7: Color Assignment Uniqueness', () => {
  // Generator for a number of boxes to place (1 to 8 for uniqueness guarantee)
  const boxCountArb = fc.integer({ min: 1, max: 8 });

  // Generator for a grid large enough to hold up to 10 non-overlapping 1x1 boxes
  // We use a 10x10 grid so we can place boxes without overlap
  const largeGrid = { columnsX: 10, rowsY: 10 };

  // Helper: place N non-overlapping 1x1 boxes on a 10x10 grid
  function placeBoxes(manager: LayoutManager, count: number) {
    for (let i = 0; i < count; i++) {
      const col = i % 10;
      const row = Math.floor(i / 10);
      manager.placeBox({ col, row }, { col, row });
    }
  }

  it('all assigned colors are distinct for up to 8 box placements', () => {
    fc.assert(
      fc.property(boxCountArb, (count) => {
        const manager = new LayoutManager(largeGrid);
        placeBoxes(manager, count);

        const boxes = manager.getBoxes();
        const colors = boxes.map((b) => b.color);

        // All colors should be unique
        const uniqueColors = new Set(colors);
        expect(uniqueColors.size).toBe(count);
      }),
      { numRuns: 100 }
    );
  });

  it('colors are always from the BOX_COLORS palette', () => {
    fc.assert(
      fc.property(boxCountArb, (count) => {
        const manager = new LayoutManager(largeGrid);
        placeBoxes(manager, count);

        const boxes = manager.getBoxes();
        for (const box of boxes) {
          expect(BOX_COLORS).toContain(box.color);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('after 8 boxes, colors cycle (9th box gets same color as 1st)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 9, max: 16 }),
        (count) => {
          const manager = new LayoutManager({ columnsX: 20, rowsY: 20 });
          placeBoxes(manager, count);

          const boxes = manager.getBoxes();
          // The (i+8)th box should have the same color as the ith box
          for (let i = 0; i < count - 8; i++) {
            expect(boxes[i + 8].color).toBe(boxes[i].color);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('every placed box always has a color assigned (never undefined)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 16 }),
        (count) => {
          const manager = new LayoutManager({ columnsX: 20, rowsY: 20 });
          placeBoxes(manager, count);

          const boxes = manager.getBoxes();
          for (const box of boxes) {
            expect(box.color).toBeDefined();
            expect(typeof box.color).toBe('string');
            expect(box.color!.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
