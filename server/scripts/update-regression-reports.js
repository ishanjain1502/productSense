/**
 * One-off edits for regression_reports.
 *
 * Usage (from server/):
 *   node scripts/update-regression-reports.js
 *
 * Set DATABASE_PATH in .env or env (default: ./data/app.db).
 * Stop the dev server first if it holds a long-lived DB lock.
 */

import "dotenv/config";
import { closeDb, initDb } from "../db.js";
import { dbAll, dbGet, dbRun } from "../db-helpers.js";

const databasePath = process.env.DATABASE_PATH || "./data/app.db";

/** @type {Array<{ where: { id?: number; prompt_id?: number }; set: Record<string, unknown> }>} */
const UPDATES = [
  // Example: set report_url for row id 3
  // {
  //   where: { id: 3 },
  //   set: { report_url: "file:///data/reports/regression/3.json" },
  // },
  // Example: match by prompt_id
  // {
  //   where: { prompt_id: 12 },
  //   set: { regression_report_submitted: 1, feature_id: "feat-abc" },
  // },
];

const ALLOWED_COLUMNS = new Set([
  "user_id",
  "project_id",
  "feature_id",
  "prompt_id",
  "demo_id",
  "regression_report_submitted",
  "report_url",
  "created_at",
]);

function buildUpdate(entry) {
  const { where, set } = entry;
  const whereKeys = Object.keys(where ?? {});
  if (whereKeys.length === 0) {
    throw new Error("Each update needs at least one where key (id or prompt_id).");
  }
  if (whereKeys.some((k) => k !== "id" && k !== "prompt_id")) {
    throw new Error("where only supports id and prompt_id.");
  }

  const setKeys = Object.keys(set ?? {});
  if (setKeys.length === 0) {
    throw new Error("set must include at least one column.");
  }
  for (const key of setKeys) {
    if (!ALLOWED_COLUMNS.has(key)) {
      throw new Error(`Column not allowed: ${key}`);
    }
  }

  const setClause = setKeys.map((k) => `${k} = ?`).join(", ");
  const whereClause = whereKeys.map((k) => `${k} = ?`).join(" AND ");
  const params = [...setKeys.map((k) => set[k]), ...whereKeys.map((k) => where[k])];

  return {
    sql: `UPDATE regression_reports SET ${setClause} WHERE ${whereClause}`,
    params,
  };
}

async function listRecent(limit = 20) {
  return dbAll(
    `SELECT id, prompt_id, project_id, feature_id, demo_id,
            regression_report_submitted, report_url, created_at
     FROM regression_reports
     ORDER BY id DESC
     LIMIT ?`,
    [limit]
  );
}

await initDb(databasePath);

try {
  if (UPDATES.length === 0) {
    console.log("No UPDATES configured. Recent rows:\n");
    console.table(await listRecent());
    console.log(
      "\nEdit UPDATES in this file, then run again.\n" +
        "Columns: user_id, project_id, feature_id, prompt_id, demo_id, " +
        "regression_report_submitted, report_url, created_at"
    );
    process.exit(0);
  }

  for (const entry of UPDATES) {
    const before =
      entry.where.id != null
        ? await dbGet(`SELECT * FROM regression_reports WHERE id = ?`, [
            entry.where.id,
          ])
        : entry.where.prompt_id != null
          ? await dbAll(
              `SELECT * FROM regression_reports WHERE prompt_id = ?`,
              [entry.where.prompt_id]
            )
          : null;

    const { sql, params } = buildUpdate(entry);
    const result = await dbRun(sql, params);

    console.log(`Ran: ${sql}`);
    console.log(`  params: ${JSON.stringify(params)}`);
    console.log(`  rows changed: ${result.changes}`);

    if (before) {
      console.log("  before:", before);
    }

    if (entry.where.id != null) {
      const after = await dbGet(`SELECT * FROM regression_reports WHERE id = ?`, [
        entry.where.id,
      ]);
      console.log("  after:", after);
    }
  }
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await closeDb();
}
