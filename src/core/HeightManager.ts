import type { Box } from './types';
import { HEIGHT_UNIT_MM } from './constants';

/**
 * Result of validating a height value.
 */
export interface HeightValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

/**
 * Manages box height configuration with uniform and variable modes.
 *
 * In uniform mode (variable=false), all boxes use the default height (1 Height_Unit).
 * In variable mode (variable=true), each box uses its own heightUnits value,
 * falling back to the default height if not explicitly set.
 */
export class HeightManager {
  private readonly maxHeight: number;
  private variableMode: boolean = false;
  private defaultHeight: number = 1;

  /**
   * @param drawerHeightMm - The drawer height in millimeters.
   *   Used to compute the maximum allowed height in Height_Units.
   */
  constructor(drawerHeightMm: number) {
    this.maxHeight = Math.floor(drawerHeightMm / HEIGHT_UNIT_MM);
  }

  /**
   * Enable or disable variable height mode.
   * When disabled, all boxes use the default height.
   * When enabled, each box can have its own height.
   */
  setVariableMode(enabled: boolean): void {
    this.variableMode = enabled;
  }

  /**
   * Returns whether variable height mode is currently enabled.
   */
  isVariableMode(): boolean {
    return this.variableMode;
  }

  /**
   * Set the default height applied to boxes.
   */
  setDefaultHeight(units: number): void {
    this.defaultHeight = units;
  }

  /**
   * Get the current default height in Height_Units.
   */
  getDefaultHeight(): number {
    return this.defaultHeight;
  }

  /**
   * Get the maximum allowed height in Height_Units, derived from drawer height.
   * Computed as floor(drawerHeightMm / 7).
   */
  getMaxHeight(): number {
    return this.maxHeight;
  }

  /**
   * Validate a height value in Height_Units.
   *
   * Returns:
   * - valid=true with no error/warning for values in [1, maxHeight]
   * - valid=true with a warning for positive integers > maxHeight (exceeds drawer)
   * - valid=false with an error for values <= 0 or non-integer values
   */
  validateHeight(units: number): HeightValidationResult {
    // Check for non-integer or less than 1
    if (!Number.isInteger(units) || units < 1) {
      return {
        valid: false,
        error: `Must be integer between 1 and ${this.maxHeight}`,
      };
    }

    // Check if exceeds drawer height (warning, not error)
    if (units > this.maxHeight) {
      return {
        valid: true,
        warning: 'Box will not fit in drawer',
      };
    }

    // Valid height within range
    return { valid: true };
  }

  /**
   * Get the effective height for a box based on the current mode.
   *
   * - In uniform mode: always returns the default height (1 Height_Unit)
   * - In variable mode: returns the box's own heightUnits value
   */
  getEffectiveHeight(box: Box): number {
    if (!this.variableMode) {
      return this.defaultHeight;
    }
    return box.heightUnits;
  }
}
