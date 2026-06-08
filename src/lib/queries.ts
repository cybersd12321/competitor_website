import { callVenice } from "./venice";

export async function generateSearchQueries(websiteContent: string): Promise<string[]> {
  const prompt = `You are a competitive intelligence researcher. Read this website content carefully and generate 6 Google search queries to find its direct competitors.

STEP 1 — Before writing any query, identify from the content:
- The single most specific niche keyword that defines this business (e.g. the technology, methodology, or differentiator that sets it apart from generic alternatives in its category)
- The primary product category
- The target audience

STEP 2 — Generate 6 queries. Every query MUST include the niche keyword from Step 1. Do not drop it or replace it with a generic synonym.
- 3 queries: niche keyword + category from different angles
- 2 queries: niche keyword + a specific feature this product offers
- 1 query: "alternative to [this product's name or a known player in this exact niche]"

Website content:
${websiteContent.slice(0, 7000)}

Respond with ONLY a JSON object, no other text:
{"queries": ["query 1", "query 2", "query 3", "query 4", "query 5", "query 6"]}`;

  const text = await callVenice(prompt);
  const parsed = JSON.parse(text) as { queries: string[] };
  if (!parsed.queries?.length) throw new Error("No queries returned from Venice");
  return parsed.queries.slice(0, 6);
}
