import { trace } from "neatlogs";
import { dbGet, dbAll } from "../db-helpers.js";
import { readReportFile, writeReportFile } from "../report-storage.js";
import { aggregateFleetJudgment } from "./aggregate.js";
import { selectRepresentativeQuotes } from "./quotes.js";
import { keywordThemeFallback } from "./theme-fallback.js";
import { mapAllVerdictThemes } from "./theme-map.js";
import { synthesizeFleetJudgment } from "./judgment-synthesis.js";
import { judgmentRelativePath } from "./judgment-path.js";

/**
 * @param {number} fleetRunId
 */
export async function loadFleetJudgmentFromCache(fleetRunId) {
  try {
    return await readReportFile(judgmentRelativePath(fleetRunId));
  } catch {
    return null;
  }
}

/**
 * @param {number} fleetRunId
 * @param {{ force?: boolean; productData?: Record<string, unknown> }} [opts]
 */
export async function composeFleetJudgment(fleetRunId, opts = {}) {
  const row = await dbGet(`SELECT * FROM agent_fleet_runs WHERE id = ?`, [
    fleetRunId,
  ]);
  if (!row) {
    const err = new Error("fleet run not found");
    err.status = 404;
    throw err;
  }
  if (row.status !== "completed") {
    const err = new Error("judgment_not_ready");
    err.status = 409;
    throw err;
  }
  if (
    row.agents_total > 0 &&
    row.agents_completed !== row.agents_total
  ) {
    const err = new Error("judgment_not_ready");
    err.status = 409;
    throw err;
  }

  if (!opts.force) {
    const cached = await loadFleetJudgmentFromCache(fleetRunId);
    if (cached) return cached;
  }

  const agentRuns = await dbAll(
    `SELECT agent_id, value_json FROM agent_runs WHERE fleet_run_id = ? ORDER BY id`,
    [fleetRunId]
  );
  const questions = JSON.parse(row.questions_json);
  const personas = JSON.parse(row.personas_json);
  const productData = opts.productData ?? {
    featureName: "",
    featureDescription: "",
    applicationName: "",
    targetMarket: "",
  };

  const layer1 = await trace(
    { name: "persona-fleet-judgment-aggregate", kind: "WORKFLOW" },
    async () =>
      aggregateFleetJudgment({
        fleetRunId,
        questions,
        personas,
        agentRuns,
        productData,
      })
  );

  const representativeQuotes = selectRepresentativeQuotes(layer1.agentRows);
  const verdicts = layer1.agentRows.map((r) => r.verdict);

  let themes = await trace(
    { name: "persona-fleet-judgment-themes", kind: "WORKFLOW" },
    async () => {
      try {
        return await mapAllVerdictThemes(verdicts);
      } catch (err) {
        console.error("theme map failed, using keyword fallback:", err);
        return keywordThemeFallback(verdicts);
      }
    }
  );

  const judgment = await trace(
    { name: "persona-fleet-judgment-synthesize", kind: "WORKFLOW" },
    async () =>
      synthesizeFleetJudgment({
        layer1,
        recommendation: layer1.recommendation,
        themes,
        representativeQuotes,
        productData,
      })
  );

  await writeReportFile(judgmentRelativePath(fleetRunId), judgment);
  return judgment;
}
