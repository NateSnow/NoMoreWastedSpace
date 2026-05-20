/**
 * Bin Catalog Picker — curated catalog of available bins.
 *
 * Users browse by category and select bins to place on the grid.
 */

import { useState, useCallback } from 'react';
import { useAppState } from '../state/AppStateContext';
import {
  getStandardBins,
  getWorkshopBins,
  getKitchenBins,
  getOfficeBins,
  getElectronicsBins,
  type CatalogBin,
  type BinCategory,
} from '../core/binCatalog';

const CATEGORIES: { key: BinCategory; label: string; emoji: string }[] = [
  { key: 'standard', label: 'Standard', emoji: '📦' },
  { key: 'workshop', label: 'Workshop', emoji: '🔧' },
  { key: 'kitchen', label: 'Kitchen', emoji: '🍳' },
  { key: 'office', label: 'Office', emoji: '📎' },
  { key: 'electronics', label: 'Electronics', emoji: '⚡' },
];

function getBinsForCategory(category: BinCategory): CatalogBin[] {
  switch (category) {
    case 'standard': return getStandardBins();
    case 'workshop': return getWorkshopBins();
    case 'kitchen': return getKitchenBins();
    case 'office': return getOfficeBins();
    case 'electronics': return getElectronicsBins();
  }
}

export function MakerWorldSearch() {
  const { state, dispatch } = useAppState();
  const [activeCategory, setActiveCategory] = useState<BinCategory>('standard');
  const [selectedBin, setSelectedBin] = useState<CatalogBin | null>(null);

  const bins = getBinsForCategory(activeCategory);
  const hasGrid = state.grid !== null;

  const handleSelectBin = useCallback((bin: CatalogBin) => {
    setSelectedBin(bin);
    dispatch({
      type: 'ENTER_PLACEMENT_MODE',
      payload: {
        itemType: bin.category === 'standard' ? 'standard' : 'makerworld',
        makerWorldModel: {
          id: bin.id,
          name: bin.name,
          thumbnailUrl: '',
          gridWidth: bin.widthCells,
          gridDepth: bin.depthCells,
        },
      },
    });
  }, [dispatch]);

  const handleCancel = useCallback(() => {
    setSelectedBin(null);
    dispatch({ type: 'EXIT_PLACEMENT_MODE' });
  }, [dispatch]);

  return (
    <div className="makerworld-search">
      <h3>📋 Bin Catalog</h3>

      {/* Category tabs */}
      <div className="bin-catalog__tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            className={`bin-catalog__tab ${activeCategory === cat.key ? 'bin-catalog__tab--active' : ''}`}
            onClick={() => setActiveCategory(cat.key)}
            type="button"
            title={cat.label}
          >
            <span className="bin-catalog__tab-emoji">{cat.emoji}</span>
            <span className="bin-catalog__tab-label">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Selected bin indicator */}
      {selectedBin && (
        <div className="bin-catalog__selected">
          <span>
            Placing: <strong>{selectedBin.name}</strong>
            {' '}({selectedBin.widthCells / 2}×{selectedBin.depthCells / 2} units)
          </span>
          <button
            className="bin-catalog__cancel"
            onClick={handleCancel}
            type="button"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Bin grid */}
      {!hasGrid && (
        <p className="bin-catalog__hint">Calculate a grid first to start placing bins.</p>
      )}

      {hasGrid && (
        <div className="bin-catalog__grid">
          {bins.map((bin) => (
            <button
              key={bin.id}
              className={`bin-catalog__item ${selectedBin?.id === bin.id ? 'bin-catalog__item--selected' : ''}`}
              onClick={() => handleSelectBin(bin)}
              type="button"
              title={bin.description}
            >
              <div
                className="bin-catalog__item-preview"
                style={{
                  aspectRatio: `${bin.widthCells} / ${bin.depthCells}`,
                }}
              />
              <span className="bin-catalog__item-name">{bin.name}</span>
              {bin.description && (
                <span className="bin-catalog__item-desc">{bin.description}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
