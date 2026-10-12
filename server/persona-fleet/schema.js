import { dbRun } from "../db-helpers.js";

export async function migratePersonaFleetSchema() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS agent_fleet_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      project_id TEXT,
      feature_id TEXT,
      demo_id TEXT,
      customer_count INTEGER NOT NULL,
      questions_json TEXT NOT NULL,
      personas_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      agents_completed INTEGER NOT NULL DEFAULT 0,
      agents_total INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS agent_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fleet_run_id INTEGER NOT NULL,
      user_id INTEGER,
      project_id TEXT,
      feature_id TEXT,
      demo_id TEXT,
      agent_id TEXT NOT NULL,
      value_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (fleet_run_id) REFERENCES agent_fleet_runs(id)
    )
  `);

  await dbRun(`
    CREATE INDEX IF NOT EXISTS idx_agent_runs_fleet_run_id
    ON agent_runs(fleet_run_id)
  `);
}
