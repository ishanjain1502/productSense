import { verifyToken } from "./auth.js";
import { getDemoUserId } from "./financial-reports.js";
import { assertFeatureOwnedByUser } from "./projects.js";
import { runFinancialAnalysis } from "./financial-analysis/run.js";

/**
 * @param {import('express').Request} req
 * @param {"demo" | "full"} mode
 */
async function resolveUserIdForAnalysis(req, mode) {
  if (mode === "demo") {
    const userId = await getDemoUserId();
    if (!userId) {
      return {
        error: { status: 503, body: { error: "demo_user_not_seeded" } },
      };
    }
    return { userId };
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
export function registerFinancialAnalysisRoutes(app) {
  app.post("/financial-analysis/run", async (req, res) => {
    try {
      const {
        mode,
        productData,
        featureId,
        financialReportId,
        personaFleetRunId,
        fleetJudgment,
      } = req.body ?? {};

      if (!productData || typeof productData !== "object") {
        res.status(400).json({ error: "product_data_required" });
        return;
      }

      if (mode !== "demo" && mode !== "full") {
        res.status(400).json({ error: "invalid_mode" });
        return;
      }

      const auth = await resolveUserIdForAnalysis(req, mode);
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
      }

      const result = await runFinancialAnalysis({
        userId: auth.userId,
        productData,
        financialReportId:
          financialReportId != null ? Number(financialReportId) : null,
        personaFleetRunId:
          personaFleetRunId != null ? Number(personaFleetRunId) : null,
        fleetJudgment:
          fleetJudgment && typeof fleetJudgment === "object"
            ? fleetJudgment
            : null,
      });

      res.json(result);
    } catch (err) {
      console.error(err);
      const status = err?.status && err.status >= 400 ? err.status : 500;
      res.status(status).json({
        error: "financial_analysis_failed",
        message: err?.message ?? "Unknown error",
      });
    }
  });
}
