import { commandCodeChat } from "./commandcode.js";
import { dbRun, dbGet } from "./db-helpers.js";
import { getDemoRegressionPrompt } from "./demo-regression-prompts.js";
import {
  AGENT_WINDOW_FALLBACK_META_NOTE,
  AGENT_WINDOW_FALLBACK_OUTLINE_BULLET,
  ENTIRE_IO_META_NOTE,
  ENTIRE_IO_OUTLINE_BULLET,
} from "./entire-prompt-snippet.js";

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

  await dbRun(`
    CREATE TABLE IF NOT EXISTS regression_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      payload TEXT NOT NULL,
      application_name TEXT,
      feature_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
}) {
  const result = await dbRun(
    `INSERT INTO regression_prompts (user_id, mode, demo_id, application_name, feature_name, prompt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId ?? null,
      mode,
      demoId ?? null,
      applicationName ?? null,
      featureName ?? null,
      prompt,
    ]
  );
  return result.lastID;
}

export async function saveRegressionReport(payload, userId = null) {
  const applicationName =
    typeof payload.applicationName === "string"
      ? payload.applicationName
      : null;
  const featureName =
    typeof payload.featureName === "string" ? payload.featureName : null;

  const result = await dbRun(
    `INSERT INTO regression_reports (user_id, payload, application_name, feature_name)
     VALUES (?, ?, ?, ?)`,
    [userId, JSON.stringify(payload), applicationName, featureName]
  );
  return result.lastID;
}

export { getDemoRegressionPrompt, AGENT_PROMPT_OUTLINE };
