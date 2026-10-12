import { verifyToken } from "./auth.js";
import {
  getDemoUserId,
  resolveDemoProjectContext,
} from "./financial-reports.js";
import { loadFinalReportJson, getFinalReportRow } from "./final-report/persist.js";
import { runFinalReportGeneration } from "./final-report/run.js";
import { assertFeatureOwnedByUser } from "./projects.js";

/**
 * @param {import('express').Request} req
 * @param {"demo" | "full"} mode
 */
async function resolveUserId(req, mode) {
  if (mode === "demo") {
    const userId = await getDemoUserId();
    return { userId: userId ?? null };
  }
  const header = req.headers.authorization;
  const token =
    header && header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  const user = token ? verifyToken(token) : null;
  if (!user) {
    return { error: { status: 401, body: { error: "unauthorized" } } };
  }
  return { userId: user.id };
}

/**
 * @param {import('express').Express} app
 */
export function registerFinalReportRoutes(app) {
  app.post("/final-report/generate", async (req, res) => {
    try {
      const body = req.body ?? {};
      const mode = body.mode;
      if (mode !== "demo" && mode !== "full") {
        res.status(400).json({ error: "invalid_mode" });
        return;
      }

      if (!body.productData || typeof body.productData !== "object") {
        res.status(400).json({ error: "product_data_required" });
        return;
      }

      let auth = await resolveUserId(req, mode);
      if (auth.error) {
        res.status(auth.error.status).json(auth.error.body);
        return;
      }

      let projectId =
        typeof body.projectId === "string" ? body.projectId : null;
      let featureId =
        typeof body.featureId === "string" ? body.featureId : null;
      let userId = auth.userId;

      if (mode === "demo" && typeof body.demoId === "string") {
        const ctx = await resolveDemoProjectContext(body.demoId);
        if (ctx) {
          projectId = ctx.projectId;
          featureId = ctx.featureId;
          if (!userId) userId = ctx.userId;
        }
      }

      if (mode === "full" && featureId) {
        const owned = await assertFeatureOwnedByUser(featureId, userId);
        if (!owned) {
          res.status(403).json({ error: "forbidden" });
          return;
        }
      }

      const result = await runFinalReportGeneration({
        mode,
        demoId: typeof body.demoId === "string" ? body.demoId : null,
        userId,
        projectId,
        featureId,
        promptId: body.promptId != null ? Number(body.promptId) : null,
        marketAnalysisRunId:
          body.marketAnalysisRunId != null
            ? Number(body.marketAnalysisRunId)
            : null,
        personaFleetRunId:
          body.personaFleetRunId != null
            ? Number(body.personaFleetRunId)
            : null,
        regressionSkipped: Boolean(body.regressionSkipped),
        productData: body.productData,
        fleetJudgment:
          body.fleetJudgment && typeof body.fleetJudgment === "object"
            ? body.fleetJudgment
            : null,
        financialAnalysis:
          body.financialAnalysis && typeof body.financialAnalysis === "object"
            ? body.financialAnalysis
            : null,
      });

      res.json(result);
    } catch (err) {
      console.error(err);
      const status = err?.status && err.status >= 400 ? err.status : 500;
      res.status(status).json({
        error: "final_report_failed",
        message: err?.message ?? "Unknown error",
      });
    }
  });

  app.get("/final-report/:reportId", async (req, res) => {
    try {
      const reportId = Number(req.params.reportId);
      if (!Number.isFinite(reportId)) {
        res.status(400).json({ error: "invalid_id" });
        return;
      }

      const row = await getFinalReportRow(reportId);
      if (!row) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      if (row.mode === "full") {
        const header = req.headers.authorization;
        const token =
          header && header.startsWith("Bearer ") ? header.slice(7).trim() : null;
        const user = token ? verifyToken(token) : null;
        if (!user) {
          res.status(401).json({ error: "unauthorized" });
          return;
        }
        if (row.feature_id) {
          const owned = await assertFeatureOwnedByUser(
            row.feature_id,
            user.id
          );
          if (!owned) {
            res.status(403).json({ error: "forbidden" });
            return;
          }
        } else if (row.user_id != null && row.user_id !== user.id) {
          res.status(403).json({ error: "forbidden" });
          return;
        }
      } else if (row.mode === "demo") {
        const demoId =
          typeof req.query.demoId === "string" ? req.query.demoId : null;
        if (demoId && row.demo_id && demoId !== row.demo_id) {
          res.status(403).json({ error: "forbidden" });
          return;
        }
      } else {
        res.status(403).json({ error: "forbidden" });
        return;
      }

      const report = await loadFinalReportJson(reportId);
      if (!report) {
        res.status(404).json({ error: "report_file_missing" });
        return;
      }

      res.json({
        reportId,
        report,
        featureId: row.feature_id,
        projectId: row.project_id,
        userId: row.user_id,
        createdAt: row.created_at,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "server_error" });
    }
  });
}
