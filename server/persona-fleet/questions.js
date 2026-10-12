import { commandCodeChat } from "../commandcode.js";
import { extractJson } from "./json-utils.js";

const FALLBACK_QUESTIONS = [
  {
    key: "featureRelevance",
    text:
      "How relevant is this feature to your day-to-day work? (0 = not at all, 100 = essential)",
  },
  {
    key: "willingnessToAdopt",
    text:
      "How willing would you be to adopt this feature in the next 90 days? (0–100)",
  },
  {
    key: "perceivedValue",
    text:
      "How much value would this feature deliver versus alternatives? (0–100)",
  },
  {
    key: "easeOfUseExpectation",
    text:
      "How easy do you expect this feature to be to use? (0–100)",
  },
  {
    key: "budgetFit",
    text:
      "How well does this feature fit your budget or procurement constraints? (0–100)",
  },
];

const SYSTEM = `You are a product market researcher.
Output ONLY valid JSON. No markdown fences.
Schema:
{
  "questions": [
    { "key": "camelCaseIdentifier", "text": "question text; answers are 0-100" }
  ]
}
Rules:
- Exactly 5 questions about the product and feature for synthetic customer research.
- Each answer is a number from 0 to 100 (state that in the question text).
- Keys must be unique camelCase identifiers.`;

/**
 * @param {Record<string, unknown>} productData
 */
export async function generateMarketResearchQuestions(productData) {
  const userContent = JSON.stringify({
    applicationName: productData.applicationName,
    applicationDescription: productData.applicationDescription,
    featureName: productData.featureName,
    featureDescription: productData.featureDescription,
    targetMarket: productData.targetMarket,
    primaryBuyer: productData.primaryBuyer,
    geography: productData.geography,
  });

  try {
    const text = await commandCodeChat([
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Create 5 market research questions for this product and feature.\n\n${userContent}`,
      },
    ]);
    const parsed = JSON.parse(extractJson(text));
    const questions = Array.isArray(parsed?.questions)
      ? parsed.questions
          .filter(
            (q) =>
              q &&
              typeof q.key === "string" &&
              typeof q.text === "string" &&
              q.key.length > 0
          )
          .slice(0, 5)
      : [];
    if (questions.length === 5) {
      return questions;
    }
  } catch (err) {
    console.warn("generateMarketResearchQuestions fallback:", err?.message);
  }
  return FALLBACK_QUESTIONS;
}
