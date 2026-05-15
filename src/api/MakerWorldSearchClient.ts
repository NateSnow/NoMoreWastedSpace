/**
 * MakerWorld Search Client
 *
 * Handles searching for pre-designed specialty bins from the MakerWorld platform.
 * Calls the proxy endpoint, enforces keyword length minimum, handles timeouts
 * and service unavailability gracefully.
 */

import {
  MIN_SEARCH_KEYWORD_LENGTH,
  MAX_SEARCH_RESULTS,
  SEARCH_TIMEOUT_MS,
  MAX_MODEL_NAME_LENGTH,
} from '../core/constants';
import type { MakerWorldModel } from '../core/types';

/** Result of a MakerWorld search operation. */
export interface SearchResult {
  /** Matching models (max 10 results). */
  models: MakerWorldModel[];
  /** Error message if the search failed. */
  error?: string;
}

/**
 * Truncates a model name to the maximum allowed length.
 * If the name exceeds MAX_MODEL_NAME_LENGTH characters, it is truncated
 * and "..." is appended.
 */
export function truncateModelName(name: string): string {
  if (name.length <= MAX_MODEL_NAME_LENGTH) {
    return name;
  }
  return name.slice(0, MAX_MODEL_NAME_LENGTH) + '...';
}

/**
 * Client for searching MakerWorld models via the proxy endpoint.
 */
export class MakerWorldSearchClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Search for MakerWorld models by keyword.
   *
   * @param keyword - The search keyword (minimum 2 characters).
   * @returns A SearchResult with matching models or an error message.
   */
  async search(keyword: string): Promise<SearchResult> {
    // Enforce minimum keyword length
    if (keyword.length < MIN_SEARCH_KEYWORD_LENGTH) {
      return {
        models: [],
        error: `Search keyword must be at least ${MIN_SEARCH_KEYWORD_LENGTH} characters`,
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

      const response = await fetch(
        `${this.baseUrl}/api/makerworld/search?keyword=${encodeURIComponent(keyword)}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          models: [],
          error: 'Search service temporarily unavailable',
        };
      }

      const data = await response.json();

      // Handle empty results
      const rawModels: MakerWorldModel[] = Array.isArray(data) ? data : data.models ?? [];

      if (rawModels.length === 0) {
        return {
          models: [],
          error: 'No results found',
        };
      }

      // Limit to top 10 results and truncate names
      const models = rawModels.slice(0, MAX_SEARCH_RESULTS).map((model) => ({
        ...model,
        name: truncateModelName(model.name),
      }));

      return { models };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          models: [],
          error: 'Search timed out — please try again',
        };
      }

      // DOMException may not extend Error in all environments
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        (error as { name: string }).name === 'AbortError'
      ) {
        return {
          models: [],
          error: 'Search timed out — please try again',
        };
      }

      return {
        models: [],
        error: 'Search service temporarily unavailable',
      };
    }
  }
}
