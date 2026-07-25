export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  /** Relevance score 0–100 after ranking. */
  score?: number;
  query?: string;
}

const BLOCKED_DOMAINS = [
  // Content & blogging
  "medium.com", "dev.to", "hashnode.dev", "substack.com",
  "wordpress.com", "blogger.com", "ghost.io", "hackernoon.com",
  "towardsdatascience.com",
  // Social & community
  "reddit.com", "quora.com", "twitter.com", "x.com",
  "facebook.com", "instagram.com", "youtube.com", "tiktok.com",
  // Professional networks
  "linkedin.com",
  // Tech noise
  "github.com", "gitlab.com", "stackoverflow.com", "npmjs.com",
  "pypi.org", "rubygems.org", "packagist.org",
  // Encyclopedic
  "wikipedia.org", "wikimedia.org",
  // Review & directory sites (good for discovery names, weak as "competitors")
  "capterra.com", "g2.com", "trustradius.com", "getapp.com",
  "softwareadvice.com", "producthunt.com", "alternativeto.net",
  // App stores
  "apps.apple.com", "play.google.com",
  // News & media
  "techcrunch.com", "venturebeat.com", "forbes.com",
  "businessinsider.com", "wired.com", "theverge.com",
  // Jobs & coupons
  "indeed.com", "glassdoor.com", "lever.co", "greenhouse.io",
  "retailmenot.com", "coupons.com", "dealspotr.com",
];

const ARTICLE_PATH_PATTERNS = [
  /\/blog\//i, /\/articles?\//i, /\/posts?\//i,
  /\/news\//i, /\/insights\//i, /\/press\//i,
  /\/docs?\//i, /\/documentation\//i, /\/help\//i,
  /\/support\//i, /\/careers?\//i, /\/jobs?\//i,
];

/** Weak product-signal paths — demote but don't always kill. */
const WEAK_PATH_PATTERNS = [
  /\/tag\//i, /\/category\//i, /\/author\//i, /\/search\//i,
];

const MULTI_PART_TLDS = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk",
  "com.au", "net.au", "org.au",
  "co.jp", "com.br", "co.in", "com.mx",
  "co.nz", "co.za", "com.sg", "com.hk",
]);

/** Hostname without leading www. */
export function rootHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Approximate registrable domain (eTLD+1). */
export function registrableDomain(hostOrUrl: string): string {
  let host = hostOrUrl.toLowerCase().replace(/^www\./, "");
  try {
    if (host.includes("://") || host.includes("/")) {
      host = new URL(host.includes("://") ? host : `https://${host}`).hostname
        .replace(/^www\./, "")
        .toLowerCase();
    }
  } catch {
    /* keep host */
  }
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const last2 = parts.slice(-2).join(".");
  if (MULTI_PART_TLDS.has(last2) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }
  return last2;
}

/**
 * True when candidate is the same site as target (incl. www / subdomains / same eTLD+1).
 */
export function isSameSite(candidateUrl: string, targetUrl: string): boolean {
  const a = rootHost(candidateUrl);
  const b = rootHost(targetUrl);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.endsWith(`.${b}`) || b.endsWith(`.${a}`)) return true;
  const ra = registrableDomain(a);
  const rb = registrableDomain(b);
  return Boolean(ra && rb && ra === rb);
}

export function isBlocked(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url);
    if (BLOCKED_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
      return true;
    }
    if (ARTICLE_PATH_PATTERNS.some((p) => p.test(pathname))) return true;
  } catch {
    /* invalid URL */
  }
  return false;
}

/** Prefer product root over deep marketing paths. */
function toPreferredUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "");
    if (path.split("/").filter(Boolean).length >= 4) {
      return `${u.protocol}//${u.host}/`;
    }
    u.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "ref", "fbclid"].forEach((k) =>
      u.searchParams.delete(k)
    );
    return u.toString();
  } catch {
    return url;
  }
}

export interface RankOptions {
  /** Original target site — always excluded from results. */
  targetUrl?: string;
  /** Extra hosts/domains to exclude (brand mirrors, etc.). */
  excludeHosts?: string[];
  /** Tokens from niche / title used for soft relevance boost. */
  nicheTerms?: string[];
  /** Max results after ranking. */
  limit?: number;
}

function shouldExclude(url: string, opts: RankOptions): boolean {
  if (opts.targetUrl && isSameSite(url, opts.targetUrl)) return true;
  const host = rootHost(url);
  const reg = registrableDomain(host);
  for (const ex of opts.excludeHosts ?? []) {
    const eh = ex.replace(/^www\./, "").toLowerCase();
    if (!eh) continue;
    if (host === eh || host.endsWith(`.${eh}`) || reg === registrableDomain(eh)) {
      return true;
    }
  }
  return false;
}

/**
 * Score a candidate result for "real product competitor" quality.
 */
export function scoreCandidate(
  item: SearchResult,
  opts: RankOptions = {}
): number {
  let score = 50;
  const host = rootHost(item.url);
  const text = `${item.title} ${item.snippet}`.toLowerCase();

  if (shouldExclude(item.url, opts)) return -1000;

  // Snippet niche overlap — keep Unicode letters (non-English niches)
  const terms = (opts.nicheTerms ?? [])
    .map((t) => t.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((t) => t.length >= 3);
  if (terms.length) {
    const hits = terms.filter((t) => text.includes(t) || host.includes(t)).length;
    score += Math.min(25, hits * 8);
  }

  // Prefer clean product-ish titles
  if (/\balternative|competitor|vs\.?|versus|similar to\b/i.test(text)) score += 8;
  if (/\blogin|sign up|careers|privacy policy\b/i.test(item.title)) score -= 15;

  try {
    const path = new URL(item.url).pathname;
    if (path === "/" || path === "") score += 10;
    if (WEAK_PATH_PATTERNS.some((p) => p.test(path))) score -= 12;
    if (path.split("/").filter(Boolean).length >= 3) score -= 5;
  } catch {
    score -= 20;
  }

  // Prefer shorter hostnames (brand domains)
  if (host && host.split(".").length <= 2 && host.length < 22) score += 5;

  // Empty snippet is weaker signal
  if (!item.snippet || item.snippet.length < 20) score -= 8;

  return Math.max(0, Math.min(100, score));
}

export async function searchCompetitors(
  queries: string[],
  opts: RankOptions = {}
): Promise<SearchResult[]> {
  const apiKey = import.meta.env.SERPER_API_KEY ?? process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error("SERPER_API_KEY is not set");

  const raw: SearchResult[] = [];
  const uniqueQueries = [...new Set(queries.map((q) => (q ?? "").trim()).filter(Boolean))];

  for (const query of uniqueQueries) {
    const q = query.trim();
    if (!q || q === "competitors") continue;
    // Reject queries that are too short or contain only stop words
    const words = q.replace(/ competitors$/i, "").trim().split(/\s+/);
    if (words.length < 2) continue;
    console.log("SERPER_QUERY:", q);
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q, num: 15 }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Serper API error: ${res.status} ${res.statusText} — query: "${q}" — response: ${body}`
      );
    }

    const data = await res.json();
    const organic: Array<{ title?: string; link?: string; snippet?: string }> =
      data?.organic ?? [];

    for (const item of organic) {
      if (item.title && item.link) {
        raw.push({
          title: item.title,
          url: toPreferredUrl(item.link),
          snippet: item.snippet ?? "",
          query: q,
        });
      }
    }
  }

  // Filter blocked + self, score, dedupe by registrable domain (keep highest score)
  const byDomain = new Map<string, SearchResult>();

  for (const item of raw) {
    if (isBlocked(item.url)) continue;
    if (shouldExclude(item.url, opts)) continue;

    const host = rootHost(item.url);
    if (!host) continue;

    const score = scoreCandidate(item, opts);
    if (score < 20) continue;

    const ranked: SearchResult = { ...item, score };
    const key = registrableDomain(host) || host;
    const prev = byDomain.get(key);
    if (!prev || (prev.score ?? 0) < score) {
      byDomain.set(key, ranked);
    }
  }

  // Final hard pass — never return the analyzed site
  const limit = opts.limit ?? 12;
  return [...byDomain.values()]
    .filter((r) => !shouldExclude(r.url, opts))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);
}
