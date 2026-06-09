function sanitizeMarkdown(content: string): string {
  return content
    // Strip empty code blocks
    .replace(/```[\s\S]*?```/gm, (match) => {
      const inner = match.replace(/```\w*\n?/, "").replace(/```$/, "").trim();
      return inner ? match : "";
    })
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

  const res = await fetch("https://r.jina.ai/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Return-Format": "markdown",
    },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) throw new Error(`Jina API error: ${res.status} ${res.statusText}`);

  const data = await res.json();
  const content: string = data?.data?.content ?? "";
  if (!content) throw new Error("No content returned from Jina Reader API");

  return sanitizeMarkdown(content);
}
