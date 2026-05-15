/**
 * GridCanvas component for the Gridfinity Drawer Designer.
 *
 * Wraps the GridRenderer class, handles responsive canvas sizing,
 * and manages pointer/touch events for two-click box placement.
 *
 * Requirements: 2.1, 3.1, 3.2, 7.4, 7.5
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { GridRenderer, type RenderState } from '../renderer/GridRenderer';
import { useAppState } from '../state/AppStateContext';
import { BOX_COLORS, UNOCCUPIED_CELL_COLOR } from '../core/constants';
import type { CellCoordinate } from '../core/types';

/** Minimum canvas width in pixels (supports 320px viewport). */
const MIN_CANVAS_WIDTH = 280;

/** Maximum canvas width in pixels (supports 3840px viewport). */
const MAX_CANVAS_WIDTH = 3600;

/** Padding around the canvas container in pixels. */
const CONTAINER_PADDING = 20;

/**
 * GridCanvas component.
 *
 * Renders the Gridfinity grid on an HTML5 Canvas element, handles responsive
 * sizing for viewports from 320px to 3840px, and implements two-click
 * placement mode with visual selection highlighting.
 */
export function GridCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<GridRenderer | null>(null);
  const { state, dispatch } = useAppState();

  // Local state for tracking the first click (start corner) during placement
  const [selectionStart, setSelectionStart] = useState<CellCoordinate | null>(null);
  // Local state for tracking hover position during selection
  const [hoverCell, setHoverCell] = useState<CellCoordinate | null>(null);

  // Canvas dimensions state
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: MIN_CANVAS_WIDTH,
    height: MIN_CANVAS_WIDTH,
  });

  /**
   * Calculate responsive canvas size based on container width and grid aspect ratio.
   */
  const calculateCanvasSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth - CONTAINER_PADDING * 2;
    const width = Math.max(MIN_CANVAS_WIDTH, Math.min(MAX_CANVAS_WIDTH, containerWidth));

    // Use grid aspect ratio if available, otherwise default to square
    const gridAspect = state.grid
      ? state.grid.columnsX / state.grid.rowsY
      : 1;

    // Calculate height from grid aspect ratio, but cap it
    const height = Math.round(width / gridAspect);
    // Don't let canvas be taller than 90vh equivalent (roughly)
    const maxHeight = Math.round(width * 2);
    const finalHeight = Math.min(height, maxHeight);

    setCanvasSize({ width, height: finalHeight });
  }, [state.grid]);

  /**
   * Initialize renderer and handle responsive resizing.
   * Uses ResizeObserver for reliable container size detection.
   */
  useEffect(() => {
    calculateCanvasSize();

    const container = containerRef.current;
    let resizeObserver: ResizeObserver | null = null;

    if (container) {
      resizeObserver = new ResizeObserver(() => {
        calculateCanvasSize();
      });
      resizeObserver.observe(container);
    }

    window.addEventListener('resize', calculateCanvasSize);
    return () => {
      window.removeEventListener('resize', calculateCanvasSize);
      resizeObserver?.disconnect();
    };
  }, [calculateCanvasSize]);

  /**
   * Initialize or reinitialize the GridRenderer when canvas size changes,
   * and immediately render the grid. This ensures the grid is always drawn
   * after the renderer is created with the correct canvas dimensions.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set the canvas internal resolution to match display size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    const renderer = new GridRenderer(canvas, {
      unoccupied: UNOCCUPIED_CELL_COLOR,
      boxColors: [...BOX_COLORS],
    });
    rendererRef.current = renderer;

    // Immediately render if grid is available
    if (state.grid) {
      const totalCells = state.grid.columnsX * state.grid.rowsY;
      const occupiedCells = state.boxes.reduce(
        (sum, box) => sum + box.widthUnits * box.depthUnits,
        0
      );
      const availableCellCount = totalCells - occupiedCells;

      let activeSelection: RenderState['activeSelection'] = null;
      if (selectionStart && hoverCell) {
        activeSelection = { start: selectionStart, current: hoverCell };
      }

      renderer.render({
        grid: state.grid,
        boxes: state.boxes,
        availableCellCount,
        selectionMode: selectionStart ? 'standard' : null,
        activeSelection,
      });
    }
  }, [canvasSize, state.grid, state.boxes, selectionStart, hoverCell]);

  /**
   * Get cell coordinate from a pointer/touch event.
   */
  const getCellFromEvent = useCallback(
    (clientX: number, clientY: number): CellCoordinate | null => {
      const canvas = canvasRef.current;
      const renderer = rendererRef.current;
      if (!canvas || !renderer) return null;

      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      return renderer.getCellAtPoint(x, y);
    },
    []
  );

  /**
   * Find which box occupies a given cell, if any.
   */
  const findBoxAtCell = useCallback(
    (cell: CellCoordinate): string | null => {
      for (const box of state.boxes) {
        if (
          cell.col >= box.startCell.col &&
          cell.col <= box.endCell.col &&
          cell.row >= box.startCell.row &&
          cell.row <= box.endCell.row
        ) {
          return box.id;
        }
      }
      return null;
    },
    [state.boxes]
  );

  /**
   * Handle pointer/touch click for two-click placement or box removal.
   *
   * - If clicking on an occupied cell (and not mid-selection): remove that box.
   * - First click on empty cell: sets the start corner of the selection rectangle.
   * - Second click: sets the end corner and dispatches PLACE_BOX action.
   */
  const handleCellClick = useCallback(
    (clientX: number, clientY: number) => {
      if (!state.grid) return;

      const cell = getCellFromEvent(clientX, clientY);
      if (!cell) return;

      // If not mid-selection and clicking on an existing box, remove it
      if (!selectionStart) {
        const boxId = findBoxAtCell(cell);
        if (boxId) {
          dispatch({ type: 'REMOVE_BOX', payload: { boxId } });
          return;
        }
        // First click on empty cell: set start corner
        setSelectionStart(cell);
        setHoverCell(cell);
      } else {
        // Second click: set end corner and place box
        dispatch({
          type: 'PLACE_BOX',
          payload: { start: selectionStart, end: cell },
        });
        // Reset selection state
        setSelectionStart(null);
        setHoverCell(null);
      }
    },
    [state.grid, selectionStart, getCellFromEvent, findBoxAtCell, dispatch]
  );

  /**
   * Handle pointer move for selection highlight preview.
   */
  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!selectionStart) return;

      const cell = getCellFromEvent(clientX, clientY);
      if (cell) {
        setHoverCell(cell);
      }
    },
    [selectionStart, getCellFromEvent]
  );

  /**
   * Pointer event handlers.
   */
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      handleCellClick(e.clientX, e.clientY);
    },
    [handleCellClick]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      handlePointerMove(e.clientX, e.clientY);
    },
    [handlePointerMove]
  );

  /**
   * Touch event handlers for mobile support.
   */
  const onTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        handleCellClick(touch.clientX, touch.clientY);
      }
    },
    [handleCellClick]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        handlePointerMove(touch.clientX, touch.clientY);
      }
    },
    [handlePointerMove]
  );

  // Reset selection when grid changes
  useEffect(() => {
    setSelectionStart(null);
    setHoverCell(null);
  }, [state.grid]);

  // Don't render if no grid is configured
  if (!state.grid) {
    return (
      <div
        ref={containerRef}
        className="grid-canvas-container"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
          color: '#666',
        }}
      >
        <p>Enter drawer dimensions to generate the grid.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="grid-canvas-container"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        className="placement-indicator"
        style={{
          marginBottom: '8px',
          padding: '4px 12px',
          backgroundColor: '#E3F2FD',
          borderRadius: '4px',
          fontSize: '14px',
          color: '#1565C0',
        }}
        role="status"
        aria-live="polite"
      >
        {selectionStart
          ? 'Click the opposite corner to place the box'
          : 'Click empty cells to place a box, or click a box to remove it'}
      </div>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          width: `${canvasSize.width}px`,
          height: `${canvasSize.height}px`,
          maxWidth: '100%',
          border: '1px solid #ccc',
          borderRadius: '4px',
          touchAction: 'none',
          cursor: 'crosshair',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        aria-label="Gridfinity grid layout canvas"
        role="img"
      />
    </div>
  );
}
