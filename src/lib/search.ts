export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
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
  // Review & directory sites
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
];

function isBlocked(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url);
    if (BLOCKED_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))) return true;
    if (ARTICLE_PATH_PATTERNS.some((p) => p.test(pathname))) return true;
  } catch {}
  return false;
}

export async function searchCompetitors(queries: string[]): Promise<SearchResult[]> {
  const apiKey = import.meta.env.SERPER_API_KEY ?? process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error("SERPER_API_KEY is not set");

  const raw: SearchResult[] = [];

  for (const query of queries) {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 15 }),
    });

    if (!res.ok) throw new Error(`Serper API error: ${res.status} ${res.statusText}`);

    const data = await res.json();
    const organic: Array<{ title?: string; link?: string; snippet?: string }> =
      data?.organic ?? [];

    for (const item of organic) {
      if (item.title && item.link) {
        raw.push({ title: item.title, url: item.link, snippet: item.snippet ?? "" });
      }
    }
  }

  // Filter blocked domains/paths, then deduplicate by root domain
  const seen = new Set<string>();
  return raw.filter(({ url }) => {
    if (isBlocked(url)) return false;
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      if (seen.has(host)) return false;
      seen.add(host);
      return true;
    } catch { return false; }
  });
}
