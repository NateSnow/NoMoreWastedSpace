/**
 * Unit tests for the DimensionInput component.
 *
 * Tests input fields, validation errors, confirmation dialog behavior,
 * and accessibility attributes.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { DimensionInput } from './DimensionInput';
import { AppStateProvider } from '../state/AppStateContext';
import type { AppState } from '../core/types';
import { initialState } from '../state/AppStateContext';

/** Helper to render DimensionInput within the AppStateProvider. */
function renderWithState(stateOverride?: Partial<AppState>) {
  const state = { ...initialState, ...stateOverride } as AppState;
  return render(
    <AppStateProvider initialStateOverride={state}>
      <DimensionInput />
    </AppStateProvider>
  );
}

describe('DimensionInput', () => {
  it('renders three input fields for width, depth, and height', () => {
    renderWithState();

    expect(screen.getByLabelText('Width (mm)')).toBeInTheDocument();
    expect(screen.getByLabelText('Depth (mm)')).toBeInTheDocument();
    expect(screen.getByLabelText('Height (mm)')).toBeInTheDocument();
  });

  it('renders a Calculate Grid button', () => {
    renderWithState();

    expect(
      screen.getByRole('button', { name: /calculate grid/i })
    ).toBeInTheDocument();
  });

  it('displays validation errors for empty inputs', () => {
    renderWithState();

    fireEvent.click(screen.getByRole('button', { name: /calculate grid/i }));

    expect(screen.getByText(/Width must be a valid number/i)).toBeInTheDocument();
    expect(screen.getByText(/Depth must be a valid number/i)).toBeInTheDocument();
    expect(screen.getByText(/Height must be a valid number/i)).toBeInTheDocument();
  });

  it('displays "too small" error for width less than 42mm', () => {
    renderWithState();

    fireEvent.change(screen.getByLabelText('Width (mm)'), {
      target: { value: '30' },
    });
    fireEvent.change(screen.getByLabelText('Depth (mm)'), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText('Height (mm)'), {
      target: { value: '50' },
    });

    fireEvent.click(screen.getByRole('button', { name: /calculate grid/i }));

    expect(
      screen.getByText(/Width is too small for the Gridfinity system/i)
    ).toBeInTheDocument();
  });

  it('displays "exceeds maximum" error for depth greater than 2000mm', () => {
    renderWithState();

    fireEvent.change(screen.getByLabelText('Width (mm)'), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText('Depth (mm)'), {
      target: { value: '2500' },
    });
    fireEvent.change(screen.getByLabelText('Height (mm)'), {
      target: { value: '50' },
    });

    fireEvent.click(screen.getByRole('button', { name: /calculate grid/i }));

    expect(
      screen.getByText(/Depth exceeds maximum supported size/i)
    ).toBeInTheDocument();
  });

  it('does not show confirmation dialog when no boxes exist', () => {
    renderWithState();

    fireEvent.change(screen.getByLabelText('Width (mm)'), {
      target: { value: '200' },
    });
    fireEvent.change(screen.getByLabelText('Depth (mm)'), {
      target: { value: '300' },
    });
    fireEvent.change(screen.getByLabelText('Height (mm)'), {
      target: { value: '50' },
    });

    fireEvent.click(screen.getByRole('button', { name: /calculate grid/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows confirmation dialog when boxes exist and dimensions change', () => {
    const stateWithBoxes: Partial<AppState> = {
      dimensions: { width: 200, depth: 300, height: 50 },
      grid: { columnsX: 4, rowsY: 7 },
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

    renderWithState(stateWithBoxes);

    fireEvent.change(screen.getByLabelText('Width (mm)'), {
      target: { value: '400' },
    });
    fireEvent.change(screen.getByLabelText('Depth (mm)'), {
      target: { value: '400' },
    });
    fireEvent.change(screen.getByLabelText('Height (mm)'), {
      target: { value: '60' },
    });

    fireEvent.click(screen.getByRole('button', { name: /calculate grid/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText(/Changing drawer dimensions will clear your current layout/i)
    ).toBeInTheDocument();
  });

  it('cancels dimension change when Cancel is clicked in confirmation dialog', () => {
    const stateWithBoxes: Partial<AppState> = {
      dimensions: { width: 200, depth: 300, height: 50 },
      grid: { columnsX: 4, rowsY: 7 },
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

    renderWithState(stateWithBoxes);

    fireEvent.change(screen.getByLabelText('Width (mm)'), {
      target: { value: '400' },
    });
    fireEvent.change(screen.getByLabelText('Depth (mm)'), {
      target: { value: '400' },
    });
    fireEvent.change(screen.getByLabelText('Height (mm)'), {
      target: { value: '60' },
    });

    fireEvent.click(screen.getByRole('button', { name: /calculate grid/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has proper aria-invalid attributes on fields with errors', () => {
    renderWithState();

    fireEvent.click(screen.getByRole('button', { name: /calculate grid/i }));

    expect(screen.getByLabelText('Width (mm)')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(screen.getByLabelText('Depth (mm)')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(screen.getByLabelText('Height (mm)')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });

  it('has aria-invalid false when inputs are valid', () => {
    renderWithState();

    // Before submission, aria-invalid should be false (no errors)
    expect(screen.getByLabelText('Width (mm)')).toHaveAttribute(
      'aria-invalid',
      'false'
    );
  });

  it('has a section with proper heading', () => {
    renderWithState();

    expect(
      screen.getByRole('heading', { name: /drawer dimensions/i })
    ).toBeInTheDocument();
  });
});
