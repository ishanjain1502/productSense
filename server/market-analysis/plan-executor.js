import {
  companyEnrichByIds,
  companyIdentify,
  companySearchNl,
  crustdataPost,
  jobSearch,
  webSearchLive,
} from "../crustdata-client.js";

const ALLOWED = new Set([
  "company_identify",
  "company_enrich",
  "company_search",
  "job_search",
  "web_search_live",
]);

/**
 * @param {string} tool
 * @param {Record<string, unknown>} params
 */
async function runTool(tool, params) {
  switch (tool) {
    case "company_identify":
      return companyIdentify(
        Array.isArray(params.names) ? params.names : [params.name].filter(Boolean)
      );
    case "company_enrich":
      return companyEnrichByIds(params.crustdata_company_ids ?? []);
    case "company_search":
      if (params.query) {
        return companySearchNl(String(params.query), params.limit ?? 10);
      }
      return crustdataPost("/company/search", params);
    case "job_search":
      return jobSearch(params.filters, params.limit ?? 15);
    case "web_search_live":
      return webSearchLive(String(params.query ?? ""));
    default:
      throw new Error(`unknown_tool:${tool}`);
  }
}

/**
 * @param {Array<{ tool: string; params?: Record<string, unknown> }>} steps
 */
export async function executePlan(steps) {
  let enrichCount = 0;
  let jobCount = 0;
  let webCount = 0;
  const results = [];
  const errors = [];

  for (const step of steps) {
    const tool = step.tool;
    const params = step.params ?? {};
    if (!ALLOWED.has(tool)) {
      errors.push({ step, error: `disallowed_tool:${tool}` });
      continue;
    }
    if (tool === "company_enrich") {
      enrichCount += 1;
      if (enrichCount > 3) {
        errors.push({ step, error: "enrich_cap_exceeded" });
        continue;
      }
    }
    if (tool === "job_search") {
      jobCount += 1;
      if (jobCount > 2) {
        errors.push({ step, error: "job_search_cap_exceeded" });
        continue;
      }
    }
    if (tool === "web_search_live") {
      webCount += 1;
      if (webCount > 1) {
        errors.push({ step, error: "web_search_cap_exceeded" });
        continue;
      }
    }
    try {
      const result = await runTool(tool, params);
      results.push({ step, result });
    } catch (err) {
      errors.push({ step, error: err.message });
    }
  }

  return { results, errors };
}
