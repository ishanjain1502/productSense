import { trace } from "neatlogs";
import { dbGet, dbRun } from "../db-helpers.js";
import { runPersonaAgent } from "./agent.js";
import { buildPersonaFleet } from "./personas.js";
import { generateMarketResearchQuestions } from "./questions.js";

const BATCH_SIZE = 5;

/**
 * @param {number} fleetRunId
 */
export async function getFleetRunStatus(fleetRunId) {
  const row = await dbGet(`SELECT * FROM agent_fleet_runs WHERE id = ?`, [
    fleetRunId,
  ]);
  if (!row) return null;

  const total = row.agents_total || 0;
  const completed = row.agents_completed || 0;
  const progressPercent =
    total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  let phase = "pending";
  if (row.status === "personas_ready") phase = "personas_ready";
  if (row.status === "running_agents") phase = "running_agents";
  if (row.status === "completed") phase = "completed";
  if (row.status === "failed") phase = "failed";

  return {
    fleetRunId: row.id,
    status: row.status,
    phase,
    featureId: row.feature_id,
    customerCount: row.customer_count,
    agentsCompleted: completed,
    agentsTotal: total,
    progressPercent,
    questions: JSON.parse(row.questions_json),
    personaCount: JSON.parse(row.personas_json).length,
    error: row.error,
  };
}

/**
 * @param {{
 *   userId: number | null;
 *   projectId: string | null;
 *   featureId: string | null;
 *   demoId: string | null;
 *   productData: Record<string, unknown>;
 *   customerCount: number;
 * }} ctx
 */
export async function startPersonaFleetRun(ctx) {
  const n = ctx.customerCount;
  if (!Number.isFinite(n) || n < 10 || n > 1000) {
    const err = new Error("customer_count must be between 10 and 1000");
    err.status = 400;
    throw err;
  }

  const questions = await trace(
    { name: "persona-fleet-questions", kind: "WORKFLOW" },
    async () => generateMarketResearchQuestions(ctx.productData)
  );
  const personas = buildPersonaFleet(ctx.productData, n);

  const insert = await dbRun(
    `INSERT INTO agent_fleet_runs (
      user_id, project_id, feature_id, demo_id,
      customer_count, questions_json, personas_json,
      status, agents_completed, agents_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'personas_ready', 0, ?)`,
    [
      ctx.userId,
      ctx.projectId,
      ctx.featureId,
      ctx.demoId,
      n,
      JSON.stringify(questions),
      JSON.stringify(personas),
      personas.length,
    ]
  );

  const fleetRunId = insert.lastID;
  void processAgentBatches(fleetRunId, ctx.productData, personas, questions);

  return {
    fleetRunId,
    status: "personas_ready",
    phase: "personas_ready",
    questions,
    personaCount: personas.length,
    agentsTotal: personas.length,
    agentsCompleted: 0,
    progressPercent: 0,
  };
}

/**
 * @param {number} fleetRunId
 * @param {Record<string, unknown>} productData
 * @param {Array<{ agentId: string; name: string; description: string }>} personas
 * @param {Array<{ key: string; text: string }>} questions
 */
async function processAgentBatches(fleetRunId, productData, personas, questions) {
  await trace({ name: "persona-fleet-agents", kind: "WORKFLOW" }, async () => {
  const row = await dbGet(`SELECT * FROM agent_fleet_runs WHERE id = ?`, [
    fleetRunId,
  ]);
  if (!row) return;

  await dbRun(
    `UPDATE agent_fleet_runs SET status = 'running_agents' WHERE id = ?`,
    [fleetRunId]
  );

  let completed = 0;

  try {
    for (let i = 0; i < personas.length; i += BATCH_SIZE) {
      const batch = personas.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (persona) => {
          const value = await runPersonaAgent({
            productData,
            persona,
            questions,
          });

          await dbRun(
            `INSERT INTO agent_runs (
              fleet_run_id, user_id, project_id, feature_id, demo_id,
              agent_id, value_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              fleetRunId,
              row.user_id,
              row.project_id,
              row.feature_id,
              row.demo_id,
              persona.agentId,
              JSON.stringify(value),
            ]
          );
        })
      );

      completed += batch.length;
      await dbRun(
        `UPDATE agent_fleet_runs SET agents_completed = ? WHERE id = ?`,
        [completed, fleetRunId]
      );
    }

    await dbRun(
      `UPDATE agent_fleet_runs SET status = 'completed' WHERE id = ?`,
      [fleetRunId]
    );
  } catch (err) {
    console.error("persona fleet batch failed:", err);
    await dbRun(
      `UPDATE agent_fleet_runs SET status = 'failed', error = ? WHERE id = ?`,
      [String(err?.message ?? err), fleetRunId]
    );
  }
  });
}
