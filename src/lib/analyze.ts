import { callVenice } from "./venice";
import { determineRequiredModel } from "./router";
import { isSameSite, rootHost, type SearchResult } from "./search";

export interface BusinessContext {
  name: string;
  niche: string;
  category: string;
  audience: string;
  query: string;
  terms: string[];
  /** Pre-baked competitor search queries (no brand name). */
  searchQueries: string[];
}

export interface CompetitorScrape {
  url: string;
  markdown: string;
  ok: boolean;
  error?: string;
  title?: string;
  snippet?: string;
}

export interface MatrixRow {
  feature_name: string;
  category: string;
  importance: "high" | "medium" | "low" | string;
  target_has: boolean | null;
  competitor_values: Array<boolean | null>;
  is_gap: boolean;
  /** Short evidence snippet for target (optional). */
  target_evidence?: string | null;
  /** Per-competitor evidence; null when unknown. */
  competitor_evidence?: Array<string | null>;
}

export interface AnalysisResult {
  target_summary: { audience: string; monetization: string };
  competitors: Array<{
    name: string;
    url: string;
    match_score: number;
    description: string;
  }>;
  matrix: MatrixRow[];
  quality?: {
    scrapedCompetitorCount: number;
    searchResultCount: number;
    matrixEvidenceCoverage: number;
    model: string;
  };
}

const MATRIX_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    target_summary: {
      type: "object",
      additionalProperties: false,
      properties: {
        audience: { type: "string" },
        monetization: { type: "string" },
      },
      required: ["audience", "monetization"],
    },
    competitors: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          url: { type: "string" },
          match_score: { type: "number" },
          description: { type: "string" },
        },
        required: ["name", "url", "match_score", "description"],
      },
    },
    matrix: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          feature_name: { type: "string" },
          category: { type: "string" },
          importance: { type: "string", enum: ["high", "medium", "low"] },
          target_has: { type: ["boolean", "null"] },
          competitor_values: {
            type: "array",
            items: { type: ["boolean", "null"] },
          },
          is_gap: { type: "boolean" },
          target_evidence: { type: ["string", "null"] },
          competitor_evidence: {
            type: "array",
            items: { type: ["string", "null"] },
          },
        },
        required: [
          "feature_name",
          "category",
          "importance",
          "target_has",
          "competitor_values",
          "is_gap",
        ],
      },
    },
  },
  required: ["target_summary", "competitors", "matrix"],
} as const;

const NICHE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    brand_name: { type: "string" },
    product_category: { type: "string" },
    niche_description: { type: "string" },
    primary_audience: { type: "string" },
    monetization_hint: { type: "string" },
    keywords: {
      type: "array",
      items: { type: "string" },
    },
    competitor_search_queries: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "brand_name",
    "product_category",
    "niche_description",
    "primary_audience",
    "keywords",
    "competitor_search_queries",
  ],
} as const;

const STOP_WORDS = new Set(
  "the and for with from your our this that you are was were been have has had its a an of to in on at by as or we they them their".split(
    " "
  )
);

function cleanText(s: string): string {
  return s
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\p{L}\p{N}\s\-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Use homepage section only when multi-page scrape is present. */
function homepageSlice(markdown: string): string {
  const parts = markdown.split(/\n---\n/);
  if (parts.length > 1 && /#\s*PAGE:/i.test(parts[0])) {
    return parts[0];
  }
  // Also handle secondary markers
  const sec = markdown.search(/\n#\s*PAGE:\s*Secondary/i);
  if (sec > 200) return markdown.slice(0, sec);
  return markdown.slice(0, 12_000);
}

function heuristicBusinessContext(targetMarkdown: string, targetUrl?: string): BusinessContext {
  const home = homepageSlice(targetMarkdown);
  const lines = home.split("\n").map((l) => l.trim()).filter(Boolean);

  const titleLine =
    lines.find((l) => /^title:\s*/i.test(l))?.replace(/^title:\s*/i, "") ??
    lines.find((l) => /^#{1,2}\s+(?!PAGE:)/i.test(l))?.replace(/^#{1,2}\s+/, "") ??
    lines.find((l) => l.length > 3 && !/^#\s*PAGE:/i.test(l) && !/^image\s*\d/i.test(l)) ??
    "";

  const descLine =
    lines.find((l) => /^description:\s*/i.test(l))?.replace(/^description:\s*/i, "") ??
    lines.find((l) => {
      if (l.startsWith("#") || l.startsWith("!") || l.startsWith("[")) return false;
      if (/^title:/i.test(l) || /^page:/i.test(l)) return false;
      if (/^image\s*\d*$/i.test(l) || /^(logo|icon|banner|screenshot|photo|illustration)(\s+\d+)?$/i.test(l)) {
        return false;
      }
      return l.length > 40 && l.includes(" ");
    }) ??
    "";

  let hostBrand = "";
  if (targetUrl) {
    try {
      const host = new URL(targetUrl).hostname.replace(/^www\./, "");
      hostBrand = host.split(".")[0] ?? "";
    } catch {
      /* ignore */
    }
  }

  const cleanTitle = cleanText(titleLine);
  const cleanDesc = cleanText(descLine);
  const name =
    cleanTitle && !/^page\b/i.test(cleanTitle)
      ? cleanTitle.split(/[|\-–—]/)[0].trim().slice(0, 80)
      : hostBrand || cleanTitle || "Unknown product";

  const niche = cleanDesc || cleanTitle || hostBrand || "online product";
  const category = niche.slice(0, 80);
  const terms = `${cleanTitle} ${cleanDesc} ${category}`
    .split(/\s+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t))
    .slice(0, 12);

  const catWords = category
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w.toLowerCase()))
    .slice(0, 4)
    .join(" ");

  return {
    name,
    niche,
    category: catWords || category,
    audience: "Unknown",
    query: catWords ? `${catWords} alternative` : `${name} alternative`,
    terms,
    searchQueries: catWords
      ? [`${catWords} software`, `${catWords} alternative`, `best ${catWords} tools`]
      : [],
  };
}

/**
 * Infer brand, product category, niche, and search queries from scraped site content.
 * Uses LLM structured output with heuristic fallback.
 */
export async function extractBusinessContext(
  targetMarkdown: string,
  targetUrl?: string
): Promise<BusinessContext> {
  const fallback = heuristicBusinessContext(targetMarkdown, targetUrl);
  const home = homepageSlice(targetMarkdown).slice(0, 8000);

  const prompt = `You are a product analyst. Read the website content and identify what business/product this site actually is.

Return JSON only matching the schema. Rules:
- brand_name: short product/company name (not a full marketing slogan). Never "PAGE: Homepage".
- product_category: 2-5 word category people would Google (e.g. "form builder", "project management SaaS", "meal kit delivery"). NOT the brand name alone.
- niche_description: one clear sentence of what they sell / do.
- primary_audience: who buys it.
- monetization_hint: freemium / subscription / marketplace / ads / ecommerce / services / unknown.
- keywords: 5-8 product keywords WITHOUT the brand name.
- competitor_search_queries: exactly 3 Google queries to find DIRECT alternatives. Must NOT include the brand name or domain. Use category language.

Target URL: ${targetUrl || "unknown"}

WEBSITE CONTENT:
${home}`;

  try {
    let raw = await callVenice(
      prompt,
      "qwen3-5-9b",
      NICHE_JSON_SCHEMA as unknown as Record<string, unknown>
    );
    // freeform retry path already handled inside callVenice for non-schema
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON in niche response");
    const parsed = JSON.parse(raw.slice(start, end + 1)) as {
      brand_name?: string;
      product_category?: string;
      niche_description?: string;
      primary_audience?: string;
      monetization_hint?: string;
      keywords?: string[];
      competitor_search_queries?: string[];
    };

    const name = cleanText(parsed.brand_name || fallback.name).slice(0, 80) || fallback.name;
    const category =
      cleanText(parsed.product_category || "").slice(0, 80) || fallback.category;
    const niche =
      cleanText(parsed.niche_description || "").slice(0, 200) ||
      category ||
      fallback.niche;
    const audience = cleanText(parsed.primary_audience || "").slice(0, 120) || fallback.audience;

    const terms = [
      ...(Array.isArray(parsed.keywords) ? parsed.keywords : []),
      ...category.split(/\s+/),
    ]
      .map((t) => cleanText(String(t)).toLowerCase())
      .filter((t) => t.length >= 3 && !STOP_WORDS.has(t))
      .filter((t) => !name.toLowerCase().includes(t) || t.length >= 5)
      .slice(0, 12);

    const searchQueries = (Array.isArray(parsed.competitor_search_queries)
      ? parsed.competitor_search_queries
      : []
    )
      .map((q) => String(q).trim())
      .filter((q) => q.length >= 6 && q.length <= 80)
      // Drop queries that still contain the brand
      .filter((q) => {
        const brandTok = name.toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
        const ql = q.toLowerCase();
        return !brandTok.some((t) => ql.includes(t));
      })
      .slice(0, 5);

    console.log("PIPELINE_NICHE:", { name, category, niche, audience, searchQueries, terms });

    return {
      name,
      niche,
      category,
      audience,
      query: category ? `${category} alternative` : fallback.query,
      terms: terms.length ? terms : fallback.terms,
      searchQueries: searchQueries.length ? searchQueries : fallback.searchQueries,
    };
  } catch (err) {
    console.warn("extractBusinessContext LLM failed, using heuristic:", err);
    return fallback;
  }
}

function buildCompetitorBlocks(
  searchResults: SearchResult[],
  scrapes: CompetitorScrape[],
  max = 5,
  targetUrl?: string
): Array<{ name: string; url: string; snippet: string; content: string; scraped: boolean }> {
  const byHost = new Map<string, CompetitorScrape>();
  for (const s of scrapes) {
    try {
      const h = rootHost(s.url);
      if (h) byHost.set(h, s);
    } catch {
      /* skip */
    }
  }

  const blocks: Array<{
    name: string;
    url: string;
    snippet: string;
    content: string;
    scraped: boolean;
  }> = [];

  for (const r of searchResults) {
    if (blocks.length >= max) break;
    if (targetUrl && isSameSite(r.url, targetUrl)) continue;

    let host = "";
    try {
      host = rootHost(r.url);
    } catch {
      continue;
    }
    if (!host) continue;

    const scrape = byHost.get(host);
    // Soft-match scrape by registrable host if exact host map miss
    let scrapeHit = scrape;
    if (!scrapeHit) {
      for (const [h, s] of byHost) {
        if (isSameSite(`https://${h}`, r.url)) {
          scrapeHit = s;
          break;
        }
      }
    }

    const content =
      scrapeHit?.ok && scrapeHit.markdown
        ? scrapeHit.markdown.slice(0, 4500)
        : `(No page content scraped. SERP only.)\nTitle: ${r.title}\nSnippet: ${r.snippet}`;

    blocks.push({
      name: r.title.split(/[|\-–—]/)[0].trim() || r.title,
      url: r.url,
      snippet: r.snippet,
      content,
      scraped: Boolean(scrapeHit?.ok && scrapeHit.markdown),
    });
  }

  return blocks;
}

function postProcessAnalysis(
  parsed: AnalysisResult,
  competitorBlocks: Array<{ name: string; url: string; snippet?: string; scraped: boolean }>,
  model: string,
  searchResultCount: number,
  targetUrl?: string,
  biz?: BusinessContext
): AnalysisResult {
  const noisyKeys = [
    "search bar",
    "navigation",
    "cart",
    "menu",
    "login",
    "contact form",
    "newsletter",
    "cookie",
    "sitemap",
    "social media",
    "faq page",
    "about us",
    "blog",
  ];

  const n = competitorBlocks.length;
  const modelByHost = new Map<string, AnalysisResult["competitors"][0]>();
  for (const c of parsed.competitors ?? []) {
    if (!c?.url) continue;
    try {
      const h = rootHost(c.url);
      if (h) modelByHost.set(h, c);
    } catch {
      /* skip */
    }
  }

  // CRITICAL: competitor URLs always come from SERP blocks — never trust the LLM for links.
  // This prevents every card linking back to the analyzed site (or invented domains).
  parsed.competitors = competitorBlocks.map((block, i) => {
    const host = rootHost(block.url);
    const byHost = host ? modelByHost.get(host) : undefined;
    const byIndex = parsed.competitors?.[i];
    const modelC =
      byHost && (!targetUrl || !isSameSite(byHost.url, targetUrl)) ? byHost : byIndex;

    let match =
      typeof modelC?.match_score === "number" && Number.isFinite(modelC.match_score)
        ? modelC.match_score
        : Math.max(50, 95 - i * 8);
    match = Math.max(0, Math.min(100, Math.round(match)));

    // Prefer SERP title for name; model may rename but must not invent the target brand as every row
    let name = (modelC?.name || block.name || `Competitor ${i + 1}`).trim().slice(0, 120);
    if (biz?.name) {
      const brand = biz.name.toLowerCase();
      if (name.toLowerCase() === brand || name.toLowerCase().startsWith(brand + " ")) {
        name = block.name.slice(0, 120);
      }
    }

    return {
      name,
      url: block.url, // always SERP — never LLM-invented
      match_score: match,
      description: (modelC?.description || block.snippet || "").slice(0, 400),
    };
  });

  // Final self-site purge (should already be empty)
  if (targetUrl) {
    parsed.competitors = parsed.competitors.filter((c) => !isSameSite(c.url, targetUrl));
  }

  // Improve target_summary when model is vague
  if (
    !parsed.target_summary ||
    parsed.target_summary.audience === "Unknown" ||
    !parsed.target_summary.audience
  ) {
    parsed.target_summary = {
      audience: biz?.audience || parsed.target_summary?.audience || "Unknown",
      monetization: parsed.target_summary?.monetization || "Unknown",
    };
  }
  if (biz?.niche && (!parsed.target_summary.monetization || parsed.target_summary.monetization === "Unknown")) {
    // keep model monetization if set; audience prefer richer
    if (biz.audience && biz.audience !== "Unknown") {
      parsed.target_summary.audience = biz.audience;
    }
  }

  let evidenceHits = 0;
  let evidenceSlots = 0;

  parsed.matrix = (parsed.matrix ?? [])
    .filter((row) => !noisyKeys.some((k) => (row.feature_name ?? "").toLowerCase().includes(k)))
    .map((row) => {
      const target_has = row.target_has === true ? true : row.target_has === false ? false : null;

      let vals: Array<boolean | null> = Array.isArray(row.competitor_values)
        ? [...row.competitor_values]
        : [];
      while (vals.length < n) vals.push(null);
      vals = vals.slice(0, n).map((v) => (v === true ? true : v === false ? false : null));

      vals = vals.map((v, i) => {
        if (!competitorBlocks[i]?.scraped) {
          const ev = row.competitor_evidence?.[i];
          if (!ev || String(ev).trim().length < 8) return null;
        }
        return v;
      });

      const is_gap = target_has === false && vals.some((v) => v === true);

      evidenceSlots += 1 + n;
      if (row.target_evidence && String(row.target_evidence).trim().length >= 8) evidenceHits++;
      for (let i = 0; i < n; i++) {
        if (row.competitor_evidence?.[i] && String(row.competitor_evidence[i]).trim().length >= 8) {
          evidenceHits++;
        }
      }

      return {
        ...row,
        category: row.category ?? "General",
        importance: row.importance ?? "medium",
        target_has,
        competitor_values: vals,
        is_gap,
      };
    });

  const scrapedCompetitorCount = competitorBlocks.filter((c) => c.scraped).length;
  const matrixEvidenceCoverage =
    evidenceSlots > 0 ? Math.round((evidenceHits / evidenceSlots) * 100) / 100 : 0;

  parsed.quality = {
    scrapedCompetitorCount,
    searchResultCount,
    matrixEvidenceCoverage,
    model,
  };

  return parsed;
}

export async function analyzeCompetitors(
  targetMarkdown: string,
  searchResults: SearchResult[],
  competitorScrapes: CompetitorScrape[] = [],
  opts: { targetUrl?: string; biz?: BusinessContext } = {}
): Promise<AnalysisResult> {
  const { targetUrl, biz } = opts;

  const filteredResults = targetUrl
    ? searchResults.filter((r) => !isSameSite(r.url, targetUrl))
    : searchResults;

  const competitorBlocks = buildCompetitorBlocks(
    filteredResults,
    competitorScrapes,
    5,
    targetUrl
  );

  if (!competitorBlocks.length) {
    throw new Error("No competitor candidates available to analyze");
  }

  const model = await determineRequiredModel(targetMarkdown);

  const nicheHint = biz
    ? `Product: ${biz.name}\nCategory: ${biz.category}\nNiche: ${biz.niche}\nAudience: ${biz.audience}`
    : "";

  const systemPrompt = `You are a senior competitive intelligence analyst. Your job is to find NON-OBVIOUS, high-signal differentiators that reveal real strategic gaps — not generic features every website has.

TARGET PRODUCT CONTEXT:
${nicheHint || "(infer from target content)"}

STRICT RULES:
- FORBIDDEN (never include): search bar, navigation menu, login/signup, shopping cart, contact form, responsive design, social media links, SSL certificate, newsletter subscription, cookie banner, FAQ page, 404 page, sitemap.
- AVOID GENERIC: "Product catalog", "Customer reviews", "About Us page", "Blog", "Mobile app" — these are table stakes, not differentiators.
- ONLY include features that are commercially or strategically significant: conversion, revenue model, retention, or market positioning.
- Each feature must belong to one of: "Pricing & Commerce", "Trust & Credibility", "Fulfillment & Operations", "Product Depth", "Support & Success", "Growth & Acquisition", "Tech & Integrations".
- importance: "high" = revenue/retention | "medium" = conversion | "low" = nice-to-have.

EVIDENCE RULES (critical for accuracy):
- competitor_values[i] must be grounded in COMPETITOR i's PAGE CONTENT when available.
- If a competitor has "(No page content scraped...)", set competitor_values[i] to null (unknown) — do NOT invent true/false.
- target_has must reflect TARGET WEBSITE CONTENT only. Use null if unclear.
- is_gap = true ONLY when target_has is false AND at least one competitor_values entry is true.
- For every non-null boolean, provide a short evidence quote (target_evidence / competitor_evidence[i]) from that site's content (≤120 chars).
- competitor_values and competitor_evidence arrays MUST have length ${competitorBlocks.length} (same order as listed competitors).
- Return EXACTLY ${competitorBlocks.length} competitors. Use the EXACT urls and order given below — do not invent, rewrite, or swap domains. Do not list the target site as a competitor.
- Return EXACTLY 12–15 matrix rows spanning at least 4 categories.
- target_summary.audience and monetization must match the TARGET PRODUCT CONTEXT.`;

  const competitorSection = competitorBlocks
    .map(
      (c, i) =>
        `### COMPETITOR ${i} — ${c.name}
URL: ${c.url}
Scraped: ${c.scraped ? "yes" : "no"}
SERP snippet: ${c.snippet}

PAGE CONTENT:
${c.content}`
    )
    .join("\n\n");

  const userContext = `TARGET WEBSITE URL: ${targetUrl || "unknown"}
TARGET WEBSITE CONTENT (read thoroughly for target_has):
${targetMarkdown.slice(0, 9000)}

${competitorSection}

Return one JSON object matching the schema. competitors[].url MUST be copied exactly from the list above.`;

  let rawText: string;
  try {
    rawText = await callVenice(
      `${systemPrompt}\n\n${userContext}`,
      model,
      MATRIX_JSON_SCHEMA as unknown as Record<string, unknown>
    );
  } catch (schemaErr) {
    console.warn("JSON-schema Venice call failed, falling back to freeform:", schemaErr);
    rawText = await callVenice(`${systemPrompt}\n\n${userContext}`, model);
  }

  try {
    const jsonStart = rawText.indexOf("{");
    const jsonEnd = rawText.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found in response.");

    const parsedData = JSON.parse(rawText.substring(jsonStart, jsonEnd + 1)) as AnalysisResult;

    if (!parsedData.competitors) parsedData.competitors = [];
    if (!parsedData.matrix) parsedData.matrix = [];
    if (!parsedData.target_summary) {
      parsedData.target_summary = {
        audience: biz?.audience || "Unknown",
        monetization: "Unknown",
      };
    }

    return postProcessAnalysis(
      parsedData,
      competitorBlocks,
      model,
      filteredResults.length,
      targetUrl,
      biz
    );
  } catch (err) {
    console.error("CRITICAL_MATRIX_PARSING_FAULT.", err);
    throw new Error("Failed to parse market matrix from Venice response.");
  }
}
