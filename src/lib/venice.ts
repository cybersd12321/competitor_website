const VENICE_MODEL = "e2ee-qwen-2-5-7b-p";
const VENICE_URL = "https://api.venice.ai/api/v1/chat/completions";

export async function callVenice(prompt: string): Promise<string> {
  const apiKey = import.meta.env.VENICE_API_KEY;
  if (!apiKey) throw new Error("VENICE_API_KEY is not set");

  const res = await fetch(VENICE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VENICE_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
      venice_parameters: { include_venice_system_prompt: false },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Venice API error: ${res.status} ${res.statusText} ${err}`.trim());
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Venice API returned empty content");
  return extractJson(content);
}

function extractJson(text: string): string {
  let t = text.trim();
  const fenceMatch = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) t = fenceMatch[1].trim();
  const firstBrace = t.indexOf("{");
  const firstBracket = t.indexOf("[");
  let start = firstBrace === -1 ? firstBracket : firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket);
  if (start > 0) {
    const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
    if (end > start) t = t.slice(start, end + 1);
  }
  return t || "{}";
}
