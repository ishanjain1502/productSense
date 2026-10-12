import { dbGet, dbRun } from "../db-helpers.js";
import { writeReportFile } from "../report-storage.js";

/**
 * @param {{
 *   userId: number | null;
 *   projectId: string | null;
 *   featureId: string | null;
 *   mode: string;
 *   demoId: string | null;
 *   promptId: number | null;
 *   marketAnalysisRunId: number | null;
 *   personaFleetRunId: number | null;
 *   report: Record<string, unknown>;
 * }} input
 */
export async function persistFinalReport(input) {
  const insert = await dbRun(
    `INSERT INTO final_validation_reports (
      user_id, project_id, feature_id, mode, demo_id,
      prompt_id, market_analysis_run_id, persona_fleet_run_id, report_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.userId,
      input.projectId,
      input.featureId,
      input.mode,
      input.demoId,
      input.promptId,
      input.marketAnalysisRunId,
      input.personaFleetRunId,
      "pending",
    ]
  );

  const reportId = insert.lastID;
  const reportUrl = await writeReportFile(
    `final-report/${reportId}.json`,
    input.report
  );

  await dbRun(
    `UPDATE final_validation_reports SET report_url = ? WHERE report_id = ?`,
    [reportUrl, reportId]
  );

  return { reportId, reportUrl };
}

/**
 * @param {number} reportId
 */
export async function getFinalReportRow(reportId) {
  return dbGet(
    `SELECT report_id, user_id, project_id, feature_id, mode, demo_id, report_url, created_at
     FROM final_validation_reports WHERE report_id = ?`,
    [reportId]
  );
}

/**
 * @param {number} reportId
 */
export async function loadFinalReportJson(reportId) {
  const row = await getFinalReportRow(reportId);
  if (!row?.report_url) return null;
  const { readReportFile } = await import("../report-storage.js");
  return readReportFile(row.report_url);
}
