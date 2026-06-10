import { callVenice } from "./venice";

const SYSTEM_PROMPT = `Analyze the provided website content snippet. Classify the business complexity strictly into one of two tiers:
- 'SIMPLE': Standard single-page landing layouts, static portfolios, simple local business business-card sites, or individual blog feeds.
- 'COMPLEX': Multi-category e-commerce marketplaces/stores, software-as-a-service (SaaS) web applications with rich user flows, data-dense web networks, or multi-tiered corporate setups.

You must return a raw JSON object matching this exact shape and absolutely nothing else:
{"complexity": "SIMPLE" | "COMPLEX", "reason": "string text description"}`;

export async function determineRequiredModel(
  targetMarkdown: string
): Promise<"qwen3-5-9b" | "deepseek-v3.2"> {
  try {
    const snippet = targetMarkdown.slice(0, 3500);
    const raw = await callVenice(
      `${SYSTEM_PROMPT}\n\n${snippet}`,
      "qwen3-5-9b"
    );

    const cleaned = raw.replace(/```(?:json)?\s*([\s\S]*?)```/i, "$1").trim();
    const { complexity } = JSON.parse(cleaned);
    return complexity === "COMPLEX" ? "deepseek-v3.2" : "qwen3-5-9b";
  } catch {
    return "deepseek-v3.2";
  }
}
