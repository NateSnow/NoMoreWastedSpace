/**
 * MakerWorldSearch Component
 *
 * Provides a keyword search interface for MakerWorld specialty bins.
 * Users can search by keyword (minimum 2 characters), view results with
 * thumbnails and grid sizes, and select a model to enter placement mode.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 5.8
 */

import { useState, useCallback, useRef } from 'react';
import { useAppState } from '../state/AppStateContext';
import { MakerWorldSearchClient } from '../api/MakerWorldSearchClient';
import { MIN_SEARCH_KEYWORD_LENGTH } from '../core/constants';
import type { MakerWorldModel } from '../core/types';

interface MakerWorldSearchProps {
  /** Optional MakerWorldSearchClient instance (for dependency injection/testing). */
  searchClient?: MakerWorldSearchClient;
}

/**
 * MakerWorldSearch component for searching and selecting MakerWorld models.
 */
export function MakerWorldSearch({ searchClient }: MakerWorldSearchProps) {
  const { state, dispatch } = useAppState();
  const [keyword, setKeyword] = useState(state.searchKeyword || '');
  const clientRef = useRef(searchClient ?? new MakerWorldSearchClient());

  const handleSearch = useCallback(async () => {
    if (keyword.length < MIN_SEARCH_KEYWORD_LENGTH) {
      return;
    }

    // Update keyword in app state
    dispatch({ type: 'SET_SEARCH_KEYWORD', payload: { keyword } });

    // Set loading state
    dispatch({
      type: 'SET_SEARCH_RESULTS',
      payload: { results: [], error: null, loading: true },
    });

    const result = await clientRef.current.search(keyword);

    dispatch({
      type: 'SET_SEARCH_RESULTS',
      payload: {
        results: result.models,
        error: result.error ?? null,
        loading: false,
      },
    });
  }, [keyword, dispatch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  const handleSelectModel = useCallback(
    (model: MakerWorldModel) => {
      dispatch({
        type: 'ENTER_PLACEMENT_MODE',
        payload: {
          itemType: 'makerworld',
          makerWorldModel: model,
        },
      });
    },
    [dispatch]
  );

  const isSearchDisabled = keyword.length < MIN_SEARCH_KEYWORD_LENGTH;

  return (
    <div className="makerworld-search" role="search" aria-label="MakerWorld model search">
      <h3>MakerWorld Models</h3>

      <div className="makerworld-search__input-group">
        <label htmlFor="makerworld-keyword" className="makerworld-search__label">
          Search keyword
        </label>
        <div className="makerworld-search__input-row">
          <input
            id="makerworld-keyword"
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search MakerWorld models..."
            aria-describedby="makerworld-keyword-hint"
            className="makerworld-search__input"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearchDisabled || state.searchLoading}
            className="makerworld-search__button"
            aria-label="Search"
          >
            {state.searchLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
        <span id="makerworld-keyword-hint" className="makerworld-search__hint">
          {keyword.length > 0 && keyword.length < MIN_SEARCH_KEYWORD_LENGTH
            ? `Enter at least ${MIN_SEARCH_KEYWORD_LENGTH} characters to search`
            : 'Enter a keyword to search for specialty bins'}
        </span>
      </div>

      {/* Error state */}
      {state.searchError && !state.searchLoading && (
        <div
          className="makerworld-search__message makerworld-search__message--error"
          role="alert"
          aria-live="polite"
        >
          {state.searchError}
        </div>
      )}

      {/* Results list */}
      {state.searchResults.length > 0 && !state.searchLoading && (
        <ul className="makerworld-search__results" aria-label="Search results">
          {state.searchResults.map((model) => (
            <li key={model.id} className="makerworld-search__result-item">
              <button
                type="button"
                className="makerworld-search__result-button"
                onClick={() => handleSelectModel(model)}
                aria-label={`Select ${model.name} (${model.gridWidth}×${model.gridDepth} grid units)`}
              >
                <img
                  src={model.thumbnailUrl}
                  alt={`Thumbnail of ${model.name}`}
                  className="makerworld-search__thumbnail"
                  width={48}
                  height={48}
                  loading="lazy"
                />
                <div className="makerworld-search__result-info">
                  <span className="makerworld-search__result-name">
                    {model.name}
                  </span>
                  <span className="makerworld-search__result-size">
                    {model.gridWidth} × {model.gridDepth} grid units
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Placement mode indicator */}
      {state.placementMode.active && state.placementMode.itemType === 'makerworld' && state.placementMode.makerWorldModel && (
        <div className="makerworld-search__placement-active" role="status" aria-live="polite">
          <span>
            Placing: <strong>{state.placementMode.makerWorldModel.name}</strong>{' '}
            ({state.placementMode.makerWorldModel.gridWidth} × {state.placementMode.makerWorldModel.gridDepth})
          </span>
          <button
            type="button"
            className="makerworld-search__cancel-button"
            onClick={() => dispatch({ type: 'EXIT_PLACEMENT_MODE' })}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
