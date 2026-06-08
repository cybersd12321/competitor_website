export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function searchCompetitors(
  queries: string[]
): Promise<SearchResult[]> {
  const apiKey = import.meta.env.SERPER_API_KEY;
  if (!apiKey) throw new Error("SERPER_API_KEY is not set");

  const results: SearchResult[] = [];

  for (const query of queries) {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 8 }),
    });

    if (!res.ok) {
      throw new Error(`Serper API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const organic: Array<{ title?: string; link?: string; snippet?: string }> =
      data?.organic ?? [];

    for (const item of organic) {
      if (item.title && item.link) {
        results.push({
          title: item.title,
          url: item.link,
          snippet: item.snippet ?? "",
        });
      }
    }
  }

  // Domains that are content/article sites, not product competitors
  const BLOCKED_DOMAINS = [
    "medium.com", "dev.to", "hashnode.dev", "substack.com",
    "reddit.com", "quora.com", "linkedin.com",
    "capterra.com", "g2.com", "trustradius.com", "getapp.com", "softwareadvice.com",
    "producthunt.com", "alternativeto.net",
    "techcrunch.com", "venturebeat.com", "forbes.com", "businessinsider.com",
    "hackernoon.com", "towardsdatascience.com", "wordpress.com",
    "youtube.com", "twitter.com", "facebook.com", "instagram.com",
    "apps.apple.com", "play.google.com", "appstore.com",
  ];
  const ARTICLE_PATH_PATTERNS = [/\/blog\//, /\/articles?\//i, /\/posts?\//i, /\/news\//i, /\/insights\//i];

  function isContentSite(url: string): boolean {
    try {
      const { hostname, pathname } = new URL(url);
      if (BLOCKED_DOMAINS.some(d => hostname.includes(d))) return true;
      if (ARTICLE_PATH_PATTERNS.some(p => p.test(pathname))) return true;
    } catch {}
    return false;
  }

  // Deduplicate by root hostname and filter content/blog sites
  const seen = new Set<string>();
  return results.filter(({ url }) => {
    if (isContentSite(url)) return false;
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      if (seen.has(host)) return false;
      seen.add(host);
      return true;
    } catch { return false; }
  });
}
