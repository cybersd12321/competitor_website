import type { APIRoute } from "astro";
import { scrapeSite, scrapeCompetitors } from "../../lib/scraper";
import { searchCompetitors, rootHost, isSameSite } from "../../lib/search";
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

  // Normalize trailing slash / casing for consistent cache + exclusion
  try {
    const u = new URL(url);
    u.hash = "";
    url = u.toString();
  } catch {
    /* keep raw */
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
      const cacheKey = `${PIPELINE_VERSION}|${normalizeUrl(url)}`;

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

          // ── Step 2: Niche understanding + multi-query discovery ───────
          await send("searching", "Identifying product niche and category...");
          const bizContext = await extractBusinessContext(targetContent, url);
          console.log("PIPELINE_BIZ:", bizContext);

          const queries = await generateSearchQueries(targetContent, bizContext);
          console.log("PIPELINE_QUERIES:", queries);

          await send(
            "searching",
            `Searching competitors for “${bizContext.category || bizContext.niche.slice(0, 40)}”...`
          );

          const targetHost = rootHost(url);
          const searchResults = await withLayerCache(
            "search",
            `${cacheKey}|${queries.join("|")}`,
            async () =>
              searchCompetitors(queries, {
                targetUrl: url,
                excludeHosts: targetHost ? [targetHost] : [],
                nicheTerms: [
                  ...bizContext.terms,
                  ...bizContext.category.split(/\s+/),
                ].filter(Boolean),
                limit: 12,
              })
          );

          // Hard filter: never keep the analyzed site in SERP list
          const externalResults = searchResults.filter((r) => !isSameSite(r.url, url));

          if (!externalResults.length) {
            throw new Error(
              "No external competitors found after filtering your own site. Try a more product-focused URL."
            );
          }

          // ── Step 3: Scrape top competitor sites (grounded evidence) ───
          const topUrls = externalResults.slice(0, 5).map((r) => r.url);
          await send(
            "scraping_competitors",
            `Scraping top ${topUrls.length} competitor sites for feature evidence...`
          );
          const competitorScrapes = await scrapeCompetitors(topUrls, {
            maxCompetitors: 5,
            multiPage: true,
            maxSecondary: 1,
          });
          const scrapedOk = competitorScrapes.filter((c) => c.ok).length;
          console.log(
            `PIPELINE_COMPETITOR_SCRAPES: ${scrapedOk}/${competitorScrapes.length} ok`
          );

          const scrapesWithMeta = competitorScrapes.map((s) => {
            const match = externalResults.find((r) => isSameSite(r.url, s.url));
            return {
              ...s,
              title: match?.title,
              snippet: match?.snippet,
            };
          });

          // ── Step 4: Grounded AI analysis ──────────────────────────────
          await send("analyzing", "Analyzing competitors with grounded page evidence...");
          const analysis = await withLayerCache(
            "analysis",
            `${cacheKey}|${topUrls.join(",")}`,
            async () =>
              analyzeCompetitors(targetContent, externalResults, scrapesWithMeta, {
                targetUrl: url,
                biz: bizContext,
              })
          );

          // Absolute final guard on output links
          analysis.competitors = (analysis.competitors ?? []).filter(
            (c) => c.url && !isSameSite(c.url, url)
          );

          const quality: QualityFlags = {
            scrapedCompetitorCount: scrapedOk,
            searchResultCount: externalResults.length,
            matrixEvidenceCoverage: analysis.quality?.matrixEvidenceCoverage,
            targetPageCount: targetSite.quality.pageCount,
            pipelineVersion: PIPELINE_VERSION,
          };

          return {
            searchResults: externalResults,
            analysis,
            queries,
            bizContext,
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
