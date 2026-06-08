import type { SearchResult } from "./search";
import { callVenice } from "./venice";

export interface AnalysisResult {
  target_summary: {
    audience: string;
    monetization: string;
  };
  competitors: Array<{
    name: string;
    url: string;
    match_score: number;
    description: string;
  }>;
  matrix: Array<{
    feature_name: string;
    target_has: boolean;
    comp_1_has: boolean;
    comp_2_has: boolean;
    comp_3_has: boolean;
    comp_4_has: boolean;
    comp_5_has: boolean;
    is_gap: boolean;
  }>;
}

type CompetitorInput = SearchResult & { scrapedContent?: string };

const SCHEMA_STUB = `{"target_summary":{"audience":"...","monetization":"..."},"competitors":[{"name":"...","url":"...","match_score":0,"description":"..."}],"matrix":[{"feature_name":"...","target_has":true,"comp_1_has":true,"comp_2_has":true,"comp_3_has":true,"comp_4_has":true,"comp_5_has":true,"is_gap":false}]}`;

export async function analyzeCompetitors(
  targetContent: string,
  candidates: CompetitorInput[]
): Promise<AnalysisResult> {
  const competitorContext = candidates
    .slice(0, 10)
    .map((c, i) => {
      const content = (c as any).scrapedContent
        ? (c as any).scrapedContent.slice(0, 2500)
        : c.snippet;
      let rootUrl = c.url;
      try { const u = new URL(c.url); rootUrl = `${u.protocol}//${u.hostname}`; } catch {}
      return `CANDIDATE ${i + 1}: ${c.title}\nURL: ${rootUrl}\n${content}`;
    })
    .join("\n\n---\n\n");

  const prompt = `You are a senior competitive intelligence analyst. Analyze the target business and identify its top 5 most relevant direct competitors from the candidates provided.

TARGET BUSINESS:
${targetContent.slice(0, 4000)}

COMPETITOR CANDIDATES:
${competitorContext}

INSTRUCTIONS:

1. IDENTIFY THE TARGET'S NICHE: Read the target content and determine the single most specific characteristic that defines this business — the technology, methodology, or differentiator that sets it apart from generic alternatives in its space. Use only what the content says; do not import assumptions from other industries.

2. FIND THE BEST 5 COMPETITORS: Only include candidates that share the same niche characteristic identified in step 1. A candidate in the same broad category but different niche is NOT a match. Prefer niche-correct lower-known competitors over well-known but niche-wrong ones. Skip blog posts, news articles, app store listings, and review aggregators.

3. RANK BY MATCH SCORE (highest first): Score 0–100. Niche match = 40 pts. Feature overlap = 30 pts. Audience match = 20 pts. Business model = 10 pts. Sort highest to lowest.

4. COMPETITOR URL: Root homepage only. Strip all paths.

5. DESCRIPTION: 2 sentences. First: what the platform does including its niche. Second: which specific features it shares with the target.

6. FEATURE MATRIX: List 6–8 of the target's actual features as rows. Mark true only when explicitly evidenced in candidate content. Set is_gap=true only when target_has=false and 2+ competitors have it.

Respond with ONLY valid JSON in this exact shape, no other text:
${SCHEMA_STUB}`;

  const text = await callVenice(prompt);
  const parsed = JSON.parse(text) as AnalysisResult;

  if (!parsed.competitors?.length || !parsed.matrix?.length)
    throw new Error("Incomplete analysis returned from Venice");

  // Normalize URLs to root homepage
  parsed.competitors.forEach(c => {
    try { const u = new URL(c.url); c.url = `${u.protocol}//${u.hostname}`; } catch {}
    c.match_score = Math.max(0, Math.min(100, Math.round(c.match_score)));
  });

  // Sort competitors by match_score descending
  parsed.competitors.sort((a, b) => b.match_score - a.match_score);

  // Enforce is_gap consistency
  parsed.matrix.forEach(row => { if (row.target_has) row.is_gap = false; });

  return parsed;
}
