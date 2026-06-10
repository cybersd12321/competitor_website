const JUNK_PATTERNS = [
  /please wait/i,
  /processing your request/i,
  /just a moment/i,
  /enable javascript/i,
  /checking your browser/i,
  /ddos protection/i,
  /access denied/i,
];

function sanitizeMarkdown(content: string): string {
  return content
    // Strip empty code blocks
    .replace(/```[\s\S]*?```/gm, (match) => {
      const inner = match.replace(/```\w*\n?/, "").replace(/```$/, "").trim();
      return inner ? match : "";
    })
    // Remove Jina image alt text noise e.g. "Image 1 Some Alt Text"
    .replace(/\bImage\s+\d+\s+[^\n]*/gi, "")
    // Collapse repeated nav/footer link lists (3+ consecutive markdown links on their own lines)
    .replace(/(^\s*\[.*?\]\(.*?\)\s*$\n?){3,}/gm, "[...navigation links removed...]\n")
    // Remove lines that are just pipes (table noise) repeated 4+ times
    .replace(/(^\s*\|.*\|\s*$\n?){4,}/gm, "[...table removed...]\n")
    // Collapse 3+ consecutive blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function scrapeWebsite(url: string): Promise<string> {
  const apiKey = import.meta.env.JINA_API_KEY ?? process.env.JINA_API_KEY;
  if (!apiKey) throw new Error("JINA_API_KEY is not set");

  let res: Response | undefined;
  let lastErr: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      res = await fetch("https://r.jina.ai/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Return-Format": "markdown",
        },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      break;
    } catch (err) {
      lastErr = err;
      if ((err as any)?.name === "AbortError") {
        if (attempt === 2) throw new Error("Jina API timeout: request exceeded 60s after 3 attempts");
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      } else {
        throw err;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  if (!res) throw lastErr;

  if (!res.ok) throw new Error(`Jina API error: ${res.status} ${res.statusText}`);

  const data = await res.json();
  const content: string = data?.data?.content ?? "";
  if (!content) throw new Error("No content returned from Jina Reader API");

  // Reject loading screens / bot challenges.
  // We check for junk patterns AND absence of a Title line — a real page always has one.
  const hasTitle = /^title:/im.test(content);
  const isJunk = JUNK_PATTERNS.some(p => p.test(content));
  if (!hasTitle && isJunk) {
    throw new Error(`Could not scrape ${url}: site returned a loading or challenge page`);
  }

  return sanitizeMarkdown(content);
}
