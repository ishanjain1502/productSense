import { verifyToken } from "./auth.js";
import { assertFeatureOwnedByUser } from "./projects.js";
import { readReportFile } from "./report-storage.js";
import { getMarketAnalysisRun, runMarketAnalysis } from "./market-analysis/run.js";

/**
 * @param {import('express').Express} app
 */
export function registerMarketAnalysisRoutes(app) {
  app.post("/market-analysis/run", async (req, res) => {
    try {
      const { mode, demoId, productData, projectId, featureId } =
        req.body ?? {};

      if (!productData || typeof productData !== "object") {
        res.status(400).json({ error: "product_data_required" });
        return;
      }

      let userId = null;

      if (mode === "full") {
        const header = req.headers.authorization;
        const token =
          header && header.startsWith("Bearer ")
            ? header.slice(7).trim()
            : null;
        const user = token ? verifyToken(token) : null;
        if (!user) {
          res.status(401).json({ error: "unauthorized" });
          return;
        }
        if (!featureId || typeof featureId !== "string") {
          res.status(400).json({ error: "feature_id_required" });
          return;
        }
        const owned = await assertFeatureOwnedByUser(featureId, user.id);
        if (!owned) {
          res.status(403).json({ error: "forbidden" });
          return;
        }
        userId = user.id;
      } else if (mode !== "demo") {
        res.status(400).json({ error: "invalid_mode" });
        return;
      }

      const result = await runMarketAnalysis({
        userId,
        projectId: mode === "full" ? projectId : null,
        featureId: mode === "full" ? featureId : null,
        demoId: mode === "demo" ? demoId : null,
        productData,
      });

      res.json(result);
    } catch (err) {
      console.error(err);
      const status = err?.status && err.status >= 400 ? err.status : 500;
      res.status(status).json({
        error: "market_analysis_failed",
        message: err?.message ?? "Unknown error",
      });
    }
  });

  app.get("/market-analysis/runs/:id", async (req, res) => {
    try {
      const runId = Number(req.params.id);
      if (!Number.isFinite(runId)) {
        res.status(400).json({ error: "invalid_id" });
        return;
      }

      const row = await getMarketAnalysisRun(runId);
      if (!row) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      if (row.feature_id) {
        const header = req.headers.authorization;
        const token =
          header && header.startsWith("Bearer ")
            ? header.slice(7).trim()
            : null;
        const user = token ? verifyToken(token) : null;
        if (!user) {
          res.status(401).json({ error: "unauthorized" });
          return;
        }
        const owned = await assertFeatureOwnedByUser(row.feature_id, user.id);
        if (!owned) {
          res.status(403).json({ error: "forbidden" });
          return;
        }
      }

      let strategyB = null;
      let strategyC = null;
      if (row.strategy_b_report_url) {
        strategyB = await readReportFile(row.strategy_b_report_url);
      }
      if (row.strategy_c_report_url) {
        strategyC = await readReportFile(row.strategy_c_report_url);
      }

      res.json({
        runId: row.id,
        status: row.status,
        strategyB,
        strategyC,
        errorB: row.error_b,
        errorC: row.error_c,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "server_error" });
    }
  });
}
