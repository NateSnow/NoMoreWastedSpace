/**
 * HeightControls component for the Gridfinity Drawer Designer.
 *
 * Provides:
 * - A toggle for variable height mode (Req 4.2)
 * - Per-box height input fields when variable mode is enabled (Req 4.4)
 * - Inline validation errors and warnings (Req 4.6, 4.7)
 * - Dispatches SET_HEIGHT_MODE and SET_BOX_HEIGHT actions via useAppState
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */

import { useState, useCallback } from 'react';
import { useAppState } from '../state/AppStateContext';
import { HeightManager } from '../core/HeightManager';

interface BoxHeightError {
  error?: string;
  warning?: string;
}

export function HeightControls() {
  const { state, dispatch } = useAppState();
  const { heightConfig, boxes, dimensions } = state;

  // Track validation state per box
  const [validationMessages, setValidationMessages] = useState<
    Record<string, BoxHeightError>
  >({});

  // Track raw input values for controlled inputs (allows empty/invalid strings)
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  const drawerHeightMm = dimensions?.height ?? 0;
  const heightManager = new HeightManager(drawerHeightMm);
  const maxHeight = heightManager.getMaxHeight();

  const handleToggleVariableMode = useCallback(() => {
    dispatch({
      type: 'SET_HEIGHT_MODE',
      payload: { variableMode: !heightConfig.variableMode },
    });
  }, [dispatch, heightConfig.variableMode]);

  const handleHeightChange = useCallback(
    (boxId: string, rawValue: string) => {
      // Update the raw input value
      setInputValues((prev) => ({ ...prev, [boxId]: rawValue }));

      const trimmed = rawValue.trim();

      // Allow empty input — will fall back to default (Req 4.8)
      if (trimmed === '') {
        setValidationMessages((prev) => ({
          ...prev,
          [boxId]: {},
        }));
        dispatch({
          type: 'SET_BOX_HEIGHT',
          payload: { boxId, heightUnits: heightConfig.defaultHeight },
        });
        return;
      }

      const numValue = Number(trimmed);

      // Non-numeric check
      if (isNaN(numValue)) {
        setValidationMessages((prev) => ({
          ...prev,
          [boxId]: { error: `Must be integer between 1 and ${maxHeight}` },
        }));
        return;
      }

      // Use HeightManager for validation
      const result = heightManager.validateHeight(numValue);

      if (!result.valid) {
        setValidationMessages((prev) => ({
          ...prev,
          [boxId]: { error: result.error },
        }));
        return;
      }

      // Valid value — dispatch and set any warning
      setValidationMessages((prev) => ({
        ...prev,
        [boxId]: { warning: result.warning },
      }));

      dispatch({
        type: 'SET_BOX_HEIGHT',
        payload: { boxId, heightUnits: numValue },
      });
    },
    [dispatch, heightConfig.defaultHeight, heightManager, maxHeight]
  );

  return (
    <section aria-labelledby="height-controls-heading">
      <h2 id="height-controls-heading">Box Height Configuration</h2>

      <p>
        Default height: <strong>{heightConfig.defaultHeight} Height Unit(s)</strong>
        {maxHeight > 0 && (
          <span> (max: {maxHeight} units for this drawer)</span>
        )}
      </p>

      <div>
        <label htmlFor="variable-height-toggle">
          <input
            id="variable-height-toggle"
            type="checkbox"
            checked={heightConfig.variableMode}
            onChange={handleToggleVariableMode}
            aria-describedby="variable-height-description"
          />
          {' '}Enable variable box heights
        </label>
        <p id="variable-height-description" style={{ fontSize: '0.85em', margin: '4px 0 0 0' }}>
          {heightConfig.variableMode
            ? 'Each box can have a different height.'
            : 'All boxes use the default height.'}
        </p>
      </div>

      {heightConfig.variableMode && boxes.length > 0 && (
        <fieldset aria-label="Per-box height settings">
          <legend>Per-Box Heights</legend>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {boxes.map((box) => {
              const boxValidation = validationMessages[box.id] ?? {};
              const displayValue =
                inputValues[box.id] !== undefined
                  ? inputValues[box.id]
                  : String(box.heightUnits);
              const inputId = `box-height-${box.id}`;
              const errorId = `box-height-error-${box.id}`;
              const warningId = `box-height-warning-${box.id}`;

              const describedBy = [
                boxValidation.error ? errorId : null,
                boxValidation.warning ? warningId : null,
              ]
                .filter(Boolean)
                .join(' ') || undefined;

              return (
                <li key={box.id} style={{ marginBottom: '8px' }}>
                  <label htmlFor={inputId}>
                    Item {box.itemNumber} ({box.widthUnits}×{box.depthUnits}):
                  </label>{' '}
                  <input
                    id={inputId}
                    type="number"
                    min={1}
                    max={maxHeight}
                    step={1}
                    value={displayValue}
                    onChange={(e) => handleHeightChange(box.id, e.target.value)}
                    aria-invalid={!!boxValidation.error}
                    aria-describedby={describedBy}
                    style={{ width: '60px' }}
                  />{' '}
                  <span aria-label="height unit">Height Units</span>
                  {boxValidation.error && (
                    <p
                      id={errorId}
                      role="alert"
                      style={{ color: 'red', margin: '2px 0 0 0', fontSize: '0.85em' }}
                    >
                      {boxValidation.error}
                    </p>
                  )}
                  {boxValidation.warning && (
                    <p
                      id={warningId}
                      role="status"
                      style={{ color: 'orange', margin: '2px 0 0 0', fontSize: '0.85em' }}
                    >
                      {boxValidation.warning}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      {heightConfig.variableMode && boxes.length === 0 && (
        <p>No boxes placed yet. Place boxes on the grid to configure individual heights.</p>
      )}
    </section>
  );
}
