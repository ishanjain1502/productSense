import { dbRun } from "../db-helpers.js";

export async function migrateCfoSchema() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS cfo_oauth_credentials (
      user_id INTEGER PRIMARY KEY,
      org_id TEXT,
      client_info_encrypted TEXT,
      tokens_encrypted TEXT,
      connected_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS cfo_oauth_states (
      state TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      code_verifier_encrypted TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await dbRun(`
    CREATE INDEX IF NOT EXISTS idx_cfo_oauth_states_user
    ON cfo_oauth_states(user_id)
  `);
}
