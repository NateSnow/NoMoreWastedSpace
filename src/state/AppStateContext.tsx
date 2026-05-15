/**
 * Application State Management for the Gridfinity Drawer Designer.
 *
 * Uses React Context + useReducer to manage all application state transitions.
 * Provides an AppStateProvider component and a useAppState() hook for consumers.
 */

import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type {
  AppState,
  Box,
  CellCoordinate,
  DrawerDimensions,
  MakerWorldModel,
} from '../core/types';
import { calculateGrid } from '../core/GridCalculator';
import { HEIGHT_UNIT_MM } from '../core/constants';

// --- Action Types ---

export type AppAction =
  | { type: 'SET_DIMENSIONS'; payload: { dimensions: DrawerDimensions; errors: string[] } }
  | { type: 'CALCULATE_GRID'; payload: DrawerDimensions }
  | { type: 'PLACE_BOX'; payload: { start: CellCoordinate; end: CellCoordinate } }
  | { type: 'REMOVE_BOX'; payload: { boxId: string } }
  | { type: 'SET_HEIGHT_MODE'; payload: { variableMode: boolean } }
  | { type: 'SET_BOX_HEIGHT'; payload: { boxId: string; heightUnits: number } }
  | { type: 'SET_SEARCH_RESULTS'; payload: { results: MakerWorldModel[]; error?: string | null; loading?: boolean } }
  | { type: 'SET_SEARCH_KEYWORD'; payload: { keyword: string } }
  | { type: 'ENTER_PLACEMENT_MODE'; payload: { itemType: 'standard' | 'makerworld'; makerWorldModel?: MakerWorldModel } }
  | { type: 'EXIT_PLACEMENT_MODE' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_FAILURE'; payload: { error: string } }
  | { type: 'CLEAR_LAYOUT' };

// --- Initial State ---

export const initialState: AppState = {
  // Input phase
  dimensions: null,
  dimensionErrors: [],

  // Grid phase
  grid: null,

  // Layout phase
  boxes: [],
  nextItemNumber: 1,
  heightConfig: {
    variableMode: false,
    defaultHeight: 1,
    maxHeight: 0,
  },

  // Interaction state
  placementMode: {
    active: false,
    itemType: 'standard',
  },
  selection: {
    startCell: null,
    endCell: null,
  },

  // Search state
  searchKeyword: '',
  searchResults: [],
  searchLoading: false,
  searchError: null,

  // Submission state
  submitting: false,
  submitRetryCount: 0,
  submitCooldownUntil: null,
  submitError: null,
};

// --- Helper: compute max height from dimensions ---

function computeMaxHeight(dimensions: DrawerDimensions): number {
  return Math.floor(dimensions.height / HEIGHT_UNIT_MM);
}

// --- Helper: check overlap against existing boxes ---

function hasOverlapWithExisting(
  boxes: Box[],
  start: CellCoordinate,
  end: CellCoordinate
): boolean {
  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);

  return boxes.some((box) => {
    const colOverlap = minCol <= box.endCell.col && maxCol >= box.startCell.col;
    const rowOverlap = minRow <= box.endCell.row && maxRow >= box.startCell.row;
    return colOverlap && rowOverlap;
  });
}

// --- Color palette for box assignment ---
import { BOX_COLORS } from '../core/constants';

function assignColor(boxIndex: number): string {
  return BOX_COLORS[boxIndex % BOX_COLORS.length];
}

// --- Reducer ---

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_DIMENSIONS': {
      const { dimensions, errors } = action.payload;
      return {
        ...state,
        dimensions: errors.length === 0 ? dimensions : state.dimensions,
        dimensionErrors: errors,
      };
    }

    case 'CALCULATE_GRID': {
      const dimensions = action.payload;
      const grid = calculateGrid(dimensions);
      const maxHeight = computeMaxHeight(dimensions);
      return {
        ...state,
        dimensions,
        dimensionErrors: [],
        grid,
        boxes: [],
        nextItemNumber: 1,
        heightConfig: {
          ...state.heightConfig,
          maxHeight,
        },
        // Reset interaction state
        placementMode: { active: false, itemType: 'standard' },
        selection: { startCell: null, endCell: null },
      };
    }

    case 'PLACE_BOX': {
      if (!state.grid) return state;

      const { start, end } = action.payload;

      // Check for overlap with existing boxes
      if (hasOverlapWithExisting(state.boxes, start, end)) {
        return state;
      }

      // Normalize coordinates
      const startCell: CellCoordinate = {
        col: Math.min(start.col, end.col),
        row: Math.min(start.row, end.row),
      };
      const endCell: CellCoordinate = {
        col: Math.max(start.col, end.col),
        row: Math.max(start.row, end.row),
      };

      const widthUnits = endCell.col - startCell.col + 1;
      const depthUnits = endCell.row - startCell.row + 1;

      const newBox: Box = {
        id: `box-${state.nextItemNumber}`,
        itemNumber: state.nextItemNumber,
        startCell,
        endCell,
        widthUnits,
        depthUnits,
        heightUnits: state.heightConfig.defaultHeight,
        isMakerWorldModel: false,
        color: assignColor(state.boxes.length),
      };

      return {
        ...state,
        boxes: [...state.boxes, newBox],
        nextItemNumber: state.nextItemNumber + 1,
        // Reset selection after placement
        selection: { startCell: null, endCell: null },
      };
    }

    case 'REMOVE_BOX': {
      const { boxId } = action.payload;
      return {
        ...state,
        boxes: state.boxes.filter((box) => box.id !== boxId),
      };
    }

    case 'SET_HEIGHT_MODE': {
      const { variableMode } = action.payload;
      return {
        ...state,
        heightConfig: {
          ...state.heightConfig,
          variableMode,
        },
      };
    }

    case 'SET_BOX_HEIGHT': {
      const { boxId, heightUnits } = action.payload;
      return {
        ...state,
        boxes: state.boxes.map((box) =>
          box.id === boxId ? { ...box, heightUnits } : box
        ),
      };
    }

    case 'SET_SEARCH_RESULTS': {
      const { results, error = null, loading = false } = action.payload;
      return {
        ...state,
        searchResults: results,
        searchError: error,
        searchLoading: loading,
      };
    }

    case 'SET_SEARCH_KEYWORD': {
      const { keyword } = action.payload;
      return {
        ...state,
        searchKeyword: keyword,
      };
    }

    case 'ENTER_PLACEMENT_MODE': {
      const { itemType, makerWorldModel } = action.payload;
      return {
        ...state,
        placementMode: {
          active: true,
          itemType,
          makerWorldModel,
        },
        selection: { startCell: null, endCell: null },
      };
    }

    case 'EXIT_PLACEMENT_MODE': {
      return {
        ...state,
        placementMode: { active: false, itemType: 'standard' },
        selection: { startCell: null, endCell: null },
      };
    }

    case 'SUBMIT_START': {
      return {
        ...state,
        submitting: true,
        submitError: null,
      };
    }

    case 'SUBMIT_SUCCESS': {
      return {
        ...state,
        submitting: false,
        submitRetryCount: 0,
        submitCooldownUntil: null,
        submitError: null,
      };
    }

    case 'SUBMIT_FAILURE': {
      const { error } = action.payload;
      const newRetryCount = state.submitRetryCount + 1;
      const cooldownUntil =
        newRetryCount >= 3 ? Date.now() + 60_000 : null;

      return {
        ...state,
        submitting: false,
        submitRetryCount: newRetryCount,
        submitCooldownUntil: cooldownUntil,
        submitError: error,
      };
    }

    case 'CLEAR_LAYOUT': {
      return {
        ...state,
        boxes: [],
        nextItemNumber: 1,
        selection: { startCell: null, endCell: null },
        placementMode: { active: false, itemType: 'standard' },
      };
    }

    default:
      return state;
  }
}

// --- Context ---

interface AppStateContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

// --- Provider ---

interface AppStateProviderProps {
  children: ReactNode;
  initialStateOverride?: AppState;
}

export function AppStateProvider({ children, initialStateOverride }: AppStateProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialStateOverride ?? initialState);

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
}

// --- Hook ---

export function useAppState(): AppStateContextValue {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

export { AppStateContext };
