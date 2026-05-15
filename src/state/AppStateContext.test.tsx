/**
 * Tests for AppStateContext reducer logic.
 *
 * Validates all state transitions handled by the appReducer.
 */

import { describe, it, expect } from 'vitest';
import { appReducer, initialState, type AppAction } from './AppStateContext';
import type { AppState, DrawerDimensions } from '../core/types';

describe('appReducer', () => {
  describe('SET_DIMENSIONS', () => {
    it('sets dimensions when no errors', () => {
      const dimensions: DrawerDimensions = { width: 400, depth: 300, height: 100 };
      const action: AppAction = {
        type: 'SET_DIMENSIONS',
        payload: { dimensions, errors: [] },
      };

      const result = appReducer(initialState, action);

      expect(result.dimensions).toEqual(dimensions);
      expect(result.dimensionErrors).toEqual([]);
    });

    it('keeps previous dimensions when errors present', () => {
      const dimensions: DrawerDimensions = { width: 10, depth: 300, height: 100 };
      const action: AppAction = {
        type: 'SET_DIMENSIONS',
        payload: { dimensions, errors: ['Width is too small'] },
      };

      const result = appReducer(initialState, action);

      expect(result.dimensions).toBeNull();
      expect(result.dimensionErrors).toEqual(['Width is too small']);
    });
  });

  describe('CALCULATE_GRID', () => {
    it('calculates grid from dimensions', () => {
      const dimensions: DrawerDimensions = { width: 400, depth: 300, height: 100 };
      const action: AppAction = { type: 'CALCULATE_GRID', payload: dimensions };

      const result = appReducer(initialState, action);

      expect(result.grid).toEqual({ columnsX: 9, rowsY: 7 }); // floor(400/42)=9, floor(300/42)=7
      expect(result.dimensions).toEqual(dimensions);
      expect(result.dimensionErrors).toEqual([]);
    });

    it('computes maxHeight from drawer height', () => {
      const dimensions: DrawerDimensions = { width: 400, depth: 300, height: 56 };
      const action: AppAction = { type: 'CALCULATE_GRID', payload: dimensions };

      const result = appReducer(initialState, action);

      expect(result.heightConfig.maxHeight).toBe(8); // floor(56/7) = 8
    });

    it('resets boxes and nextItemNumber on new grid', () => {
      const stateWithBoxes: AppState = {
        ...initialState,
        boxes: [
          {
            id: 'box-1',
            itemNumber: 1,
            startCell: { col: 0, row: 0 },
            endCell: { col: 1, row: 1 },
            widthUnits: 2,
            depthUnits: 2,
            heightUnits: 1,
            isMakerWorldModel: false,
            color: '#4CAF50',
          },
        ],
        nextItemNumber: 2,
      };

      const dimensions: DrawerDimensions = { width: 200, depth: 200, height: 70 };
      const action: AppAction = { type: 'CALCULATE_GRID', payload: dimensions };

      const result = appReducer(stateWithBoxes, action);

      expect(result.boxes).toEqual([]);
      expect(result.nextItemNumber).toBe(1);
    });
  });

  describe('PLACE_BOX', () => {
    const stateWithGrid: AppState = {
      ...initialState,
      grid: { columnsX: 5, rowsY: 5 },
      dimensions: { width: 210, depth: 210, height: 70 },
      heightConfig: { variableMode: false, defaultHeight: 1, maxHeight: 10 },
    };

    it('places a box with normalized coordinates', () => {
      const action: AppAction = {
        type: 'PLACE_BOX',
        payload: { start: { col: 2, row: 3 }, end: { col: 0, row: 1 } },
      };

      const result = appReducer(stateWithGrid, action);

      expect(result.boxes).toHaveLength(1);
      const box = result.boxes[0];
      expect(box.startCell).toEqual({ col: 0, row: 1 });
      expect(box.endCell).toEqual({ col: 2, row: 3 });
      expect(box.widthUnits).toBe(3);
      expect(box.depthUnits).toBe(3);
      expect(box.itemNumber).toBe(1);
      expect(box.heightUnits).toBe(1);
      expect(box.isMakerWorldModel).toBe(false);
    });

    it('increments nextItemNumber after placement', () => {
      const action: AppAction = {
        type: 'PLACE_BOX',
        payload: { start: { col: 0, row: 0 }, end: { col: 1, row: 1 } },
      };

      const result = appReducer(stateWithGrid, action);

      expect(result.nextItemNumber).toBe(2);
    });

    it('prevents placement when overlapping existing box', () => {
      const stateWithBox: AppState = {
        ...stateWithGrid,
        boxes: [
          {
            id: 'box-1',
            itemNumber: 1,
            startCell: { col: 0, row: 0 },
            endCell: { col: 2, row: 2 },
            widthUnits: 3,
            depthUnits: 3,
            heightUnits: 1,
            isMakerWorldModel: false,
            color: '#4CAF50',
          },
        ],
        nextItemNumber: 2,
      };

      const action: AppAction = {
        type: 'PLACE_BOX',
        payload: { start: { col: 1, row: 1 }, end: { col: 3, row: 3 } },
      };

      const result = appReducer(stateWithBox, action);

      // Should not add a new box
      expect(result.boxes).toHaveLength(1);
      expect(result.nextItemNumber).toBe(2);
    });

    it('does nothing when grid is null', () => {
      const action: AppAction = {
        type: 'PLACE_BOX',
        payload: { start: { col: 0, row: 0 }, end: { col: 1, row: 1 } },
      };

      const result = appReducer(initialState, action);

      expect(result.boxes).toEqual([]);
    });

    it('resets selection after placement', () => {
      const stateWithSelection: AppState = {
        ...stateWithGrid,
        selection: { startCell: { col: 0, row: 0 }, endCell: null },
      };

      const action: AppAction = {
        type: 'PLACE_BOX',
        payload: { start: { col: 0, row: 0 }, end: { col: 1, row: 1 } },
      };

      const result = appReducer(stateWithSelection, action);

      expect(result.selection).toEqual({ startCell: null, endCell: null });
    });

    it('assigns colors from palette sequentially', () => {
      let state = stateWithGrid;

      // Place first box
      state = appReducer(state, {
        type: 'PLACE_BOX',
        payload: { start: { col: 0, row: 0 }, end: { col: 0, row: 0 } },
      });

      // Place second box
      state = appReducer(state, {
        type: 'PLACE_BOX',
        payload: { start: { col: 1, row: 0 }, end: { col: 1, row: 0 } },
      });

      expect(state.boxes[0].color).toBe('#4CAF50'); // green
      expect(state.boxes[1].color).toBe('#2196F3'); // blue
    });
  });

  describe('REMOVE_BOX', () => {
    it('removes a box by id', () => {
      const stateWithBoxes: AppState = {
        ...initialState,
        grid: { columnsX: 5, rowsY: 5 },
        boxes: [
          {
            id: 'box-1',
            itemNumber: 1,
            startCell: { col: 0, row: 0 },
            endCell: { col: 1, row: 1 },
            widthUnits: 2,
            depthUnits: 2,
            heightUnits: 1,
            isMakerWorldModel: false,
            color: '#4CAF50',
          },
          {
            id: 'box-2',
            itemNumber: 2,
            startCell: { col: 3, row: 3 },
            endCell: { col: 4, row: 4 },
            widthUnits: 2,
            depthUnits: 2,
            heightUnits: 1,
            isMakerWorldModel: false,
            color: '#2196F3',
          },
        ],
        nextItemNumber: 3,
      };

      const action: AppAction = { type: 'REMOVE_BOX', payload: { boxId: 'box-1' } };
      const result = appReducer(stateWithBoxes, action);

      expect(result.boxes).toHaveLength(1);
      expect(result.boxes[0].id).toBe('box-2');
    });

    it('does nothing when boxId not found', () => {
      const stateWithBox: AppState = {
        ...initialState,
        boxes: [
          {
            id: 'box-1',
            itemNumber: 1,
            startCell: { col: 0, row: 0 },
            endCell: { col: 1, row: 1 },
            widthUnits: 2,
            depthUnits: 2,
            heightUnits: 1,
            isMakerWorldModel: false,
            color: '#4CAF50',
          },
        ],
      };

      const action: AppAction = { type: 'REMOVE_BOX', payload: { boxId: 'nonexistent' } };
      const result = appReducer(stateWithBox, action);

      expect(result.boxes).toHaveLength(1);
    });
  });

  describe('SET_HEIGHT_MODE', () => {
    it('enables variable height mode', () => {
      const action: AppAction = { type: 'SET_HEIGHT_MODE', payload: { variableMode: true } };
      const result = appReducer(initialState, action);

      expect(result.heightConfig.variableMode).toBe(true);
    });

    it('disables variable height mode', () => {
      const stateWithVariable: AppState = {
        ...initialState,
        heightConfig: { ...initialState.heightConfig, variableMode: true },
      };

      const action: AppAction = { type: 'SET_HEIGHT_MODE', payload: { variableMode: false } };
      const result = appReducer(stateWithVariable, action);

      expect(result.heightConfig.variableMode).toBe(false);
    });

    it('preserves other heightConfig fields', () => {
      const stateWithConfig: AppState = {
        ...initialState,
        heightConfig: { variableMode: false, defaultHeight: 3, maxHeight: 10 },
      };

      const action: AppAction = { type: 'SET_HEIGHT_MODE', payload: { variableMode: true } };
      const result = appReducer(stateWithConfig, action);

      expect(result.heightConfig.defaultHeight).toBe(3);
      expect(result.heightConfig.maxHeight).toBe(10);
    });
  });

  describe('SET_BOX_HEIGHT', () => {
    const stateWithBox: AppState = {
      ...initialState,
      boxes: [
        {
          id: 'box-1',
          itemNumber: 1,
          startCell: { col: 0, row: 0 },
          endCell: { col: 1, row: 1 },
          widthUnits: 2,
          depthUnits: 2,
          heightUnits: 1,
          isMakerWorldModel: false,
          color: '#4CAF50',
        },
      ],
    };

    it('updates height for a specific box', () => {
      const action: AppAction = {
        type: 'SET_BOX_HEIGHT',
        payload: { boxId: 'box-1', heightUnits: 5 },
      };

      const result = appReducer(stateWithBox, action);

      expect(result.boxes[0].heightUnits).toBe(5);
    });

    it('does not modify other boxes', () => {
      const stateWithTwoBoxes: AppState = {
        ...stateWithBox,
        boxes: [
          ...stateWithBox.boxes,
          {
            id: 'box-2',
            itemNumber: 2,
            startCell: { col: 3, row: 3 },
            endCell: { col: 4, row: 4 },
            widthUnits: 2,
            depthUnits: 2,
            heightUnits: 1,
            isMakerWorldModel: false,
            color: '#2196F3',
          },
        ],
      };

      const action: AppAction = {
        type: 'SET_BOX_HEIGHT',
        payload: { boxId: 'box-1', heightUnits: 3 },
      };

      const result = appReducer(stateWithTwoBoxes, action);

      expect(result.boxes[0].heightUnits).toBe(3);
      expect(result.boxes[1].heightUnits).toBe(1);
    });
  });

  describe('SET_SEARCH_RESULTS', () => {
    it('sets search results', () => {
      const results = [
        { id: 'm1', name: 'Model 1', thumbnailUrl: 'http://example.com/1.png', gridWidth: 2, gridDepth: 2 },
      ];

      const action: AppAction = {
        type: 'SET_SEARCH_RESULTS',
        payload: { results },
      };

      const result = appReducer(initialState, action);

      expect(result.searchResults).toEqual(results);
      expect(result.searchError).toBeNull();
      expect(result.searchLoading).toBe(false);
    });

    it('sets search error', () => {
      const action: AppAction = {
        type: 'SET_SEARCH_RESULTS',
        payload: { results: [], error: 'Service unavailable' },
      };

      const result = appReducer(initialState, action);

      expect(result.searchResults).toEqual([]);
      expect(result.searchError).toBe('Service unavailable');
    });

    it('sets loading state', () => {
      const action: AppAction = {
        type: 'SET_SEARCH_RESULTS',
        payload: { results: [], loading: true },
      };

      const result = appReducer(initialState, action);

      expect(result.searchLoading).toBe(true);
    });
  });

  describe('SUBMIT_START', () => {
    it('sets submitting to true and clears error', () => {
      const stateWithError: AppState = {
        ...initialState,
        submitError: 'Previous error',
      };

      const action: AppAction = { type: 'SUBMIT_START' };
      const result = appReducer(stateWithError, action);

      expect(result.submitting).toBe(true);
      expect(result.submitError).toBeNull();
    });
  });

  describe('SUBMIT_SUCCESS', () => {
    it('resets all submission state', () => {
      const stateWithRetries: AppState = {
        ...initialState,
        submitting: true,
        submitRetryCount: 2,
        submitCooldownUntil: Date.now() + 60000,
        submitError: 'Some error',
      };

      const action: AppAction = { type: 'SUBMIT_SUCCESS' };
      const result = appReducer(stateWithRetries, action);

      expect(result.submitting).toBe(false);
      expect(result.submitRetryCount).toBe(0);
      expect(result.submitCooldownUntil).toBeNull();
      expect(result.submitError).toBeNull();
    });
  });

  describe('SUBMIT_FAILURE', () => {
    it('increments retry count', () => {
      const action: AppAction = {
        type: 'SUBMIT_FAILURE',
        payload: { error: 'Network error' },
      };

      const result = appReducer(initialState, action);

      expect(result.submitting).toBe(false);
      expect(result.submitRetryCount).toBe(1);
      expect(result.submitError).toBe('Network error');
      expect(result.submitCooldownUntil).toBeNull();
    });

    it('activates cooldown after 3 consecutive failures', () => {
      const stateWith2Failures: AppState = {
        ...initialState,
        submitRetryCount: 2,
      };

      const action: AppAction = {
        type: 'SUBMIT_FAILURE',
        payload: { error: 'Network error' },
      };

      const now = Date.now();
      const result = appReducer(stateWith2Failures, action);

      expect(result.submitRetryCount).toBe(3);
      expect(result.submitCooldownUntil).not.toBeNull();
      // Cooldown should be approximately 60 seconds from now
      expect(result.submitCooldownUntil!).toBeGreaterThanOrEqual(now + 59_000);
      expect(result.submitCooldownUntil!).toBeLessThanOrEqual(now + 61_000);
    });

    it('does not activate cooldown before 3 failures', () => {
      const stateWith1Failure: AppState = {
        ...initialState,
        submitRetryCount: 1,
      };

      const action: AppAction = {
        type: 'SUBMIT_FAILURE',
        payload: { error: 'Timeout' },
      };

      const result = appReducer(stateWith1Failure, action);

      expect(result.submitRetryCount).toBe(2);
      expect(result.submitCooldownUntil).toBeNull();
    });
  });

  describe('CLEAR_LAYOUT', () => {
    it('clears all boxes and resets item number', () => {
      const stateWithBoxes: AppState = {
        ...initialState,
        grid: { columnsX: 5, rowsY: 5 },
        boxes: [
          {
            id: 'box-1',
            itemNumber: 1,
            startCell: { col: 0, row: 0 },
            endCell: { col: 1, row: 1 },
            widthUnits: 2,
            depthUnits: 2,
            heightUnits: 1,
            isMakerWorldModel: false,
            color: '#4CAF50',
          },
        ],
        nextItemNumber: 2,
      };

      const action: AppAction = { type: 'CLEAR_LAYOUT' };
      const result = appReducer(stateWithBoxes, action);

      expect(result.boxes).toEqual([]);
      expect(result.nextItemNumber).toBe(1);
    });

    it('resets selection and placement mode', () => {
      const stateWithSelection: AppState = {
        ...initialState,
        placementMode: { active: true, itemType: 'standard' },
        selection: { startCell: { col: 0, row: 0 }, endCell: null },
      };

      const action: AppAction = { type: 'CLEAR_LAYOUT' };
      const result = appReducer(stateWithSelection, action);

      expect(result.placementMode.active).toBe(false);
      expect(result.selection.startCell).toBeNull();
      expect(result.selection.endCell).toBeNull();
    });

    it('preserves grid and dimensions', () => {
      const stateWithGrid: AppState = {
        ...initialState,
        grid: { columnsX: 5, rowsY: 5 },
        dimensions: { width: 210, depth: 210, height: 70 },
      };

      const action: AppAction = { type: 'CLEAR_LAYOUT' };
      const result = appReducer(stateWithGrid, action);

      expect(result.grid).toEqual({ columnsX: 5, rowsY: 5 });
      expect(result.dimensions).toEqual({ width: 210, depth: 210, height: 70 });
    });
  });

  describe('unknown action', () => {
    it('returns state unchanged for unknown action type', () => {
      const action = { type: 'UNKNOWN_ACTION' } as unknown as AppAction;
      const result = appReducer(initialState, action);

      expect(result).toBe(initialState);
    });
  });
});
