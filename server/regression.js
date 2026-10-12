import { commandCodeChat } from "./commandcode.js";
import { dbRun, dbGet } from "./db-helpers.js";
import { getDemoRegressionPrompt } from "./demo-regression-prompts.js";
import {
  AGENT_WINDOW_FALLBACK_META_NOTE,
  AGENT_WINDOW_FALLBACK_OUTLINE_BULLET,
  ENTIRE_IO_META_NOTE,
  ENTIRE_IO_OUTLINE_BULLET,
} from "./entire-prompt-snippet.js";
import { writeReportFile } from "./report-storage.js";

const AGENT_PROMPT_OUTLINE = `
The output must be a single prompt for a coding agent. Do not wrap it in markdown fences.

Required sections in the agent prompt:
1. ROLE — coding agent for regression analysis in the product codebase.
2. PRODUCT CONTEXT — application name, description, team size, market summary.
3. FEATURE UNDER REVIEW — feature name, description, attached document names if any.
4. REGRESSION ANALYSIS TASK — numbered tasks: blast radius, impacted components, API and data impact, regression tests, rollout risks, mitigations.
5. OUTPUT FORMAT — JSON schema with keys: summary, blastRadius, impactedComponents, apiAndDataImpact, regressionTests, rolloutRisks, recommendedMitigations, entireInsights.
6. SUBMISSION — POST JSON to the backend reports URL with source and product identifiers.
7. RULES — ASD-STE100 style in all text fields; short sentences; no secrets in the report.
${ENTIRE_IO_OUTLINE_BULLET}
${AGENT_WINDOW_FALLBACK_OUTLINE_BULLET}
`;

const META_WRITER_SYSTEM = `You are a technical writer for software engineering.
You write instructions for autonomous coding agents.
You follow ASD-STE100 rules: use short sentences, one instruction per sentence, simple words, active voice.
Output only the final agent prompt text. Do not add commentary before or after the prompt.`;

/**
 * @param {Record<string, unknown>} productData
 */
function formatProductBlock(productData) {
  const personas = Array.isArray(productData.personas)
    ? productData.personas
        .map(
          (p, i) =>
            `Persona ${i + 1}: ${p?.name ?? ""}. ${p?.description ?? ""}`
        )
        .join("\n")
    : "";

  const newInstall = productData.newInstallPersona;
  const teamSize =
    productData.teamSize === "" || productData.teamSize == null
      ? "unknown"
      : String(productData.teamSize);

  return [
    `Application: ${productData.applicationName ?? ""}`,
    `Description: ${productData.applicationDescription ?? ""}`,
    `Team size: ${teamSize}`,
    `Feature name: ${productData.featureName ?? ""}`,
    `Feature description: ${productData.featureDescription ?? ""}`,
    `Feature document: ${productData.featureDocumentName ?? "none"}`,
    `Target market: ${productData.targetMarket ?? ""}`,
    personas,
    `New install persona: ${newInstall?.name ?? ""}. ${newInstall?.description ?? ""}`,
    `Personas document: ${productData.personasDocumentName ?? "none"}`,
    `Primary buyer: ${productData.primaryBuyer ?? ""}`,
    `Competitors: ${productData.competitorCompanies ?? ""}`,
    `Geography: ${productData.geography ?? ""}`,
  ].join("\n");
}

/**
 * @param {string} prompt
 * @param {{ promptId: number; featureId?: string | null }} meta
 */
export function appendRegressionSubmissionMeta(prompt, meta) {
  const lines = [
    `Include field "promptId": ${meta.promptId}.`,
    meta.featureId
      ? `Include field "featureId": "${meta.featureId}".`
      : `Include field "featureId": null.`,
  ];
  if (prompt.includes("Include field \"promptId\"")) return prompt;
  return `${prompt}\n\nCORRELATION FIELDS (required in POST JSON)\n${lines.join("\n")}`;
}

async function addColumnIfMissing(table, column, ddl) {
  try {
    await dbRun(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  } catch (err) {
    if (!String(err?.message).includes("duplicate column")) throw err;
  }
}

export async function migrateRegressionSchema() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS regression_prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      mode TEXT NOT NULL,
      demo_id TEXT,
      application_name TEXT,
      feature_name TEXT,
      prompt TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await addColumnIfMissing("regression_prompts", "project_id", "TEXT");
  await addColumnIfMissing("regression_prompts", "feature_id", "TEXT");

  const legacy = await dbGet(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name='regression_reports'`
  );
  if (legacy?.sql && legacy.sql.includes("payload")) {
    await dbRun(`DROP TABLE regression_reports`);
  }

  await dbRun(`
    CREATE TABLE IF NOT EXISTS regression_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      project_id TEXT,
      feature_id TEXT,
      prompt_id INTEGER,
      demo_id TEXT,
      regression_report_submitted INTEGER NOT NULL DEFAULT 0,
      report_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (prompt_id) REFERENCES regression_prompts(id)
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS market_analysis_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      project_id TEXT,
      feature_id TEXT,
      demo_id TEXT,
      strategy_b_report_url TEXT,
      strategy_c_report_url TEXT,
      strategy_b_raw_url TEXT,
      strategy_c_raw_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error_b TEXT,
      error_c TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS market_analysis_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      project_id TEXT,
      feature_id TEXT,
      demo_id TEXT,
      run_id INTEGER NOT NULL,
      market_analysis_report_submitted INTEGER NOT NULL DEFAULT 1,
      report_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (run_id) REFERENCES market_analysis_runs(id)
    )
  `);
}

/**
 * @param {Record<string, unknown>} productData
 * @param {string} backendUrl
 */
export async function generateFullRegressionPrompt(productData, backendUrl) {
  const reportsUrl = `${backendUrl.replace(/\/$/, "")}/regression/reports`;
  const userMessage = `Write one coding-agent prompt for feature regression analysis.

${AGENT_PROMPT_OUTLINE}

PRODUCT INPUT:
${formatProductBlock(productData)}

BACKEND REPORT URL FOR THE AGENT PROMPT: ${reportsUrl}

The agent prompt must tell the coding agent to POST the JSON report to that URL.
The agent prompt must require fields promptId and featureId in the POST body (values will be filled in later).

${ENTIRE_IO_META_NOTE}

${AGENT_WINDOW_FALLBACK_META_NOTE}`;

  return commandCodeChat([
    { role: "system", content: META_WRITER_SYSTEM },
    { role: "user", content: userMessage },
  ]);
}

export async function saveRegressionPrompt({
  userId,
  mode,
  demoId,
  applicationName,
  featureName,
  prompt,
  projectId = null,
  featureId = null,
}) {
  const result = await dbRun(
    `INSERT INTO regression_prompts (
      user_id, mode, demo_id, application_name, feature_name, prompt, project_id, feature_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId ?? null,
      mode,
      demoId ?? null,
      applicationName ?? null,
      featureName ?? null,
      prompt,
      projectId,
      featureId,
    ]
  );
  return result.lastID;
}

/**
 * @param {Record<string, unknown>} payload
 * @param {{
 *   userId?: number | null;
 *   demoId?: string | null;
 * }} ctx
 */
export async function saveRegressionReport(payload, ctx = {}) {
  const promptId =
    typeof payload.promptId === "number"
      ? payload.promptId
      : Number(payload.promptId);
  if (!Number.isFinite(promptId)) {
    const err = new Error("prompt_id_required");
    err.status = 400;
    throw err;
  }

  const promptRow = await dbGet(
    `SELECT id, user_id, project_id, feature_id, demo_id, mode FROM regression_prompts WHERE id = ?`,
    [promptId]
  );
  if (!promptRow) {
    const err = new Error("unknown_prompt");
    err.status = 400;
    throw err;
  }

  const userId = ctx.userId ?? null;
  const demoId =
    ctx.demoId ?? promptRow.demo_id ?? (typeof payload.demoId === "string" ? payload.demoId : null);
  const projectId = promptRow.project_id ?? null;
  const featureId =
    typeof payload.featureId === "string" && payload.featureId
      ? payload.featureId
      : promptRow.feature_id ?? null;

  const submitted = promptRow.mode === "demo" ? 1 : 1;

  const insert = await dbRun(
    `INSERT INTO regression_reports (
      user_id, project_id, feature_id, prompt_id, demo_id,
      regression_report_submitted, report_url
    ) VALUES (?, ?, ?, ?, ?, ?, '')`,
    [
      userId,
      projectId ?? null,
      featureId ?? null,
      promptId,
      demoId,
      submitted,
    ]
  );

  const reportId = insert.lastID;
  const reportUrl = await writeReportFile(
    `regression/${reportId}.json`,
    payload
  );

  await dbRun(`UPDATE regression_reports SET report_url = ? WHERE id = ?`, [
    reportUrl,
    reportId,
  ]);

  return reportId;
}

/**
 * @param {{ promptId?: number; featureId?: string; userId?: number }} query
 */
export async function getRegressionReportStatus(query) {
  if (query.promptId != null) {
    const row = await dbGet(
      `SELECT id FROM regression_reports WHERE prompt_id = ? ORDER BY id DESC LIMIT 1`,
      [query.promptId]
    );
    return row ? { found: true, reportId: row.id } : { found: false };
  }

  if (query.featureId && query.userId) {
    const row = await dbGet(
      `SELECT r.id FROM regression_reports r
       JOIN features f ON f.id = r.feature_id
       JOIN projects p ON p.id = f.project_id
       WHERE r.feature_id = ? AND p.user_id = ?
         AND r.regression_report_submitted = 1
       ORDER BY r.id DESC LIMIT 1`,
      [query.featureId, query.userId]
    );
    return row ? { found: true, reportId: row.id } : { found: false };
  }

  return { found: false };
}

export { getDemoRegressionPrompt, AGENT_PROMPT_OUTLINE, formatProductBlock };
