/** Bump when pipeline semantics change so stale blobs are not reused. */
export const PIPELINE_VERSION = "v3-niche-fix";

const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const SCRAPE_TTL_MS = 12 * 60 * 60 * 1000;
const SEARCH_TTL_MS = 6 * 60 * 60 * 1000;
const ANALYSIS_TTL_MS = 4 * 60 * 60 * 1000; // shorter — LLM output goes stale faster

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  layer: CacheLayer;
  quality?: QualityFlags;
}

export type CacheLayer = "full" | "scrape" | "search" | "analysis";

export interface QualityFlags {
  scrapedCompetitorCount?: number;
  searchResultCount?: number;
  matrixEvidenceCoverage?: number;
  targetPageCount?: number;
  pipelineVersion?: string;
}

const store = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export function normalizeUrl(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    return hostname.replace(/^www\./, "") + pathname.replace(/\/+$/, "");
  } catch {
    return url.trim().toLowerCase();
  }
}

function layerKey(layer: CacheLayer, key: string): string {
  return `${PIPELINE_VERSION}:${layer}:${key}`;
}

function ttlFor(layer: CacheLayer): number {
  switch (layer) {
    case "scrape":
      return SCRAPE_TTL_MS;
    case "search":
      return SEARCH_TTL_MS;
    case "analysis":
      return ANALYSIS_TTL_MS;
    default:
      return DEFAULT_TTL_MS;
  }
}

export function cacheGet<T>(layer: CacheLayer, key: string): T | undefined {
  const full = layerKey(layer, key);
  const entry = store.get(full) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() >= entry.expiresAt) {
    store.delete(full);
    return undefined;
  }
  // Reject entries from older pipeline if somehow present
  if (entry.quality?.pipelineVersion && entry.quality.pipelineVersion !== PIPELINE_VERSION) {
    store.delete(full);
    return undefined;
  }
  return entry.value;
}

export function cacheSet<T>(
  layer: CacheLayer,
  key: string,
  value: T,
  quality?: QualityFlags
): void {
  const full = layerKey(layer, key);
  store.set(full, {
    value,
    expiresAt: Date.now() + ttlFor(layer),
    layer,
    quality: { ...quality, pipelineVersion: PIPELINE_VERSION },
  });
}

export async function withLayerCache<T>(
  layer: CacheLayer,
  key: string,
  fn: () => Promise<T>,
  quality?: (value: T) => QualityFlags | undefined
): Promise<T> {
  const hit = cacheGet<T>(layer, key);
  if (hit !== undefined) return hit;

  const full = layerKey(layer, key);
  if (inFlight.has(full)) return inFlight.get(full) as Promise<T>;

  const promise = fn()
    .then((value) => {
      const q = quality?.(value);
      cacheSet(layer, key, value, q);
      inFlight.delete(full);
      return value;
    })
    .catch((err) => {
      inFlight.delete(full);
      throw err;
    });

  inFlight.set(full, promise);
  return promise;
}

/** Back-compat: full-result cache (pipeline-versioned). */
export async function withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
  return withLayerCache("full", key, fn);
}

export function invalidateUrl(url: string): void {
  const n = normalizeUrl(url);
  for (const layer of ["full", "scrape", "search", "analysis"] as CacheLayer[]) {
    store.delete(layerKey(layer, n));
  }
}
