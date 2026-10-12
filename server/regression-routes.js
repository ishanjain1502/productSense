import { authMiddleware, verifyToken } from "./auth.js";
import {
  generateFullRegressionPrompt,
  getDemoRegressionPrompt,
  saveRegressionPrompt,
  saveRegressionReport,
} from "./regression.js";

function publicBackendUrl(req) {
  return (
    process.env.PUBLIC_API_URL ||
    process.env.SERVER_PUBLIC_URL ||
    `${req.protocol}://${req.get("host")}`
  );
}

/**
 * @param {import('express').Express} app
 */
export function registerRegressionRoutes(app) {
  app.post("/regression/agent-prompt", async (req, res) => {
    try {
      const { mode, demoId, productData } = req.body ?? {};
      const backendUrl = publicBackendUrl(req);

      if (mode === "demo") {
        if (!demoId || typeof demoId !== "string") {
          res.status(400).json({ error: "demo_id_required" });
          return;
        }
        const prompt = getDemoRegressionPrompt(demoId, backendUrl);
        if (!prompt) {
          res.status(404).json({ error: "unknown_demo" });
          return;
        }
        const promptId = await saveRegressionPrompt({
          userId: null,
          mode: "demo",
          demoId,
          applicationName: productData?.applicationName,
          featureName: productData?.featureName,
          prompt,
        });
        res.json({ prompt, promptId, mode: "demo", generatedBy: "constant" });
        return;
      }

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
        if (!productData || typeof productData !== "object") {
          res.status(400).json({ error: "product_data_required" });
          return;
        }

        const prompt = await generateFullRegressionPrompt(
          productData,
          backendUrl
        );
        const promptId = await saveRegressionPrompt({
          userId: user.id,
          mode: "full",
          demoId: null,
          applicationName: productData.applicationName,
          featureName: productData.featureName,
          prompt,
        });
        res.json({
          prompt,
          promptId,
          mode: "full",
          generatedBy: "commandcode",
        });
        return;
      }

      res.status(400).json({ error: "invalid_mode" });
    } catch (err) {
      console.error(err);
      const status = err?.status && err.status >= 400 ? err.status : 500;
      res.status(status).json({
        error: "prompt_generation_failed",
        message: err?.message ?? "Unknown error",
      });
    }
  });

  app.post("/regression/reports", async (req, res) => {
    try {
      const payload = req.body ?? {};
      if (typeof payload !== "object" || Array.isArray(payload)) {
        res.status(400).json({ error: "invalid_payload" });
        return;
      }

      let userId = null;
      const header = req.headers.authorization;
      const token =
        header && header.startsWith("Bearer ")
          ? header.slice(7).trim()
          : null;
      if (token) {
        const user = verifyToken(token);
        if (user) userId = user.id;
      }

      const reportId = await saveRegressionReport(payload, userId);
      res.status(201).json({ ok: true, reportId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "server_error" });
    }
  });

  app.get(
    "/regression/prompts/latest",
    authMiddleware,
    async (req, res) => {
      try {
        const { dbGet } = await import("./db-helpers.js");
        const row = await dbGet(
          `SELECT id, mode, demo_id, application_name, feature_name, prompt, created_at
           FROM regression_prompts
           WHERE user_id = ?
           ORDER BY id DESC
           LIMIT 1`,
          [req.user.id]
        );
        if (!row) {
          res.status(404).json({ error: "not_found" });
          return;
        }
        res.json({ prompt: row });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "server_error" });
      }
    }
  );
}
