import { callVenice } from './venice';

export function extractBusinessContext(targetMarkdown: string): { name: string; niche: string; query: string } {
  const lines = targetMarkdown.split('\n').map(l => l.trim()).filter(Boolean);

  // Jina includes "Title: ..." and "Description: ..." at the top
  const titleLine = lines.find(l => /^title:/i.test(l))?.replace(/^title:\s*/i, '')
    ?? lines.find(l => /^#{1,2}\s/.test(l))?.replace(/^#{1,2}\s+/, '')
    ?? lines[0];

  const descLine = lines.find(l => /^description:/i.test(l))?.replace(/^description:\s*/i, '')
    ?? lines.find(l => {
      // Skip lines that are images, image captions, short labels, or navigation noise
      if (l.startsWith('#') || l.startsWith('!') || l.startsWith('[')) return false;
      // Skip lines that look like image alt/caption text (e.g. "Image 2", "logo", short isolated words)
      if (/^image\s*\d*$/i.test(l) || /^(logo|icon|banner|screenshot|photo|illustration)(\s+\d+)?$/i.test(l)) return false;
      // Must be a real sentence (contains a space and is reasonably long)
      return l.length > 40 && l.includes(' ');
    })
    ?? '';

  // Strip markdown syntax, URLs, image tags, and special characters from both
  const clean = (s: string) => s
    .replace(/!\[.*?\]\(.*?\)/g, '')       // remove markdown images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // unwrap markdown links → keep text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#*\[\]()_`>|!:&"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const cleanTitle = clean(titleLine ?? '');
  const cleanDesc = clean(descLine);

  // Keep query short enough for Serper (max ~80 chars before appending " competitors")
  const combined = `${cleanTitle} ${cleanDesc}`.trim().slice(0, 80);
  const query = combined + ' competitors';

  return { name: titleLine, niche: descLine, query };
}

export async function analyzeCompetitors(targetMarkdown: string, searchResults: any[]) {
  const systemPrompt = `You are a senior competitive intelligence analyst. Your job is to find NON-OBVIOUS, high-signal differentiators that reveal real strategic gaps — not generic features every website has.

STRICT RULES:
- FORBIDDEN (never include): search bar, navigation menu, login/signup, shopping cart, contact form, responsive design, social media links, SSL certificate, newsletter subscription, cookie banner, FAQ page, 404 page, sitemap.
- AVOID GENERIC: "Product catalog", "Customer reviews", "About Us page", "Blog", "Mobile app" — these are table stakes, not differentiators.
- ONLY include features that are commercially or strategically significant: things that affect conversion, revenue model, customer retention, or market positioning.
- Each feature must belong to one of these categories: "Pricing & Commerce", "Trust & Credibility", "Fulfillment & Operations", "Product Depth", "Support & Success", "Growth & Acquisition", "Tech & Integrations".
- importance: "high" = directly impacts revenue or retention | "medium" = affects conversion | "low" = nice-to-have.
- "target_has" must reflect what is ACTUALLY present in the Target Markdown — read it carefully.
- "is_gap" = true ONLY when target_has is FALSE. Never when target_has is true.
- Return EXACTLY 5 competitors. If fewer in results, infer well-known alternatives in the same niche.
- Return EXACTLY 12–15 matrix rows spanning at least 4 different categories.

GOOD feature examples (niche-specific, commercially meaningful):
- "Transparent Pricing Page" (Pricing & Commerce, high)
- "Free Trial Without Credit Card" (Growth & Acquisition, high)
- "Live Chat Support" (Support & Success, medium)
- "Annual Billing Discount" (Pricing & Commerce, medium)
- "SOC2 / ISO Certification" (Trust & Credibility, high)
- "White-label / Reseller Program" (Growth & Acquisition, high)
- "SLA / Uptime Guarantee" (Fulfillment & Operations, high)
- "Zapier / API Integration" (Tech & Integrations, medium)
- "Custom Onboarding / CSM" (Support & Success, high)
- "Case Studies with ROI Data" (Trust & Credibility, medium)

OUTPUT: one raw JSON object, no markdown fences, no extra text.

{
  "target_summary": { "audience": "specific buyer persona", "monetization": "revenue model" },
  "competitors": [
    { "name": "Brand", "url": "https://...", "match_score": 85, "description": "positioning summary" }
  ],
  "matrix": [
    { "feature_name": "Differentiator", "category": "Pricing & Commerce", "importance": "high", "target_has": true, "competitor_values": [true, false], "is_gap": false }
  ]
}`;

  const userContext = `TARGET WEBSITE CONTENT (read thoroughly to determine what the target actually offers):
${targetMarkdown.slice(0, 5000)}

COMPETITOR SEARCH RESULTS:
${JSON.stringify(searchResults)}`;

  const rawText = await callVenice(`${systemPrompt}\n\n${userContext}`, 'qwen3-5-9b');

  try {
    const jsonStart = rawText.indexOf('{');
    const jsonEnd = rawText.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found in response.");

    const parsedData = JSON.parse(rawText.substring(jsonStart, jsonEnd + 1));

    if (!parsedData.competitors) parsedData.competitors = [];
    if (!parsedData.matrix) parsedData.matrix = [];

    // Enforce is_gap consistency and strip UI noise
    const noisyKeys = ['search bar', 'navigation', 'cart', 'menu', 'login', 'contact form', 'newsletter', 'cookie', 'sitemap', 'social media', 'faq page', 'about us', 'blog'];
    parsedData.matrix = parsedData.matrix
      .filter((row: any) => !noisyKeys.some(k => (row.feature_name ?? '').toLowerCase().includes(k)))
      .map((row: any) => ({
        ...row,
        category: row.category ?? 'General',
        importance: row.importance ?? 'medium',
        is_gap: row.target_has === false,
      }));

    return parsedData;
  } catch (err) {
    console.error("CRITICAL_MATRIX_PARSING_FAULT.", err);
    throw new Error("Failed to parse market matrix from Venice response.");
  }
}
