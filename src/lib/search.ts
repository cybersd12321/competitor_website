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

function rootHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
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

function isSameSite(candidateUrl: string, targetUrl: string): boolean {
  const a = rootHost(candidateUrl);
  const b = rootHost(targetUrl);
  if (!a || !b) return false;
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
}

/** Prefer product root over deep marketing paths. */
function toPreferredUrl(url: string): string {
  try {
    const u = new URL(url);
    // If path looks like a deep article already filtered; for others collapse to origin when path is long blog-like
    const path = u.pathname.replace(/\/+$/, "");
    if (path.split("/").filter(Boolean).length >= 4) {
      return `${u.protocol}//${u.host}/`;
    }
    u.hash = "";
    // Drop tracking params
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "ref", "fbclid"].forEach((k) =>
      u.searchParams.delete(k)
    );
    return u.toString();
  } catch {
    return url;
  }
}

export interface RankOptions {
  /** Original target site — excluded from results. */
  targetUrl?: string;
  /** Tokens from niche / title used for soft relevance boost. */
  nicheTerms?: string[];
  /** Max results after ranking. */
  limit?: number;
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

  if (opts.targetUrl && isSameSite(item.url, opts.targetUrl)) return -1000;

  // Snippet niche overlap
  const terms = (opts.nicheTerms ?? [])
    .map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, ""))
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

  // Filter blocked + self, score, dedupe by root domain (keep highest score)
  const byHost = new Map<string, SearchResult>();

  for (const item of raw) {
    if (isBlocked(item.url)) continue;
    if (opts.targetUrl && isSameSite(item.url, opts.targetUrl)) continue;

    const host = rootHost(item.url);
    if (!host) continue;

    const score = scoreCandidate(item, opts);
    if (score < 20) continue;

    const ranked: SearchResult = { ...item, score };
    const prev = byHost.get(host);
    if (!prev || (prev.score ?? 0) < score) {
      byHost.set(host, ranked);
    }
  }

  const limit = opts.limit ?? 12;
  return [...byHost.values()]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);
}
