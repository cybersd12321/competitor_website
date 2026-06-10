import type { APIRoute } from "astro";
import { scrapeWebsite } from "../../lib/scraper";
import { searchCompetitors } from "../../lib/search";
import { extractBusinessContext, analyzeCompetitors } from "../../lib/analyze";
import { normalizeUrl, withCache } from "../../lib/cache";

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

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const send = (status: string, message: string, payload?: unknown) =>
    writer.write(
      encoder.encode(
        `data: ${JSON.stringify({ status, message, ...(payload ? { payload } : {}) })}\n\n`
      )
    );

  (async () => {
    try {
      const cacheKey = normalizeUrl(url);

      const cached = await withCache(cacheKey, async () => {
        // Step 1: Scrape
        await send("scraping", "Fetching target website...");
        const targetContent = await scrapeWebsite(url);

        // Step 2: Search
        await send("searching", "Identifying business niche and searching for competitors...");
        const bizContext = extractBusinessContext(targetContent);
        const searchResults = await searchCompetitors([bizContext.query]);

        // Step 3: Analyze
        await send("analyzing", "Analyzing competitors with Venice AI...");
        const analysis = await analyzeCompetitors(targetContent, searchResults);

        return { searchResults, analysis };
      });

      await send("complete", "Analysis complete.", cached);
    } catch (err) {
      console.error("ANALYSIS_PIPELINE_CRASH:", err);
      const message = err instanceof Error ? err.message : "Internal server error";
      await send("error", message);
    } finally {
      try { await writer.close(); } catch {}
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
