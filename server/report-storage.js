import fs from "node:fs/promises";
import path from "node:path";

function reportsRoot() {
  return process.env.REPORTS_ROOT || path.join(process.cwd(), "data/reports");
}

export async function ensureReportsRoot() {
  await fs.mkdir(reportsRoot(), { recursive: true });
}

/**
 * @param {string} relativePath
 * @param {unknown} data
 * @returns {Promise<string>} normalized relative path
 */
export async function writeReportFile(relativePath, data) {
  await ensureReportsRoot();
  const full = path.join(reportsRoot(), relativePath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(data, null, 2), "utf8");
  return relativePath.replace(/\\/g, "/");
}

/**
 * @param {string} relativePath
 */
export async function readReportFile(relativePath) {
  const full = path.join(reportsRoot(), relativePath);
  const raw = await fs.readFile(full, "utf8");
  return JSON.parse(raw);
}
