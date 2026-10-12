import { commandCodeChat } from "../commandcode.js";
import { extractJson } from "./json-utils.js";
import { JUDGMENT_SCHEMA_HINT } from "./judgment-constants.js";

const SYSTEM = `You are a product research analyst summarizing synthetic customer panel results.
Output ONLY valid JSON matching the schema below. No markdown fences.
Rules:
- Do NOT change recommendation or any numeric aggregates; they are provided and final.
- Ground narrative in provided themes and quotes only; do not invent new quotes.
- segmentInsights must reference segment compositeMean and count where relevant.
Schema:
${JUDGMENT_SCHEMA_HINT}`;

/**
 * @param {{
 *   layer1: Record<string, unknown>;
 *   recommendation: string;
 *   themes: Array<{ label: string; sentiment: string; approxCount: number }>;
 *   representativeQuotes: Array<Record<string, unknown>>;
 *   productData: Record<string, unknown>;
 * }} input
 */
export async function synthesizeFleetJudgment(input) {
  const layer1Public = { ...input.layer1 };
  delete layer1Public.agentRows;

  const userContent = JSON.stringify({
    product: {
      applicationName: input.productData.applicationName,
      featureName: input.productData.featureName,
      featureDescription: input.productData.featureDescription,
      targetMarket: input.productData.targetMarket,
    },
    recommendation: input.recommendation,
    aggregates: layer1Public,
    themes: input.themes,
    representativeQuotes: input.representativeQuotes,
  });

  const text = await commandCodeChat(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Write the narrative judgment fields.\n\n${userContent}`,
      },
    ],
    { temperature: 0.4 }
  );

  const narrative = JSON.parse(extractJson(text));

  return {
    ...layer1Public,
    themes: input.themes,
    representativeQuotes: input.representativeQuotes,
    executiveSummary: String(narrative.executiveSummary ?? ""),
    strengths: Array.isArray(narrative.strengths) ? narrative.strengths : [],
    blockers: Array.isArray(narrative.blockers) ? narrative.blockers : [],
    segmentInsights: Array.isArray(narrative.segmentInsights)
      ? narrative.segmentInsights
      : [],
    dataLimitations: Array.isArray(narrative.dataLimitations)
      ? narrative.dataLimitations
      : [],
    recommendation: input.recommendation,
    generatedAt: new Date().toISOString(),
  };
}
