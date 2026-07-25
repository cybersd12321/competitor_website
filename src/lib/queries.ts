import { callVenice } from "./venice";

/**
 * Generate multiple search queries for competitor discovery.
 * Combines LLM suggestions with template variants for higher recall.
 */
export async function generateSearchQueries(
  websiteContent: string,
  seed?: { name?: string; niche?: string; query?: string }
): Promise<string[]> {
  const prompt = `Based on the following website content, generate a raw comma-separated list of exactly 3 distinct Google search queries a human would use to find DIRECT product alternatives / competitors (not review articles, not "how to").

Rules:
- Each query should name the product category or value prop, not only the brand.
- Prefer forms like: "<category> software", "<category> alternative", "<niche> platform".
- Do NOT include the brand's own name if known.
- No code blocks, notes, or numbering. Output only the queries separated by commas.

${websiteContent.slice(0, 7000)}`;

  const queries: string[] = [];

  try {
    const text = await callVenice(prompt, "qwen3-5-9b");
    const parts = text
      .split(/[,\n]/)
      .map((q) => q.replace(/^[\d.)\-\*]+\s*/, "").replace(/^["']|["']$/g, "").trim())
      .filter((q) => q.length >= 6 && q.length <= 80);
    queries.push(...parts);
  } catch (err) {
    console.warn("generateSearchQueries LLM failed, using seed fallbacks:", err);
  }

  // Seed / heuristic fallbacks always help recall
  if (seed?.query) queries.push(seed.query);
  if (seed?.name) {
    const brand = seed.name.replace(/[^\w\s\-]/g, " ").trim().slice(0, 40);
    if (brand.length >= 2) {
      queries.push(`${brand} alternatives`);
      queries.push(`${brand} competitors`);
      queries.push(`${brand} vs`);
    }
  }
  if (seed?.niche) {
    const niche = seed.niche.replace(/[^\w\s\-]/g, " ").trim().slice(0, 50);
    if (niche.split(/\s+/).length >= 2) {
      queries.push(`${niche} software`);
      queries.push(`${niche} platform`);
    }
  }

  // Dedupe case-insensitively, cap
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of queries) {
    const k = q.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(q);
    if (out.length >= 5) break;
  }

  if (!out.length) {
    throw new Error("No search queries could be generated from website content");
  }
  return out;
}
