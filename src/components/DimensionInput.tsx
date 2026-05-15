/**
 * DimensionInput component for the Gridfinity Drawer Designer.
 *
 * Provides input fields for drawer width, depth, and height in millimeters.
 * Validates inputs using GridCalculator and dispatches state updates.
 * Shows a confirmation dialog when changing dimensions with an existing layout.
 *
 * Requirements: 1.1, 1.4, 1.5, 1.6, 8.3
 */

import { useState, useCallback } from 'react';
import { useAppState } from '../state/AppStateContext';
import { validateDimensions } from '../core/GridCalculator';
import type { DrawerDimensions } from '../core/types';

/** Per-field error messages for inline display. */
interface FieldErrors {
  width: string[];
  depth: string[];
  height: string[];
}

/**
 * Parses validation errors into per-field error arrays.
 * Matches errors to fields based on the field label prefix in the error message.
 */
function categorizeErrors(errors: string[]): FieldErrors {
  const fieldErrors: FieldErrors = { width: [], depth: [], height: [] };
  for (const error of errors) {
    if (error.startsWith('Width')) {
      fieldErrors.width.push(error);
    } else if (error.startsWith('Depth')) {
      fieldErrors.depth.push(error);
    } else if (error.startsWith('Height')) {
      fieldErrors.height.push(error);
    }
  }
  return fieldErrors;
}

export function DimensionInput() {
  const { state, dispatch } = useAppState();

  // Local input values (strings for controlled inputs)
  const [width, setWidth] = useState<string>(
    state.dimensions?.width.toString() ?? ''
  );
  const [depth, setDepth] = useState<string>(
    state.dimensions?.depth.toString() ?? ''
  );
  const [height, setHeight] = useState<string>(
    state.dimensions?.height.toString() ?? ''
  );

  // Per-field validation errors
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    width: [],
    depth: [],
    height: [],
  });

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingDimensions, setPendingDimensions] =
    useState<DrawerDimensions | null>(null);

  /**
   * Applies validated dimensions: dispatches SET_DIMENSIONS and CALCULATE_GRID.
   */
  const applyDimensions = useCallback(
    (dimensions: DrawerDimensions) => {
      dispatch({
        type: 'SET_DIMENSIONS',
        payload: { dimensions, errors: [] },
      });
      dispatch({
        type: 'CALCULATE_GRID',
        payload: dimensions,
      });
    },
    [dispatch]
  );

  /**
   * Handles the "Calculate Grid" button click.
   * Validates inputs, checks for existing layout, and either applies
   * dimensions directly or shows a confirmation dialog.
   */
  const handleSubmit = useCallback(() => {
    // Convert height units to mm for validation
    const heightMm = (Number(height) * 7).toString();
    const result = validateDimensions({ width, depth, height: heightMm });

    if (!result.valid) {
      const categorized = categorizeErrors(result.errors);
      setFieldErrors(categorized);
      dispatch({
        type: 'SET_DIMENSIONS',
        payload: {
          dimensions: state.dimensions ?? { width: 0, depth: 0, height: 0 },
          errors: result.errors,
        },
      });
      return;
    }

    // Clear field errors on valid input
    setFieldErrors({ width: [], depth: [], height: [] });

    const dimensions: DrawerDimensions = {
      width: Number(width),
      depth: Number(depth),
      height: Number(height) * 7, // Convert height units to mm (1 unit = 7mm)
    };

    // If boxes exist, show confirmation dialog (Req 8.3)
    if (state.boxes.length > 0) {
      setPendingDimensions(dimensions);
      setShowConfirmDialog(true);
      return;
    }

    applyDimensions(dimensions);
  }, [width, depth, height, state.dimensions, state.boxes.length, dispatch, applyDimensions]);

  /**
   * Confirms dimension change: clears layout and applies new dimensions.
   */
  const handleConfirm = useCallback(() => {
    if (pendingDimensions) {
      dispatch({ type: 'CLEAR_LAYOUT' });
      applyDimensions(pendingDimensions);
    }
    setShowConfirmDialog(false);
    setPendingDimensions(null);
  }, [pendingDimensions, dispatch, applyDimensions]);

  /**
   * Cancels the dimension change confirmation.
   */
  const handleCancel = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingDimensions(null);
  }, []);

  return (
    <section aria-labelledby="dimension-input-heading">
      <h2 id="dimension-input-heading">Drawer Dimensions</h2>

      <div role="group" aria-label="Drawer dimension inputs">
        {/* Width field */}
        <div className="dimension-field">
          <label htmlFor="dimension-width">Width (mm)</label>
          <input
            id="dimension-width"
            type="number"
            inputMode="decimal"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            aria-describedby={
              fieldErrors.width.length > 0
                ? 'dimension-width-error'
                : undefined
            }
            aria-invalid={fieldErrors.width.length > 0}
            min={21}
            max={2000}
          />
          {fieldErrors.width.length > 0 && (
            <div
              id="dimension-width-error"
              className="dimension-error"
              role="alert"
              aria-live="polite"
            >
              {fieldErrors.width.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          )}
        </div>

        {/* Depth field */}
        <div className="dimension-field">
          <label htmlFor="dimension-depth">Depth (mm)</label>
          <input
            id="dimension-depth"
            type="number"
            inputMode="decimal"
            value={depth}
            onChange={(e) => setDepth(e.target.value)}
            aria-describedby={
              fieldErrors.depth.length > 0
                ? 'dimension-depth-error'
                : undefined
            }
            aria-invalid={fieldErrors.depth.length > 0}
            min={21}
            max={2000}
          />
          {fieldErrors.depth.length > 0 && (
            <div
              id="dimension-depth-error"
              className="dimension-error"
              role="alert"
              aria-live="polite"
            >
              {fieldErrors.depth.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          )}
        </div>

        {/* Height field */}
        <div className="dimension-field">
          <label htmlFor="dimension-height">Height (units, 1 unit = 7mm)</label>
          <input
            id="dimension-height"
            type="number"
            inputMode="numeric"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            aria-describedby={
              fieldErrors.height.length > 0
                ? 'dimension-height-error'
                : undefined
            }
            aria-invalid={fieldErrors.height.length > 0}
            min={1}
            max={2000}
          />
          {fieldErrors.height.length > 0 && (
            <div
              id="dimension-height-error"
              className="dimension-error"
              role="alert"
              aria-live="polite"
            >
              {fieldErrors.height.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        aria-label="Calculate grid from drawer dimensions"
      >
        Calculate Grid
      </button>

      {/* Confirmation dialog for dimension change with existing layout (Req 8.3) */}
      {showConfirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
          className="confirm-dialog-overlay"
        >
          <div className="confirm-dialog">
            <h3 id="confirm-dialog-title">Change Dimensions?</h3>
            <p id="confirm-dialog-description">
              Changing drawer dimensions will clear your current layout. All
              placed boxes will be removed. Do you want to continue?
            </p>
            <div className="confirm-dialog-actions">
              <button
                type="button"
                onClick={handleConfirm}
                aria-label="Confirm dimension change and clear layout"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={handleCancel}
                aria-label="Cancel dimension change"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
