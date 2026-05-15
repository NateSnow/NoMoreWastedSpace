/**
 * BoxList component — displays a summary of all placed boxes in the layout.
 *
 * Shows item number, size (W×D in grid units), height, a remove button per box,
 * and a MakerWorld indicator for model-based boxes.
 *
 * Requirements: 8.1, 3.6, 5.5
 */

import { useAppState } from '../state/AppStateContext';
import type { Box } from '../core/types';

/** Props for a single box list item. */
interface BoxListItemProps {
  box: Box;
  onRemove: (boxId: string) => void;
}

/** Renders a single box entry in the list. */
function BoxListItem({ box, onRemove }: BoxListItemProps) {
  return (
    <li
      className="box-list-item"
      aria-label={`Item ${box.itemNumber}, ${box.widthUnits} by ${box.depthUnits} grid units, height ${box.heightUnits}`}
    >
      <span
        className="box-list-item__color"
        style={{ backgroundColor: box.color ?? '#ccc' }}
        aria-hidden="true"
      />
      <span className="box-list-item__details">
        <span className="box-list-item__number">Item {box.itemNumber}</span>
        <span className="box-list-item__size">
          {box.widthUnits}×{box.depthUnits}
        </span>
        <span className="box-list-item__height">H: {box.heightUnits}</span>
        {box.isMakerWorldModel && (
          <span
            className="box-list-item__makerworld"
            title={box.makerWorldName ?? 'MakerWorld Model'}
            aria-label="MakerWorld model"
          >
            🌐 MW
          </span>
        )}
      </span>
      <button
        className="box-list-item__remove"
        onClick={() => onRemove(box.id)}
        aria-label={`Remove Item ${box.itemNumber}`}
        type="button"
      >
        ✕
      </button>
    </li>
  );
}

/** Displays a list of all placed boxes with remove actions. */
export function BoxList() {
  const { state, dispatch } = useAppState();
  const { boxes } = state;

  const handleRemove = (boxId: string) => {
    dispatch({ type: 'REMOVE_BOX', payload: { boxId } });
  };

  if (boxes.length === 0) {
    return (
      <section className="box-list" aria-label="Placed boxes">
        <h2 className="box-list__heading">Placed Boxes</h2>
        <p className="box-list__empty">No boxes placed yet.</p>
      </section>
    );
  }

  return (
    <section className="box-list" aria-label="Placed boxes">
      <h2 className="box-list__heading">Placed Boxes ({boxes.length})</h2>
      <ul className="box-list__items" role="list">
        {boxes.map((box) => (
          <BoxListItem key={box.id} box={box} onRemove={handleRemove} />
        ))}
      </ul>
    </section>
  );
}
