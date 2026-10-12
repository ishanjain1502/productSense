import { commandCodeChat } from "../commandcode.js";
import { MARKET_REPORT_SCHEMA_HINT } from "./constants.js";

const SYSTEM = `You are a product management market analyst.
Output ONLY valid JSON matching the schema below. No markdown fences.
Ground every claim in the provided raw data. If data is missing, add entries to dataLimitations.
Schema:
${MARKET_REPORT_SCHEMA_HINT}`;

/**
 * @param {string} text
 */
function extractJson(text) {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

/**
 * @param {{
 *   strategy: "fixed_b" | "planned_c";
 *   productData: Record<string, unknown>;
 *   rawBundle: unknown;
 *   planSummary?: string | null;
 * }} input
 */
export async function synthesizeMarketReport(input) {
  const userContent = JSON.stringify({
    productData: input.productData,
    rawBundle: input.rawBundle,
    planSummary: input.planSummary ?? null,
  });

  const text = await commandCodeChat([
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: `Synthesize a market analysis report. Set strategy to "${input.strategy}".\n\n${userContent}`,
    },
  ]);

  const json = JSON.parse(extractJson(text));
  json.strategy = input.strategy;
  json.generatedAt = new Date().toISOString();
  if (input.planSummary) {
    json.planSummary = input.planSummary;
  }
  return json;
}
