import { dbRun } from "../db-helpers.js";

export async function migrateFinalReportSchema() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS final_validation_reports (
      report_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      project_id TEXT,
      feature_id TEXT,
      mode TEXT NOT NULL,
      demo_id TEXT,
      prompt_id INTEGER,
      market_analysis_run_id INTEGER,
      persona_fleet_run_id INTEGER,
      report_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (feature_id) REFERENCES features(id)
    )
  `);
}
