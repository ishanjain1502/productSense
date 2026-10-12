import { commandCodeChat } from "../commandcode.js";
import { executePlan } from "./plan-executor.js";
import { synthesizeMarketReport } from "./synthesis.js";

const PLAN_SYSTEM = `You plan Crustdata API calls for market research.
Output ONLY valid JSON: { "steps": [ { "tool": "...", "params": { ... } }, ... ] }
Allowlisted tools: company_identify, company_enrich, company_search, job_search, web_search_live.
Max 12 steps, max 3 company_enrich, max 2 job_search, max 1 web_search_live.
No markdown.`;

/**
 * @param {Record<string, unknown>} productData
 */
export async function runStrategyC(productData) {
  const planText = await commandCodeChat([
    { role: "system", content: PLAN_SYSTEM },
    {
      role: "user",
      content: `Plan Crustdata calls for this product context:\n${JSON.stringify(productData)}`,
    },
  ]);

  let plan;
  try {
    const trimmed = planText.trim();
    const jsonSlice = trimmed.includes("{")
      ? trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1)
      : trimmed;
    plan = JSON.parse(jsonSlice);
  } catch {
    throw new Error("invalid_plan_json");
  }

  const steps = Array.isArray(plan.steps) ? plan.steps.slice(0, 12) : [];
  const { results, errors } = await executePlan(steps);

  const raw = { plan: { steps }, results, errors };
  const planSummary = `Executed ${results.length} step(s); ${errors.length} error(s). Planned tools: ${steps.map((s) => s.tool).join(", ")}`;

  const report = await synthesizeMarketReport({
    strategy: "planned_c",
    productData,
    rawBundle: raw,
    planSummary,
  });

  return { raw, report, planSummary };
}
