/**
 * MakerWorld Search Proxy — Cloudflare Worker
 *
 * Proxies search requests to the MakerWorld platform API, returning the top 10
 * results. Implements a 10-second upstream timeout and 5-minute response cache
 * via the Cache API.
 *
 * Endpoint: GET /api/makerworld/search?keyword={keyword}
 *
 * Requirements: 5.2, 5.8
 */

export interface Env {
  MAKERWORLD_API_BASE: string;
  CACHE_TTL_SECONDS: string;
}

/** Shape of a model returned to the client. */
interface MakerWorldModelResult {
  id: string;
  name: string;
  thumbnailUrl: string;
  gridWidth: number;
  gridDepth: number;
}

/** Upstream timeout in milliseconds. */
const UPSTREAM_TIMEOUT_MS = 10_000;

/** Default cache TTL in seconds (5 minutes). */
const DEFAULT_CACHE_TTL_SECONDS = 300;

/** Maximum number of results to return. */
const MAX_RESULTS = 10;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Only handle the search endpoint
    if (url.pathname !== '/api/makerworld/search') {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const keyword = url.searchParams.get('keyword');

    if (!keyword || keyword.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required query parameter: keyword' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check cache first
    const cache = caches.default;
    const cacheKey = new Request(request.url, { method: 'GET' });
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Forward request to MakerWorld API
    try {
      const models = await fetchMakerWorldModels(keyword, env);

      const cacheTtl = parseInt(env.CACHE_TTL_SECONDS, 10) || DEFAULT_CACHE_TTL_SECONDS;

      const response = new Response(JSON.stringify({ models }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${cacheTtl}`,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });

      // Store in cache (non-blocking)
      const responseToCache = response.clone();
      await cache.put(cacheKey, responseToCache);

      return response;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return new Response(
          JSON.stringify({ error: 'Upstream request timed out' }),
          {
            status: 504,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Search service temporarily unavailable' }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
} satisfies ExportedHandler<Env>;

/**
 * Fetches models from the MakerWorld API with a 10-second timeout.
 * Returns the top 10 results mapped to our MakerWorldModelResult shape.
 */
async function fetchMakerWorldModels(
  keyword: string,
  env: Env
): Promise<MakerWorldModelResult[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  const apiBase = env.MAKERWORLD_API_BASE || 'https://makerworld.com';
  const searchUrl = `${apiBase}/api/v1/search-service/model?keyword=${encodeURIComponent(keyword)}&limit=${MAX_RESULTS}&offset=0`;

  try {
    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GridfinityDrawerDesigner/1.0',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`MakerWorld API returned ${response.status}`);
    }

    const data = await response.json() as MakerWorldApiResponse;

    return mapApiResponse(data);
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Expected shape of the MakerWorld API response.
 * This is based on the known MakerWorld API structure.
 */
interface MakerWorldApiResponse {
  hits?: MakerWorldApiHit[];
  models?: MakerWorldApiHit[];
  data?: MakerWorldApiHit[];
  total?: number;
}

interface MakerWorldApiHit {
  id?: string | number;
  designId?: string | number;
  title?: string;
  name?: string;
  cover?: string;
  thumbnail?: string;
  coverUrl?: string;
  gridWidth?: number;
  gridDepth?: number;
  // Some APIs return dimensions in a nested object
  dimensions?: {
    width?: number;
    depth?: number;
  };
}

/**
 * Maps the upstream MakerWorld API response to our standardized model format.
 * Handles multiple possible response shapes from the MakerWorld API.
 */
function mapApiResponse(data: MakerWorldApiResponse): MakerWorldModelResult[] {
  // The API may return results under different keys
  const hits = data.hits ?? data.models ?? data.data ?? [];

  return hits.slice(0, MAX_RESULTS).map((hit) => ({
    id: String(hit.id ?? hit.designId ?? ''),
    name: hit.title ?? hit.name ?? 'Untitled Model',
    thumbnailUrl: hit.cover ?? hit.thumbnail ?? hit.coverUrl ?? '',
    gridWidth: hit.gridWidth ?? hit.dimensions?.width ?? 1,
    gridDepth: hit.gridDepth ?? hit.dimensions?.depth ?? 1,
  }));
}
