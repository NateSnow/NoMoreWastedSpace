/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BoxList } from './BoxList';
import { AppStateProvider } from '../state/AppStateContext';
import type { AppState, Box } from '../core/types';
import { initialState } from '../state/AppStateContext';

function renderWithState(stateOverride: Partial<AppState> = {}) {
  const state: AppState = { ...initialState, ...stateOverride };
  return render(
    <AppStateProvider initialStateOverride={state}>
      <BoxList />
    </AppStateProvider>
  );
}

function createBox(overrides: Partial<Box> = {}): Box {
  return {
    id: 'box-1',
    itemNumber: 1,
    startCell: { col: 0, row: 0 },
    endCell: { col: 1, row: 1 },
    widthUnits: 2,
    depthUnits: 2,
    heightUnits: 3,
    isMakerWorldModel: false,
    color: '#4CAF50',
    ...overrides,
  };
}

describe('BoxList', () => {
  it('shows empty message when no boxes are placed', () => {
    renderWithState({ boxes: [] });
    expect(screen.getByText('No boxes placed yet.')).toBeTruthy();
  });

  it('displays item number, size, and height for each box', () => {
    const boxes = [createBox({ itemNumber: 1, widthUnits: 3, depthUnits: 2, heightUnits: 4 })];
    renderWithState({ boxes });

    expect(screen.getByText('Item 1')).toBeTruthy();
    expect(screen.getByText('3×2')).toBeTruthy();
    expect(screen.getByText('H: 4')).toBeTruthy();
  });

  it('displays multiple boxes', () => {
    const boxes = [
      createBox({ id: 'box-1', itemNumber: 1, widthUnits: 2, depthUnits: 2, heightUnits: 1 }),
      createBox({ id: 'box-2', itemNumber: 2, widthUnits: 1, depthUnits: 3, heightUnits: 5, startCell: { col: 3, row: 0 }, endCell: { col: 3, row: 2 } }),
    ];
    renderWithState({ boxes });

    expect(screen.getByText('Item 1')).toBeTruthy();
    expect(screen.getByText('Item 2')).toBeTruthy();
    expect(screen.getByText('Placed Boxes (2)')).toBeTruthy();
  });

  it('shows MakerWorld indicator for model-based boxes', () => {
    const boxes = [
      createBox({
        isMakerWorldModel: true,
        makerWorldName: 'Hex Bit Holder',
        makerWorldId: 'mw-123',
      }),
    ];
    renderWithState({ boxes });

    expect(screen.getByLabelText('MakerWorld model')).toBeTruthy();
    expect(screen.getByText('🌐 MW')).toBeTruthy();
  });

  it('does not show MakerWorld indicator for standard boxes', () => {
    const boxes = [createBox({ isMakerWorldModel: false })];
    renderWithState({ boxes });

    expect(screen.queryByLabelText('MakerWorld model')).toBeNull();
  });

  it('has a remove button per box', () => {
    const boxes = [
      createBox({ id: 'box-1', itemNumber: 1 }),
      createBox({ id: 'box-2', itemNumber: 2, startCell: { col: 3, row: 0 }, endCell: { col: 4, row: 1 } }),
    ];
    renderWithState({ boxes });

    expect(screen.getByLabelText('Remove Item 1')).toBeTruthy();
    expect(screen.getByLabelText('Remove Item 2')).toBeTruthy();
  });

  it('removes a box when remove button is clicked', () => {
    const boxes = [
      createBox({ id: 'box-1', itemNumber: 1 }),
      createBox({ id: 'box-2', itemNumber: 2, startCell: { col: 3, row: 0 }, endCell: { col: 4, row: 1 } }),
    ];
    renderWithState({ boxes });

    fireEvent.click(screen.getByLabelText('Remove Item 1'));

    // After removal, Item 1 should be gone
    expect(screen.queryByText('Item 1')).toBeNull();
    expect(screen.getByText('Item 2')).toBeTruthy();
  });

  it('uses proper list semantics', () => {
    const boxes = [createBox()];
    renderWithState({ boxes });

    expect(screen.getByRole('list')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('has accessible section label', () => {
    renderWithState({ boxes: [] });
    expect(screen.getByLabelText('Placed boxes')).toBeTruthy();
  });
});
