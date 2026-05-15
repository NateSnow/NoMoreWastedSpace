/**
 * Core TypeScript interfaces for the Gridfinity Drawer Designer.
 *
 * These types define the domain model for drawer dimensions, grid calculations,
 * box placement, MakerWorld integration, spec file output, and application state.
 */

// --- Drawer & Grid ---

/** Drawer physical dimensions in millimeters. */
export interface DrawerDimensions {
  /** Width in mm, must be >= 42 and <= 2000 */
  width: number;
  /** Depth in mm, must be >= 42 and <= 2000 */
  depth: number;
  /** Height in mm, must be > 0 and <= 2000 */
  height: number;
}

/** Computed Gridfinity grid dimensions in grid units. */
export interface GridDimensions {
  /** Number of columns: floor(width / 42) */
  columnsX: number;
  /** Number of rows: floor(depth / 42) */
  rowsY: number;
}

// --- Cell & Box ---

/** A single cell position on the grid (0-indexed). */
export interface CellCoordinate {
  /** Column index, 0 to columnsX - 1 */
  col: number;
  /** Row index, 0 to rowsY - 1 */
  row: number;
}

/** A placed box occupying a rectangular region of grid cells. */
export interface Box {
  /** Unique identifier */
  id: string;
  /** Sequential display number: 1, 2, 3... */
  itemNumber: number;
  /** Top-left corner of the occupied region */
  startCell: CellCoordinate;
  /** Bottom-right corner of the occupied region */
  endCell: CellCoordinate;
  /** Number of grid units wide */
  widthUnits: number;
  /** Number of grid units deep */
  depthUnits: number;
  /** Height in Height_Units (7mm each) */
  heightUnits: number;
  /** Whether this box is a MakerWorld model placement */
  isMakerWorldModel: boolean;
  /** MakerWorld model name (if applicable) */
  makerWorldName?: string;
  /** MakerWorld platform identifier (if applicable) */
  makerWorldId?: string;
  /** Assigned display color */
  color?: string;
}

// --- MakerWorld ---

/** A MakerWorld model search result. */
export interface MakerWorldModel {
  /** Unique MakerWorld platform identifier */
  id: string;
  /** Model name, truncated to 60 characters if longer */
  name: string;
  /** URL to the model thumbnail image */
  thumbnailUrl: string;
  /** Required grid units wide for placement */
  gridWidth: number;
  /** Required grid units deep for placement */
  gridDepth: number;
}

// --- Spec File Output ---

/** A single box entry in the spec file output. */
export interface SpecBoxEntry {
  /** Sequential item number */
  itemNumber: number;
  /** Grid position (top-left cell) */
  gridPosition: CellCoordinate;
  /** Size in grid units */
  sizeUnits: { width: number; depth: number };
  /** Height in Height_Units */
  heightUnits: number;
  /** Optional MakerWorld model reference */
  makerWorldModel?: {
    name: string;
    platformId: string;
  };
}

/** The complete spec file submitted to the Operator. */
export interface SpecFile {
  /** Baseplate dimensions */
  baseplate: {
    /** Grid width in Grid_Units */
    gridWidth: number;
    /** Grid depth in Grid_Units */
    gridDepth: number;
    /** Total width in mm (gridWidth * 42) */
    totalWidthMm: number;
    /** Total depth in mm (gridDepth * 42) */
    totalDepthMm: number;
  };
  /** All box specifications */
  boxes: SpecBoxEntry[];
}

// --- Layout ---

/** Complete layout state representing one drawer design. */
export interface Layout {
  /** Physical drawer dimensions */
  drawerDimensions: DrawerDimensions;
  /** Computed grid dimensions */
  grid: GridDimensions;
  /** All placed boxes */
  boxes: Box[];
  /** Height configuration */
  heightConfig: {
    /** Whether variable height mode is enabled */
    variableMode: boolean;
    /** Default height in Height_Units */
    defaultHeight: number;
  };
}

// --- Application State ---

/** Height configuration state. */
export interface HeightConfig {
  /** Whether variable height mode is enabled */
  variableMode: boolean;
  /** Default height in Height_Units (default = 1) */
  defaultHeight: number;
  /** Maximum allowed height: floor(drawerHeight / 7) */
  maxHeight: number;
}

/** Current placement mode state. */
export interface PlacementMode {
  /** Whether placement mode is active */
  active: boolean;
  /** Type of item being placed */
  itemType: 'standard' | 'makerworld';
  /** MakerWorld model being placed (if itemType is 'makerworld') */
  makerWorldModel?: MakerWorldModel;
}

/** Current cell selection state during placement. */
export interface SelectionState {
  /** First corner cell (set on first click) */
  startCell: CellCoordinate | null;
  /** Second corner cell (set on second click) */
  endCell: CellCoordinate | null;
}

/** Full application state managed by the state reducer. */
export interface AppState {
  // Input phase
  /** Current drawer dimensions (null before first valid input) */
  dimensions: DrawerDimensions | null;
  /** Validation errors for dimension inputs */
  dimensionErrors: string[];

  // Grid phase
  /** Computed grid (null before valid dimensions submitted) */
  grid: GridDimensions | null;

  // Layout phase
  /** All placed boxes */
  boxes: Box[];
  /** Next item number to assign */
  nextItemNumber: number;
  /** Height configuration */
  heightConfig: HeightConfig;

  // Interaction state
  /** Current placement mode */
  placementMode: PlacementMode;
  /** Current cell selection during placement */
  selection: SelectionState;

  // Search state
  /** Current search keyword */
  searchKeyword: string;
  /** MakerWorld search results */
  searchResults: MakerWorldModel[];
  /** Whether a search is in progress */
  searchLoading: boolean;
  /** Search error message (null if no error) */
  searchError: string | null;

  // Submission state
  /** Whether a submission is in progress */
  submitting: boolean;
  /** Number of consecutive submission failures */
  submitRetryCount: number;
  /** Timestamp when cooldown expires (null if not in cooldown) */
  submitCooldownUntil: number | null;
  /** Submission error message (null if no error) */
  submitError: string | null;
}
