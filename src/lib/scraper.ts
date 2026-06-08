export async function scrapeWebsite(url: string): Promise<string> {
  const apiKey = import.meta.env.JINA_API_KEY;
  if (!apiKey) throw new Error("JINA_API_KEY is not set");

  const scrape = async (targetUrl: string): Promise<string | null> => {
    const res = await fetch("https://r.jina.ai/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Return-Format": "markdown",
      },
      body: JSON.stringify({ url: targetUrl }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.content ?? null;
  };

  // Always scrape the homepage
  const homepage = await scrape(url);
  if (!homepage) throw new Error("No content returned from Jina Reader API");

  // Derive base URL and scrape key subpages in parallel for deeper niche understanding
  let base = url.replace(/\/$/, "");
  try { base = `${new URL(url).protocol}//${new URL(url).hostname}`; } catch {}

  const SUBPAGES = ["/features", "/pricing", "/about", "/product", "/solutions"];
  const subpageResults = await Promise.allSettled(
    SUBPAGES.map(path => scrape(`${base}${path}`))
  );

  const subpageContent = subpageResults
    .filter(r => r.status === "fulfilled" && r.value)
    .map(r => (r as PromiseFulfilledResult<string>).value)
    .join("\n\n---\n\n");

  return subpageContent
    ? `${homepage}\n\n---\n\n${subpageContent}`
    : homepage;
}
