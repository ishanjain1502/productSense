import { verifyToken } from "./auth.js";
import { assertFeatureOwnedByUser } from "./projects.js";
import { dbGet } from "./db-helpers.js";
import {
  composeFleetJudgment,
  loadFleetJudgmentFromCache,
} from "./persona-fleet/compose-judgment.js";
import {
  getFleetRunStatus,
  startPersonaFleetRun,
} from "./persona-fleet/run.js";

function resolveAuth(req, mode) {
  if (mode !== "full") {
    return { userId: null };
  }
  const header = req.headers.authorization;
  const token =
    header && header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  const user = token ? verifyToken(token) : null;
  if (!user) {
    return { error: { status: 401, body: { error: "unauthorized" } } };
  }
  return { userId: user.id, user };
}

/**
 * @param {number} fleetRunId
 */
async function assertFleetAccess(req, fleetRunId) {
  const row = await dbGet(`SELECT feature_id FROM agent_fleet_runs WHERE id = ?`, [
    fleetRunId,
  ]);
  if (!row) return { error: { status: 404, body: { error: "not_found" } } };
  if (!row.feature_id) return { ok: true };
  const auth = resolveAuth(req, "full");
  if (auth.error) return { error: auth.error };
  const owned = await assertFeatureOwnedByUser(row.feature_id, auth.userId);
  if (!owned) return { error: { status: 403, body: { error: "forbidden" } } };
  return { ok: true };
}

/**
 * @param {import('express').Express} app
 */
export function registerPersonaFleetRoutes(app) {
  app.post("/market-analysis/persona-fleet/start", async (req, res) => {
    try {
      const {
        mode,
        demoId,
        productData,
        projectId,
        featureId,
        customerCount,
      } = req.body ?? {};

      if (!productData || typeof productData !== "object") {
        res.status(400).json({ error: "product_data_required" });
        return;
      }

      const auth = resolveAuth(req, mode);
      if (auth.error) {
        res.status(auth.error.status).json(auth.error.body);
        return;
      }

      if (mode === "full") {
        if (!featureId || typeof featureId !== "string") {
          res.status(400).json({ error: "feature_id_required" });
          return;
        }
        const owned = await assertFeatureOwnedByUser(featureId, auth.userId);
        if (!owned) {
          res.status(403).json({ error: "forbidden" });
          return;
        }
      } else if (mode !== "demo") {
        res.status(400).json({ error: "invalid_mode" });
        return;
      }

      const result = await startPersonaFleetRun({
        userId: auth.userId,
        projectId: mode === "full" ? projectId : null,
        featureId: mode === "full" ? featureId : null,
        demoId: mode === "demo" ? demoId : null,
        productData,
        customerCount: Number(customerCount),
      });

      res.json(result);
    } catch (err) {
      console.error(err);
      const status = err?.status && err.status >= 400 ? err.status : 500;
      res.status(status).json({
        error: "persona_fleet_failed",
        message: err?.message ?? "Unknown error",
      });
    }
  });

  app.get("/market-analysis/persona-fleet/:id/status", async (req, res) => {
    try {
      const fleetRunId = Number(req.params.id);
      if (!Number.isFinite(fleetRunId)) {
        res.status(400).json({ error: "invalid_id" });
        return;
      }

      const status = await getFleetRunStatus(fleetRunId);
      if (!status) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      if (status.featureId) {
        const auth = resolveAuth(req, "full");
        if (auth.error) {
          res.status(auth.error.status).json(auth.error.body);
          return;
        }
        const owned = await assertFeatureOwnedByUser(
          status.featureId,
          auth.userId
        );
        if (!owned) {
          res.status(403).json({ error: "forbidden" });
          return;
        }
      }

      res.json(status);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "server_error" });
    }
  });

  app.post("/market-analysis/persona-fleet/:id/judgment", async (req, res) => {
    try {
      const fleetRunId = Number(req.params.id);
      if (!Number.isFinite(fleetRunId)) {
        res.status(400).json({ error: "invalid_id" });
        return;
      }

      const access = await assertFleetAccess(req, fleetRunId);
      if (access.error) {
        res.status(access.error.status).json(access.error.body);
        return;
      }

      const { productData, force } = req.body ?? {};
      const judgment = await composeFleetJudgment(fleetRunId, {
        force: Boolean(force),
        productData:
          productData && typeof productData === "object" ? productData : {},
      });
      res.json(judgment);
    } catch (err) {
      console.error(err);
      if (err?.status === 404) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      if (err?.status === 409) {
        res.status(409).json({ error: "judgment_not_ready" });
        return;
      }
      res.status(500).json({
        error: "judgment_failed",
        message: err?.message ?? "Unknown error",
      });
    }
  });

  app.get("/market-analysis/persona-fleet/:id/judgment", async (req, res) => {
    try {
      const fleetRunId = Number(req.params.id);
      if (!Number.isFinite(fleetRunId)) {
        res.status(400).json({ error: "invalid_id" });
        return;
      }

      const access = await assertFleetAccess(req, fleetRunId);
      if (access.error) {
        res.status(access.error.status).json(access.error.body);
        return;
      }

      const judgment = await loadFleetJudgmentFromCache(fleetRunId);
      if (!judgment) {
        res.status(404).json({ ready: false, error: "judgment_not_found" });
        return;
      }
      res.json(judgment);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "server_error" });
    }
  });
}
