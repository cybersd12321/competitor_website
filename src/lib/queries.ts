import { callVenice } from "./venice";
import type { BusinessContext } from "./analyze";

const STOP = new Set(
  "the and for with from your our this that you are was its a an of to in on at by as or vs".split(
    " "
  )
);

function stripBrandFromQuery(q: string, brand?: string): string {
  if (!brand) return q;
  const brandTokens = brand
    .toLowerCase()
    .split(/[\s\-_|/]+/)
    .filter((t) => t.length >= 3 && !STOP.has(t));
  let out = q;
  for (const t of brandTokens) {
    out = out.replace(new RegExp(`\\b${escapeRegExp(t)}\\b`, "gi"), " ");
  }
  return out.replace(/\s+/g, " ").trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isGarbageBrand(name?: string): boolean {
  if (!name) return true;
  const n = name.trim();
  if (n.length < 2 || n.length > 60) return true;
  if (/^page\s*:/i.test(n)) return true;
  if (/homepage|secondary\s*\(/i.test(n)) return true;
  if (/^https?:/i.test(n)) return true;
  return false;
}

/**
 * Generate multiple search queries for competitor discovery.
 * Prefers category / niche language over brand-name SERP noise.
 */
export async function generateSearchQueries(
  websiteContent: string,
  seed?: Partial<BusinessContext> & { name?: string; niche?: string; query?: string }
): Promise<string[]> {
  const brand = seed?.name?.trim();
  const category = seed?.category?.trim() || seed?.niche?.trim() || "";
  const prebaked = (seed?.searchQueries ?? []).filter(Boolean);

  const prompt = `You generate Google search queries to find DIRECT product alternatives to a website.

Brand (DO NOT put this brand name in any query): ${brand || "unknown"}
Category / niche: ${category || "infer from content"}
Audience: ${seed?.audience || "unknown"}

Rules:
- Output exactly 3 queries, comma-separated only (no numbering, no quotes, no markdown).
- Each query must describe the PRODUCT CATEGORY or use-case, not the brand.
- Prefer forms: "<category> software", "<category> alternative", "best <category> tools", "<niche> platform".
- Never include the brand name, domain, or "competitors of <brand>".
- English queries unless the product is clearly non-English only.

Website content:
${websiteContent.slice(0, 6000)}`;

  const queries: string[] = [...prebaked];

  try {
    const text = await callVenice(prompt, "qwen3-5-9b");
    const parts = text
      .split(/[,\n]/)
      .map((q) => q.replace(/^[\d.)\-\*]+\s*/, "").replace(/^["']|["']$/g, "").trim())
      .map((q) => stripBrandFromQuery(q, brand))
      .filter((q) => q.length >= 6 && q.length <= 80);
    queries.push(...parts);
  } catch (err) {
    console.warn("generateSearchQueries LLM failed, using seed fallbacks:", err);
  }

  // Category / niche templates (best recall, less self-SERP)
  if (category) {
    const niche = category
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[^\p{L}\p{N}\s\-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 50);
    if (niche.split(/\s+/).filter(Boolean).length >= 2) {
      queries.push(`${niche} software`);
      queries.push(`${niche} alternative`);
      queries.push(`best ${niche} tools`);
      queries.push(`${niche} platform`);
    }
  }

  // Brand "alternatives" is useful ONLY as a last-resort recall boost
  // (self-domain is filtered hard in search.ts). Skip garbage brand labels.
  if (!isGarbageBrand(brand) && queries.length < 3) {
    const shortBrand = brand!
      .replace(/[^\p{L}\p{N}\s\-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40);
    if (shortBrand.split(/\s+/).length <= 4) {
      queries.push(`${shortBrand} alternatives`);
    }
  }

  if (seed?.query) {
    queries.push(stripBrandFromQuery(seed.query, brand));
  }

  // Keywords as soft queries
  for (const kw of seed?.terms ?? []) {
    if (kw.length >= 4) queries.push(`${kw} software alternative`);
  }

  // Dedupe case-insensitively, drop brand-only / too-short, cap
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of queries) {
    const cleaned = q.replace(/\s+/g, " ").trim();
    if (cleaned.length < 6) continue;
    const words = cleaned.split(/\s+/).filter((w) => !STOP.has(w.toLowerCase()));
    if (words.length < 2) continue;
    const k = cleaned.toLowerCase();
    if (seen.has(k)) continue;
    // Drop queries that are just the brand name
    if (!isGarbageBrand(brand) && brand && k === brand.toLowerCase()) continue;
    seen.add(k);
    out.push(cleaned);
    if (out.length >= 5) break;
  }

  if (!out.length) {
    throw new Error("No search queries could be generated from website content");
  }
  return out;
}
