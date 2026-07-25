import type { APIRoute } from "astro";
import { scrapeSite, scrapeCompetitors } from "../../lib/scraper";
import { searchCompetitors } from "../../lib/search";
import { extractBusinessContext, analyzeCompetitors } from "../../lib/analyze";
import { generateSearchQueries } from "../../lib/queries";
import {
  normalizeUrl,
  withLayerCache,
  PIPELINE_VERSION,
  type QualityFlags,
} from "../../lib/cache";

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

      const cached = await withLayerCache(
        "full",
        cacheKey,
        async () => {
          // ── Step 1: Multi-page target scrape ──────────────────────────
          await send("scraping", "Fetching target website (home + pricing/features)...");
          const targetSite = await withLayerCache("scrape", cacheKey, async () =>
            scrapeSite(url, { multiPage: true, maxSecondary: 3 })
          );
          const targetContent = targetSite.markdown;

          // ── Step 2: Business context + multi-query discovery ──────────
          await send("searching", "Identifying niche and generating search queries...");
          const bizContext = extractBusinessContext(targetContent);

          const queries = await generateSearchQueries(targetContent, {
            name: bizContext.name,
            niche: bizContext.niche,
            query: bizContext.query,
          });
          console.log("PIPELINE_QUERIES:", queries);

          await send("searching", `Searching competitors (${queries.length} queries)...`);
          const searchResults = await withLayerCache(
            "search",
            `${cacheKey}|${queries.join("|")}`,
            async () =>
              searchCompetitors(queries, {
                targetUrl: url,
                nicheTerms: bizContext.terms,
                limit: 12,
              })
          );

          if (!searchResults.length) {
            throw new Error(
              "No competitor search results after filtering. Try a more product-focused URL."
            );
          }

          // ── Step 3: Scrape top competitor sites (grounded evidence) ───
          const topUrls = searchResults.slice(0, 5).map((r) => r.url);
          await send(
            "scraping_competitors",
            `Scraping top ${topUrls.length} competitor sites for feature evidence...`
          );
          const competitorScrapes = await scrapeCompetitors(topUrls, {
            maxCompetitors: 5,
            multiPage: true,
            maxSecondary: 1, // home + pricing/features only — latency budget
          });
          const scrapedOk = competitorScrapes.filter((c) => c.ok).length;
          console.log(
            `PIPELINE_COMPETITOR_SCRAPES: ${scrapedOk}/${competitorScrapes.length} ok`
          );

          // Attach SERP metadata for analyze step
          const scrapesWithMeta = competitorScrapes.map((s) => {
            const match = searchResults.find((r) => {
              try {
                return (
                  new URL(r.url).hostname.replace(/^www\./, "") ===
                  new URL(s.url).hostname.replace(/^www\./, "")
                );
              } catch {
                return false;
              }
            });
            return {
              ...s,
              title: match?.title,
              snippet: match?.snippet,
            };
          });

          // ── Step 4: Grounded AI analysis (model routed by complexity) ─
          await send("analyzing", "Analyzing competitors with grounded page evidence...");
          const analysis = await withLayerCache(
            "analysis",
            `${cacheKey}|${topUrls.join(",")}|${PIPELINE_VERSION}`,
            async () => analyzeCompetitors(targetContent, searchResults, scrapesWithMeta)
          );

          const quality: QualityFlags = {
            scrapedCompetitorCount: scrapedOk,
            searchResultCount: searchResults.length,
            matrixEvidenceCoverage: analysis.quality?.matrixEvidenceCoverage,
            targetPageCount: targetSite.quality.pageCount,
            pipelineVersion: PIPELINE_VERSION,
          };

          return {
            searchResults,
            analysis,
            queries,
            quality,
            pipelineVersion: PIPELINE_VERSION,
          };
        },
        (value) => value.quality
      );

      await send("complete", "Analysis complete.", cached);
    } catch (err) {
      console.error("ANALYSIS_PIPELINE_CRASH:", err);
      const message = err instanceof Error ? err.message : "Internal server error";
      await send("error", message);
    } finally {
      try {
        await writer.close();
      } catch {
        /* already closed */
      }
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
