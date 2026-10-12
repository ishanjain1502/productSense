import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dbGet, dbRun } from "./db-helpers.js";
import {
  demoFeatureId,
  demoProjectId,
} from "./demo-applications.js";
import { DEMO_USER_EMAIL } from "./seed-demo-data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_ROOT = path.join(__dirname, "data", "financial-reports");
const UPLOAD_TMP_ROOT = path.join(__dirname, "data", "uploads", "tmp");

const ALLOWED_EXT = new Set([".csv", ".xlsx", ".xls"]);

export function financialReportsRoot() {
  return REPORTS_ROOT;
}

/** Multer staging dir on the same volume as stored reports (avoids cross-device rename). */
export function financialReportsUploadTempRoot() {
  return UPLOAD_TMP_ROOT;
}

export async function ensureFinancialReportsStorageDirs() {
  await mkdir(UPLOAD_TMP_ROOT, { recursive: true });
  await mkdir(REPORTS_ROOT, { recursive: true });
}

export function sanitizeFinancialFilename(name) {
  const base = path.basename(String(name || "report"));
  const cleaned = base.replace(/[^\w.\-()+ ]/g, "_").slice(0, 180);
  const ext = path.extname(cleaned).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return null;
  }
  return cleaned || null;
}

export async function migrateFinancialReportsSchema() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS financial_reports (
      report_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      project_id TEXT,
      feature_id TEXT,
      location TEXT NOT NULL,
      uploaded_to_cfo INTEGER NOT NULL DEFAULT 0,
      original_filename TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (feature_id) REFERENCES features(id)
    )
  `);
}

export async function getDemoUserId() {
  const row = await dbGet(
    `SELECT id FROM users WHERE email = ? COLLATE NOCASE`,
    [DEMO_USER_EMAIL]
  );
  return row?.id ?? null;
}

/**
 * @param {string} demoId
 */
export async function resolveDemoProjectContext(demoId) {
  const userId = await getDemoUserId();
  if (!userId) return null;
  const projectId = demoProjectId(demoId);
  const featureId = demoFeatureId(demoId);
  const row = await dbGet(
    `SELECT p.id AS project_id, f.id AS feature_id
     FROM projects p
     JOIN features f ON f.project_id = p.id
     WHERE p.user_id = ? AND p.demo_id = ?`,
    [userId, demoId]
  );
  if (!row) {
    return { userId, projectId, featureId };
  }
  return {
    userId,
    projectId: row.project_id,
    featureId: row.feature_id,
  };
}

/**
 * @param {{
 *   userId: number;
 *   tempPath: string;
 *   originalFilename: string;
 *   projectId?: string | null;
 *   featureId?: string | null;
 * }} input
 */
export async function persistFinancialReport(input) {
  const safeName = sanitizeFinancialFilename(input.originalFilename);
  if (!safeName) {
    throw Object.assign(new Error("invalid_file_type"), { status: 400 });
  }

  const insert = await dbRun(
    `INSERT INTO financial_reports (
      user_id, project_id, feature_id, location, uploaded_to_cfo, original_filename
    ) VALUES (?, ?, ?, ?, 0, ?)`,
    [
      input.userId,
      input.projectId ?? null,
      input.featureId ?? null,
      "",
      safeName,
    ]
  );

  const reportId = insert.lastID;
  const userDir = path.join(REPORTS_ROOT, String(input.userId));
  await mkdir(userDir, { recursive: true });
  const storedName = `${reportId}_${safeName}`;
  const absolutePath = path.join(userDir, storedName);
  const relativeLocation = path.relative(__dirname, absolutePath).replace(/\\/g, "/");

  const { copyFile, rename, unlink } = await import("node:fs/promises");
  try {
    await rename(input.tempPath, absolutePath);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "EXDEV") {
      await copyFile(input.tempPath, absolutePath);
      await unlink(input.tempPath);
    } else {
      throw err;
    }
  }

  await dbRun(
    `UPDATE financial_reports SET location = ? WHERE report_id = ?`,
    [relativeLocation, reportId]
  );

  return {
    reportId,
    location: relativeLocation,
    originalFilename: safeName,
  };
}

/**
 * @param {number} userId
 * @param {number} reportId
 * @param {string} projectId
 * @param {string} featureId
 */
/**
 * @returns {Promise<{ projectId: string; featureId: string }>}
 */
export async function linkFinancialReportToProject(
  userId,
  reportId,
  projectId,
  featureId
) {
  const row = await dbGet(
    `SELECT report_id, project_id, feature_id FROM financial_reports
     WHERE report_id = ? AND user_id = ?`,
    [reportId, userId]
  );
  if (!row) {
    throw Object.assign(new Error("report_not_found"), { status: 404 });
  }
  if (row.project_id) {
    const linkedFeatureId =
      typeof row.feature_id === "string" && row.feature_id
        ? row.feature_id
        : featureId;
    if (row.project_id !== projectId) {
      return { projectId: row.project_id, featureId: linkedFeatureId };
    }
    if (row.feature_id !== featureId) {
      await dbRun(
        `UPDATE financial_reports SET feature_id = ? WHERE report_id = ?`,
        [featureId, reportId]
      );
    }
    return { projectId: row.project_id, featureId };
  }
  await dbRun(
    `UPDATE financial_reports SET project_id = ?, feature_id = ? WHERE report_id = ?`,
    [projectId, featureId, reportId]
  );
  return { projectId, featureId };
}

/**
 * @param {number} userId
 * @param {number} reportId
 */
export async function getFinancialReportProjectLink(userId, reportId) {
  return dbGet(
    `SELECT project_id, feature_id FROM financial_reports
     WHERE report_id = ? AND user_id = ?`,
    [reportId, userId]
  );
}

/**
 * @param {number} userId
 * @param {number} reportId
 */
export async function deleteFinancialReport(userId, reportId) {
  const row = await dbGet(
    `SELECT location FROM financial_reports WHERE report_id = ? AND user_id = ?`,
    [reportId, userId]
  );
  if (!row) return false;
  await dbRun(`DELETE FROM financial_reports WHERE report_id = ?`, [reportId]);
  if (row.location) {
    const absolute = path.join(__dirname, row.location);
    try {
      await unlink(absolute);
    } catch {
      /* file may already be gone */
    }
  }
  return true;
}
