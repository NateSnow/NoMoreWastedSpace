/**
 * Main App component for the Gridfinity Drawer Designer.
 *
 * Combines all components in a logical layout:
 * DimensionInput → GridCanvas → BoxList → HeightControls → MakerWorldSearch → SubmitPanel
 *
 * Responsive layout:
 * - Single-column at < 768px viewport width
 * - Multi-panel layout at ≥ 768px
 *
 * Includes a "Clear All" button with confirmation dialog.
 *
 * Requirements: 7.4, 7.5, 8.2
 */

import { useState, useCallback } from 'react';
import { AppStateProvider, useAppState } from './state/AppStateContext';
import { DimensionInput } from './components/DimensionInput';
import { GridCanvas } from './components/GridCanvas';
import { BoxList } from './components/BoxList';
import { HeightControls } from './components/HeightControls';
import { MakerWorldSearch } from './components/MakerWorldSearch';
import { SubmitPanel } from './components/SubmitPanel';
import './App.css';

/**
 * Inner app content that uses the AppState context.
 * Separated from App so it can be wrapped in AppStateProvider.
 */
function AppContent() {
  const { state, dispatch } = useAppState();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearAll = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const handleConfirmClear = useCallback(() => {
    dispatch({ type: 'CLEAR_LAYOUT' });
    setShowClearConfirm(false);
  }, [dispatch]);

  const handleCancelClear = useCallback(() => {
    setShowClearConfirm(false);
  }, []);

  const hasBoxes = state.boxes.length > 0;

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-content">
          <img src="/icon-96.png" alt="" className="app__header-icon" />
          <h1>Sorted w/ Gridfinity</h1>
        </div>
      </header>

      <main className="app__main">
        {/* Left panel: Dimensions + Grid */}
        <div className="app__panel app__panel--primary">
          <DimensionInput />
          <div className={`app__drawer ${state.grid ? 'app__drawer--open' : ''}`}>
            <div className="app__drawer-track">
              <GridCanvas />
            </div>
          </div>
          {hasBoxes && (
            <div className="app__clear-section">
              <button
                type="button"
                className="app__clear-button"
                onClick={handleClearAll}
                aria-label="Clear all placed boxes"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Right panel: Box list, Height, MakerWorld, Submit */}
        <div className="app__panel app__panel--secondary">
          <BoxList />
          <HeightControls />
          <MakerWorldSearch />
          <SubmitPanel />
        </div>
      </main>

      {/* Clear All confirmation dialog (Req 8.2) */}
      {showClearConfirm && (
        <div
          className="app__dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-dialog-title"
          aria-describedby="clear-dialog-description"
        >
          <div className="app__dialog">
            <h2 id="clear-dialog-title">Clear All Boxes?</h2>
            <p id="clear-dialog-description">
              This will remove all placed boxes and return the grid to its empty
              state. This action cannot be undone.
            </p>
            <div className="app__dialog-actions">
              <button
                type="button"
                className="app__dialog-button app__dialog-button--confirm"
                onClick={handleConfirmClear}
                aria-label="Confirm clear all boxes"
              >
                Clear All
              </button>
              <button
                type="button"
                className="app__dialog-button app__dialog-button--cancel"
                onClick={handleCancelClear}
                aria-label="Cancel clear action"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Root App component wrapped in AppStateProvider.
 */
function App() {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  );
}

export default App;
