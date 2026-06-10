const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
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

export async function withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() < entry.expiresAt) return entry.value;

  // Coalesce in-flight requests for the same key
  if (inFlight.has(key)) return inFlight.get(key) as Promise<T>;

  const promise = fn().then((value) => {
    store.set(key, { value, expiresAt: Date.now() + TTL_MS });
    inFlight.delete(key);
    return value;
  }).catch((err) => {
    inFlight.delete(key);
    throw err;
  });

  inFlight.set(key, promise);
  return promise;
}
