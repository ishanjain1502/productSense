import { trace } from "neatlogs";
import { dbRun, dbGet } from "../db-helpers.js";
import { saveMarketAnalysisReportFromRun } from "../market-analysis-reports.js";
import { writeReportFile } from "../report-storage.js";
import { runStrategyB } from "./strategy-b.js";
import { runStrategyC } from "./strategy-c.js";

/**
 * @param {{
 *   userId?: number | null;
 *   projectId?: string | null;
 *   featureId?: string | null;
 *   demoId?: string | null;
 *   productData: Record<string, unknown>;
 * }} ctx
 */
export async function runMarketAnalysis(ctx) {
  return trace({ name: "market-analysis", kind: "WORKFLOW" }, async () => {
  const insert = await dbRun(
    `INSERT INTO market_analysis_runs (user_id, project_id, feature_id, demo_id, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [
      ctx.userId ?? null,
      ctx.projectId ?? null,
      ctx.featureId ?? null,
      ctx.demoId ?? null,
    ]
  );
  const runId = insert.lastID;

  let errorB = null;
  let errorC = null;
  let reportB = null;
  let reportC = null;
  let urlB = null;
  let urlC = null;
  let rawUrlB = null;
  let rawUrlC = null;

  try {
    const { raw, report } = await runStrategyB(ctx.productData);
    rawUrlB = await writeReportFile(
      `market/${runId}/strategy-b-raw.json`,
      raw
    );
    urlB = await writeReportFile(`market/${runId}/strategy-b.json`, report);
    reportB = report;
  } catch (err) {
    errorB = err?.message ?? String(err);
  }

  try {
    const { raw, report } = await runStrategyC(ctx.productData);
    rawUrlC = await writeReportFile(
      `market/${runId}/strategy-c-raw.json`,
      raw
    );
    urlC = await writeReportFile(`market/${runId}/strategy-c.json`, report);
    reportC = report;
  } catch (err) {
    errorC = err?.message ?? String(err);
  }

  const status =
    reportB && reportC ? "completed" : reportB || reportC ? "partial" : "failed";

  await dbRun(
    `UPDATE market_analysis_runs SET
      strategy_b_report_url = ?,
      strategy_c_report_url = ?,
      strategy_b_raw_url = ?,
      strategy_c_raw_url = ?,
      status = ?,
      error_b = ?,
      error_c = ?
     WHERE id = ?`,
    [urlB, urlC, rawUrlB, rawUrlC, status, errorB, errorC, runId]
  );

  const { reportId } = await saveMarketAnalysisReportFromRun(runId);

  return {
    runId,
    reportId,
    status,
    strategyB: reportB,
    strategyC: reportC,
    errorB,
    errorC,
  };
  });
}

/**
 * @param {number} runId
 */
export async function getMarketAnalysisRun(runId) {
  const row = await dbGet(`SELECT * FROM market_analysis_runs WHERE id = ?`, [
    runId,
  ]);
  return row ?? null;
}
