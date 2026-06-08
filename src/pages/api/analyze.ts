import type { APIRoute } from "astro";
import { scrapeWebsite } from "../../lib/scraper";
import { generateSearchQueries } from "../../lib/queries";
import { searchCompetitors } from "../../lib/search";
import { analyzeCompetitors } from "../../lib/analyze";
import type { SearchResult } from "../../lib/search";

export const POST: APIRoute = async ({ request }) => {
  let url: string;

  try {
    const body = await request.json();
    url = body?.url;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!url || !/^https?:\/\/.+/.test(url)) {
    return new Response(
      JSON.stringify({ error: "A valid URL is required in the request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Step 1: Scrape target website
    const targetContent = await scrapeWebsite(url);

    // Step 2: Generate search queries directly from content
    const queries = await generateSearchQueries(targetContent);

    // Step 3: Search for competitors
    const searchResults = await searchCompetitors(queries);

    // Step 4: Scrape top 10 candidate URLs in parallel
    const candidates = searchResults.slice(0, 10);
    const scrapeResults = await Promise.allSettled(
      candidates.map(result => scrapeWebsite(result.url).then(content => ({ ...result, scrapedContent: content })))
    );
    const scrapedCompetitors = scrapeResults
      .filter(r => r.status === "fulfilled")
      .map(r => (r as PromiseFulfilledResult<SearchResult & { scrapedContent: string }>).value);

    // Step 5: Analyze
    const analysis = await analyzeCompetitors(
      targetContent,
      scrapedCompetitors.length > 0 ? scrapedCompetitors : searchResults
    );

    return new Response(
      JSON.stringify({ success: true, queries, searchResults, analysis }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/analyze]", message);

    const isServiceUnavailable =
      message.includes("503") ||
      message.toLowerCase().includes("unavailable") ||
      message.toLowerCase().includes("high demand");

    const isQuotaExhausted =
      message.includes("429") ||
      message.toLowerCase().includes("quota") ||
      message.toLowerCase().includes("resource_exhausted");

    return new Response(
      JSON.stringify({
        error: isQuotaExhausted
          ? "All AI providers are currently rate-limited. Please try again in a minute."
          : message,
        serviceUnavailable: isServiceUnavailable,
        rateLimited: isQuotaExhausted,
      }),
      {
        status: isServiceUnavailable ? 503 : isQuotaExhausted ? 429 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
