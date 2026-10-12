import { commandCodeChat } from "../commandcode.js";
import { extractJson } from "./json-utils.js";

const SYSTEM = `You simulate a specific customer persona evaluating a product feature.
Output ONLY valid JSON. No markdown fences.
Each question key must map to an integer from 0 to 100.
Include a "verdict" string: 1-3 sentences in plain language summarizing whether they would adopt the feature.`;

/**
 * @param {{
 *   productData: Record<string, unknown>;
 *   persona: { name: string; description: string; agentId: string };
 *   questions: Array<{ key: string; text: string }>;
 * }} input
 */
export async function runPersonaAgent(input) {
  const questionKeys = input.questions.map((q) => q.key);
  const schemaHint = {
    ...Object.fromEntries(questionKeys.map((k) => [k, 0])),
    verdict: "",
  };

  const userContent = JSON.stringify({
    persona: {
      id: input.persona.agentId,
      name: input.persona.name,
      description: input.persona.description,
    },
    product: {
      applicationName: input.productData.applicationName,
      featureName: input.productData.featureName,
      featureDescription: input.productData.featureDescription,
      targetMarket: input.productData.targetMarket,
    },
    questions: input.questions,
    outputSchema: schemaHint,
  });

  const text = await commandCodeChat(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Answer as this persona. Use only the question keys provided.\n\n${userContent}`,
      },
    ],
    { temperature: 0.6 }
  );

  const parsed = JSON.parse(extractJson(text));
  const value = { verdict: String(parsed.verdict ?? "") };

  for (const key of questionKeys) {
    const raw = parsed[key];
    const num = Number(raw);
    if (!Number.isFinite(num)) {
      throw new Error(`Agent ${input.persona.agentId} missing score for ${key}`);
    }
    value[key] = Math.min(100, Math.max(0, Math.round(num)));
  }

  return value;
}
