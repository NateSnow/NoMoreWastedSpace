/**
 * Grid Calculator for the Gridfinity Drawer Designer.
 *
 * Validates drawer dimension inputs and calculates the Gridfinity grid
 * dimensions (columns × rows) based on the standard 42mm grid unit.
 */

import type { DrawerDimensions, GridDimensions } from './types';
import { GRID_BASE_MM, MAX_DIMENSION_MM, MIN_GRID_DIMENSION_MM } from './constants';

/** Result of validating dimension inputs. */
export interface DimensionValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates raw string inputs for drawer dimensions.
 *
 * Checks for non-numeric, zero, negative, too-small, and too-large values.
 * Width and depth must be in [42, 2000]. Height must be in (0, 2000].
 *
 * @param input - Raw string values from user input fields
 * @returns Validation result with any error messages
 */
export function validateDimensions(input: {
  width: string;
  depth: string;
  height: string;
}): DimensionValidationResult {
  const errors: string[] = [];

  // Validate width
  const widthErrors = validateSingleDimension(input.width, 'Width', true);
  errors.push(...widthErrors);

  // Validate depth
  const depthErrors = validateSingleDimension(input.depth, 'Depth', true);
  errors.push(...depthErrors);

  // Validate height
  const heightErrors = validateSingleDimension(input.height, 'Height', false);
  errors.push(...heightErrors);

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a single dimension value.
 *
 * @param value - Raw string input
 * @param label - Field label for error messages (e.g., "Width")
 * @param isGridDimension - Whether this is a width/depth (requires >= 42mm)
 * @returns Array of error messages (empty if valid)
 */
function validateSingleDimension(
  value: string,
  label: string,
  isGridDimension: boolean
): string[] {
  const errors: string[] = [];
  const trimmed = value.trim();

  // Check for empty or non-numeric
  if (trimmed === '' || isNaN(Number(trimmed))) {
    errors.push(`${label} must be a valid number`);
    return errors;
  }

  const num = Number(trimmed);

  // Check for zero or negative
  if (num <= 0) {
    errors.push(`${label} must be a positive number`);
    return errors;
  }

  // For width/depth: check minimum grid dimension
  if (isGridDimension && num < MIN_GRID_DIMENSION_MM) {
    errors.push(
      `${label} is too small for the Gridfinity system (minimum ${MIN_GRID_DIMENSION_MM}mm)`
    );
    return errors;
  }

  // Check maximum dimension
  if (num > MAX_DIMENSION_MM) {
    errors.push(`${label} exceeds maximum supported size (${MAX_DIMENSION_MM}mm)`);
    return errors;
  }

  return errors;
}

/**
 * Calculates the Gridfinity grid dimensions from validated drawer dimensions.
 *
 * Uses the 21mm grid base (half-unit) to determine how many columns (X axis)
 * and rows (Y axis) fit within the drawer. This matches the GRIPS baseplate
 * generator with "Grid base size: 21mm" and "Half-width on edge" enabled.
 *
 * Standard Gridfinity bins occupy 2×2 cells (42mm × 42mm) on this grid.
 *
 * @param dimensions - Validated drawer dimensions in millimeters
 * @returns Grid dimensions in 21mm grid base units
 */
export function calculateGrid(dimensions: DrawerDimensions): GridDimensions {
  return {
    columnsX: Math.floor(dimensions.width / GRID_BASE_MM),
    rowsY: Math.floor(dimensions.depth / GRID_BASE_MM),
  };
}
