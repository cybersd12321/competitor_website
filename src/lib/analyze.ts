import { callVenice } from "./venice";
import { determineRequiredModel } from "./router";
import type { SearchResult } from "./search";

export interface BusinessContext {
  name: string;
  niche: string;
  query: string;
  terms: string[];
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

export function extractBusinessContext(targetMarkdown: string): BusinessContext {
  const lines = targetMarkdown.split("\n").map((l) => l.trim()).filter(Boolean);

  // Jina includes "Title: ..." and "Description: ..." at the top
  const titleLine =
    lines.find((l) => /^title:/i.test(l))?.replace(/^title:\s*/i, "") ??
    lines.find((l) => /^#{1,2}\s/.test(l))?.replace(/^#{1,2}\s+/, "") ??
    lines[0];

  const descLine =
    lines.find((l) => /^description:/i.test(l))?.replace(/^description:\s*/i, "") ??
    lines.find((l) => {
      if (l.startsWith("#") || l.startsWith("!") || l.startsWith("[")) return false;
      if (/^image\s*\d*$/i.test(l) || /^(logo|icon|banner|screenshot|photo|illustration)(\s+\d+)?$/i.test(l)) {
        return false;
      }
      return l.length > 40 && l.includes(" ");
    }) ??
    "";

  // Keep letters from any language; strip markdown/URLs/punctuation for search safety
  const clean = (s: string) =>
    s
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[^\p{L}\p{N}\s\-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

  const cleanTitle = clean(titleLine ?? "");
  const cleanDesc = clean(descLine);

  const combined = cleanDesc
    ? `${cleanTitle} ${cleanDesc}`.trim().slice(0, 60)
    : cleanTitle.slice(0, 60);
  const query = combined + " competitors";

  const terms = `${cleanTitle} ${cleanDesc}`
    .split(/\s+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length >= 3 && !/^(the|and|for|with|from|your|our|this|that|you|are|was)$/i.test(t))
    .slice(0, 12);

  return {
    name: titleLine ?? cleanTitle,
    niche: descLine,
    query,
    terms,
  };
}

function buildCompetitorBlocks(
  searchResults: SearchResult[],
  scrapes: CompetitorScrape[],
  max = 5
): Array<{ name: string; url: string; snippet: string; content: string; scraped: boolean }> {
  const byHost = new Map<string, CompetitorScrape>();
  for (const s of scrapes) {
    try {
      const h = new URL(s.url).hostname.replace(/^www\./, "").toLowerCase();
      byHost.set(h, s);
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
    let host = "";
    try {
      host = new URL(r.url).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      continue;
    }
    const scrape = byHost.get(host);
    const content =
      scrape?.ok && scrape.markdown
        ? scrape.markdown.slice(0, 4500)
        : `(No page content scraped. SERP only.)\nTitle: ${r.title}\nSnippet: ${r.snippet}`;

    blocks.push({
      name: r.title.split(/[|\-–—]/)[0].trim() || r.title,
      url: r.url,
      snippet: r.snippet,
      content,
      scraped: Boolean(scrape?.ok && scrape.markdown),
    });
  }

  return blocks;
}

function postProcessAnalysis(
  parsed: AnalysisResult,
  competitorBlocks: Array<{ name: string; url: string; scraped: boolean }>,
  model: string,
  searchResultCount: number
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

  // Ensure competitors list aligns with scraped/search order when model drifts
  if (!parsed.competitors?.length && competitorBlocks.length) {
    parsed.competitors = competitorBlocks.map((c, i) => ({
      name: c.name,
      url: c.url,
      match_score: Math.max(50, 95 - i * 8),
      description: "",
    }));
  }

  parsed.competitors = (parsed.competitors ?? []).slice(0, 5).map((c, i) => ({
    name: c.name || competitorBlocks[i]?.name || `Competitor ${i + 1}`,
    url: c.url || competitorBlocks[i]?.url || "",
    match_score: typeof c.match_score === "number" ? c.match_score : 70,
    description: c.description ?? "",
  }));

  let evidenceHits = 0;
  let evidenceSlots = 0;

  parsed.matrix = (parsed.matrix ?? [])
    .filter((row) => !noisyKeys.some((k) => (row.feature_name ?? "").toLowerCase().includes(k)))
    .map((row) => {
      const target_has = row.target_has === true ? true : row.target_has === false ? false : null;

      // Align competitor_values length; null = unknown (not false)
      let vals: Array<boolean | null> = Array.isArray(row.competitor_values)
        ? [...row.competitor_values]
        : [];
      while (vals.length < n) vals.push(null);
      vals = vals.slice(0, n).map((v) => (v === true ? true : v === false ? false : null));

      // If competitor was not scraped, force unknown unless model left null already
      vals = vals.map((v, i) => {
        if (!competitorBlocks[i]?.scraped) {
          // Keep true/false only if we have evidence string; else null
          const ev = row.competitor_evidence?.[i];
          if (!ev || String(ev).trim().length < 8) return null;
        }
        return v;
      });

      const is_gap = target_has === false && vals.some((v) => v === true);

      // Evidence coverage stats
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
  competitorScrapes: CompetitorScrape[] = []
): Promise<AnalysisResult> {
  const competitorBlocks = buildCompetitorBlocks(searchResults, competitorScrapes, 5);

  if (!competitorBlocks.length) {
    throw new Error("No competitor candidates available to analyze");
  }

  const model = await determineRequiredModel(targetMarkdown);

  const systemPrompt = `You are a senior competitive intelligence analyst. Your job is to find NON-OBVIOUS, high-signal differentiators that reveal real strategic gaps — not generic features every website has.

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
- Return EXACTLY ${Math.min(5, competitorBlocks.length)} competitors using the URLs provided (do not invent domains).
- Return EXACTLY 12–15 matrix rows spanning at least 4 categories.
- Do not invent competitors that are not in the provided list.`;

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

  const userContext = `TARGET WEBSITE CONTENT (read thoroughly for target_has):
${targetMarkdown.slice(0, 9000)}

${competitorSection}

Return one JSON object matching the schema.`;

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
      parsedData.target_summary = { audience: "Unknown", monetization: "Unknown" };
    }

    return postProcessAnalysis(
      parsedData,
      competitorBlocks,
      model,
      searchResults.length
    );
  } catch (err) {
    console.error("CRITICAL_MATRIX_PARSING_FAULT.", err);
    throw new Error("Failed to parse market matrix from Venice response.");
  }
}
