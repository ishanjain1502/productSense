import { trace } from "neatlogs";
import { dbRun, dbGet } from "../db-helpers.js";
import {
  getMarketAnalysisReportStatus,
  saveMarketAnalysisReportFromRun,
} from "../market-analysis-reports.js";
import { readReportFile, writeReportFile } from "../report-storage.js";
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
export async function createMarketAnalysisRun(ctx) {
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
  return insert.lastID;
}

/**
 * @param {number} runId
 * @param {{
 *   productData: Record<string, unknown>;
 * }} ctx
 */
export async function executeMarketAnalysisRun(runId, ctx) {
  return trace({ name: "market-analysis", kind: "WORKFLOW" }, async () => {
    await dbRun(
      `UPDATE market_analysis_runs SET status = 'running' WHERE id = ?`,
      [runId]
    );

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
      reportB && reportC
        ? "completed"
        : reportB || reportC
          ? "partial"
          : "failed";

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

    await saveMarketAnalysisReportFromRun(runId);

    return {
      runId,
      status,
      strategyB: reportB,
      strategyC: reportC,
      errorB,
      errorC,
    };
  });
}

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
  const runId = await createMarketAnalysisRun(ctx);
  const result = await executeMarketAnalysisRun(runId, ctx);
  const index = await getMarketAnalysisReportStatus({ runId });
  return {
    ...result,
    reportId: index.found ? index.reportId : null,
  };
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

/**
 * @param {number} runId
 */
export async function loadMarketAnalysisRunResponse(runId) {
  const row = await getMarketAnalysisRun(runId);
  if (!row) {
    return null;
  }

  let strategyB = null;
  let strategyC = null;
  if (row.strategy_b_report_url) {
    strategyB = await readReportFile(row.strategy_b_report_url);
  }
  if (row.strategy_c_report_url) {
    strategyC = await readReportFile(row.strategy_c_report_url);
  }

  const index = await getMarketAnalysisReportStatus({ runId });

  return {
    runId: row.id,
    reportId: index.found ? index.reportId : null,
    status: row.status,
    strategyB,
    strategyC,
    errorB: row.error_b,
    errorC: row.error_c,
  };
}

/**
 * @param {number} runId
 * @param {{
 *   userId?: number | null;
 *   projectId?: string | null;
 *   featureId?: string | null;
 *   demoId?: string | null;
 *   productData: Record<string, unknown>;
 * }} ctx
 */
export function scheduleMarketAnalysisRun(runId, ctx) {
  void executeMarketAnalysisRun(runId, ctx).catch((err) => {
    console.error("market_analysis_background_failed", runId, err);
    void dbRun(
      `UPDATE market_analysis_runs SET status = 'failed', error_b = COALESCE(error_b, ?) WHERE id = ?`,
      [err?.message ?? "background_failed", runId]
    );
  });
}
