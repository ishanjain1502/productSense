import { dbRun, dbGet } from "./db-helpers.js";
import { writeReportFile, readReportFile } from "./report-storage.js";

/**
 * @param {number} runId
 */
export async function saveMarketAnalysisReportFromRun(runId) {
  const runRow = await dbGet(
    `SELECT * FROM market_analysis_runs WHERE id = ?`,
    [runId]
  );
  if (!runRow) {
    const err = new Error("unknown_run");
    err.status = 400;
    throw err;
  }

  const insert = await dbRun(
    `INSERT INTO market_analysis_reports (
      user_id, project_id, feature_id, demo_id, run_id,
      market_analysis_report_submitted, report_url
    ) VALUES (?, ?, ?, ?, ?, 1, '')`,
    [
      runRow.user_id ?? null,
      runRow.project_id ?? null,
      runRow.feature_id ?? null,
      runRow.demo_id ?? null,
      runId,
    ]
  );

  const reportId = insert.lastID;
  const indexPayload = {
    runId,
    status: runRow.status,
    strategyBReportUrl: runRow.strategy_b_report_url,
    strategyCReportUrl: runRow.strategy_c_report_url,
    strategyBRawUrl: runRow.strategy_b_raw_url,
    strategyCRawUrl: runRow.strategy_c_raw_url,
    errorB: runRow.error_b,
    errorC: runRow.error_c,
    createdAt: runRow.created_at,
  };

  const reportUrl = await writeReportFile(
    `market-analysis/${reportId}.json`,
    indexPayload
  );

  await dbRun(`UPDATE market_analysis_reports SET report_url = ? WHERE id = ?`, [
    reportUrl,
    reportId,
  ]);

  return { reportId, reportUrl };
}

/**
 * @param {{ runId?: number; featureId?: string; userId?: number }} query
 */
export async function getMarketAnalysisReportStatus(query) {
  if (query.runId != null && Number.isFinite(query.runId)) {
    const row = await dbGet(
      `SELECT id FROM market_analysis_reports WHERE run_id = ? ORDER BY id DESC LIMIT 1`,
      [query.runId]
    );
    return row ? { found: true, reportId: row.id } : { found: false };
  }

  if (query.featureId && query.userId) {
    const row = await dbGet(
      `SELECT r.id FROM market_analysis_reports r
       JOIN features f ON f.id = r.feature_id
       JOIN projects p ON p.id = f.project_id
       WHERE r.feature_id = ? AND p.user_id = ?
         AND r.market_analysis_report_submitted = 1
       ORDER BY r.id DESC LIMIT 1`,
      [query.featureId, query.userId]
    );
    return row ? { found: true, reportId: row.id } : { found: false };
  }

  return { found: false };
}

/**
 * @param {number} reportId
 */
export async function getMarketAnalysisReportIndex(reportId) {
  const row = await dbGet(
    `SELECT id, run_id, report_url, feature_id, demo_id, created_at
     FROM market_analysis_reports WHERE id = ?`,
    [reportId]
  );
  if (!row?.report_url) return null;
  const index = await readReportFile(row.report_url);
  return { reportId: row.id, runId: row.run_id, index };
}
