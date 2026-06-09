import { callVenice } from './venice';

export function extractBusinessContext(targetMarkdown: string): { name: string; niche: string; query: string } {
  const lines = targetMarkdown.split('\n').map(l => l.trim()).filter(Boolean);

  // Jina includes "Title: ..." and "Description: ..." at the top
  const titleLine = lines.find(l => /^title:/i.test(l))?.replace(/^title:\s*/i, '')
    ?? lines.find(l => /^#{1,2}\s/.test(l))?.replace(/^#{1,2}\s+/, '')
    ?? lines[0];

  const descLine = lines.find(l => /^description:/i.test(l))?.replace(/^description:\s*/i, '')
    ?? lines.find(l => l.length > 40 && !l.startsWith('#') && !l.startsWith('!'))
    ?? '';

  const query = `${titleLine} ${descLine}`.slice(0, 120).trim() + ' competitors';
  return { name: titleLine, niche: descLine, query };
}

export async function analyzeCompetitors(targetMarkdown: string, searchResults: any[]) {
  const systemPrompt = `You are a competitive intelligence analyst. Perform a precise capability comparison between the TARGET business and its competitors.

RULES:
- Only extract true operational/commercial differentiators: fulfillment methods, warranty terms, pricing tiers, payment options (COD, installments), geographic coverage, product specializations, certifications, B2B/wholesale programs, delivery SLAs.
- FORBIDDEN features: search bar, navigation, login, cart, contact form, responsive design, social media links.
- "target_has" must reflect what is ACTUALLY present in the Target Markdown — read it carefully before setting this value.
- "is_gap" = true ONLY when target_has is FALSE (the target is missing something competitors offer). If target_has is true, is_gap must be false.
- Return EXACTLY 5 competitors. If search results have fewer, infer well-known alternatives in the same niche.

OUTPUT: one raw JSON object, no markdown fences, no extra text.

{
  "target_summary": { "audience": "specific buyer persona", "monetization": "revenue model" },
  "competitors": [
    { "name": "Brand", "url": "https://...", "match_score": 85, "description": "positioning summary" }
  ],
  "matrix": [
    { "feature_name": "Differentiator", "target_has": true, "competitor_values": [true, false], "is_gap": false }
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
    const noisyKeys = ['search', 'navigation', 'cart', 'menu', 'login', 'contact'];
    parsedData.matrix = parsedData.matrix
      .filter((row: any) => !noisyKeys.some(k => (row.feature_name ?? '').toLowerCase().includes(k)))
      .map((row: any) => ({ ...row, is_gap: row.target_has === false }));

    return parsedData;
  } catch (err) {
    console.error("CRITICAL_MATRIX_PARSING_FAULT.", err);
    throw new Error("Failed to parse market matrix from Venice response.");
  }
}
