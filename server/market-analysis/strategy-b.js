import {
  companyEnrichByIds,
  companyIdentify,
  companySearchNl,
  jobSearch,
} from "../crustdata-client.js";
import {
  JOB_LIMIT_PER_BATCH,
  JOB_LIMIT_TOTAL,
  MAX_COMPETITORS,
} from "./constants.js";
import { parseCompetitors } from "./parse-competitors.js";
import { synthesizeMarketReport } from "./synthesis.js";

/**
 * @param {unknown} identifyRow
 */
function topCompanyId(identifyRow) {
  const matches = identifyRow?.matches;
  if (!Array.isArray(matches) || matches.length === 0) return null;
  const id = matches[0]?.company_data?.crustdata_company_id;
  return typeof id === "number" ? id : null;
}

/**
 * @param {Record<string, unknown>} productData
 */
export async function runStrategyB(productData) {
  const queriesExecuted = [];
  const competitors = [];
  const names = parseCompetitors(
    typeof productData.competitorCompanies === "string"
      ? productData.competitorCompanies
      : ""
  ).slice(0, MAX_COMPETITORS);

  const companyIds = [];
  for (const name of names) {
    try {
      const idResult = await companyIdentify([name]);
      queriesExecuted.push({ tool: "company_identify", name, idResult });
      const cid = Array.isArray(idResult)
        ? topCompanyId(idResult[0])
        : topCompanyId(idResult);
      if (cid) {
        companyIds.push(cid);
        competitors.push({ inputName: name, crustdataCompanyId: cid });
      }
    } catch (err) {
      queriesExecuted.push({
        tool: "company_identify",
        name,
        error: err.message,
      });
    }
  }

  let enrichResult = null;
  if (companyIds.length > 0) {
    enrichResult = await companyEnrichByIds(companyIds);
    queriesExecuted.push({ tool: "company_enrich", companyIds, enrichResult });
  }

  let jobs = [];
  if (companyIds.length > 0) {
    const limit = Math.min(JOB_LIMIT_PER_BATCH, JOB_LIMIT_TOTAL);
    try {
      const jobResult = await jobSearch(
        {
          op: "and",
          conditions: [
            {
              op: "in",
              field: "company.basic_info.company_id",
              values: companyIds,
            },
          ],
        },
        limit
      );
      jobs = jobResult?.job_listings ?? [];
      queriesExecuted.push({ tool: "job_search", limit, jobResult });
    } catch (err) {
      queriesExecuted.push({ tool: "job_search", error: err.message });
    }
  }

  let landscape = null;
  if (companyIds.length < 3) {
    const query = [
      productData.featureName,
      productData.featureDescription,
      productData.targetMarket,
    ]
      .filter(Boolean)
      .join(" ");
    try {
      landscape = await companySearchNl(query, 10);
      queriesExecuted.push({ tool: "company_search", query, landscape });
    } catch (err) {
      queriesExecuted.push({ tool: "company_search", error: err.message });
    }
  }

  const raw = {
    competitors,
    enrichResult,
    jobs,
    landscape,
    queriesExecuted,
  };

  const report = await synthesizeMarketReport({
    strategy: "fixed_b",
    productData,
    rawBundle: raw,
  });

  return { raw, report };
}
