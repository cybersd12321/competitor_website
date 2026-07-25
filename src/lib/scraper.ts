const JUNK_PATTERNS = [
  /please wait/i,
  /processing your request/i,
  /just a moment/i,
  /enable javascript/i,
  /checking your browser/i,
  /ddos protection/i,
  /access denied/i,
  /attention required/i,
  /cf-browser-verification/i,
  /captcha/i,
  /verify you are human/i,
  /cloudflare/i,
  /ray id:/i,
];

/** Paths commonly holding commercially meaningful feature/pricing signal. */
const SECONDARY_PATHS = [
  "/pricing",
  "/price",
  "/plans",
  "/features",
  "/product",
  "/products",
  "/solutions",
  "/platform",
];

const MAX_SECONDARY_PAGES = 3;
const MAX_PAGE_CHARS = 8_000;
const MAX_COMBINED_CHARS = 18_000;

export interface ScrapePage {
  url: string;
  content: string;
  kind: "home" | "secondary";
}

export interface ScrapeResult {
  /** Combined markdown for LLM / context extraction. */
  markdown: string;
  pages: ScrapePage[];
  rootUrl: string;
  quality: {
    hasTitle: boolean;
    pageCount: number;
    charCount: number;
    likelyChallenge: boolean;
  };
}

function sanitizeMarkdown(content: string, preserveTables = true): string {
  let out = content
    // Strip empty code blocks
    .replace(/```[\s\S]*?```/gm, (match) => {
      const inner = match.replace(/```\w*\n?/, "").replace(/```$/, "").trim();
      return inner ? match : "";
    })
    // Remove Jina image alt text noise e.g. "Image 1 Some Alt Text"
    .replace(/\bImage\s+\d+\s+[^\n]*/gi, "")
    // Collapse repeated nav/footer link lists (3+ consecutive markdown links on their own lines)
    .replace(/(^\s*\[.*?\]\(.*?\)\s*$\n?){3,}/gm, "[...navigation links removed...]\n")
    // Collapse 3+ consecutive blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!preserveTables) {
    out = out.replace(/(^\s*\|.*\|\s*$\n?){4,}/gm, "[...table removed...]\n");
  }

  return out;
}

function isLikelyChallengePage(content: string): boolean {
  const hasTitle = /^title:/im.test(content);
  const junkHits = JUNK_PATTERNS.filter((p) => p.test(content)).length;
  const short = content.replace(/\s+/g, " ").trim().length < 400;
  // Challenge if: multiple junk signals, or junk + short body, or no title with junk
  if (junkHits >= 2) return true;
  if (junkHits >= 1 && short) return true;
  if (!hasTitle && junkHits >= 1) return true;
  return false;
}

function originOf(url: string): string {
  const u = new URL(url);
  return `${u.protocol}//${u.host}`;
}

function absolutize(base: string, href: string): string | null {
  try {
    const u = new URL(href, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Discover secondary URLs (pricing/features) from homepage markdown + known paths. */
export function discoverSecondaryUrls(homeUrl: string, homeMarkdown: string): string[] {
  const origin = originOf(homeUrl);
  const found = new Set<string>();

  // Known high-signal paths on same origin
  for (const path of SECONDARY_PATHS) {
    found.add(new URL(path, origin).toString());
  }

  // Links in markdown: [text](url)
  const linkRe = /\[([^\]]*)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(homeMarkdown)) !== null) {
    const abs = absolutize(homeUrl, m[2]);
    if (!abs) continue;
    try {
      const u = new URL(abs);
      if (u.origin !== new URL(origin).origin) continue;
      const path = u.pathname.toLowerCase();
      if (
        /pricing|price|plans|features|product|solutions|platform|compare|vs\b/.test(path) ||
        /pricing|plans|features|product/i.test(m[1])
      ) {
        // Drop anchors and query noise
        u.hash = "";
        found.add(u.toString());
      }
    } catch {
      /* skip */
    }
  }

  // Prefer homepage-adjacent paths; exclude the home URL itself
  const homeNorm = normalizePageUrl(homeUrl);
  return [...found]
    .filter((u) => normalizePageUrl(u) !== homeNorm)
    .slice(0, MAX_SECONDARY_PAGES + 4); // oversample; scrape will cap
}

function normalizePageUrl(url: string): string {
  try {
    const u = new URL(url);
    return (
      u.hostname.replace(/^www\./, "").toLowerCase() +
      u.pathname.replace(/\/+$/, "").toLowerCase()
    );
  } catch {
    return url.trim().toLowerCase();
  }
}

async function jinaFetch(url: string): Promise<string> {
  const apiKey = import.meta.env.JINA_API_KEY ?? process.env.JINA_API_KEY;
  if (!apiKey) throw new Error("JINA_API_KEY is not set");

  let res: Response | undefined;
  let lastErr: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      res = await fetch("https://r.jina.ai/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Return-Format": "markdown",
        },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      // Retry transient server / rate-limit errors
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`Jina API error: ${res.status} ${res.statusText}`);
        if (attempt === 2) throw lastErr;
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        continue;
      }
      break;
    } catch (err) {
      lastErr = err;
      const name = (err as { name?: string })?.name;
      if (name === "AbortError") {
        if (attempt === 2) {
          throw new Error("Jina API timeout: request exceeded 60s after 3 attempts");
        }
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      } else if (attempt === 2) {
        throw err;
      } else {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  if (!res) throw lastErr ?? new Error("Jina fetch failed");

  if (!res.ok) throw new Error(`Jina API error: ${res.status} ${res.statusText}`);

  const data = await res.json();
  const content: string = data?.data?.content ?? "";
  if (!content) throw new Error("No content returned from Jina Reader API");

  if (isLikelyChallengePage(content)) {
    throw new Error(`Could not scrape ${url}: site returned a loading or challenge page`);
  }

  // Prefer preserving pricing/feature tables
  return sanitizeMarkdown(content, true);
}

/**
 * Scrape a single URL (homepage-only, legacy entry).
 * Prefer scrapeSite() for multi-page extraction.
 */
export async function scrapeWebsite(url: string): Promise<string> {
  const result = await scrapeSite(url, { multiPage: false });
  return result.markdown;
}

export interface ScrapeSiteOptions {
  /** Follow pricing/features links from the homepage. Default true. */
  multiPage?: boolean;
  /** Max secondary pages to fetch. Default 3. */
  maxSecondary?: number;
}

/**
 * Multi-page scrape: homepage + high-signal secondary pages (pricing/features).
 */
export async function scrapeSite(
  url: string,
  options: ScrapeSiteOptions = {}
): Promise<ScrapeResult> {
  const multiPage = options.multiPage !== false;
  const maxSecondary = options.maxSecondary ?? MAX_SECONDARY_PAGES;

  const homeContent = await jinaFetch(url);
  const pages: ScrapePage[] = [
    {
      url,
      content: homeContent.slice(0, MAX_PAGE_CHARS),
      kind: "home",
    },
  ];

  if (multiPage) {
    const candidates = discoverSecondaryUrls(url, homeContent).slice(0, maxSecondary);
    const secondary = await Promise.allSettled(
      candidates.map(async (pageUrl) => {
        const content = await jinaFetch(pageUrl);
        return {
          url: pageUrl,
          content: content.slice(0, MAX_PAGE_CHARS),
          kind: "secondary" as const,
        };
      })
    );

    for (const r of secondary) {
      if (r.status === "fulfilled" && r.value.content.length > 200) {
        pages.push(r.value);
      }
    }
  }

  const parts = pages.map((p) => {
    const header =
      p.kind === "home"
        ? `# PAGE: Homepage (${p.url})`
        : `# PAGE: Secondary (${p.url})`;
    return `${header}\n\n${p.content}`;
  });

  let markdown = parts.join("\n\n---\n\n");
  if (markdown.length > MAX_COMBINED_CHARS) {
    markdown = markdown.slice(0, MAX_COMBINED_CHARS) + "\n\n[...content truncated...]";
  }

  return {
    markdown,
    pages,
    rootUrl: url,
    quality: {
      hasTitle: /^title:/im.test(homeContent),
      pageCount: pages.length,
      charCount: markdown.length,
      likelyChallenge: false,
    },
  };
}

/**
 * Scrape several competitor roots in parallel (homepage + limited secondary).
 * Failures are soft — returns whatever succeeded.
 */
export async function scrapeCompetitors(
  urls: string[],
  options: {
    maxCompetitors?: number;
    multiPage?: boolean;
    maxSecondary?: number;
  } = {}
): Promise<Array<{ url: string; markdown: string; ok: boolean; error?: string }>> {
  // Cap volume: parallel competitor scrapes dominate latency/cost.
  const max = options.maxCompetitors ?? 5;
  const maxSecondary = options.maxSecondary ?? 1;
  const slice = urls.slice(0, max);

  const results = await Promise.all(
    slice.map(async (compUrl) => {
      try {
        const site = await scrapeSite(compUrl, {
          multiPage: options.multiPage !== false,
          maxSecondary,
        });
        return { url: compUrl, markdown: site.markdown, ok: true as const };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { url: compUrl, markdown: "", ok: false as const, error: message };
      }
    })
  );

  return results;
}
