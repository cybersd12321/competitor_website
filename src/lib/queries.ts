import { callVenice } from "./venice";

export async function generateSearchQueries(websiteContent: string): Promise<string[]> {
  const prompt = `Based on the following website content, generate a raw comma-separated list of exactly 3 distinct search queries a human would use to find direct alternatives. Do not provide code blocks, notes, introduction, or formatting. Output only the queries separated by commas.

${websiteContent.slice(0, 7000)}`;

  const text = await callVenice(prompt, "qwen3-5-9b");
  const queries = text.split(",").map(q => q.trim()).filter(Boolean);
  if (!queries.length) throw new Error("No queries returned from Venice");
  return queries.slice(0, 3);
}
