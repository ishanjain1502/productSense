import { commandCodeChat } from "../commandcode.js";
import { extractJson } from "./json-utils.js";

const BATCH_SYSTEM = `You analyze customer verdict texts about a product feature.
Output ONLY valid JSON. No markdown fences.
Schema: { "themes": [ { "id": "string", "label": "short theme", "sentiment": "positive"|"mixed"|"negative", "countHint": number } ] }
countHint is how many verdicts in THIS batch relate to each theme (approximate).`;

/**
 * @param {Array<{ themes: Array<{ label: string; sentiment: string; countHint: number }> }>} batchResults
 */
export function mergeThemeBatches(batchResults) {
  const merged = new Map();
  for (const batch of batchResults) {
    for (const theme of batch.themes ?? []) {
      const key = String(theme.label ?? "").trim().toLowerCase();
      if (!key) continue;
      const prev = merged.get(key);
      const count = Number(theme.countHint) || 0;
      if (!prev) {
        merged.set(key, {
          label: String(theme.label).trim(),
          sentiment: theme.sentiment ?? "mixed",
          approxCount: count,
        });
      } else {
        prev.approxCount += count;
      }
    }
  }
  return [...merged.values()];
}

/**
 * @param {string[]} verdictTexts
 */
export async function mapVerdictBatch(verdictTexts) {
  const text = await commandCodeChat(
    [
      { role: "system", content: BATCH_SYSTEM },
      {
        role: "user",
        content: JSON.stringify({ verdicts: verdictTexts }),
      },
    ],
    { temperature: 0.3 }
  );
  const parsed = JSON.parse(extractJson(text));
  if (!Array.isArray(parsed.themes)) {
    throw new Error("theme batch missing themes array");
  }
  return parsed;
}

/**
 * @param {string[]} verdicts
 * @param {{ batchSize?: number; concurrency?: number }} [opts]
 */
export async function mapAllVerdictThemes(verdicts, opts = {}) {
  const batchSize = opts.batchSize ?? 50;
  const concurrency = opts.concurrency ?? 5;
  const batches = [];
  for (let i = 0; i < verdicts.length; i += batchSize) {
    batches.push(verdicts.slice(i, i + batchSize));
  }
  const results = [];
  for (let i = 0; i < batches.length; i += concurrency) {
    const slice = batches.slice(i, i + concurrency);
    const chunk = await Promise.all(slice.map((b) => mapVerdictBatch(b)));
    results.push(...chunk);
  }
  return mergeThemeBatches(results);
}
