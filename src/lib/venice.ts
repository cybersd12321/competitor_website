const VENICE_URL = "https://api.venice.ai/api/v1/chat/completions";

export type ResponseFormat = Record<string, unknown>;

export async function callVenice(
  prompt: string,
  model: string = "qwen3-5-9b",
  response_format?: ResponseFormat,
  overrides?: Record<string, unknown>
): Promise<string> {
  const apiKey = import.meta.env.VENICE_API_KEY ?? process.env.VENICE_API_KEY;
  if (!apiKey) throw new Error("VENICE_API_KEY is not set");

  const messages = [{ role: "user", content: prompt }];

  const requestBody: any = {
    model: model,
    messages: messages,
    max_tokens: 4096,
    temperature: 0.3,
    venice_parameters: (overrides?.venice_parameters as object) || {
      disable_thinking: true,
      strip_thinking_response: true,
    },
  };

  if (response_format) {
    requestBody.response_format = {
      type: "json_schema",
      json_schema: {
        name: "competitor_analysis",
        strict: true,
        schema: response_format,
      },
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  let res: Response;
  try {
    res = await fetch(VENICE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as any)?.name === "AbortError") {
      console.error("VENICE_GATEWAY_TIMEOUT: Request exceeded 60s processing limits.");
      throw new Error("VENICE_GATEWAY_TIMEOUT: Request exceeded 60s processing limits.");
    }
    console.error("VENICE_CLIENT_ERROR:", err);
    throw new Error(`Venice network error: ${err}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.text();
    console.error("VENICE_CLIENT_ERROR:", body);
    throw new Error(`Venice API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const content = extractContent(data);
  if (!content) {
    console.error("RAW_VENICE_PAYLOAD:", JSON.stringify(data));
    throw new Error("Venice API returned empty content");
  }
  return response_format ? stripFences(content) : extractJson(content);
}

function stripFences(text: string): string {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return m ? m[1].trim() : text.trim();
}

function extractContent(data: any): string {
  const msg = data.choices?.[0]?.message;
  if (msg?.content) return msg.content;
  if (msg?.reasoning_content) return msg.reasoning_content;
  const args = msg?.tool_calls?.[0]?.function?.arguments;
  if (args) return typeof args === "string" ? args : JSON.stringify(args);
  // Root-level text fallbacks
  for (const key of ["text", "content", "output", "result"]) {
    if (typeof data[key] === "string" && data[key]) return data[key];
  }
  return "";
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
