/**
 * Core constants for the Gridfinity Drawer Designer.
 *
 * These values define the Gridfinity system parameters, validation limits,
 * and application constraints referenced throughout the codebase.
 */

// --- Gridfinity System Constants ---

/** Standard Gridfinity grid unit size in millimeters. */
export const GRID_UNIT_MM = 42;

/** Half-unit grid base size in millimeters (used for GRIPS-compatible layout). */
export const GRID_BASE_MM = 21;

/** Standard Gridfinity height unit size in millimeters. */
export const HEIGHT_UNIT_MM = 7;

/** Default smallest build plate dimension in mm (for plate splitting). */
export const DEFAULT_BUILD_PLATE_MM = 220;

/** Width added per plate joint (dovetail connection) in mm. */
export const PLATE_JOINT_MM = 10;

// --- Dimension Validation Limits ---

/** Maximum supported dimension in millimeters (width, depth, or height). */
export const MAX_DIMENSION_MM = 2000;

/** Minimum dimension in mm for width/depth to form at least one grid unit. */
export const MIN_GRID_DIMENSION_MM = 21;

/** Minimum height in mm (must be positive). */
export const MIN_HEIGHT_MM = 1;

// --- Layout Constraints ---

/** Maximum number of boxes allowed in a single layout. */
export const MAX_BOXES_PER_LAYOUT = 50;

// --- MakerWorld Search Constants ---

/** Minimum keyword length required to trigger a search. */
export const MIN_SEARCH_KEYWORD_LENGTH = 2;

/** Maximum number of search results returned. */
export const MAX_SEARCH_RESULTS = 10;

/** Search request timeout in milliseconds. */
export const SEARCH_TIMEOUT_MS = 10_000;

/** Maximum displayed name length for MakerWorld models. */
export const MAX_MODEL_NAME_LENGTH = 60;

// --- Submission Constants ---

/** Submission request timeout in milliseconds. */
export const SUBMIT_TIMEOUT_MS = 30_000;

/** Number of consecutive failures before cooldown activates. */
export const MAX_SUBMIT_RETRIES = 3;

/** Cooldown duration in milliseconds after max retries exceeded. */
export const SUBMIT_COOLDOWN_MS = 60_000;

// --- Visual Constants ---

/** Minimum number of distinct box colors before repeating. */
export const BOX_COLOR_COUNT = 8;

/** Default box color palette (8 visually distinct colors). */
export const BOX_COLORS: readonly string[] = [
  '#4CAF50', // green
  '#2196F3', // blue
  '#FF9800', // orange
  '#9C27B0', // purple
  '#F44336', // red
  '#00BCD4', // cyan
  '#FFEB3B', // yellow
  '#795548', // brown
] as const;

/** Background color for unoccupied grid cells. */
export const UNOCCUPIED_CELL_COLOR = '#E0E0E0';

/** Border color for grid lines. */
export const GRID_BORDER_COLOR = '#9E9E9E';
