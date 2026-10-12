import multer from "multer";
import { authMiddleware, verifyToken } from "./auth.js";
import { publishFinancialReportToCfo } from "./cfo/publish-financial-report.js";
import {
  deleteFinancialReport,
  financialReportsUploadTempRoot,
  persistFinancialReport,
  resolveDemoProjectContext,
  sanitizeFinancialFilename,
} from "./financial-reports.js";

/**
 * @param {import('express').Request} req
 * @param {number} reportOwnerId
 */
function resolveCfoCredentialUserId(req, reportOwnerId) {
  const header = req.headers.authorization;
  const token =
    header && header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  const user = token ? verifyToken(token) : null;
  return user?.id ?? reportOwnerId;
}

/**
 * @param {number} cfoUserId
 * @param {number} reportId
 */
async function tryPublishToCfo(cfoUserId, reportId) {
  try {
    const published = await publishFinancialReportToCfo(cfoUserId, reportId);
    return {
      uploadedToCFO: Boolean(published.uploadedToCFO ?? published.alreadyUploaded),
      cfoSync: published.alreadyUploaded ? "already_uploaded" : "ok",
    };
  } catch (err) {
    console.error("cfo_sync_failed", reportId, err?.message ?? err);
    const code = err?.message ?? "cfo_sync_failed";
    return {
      uploadedToCFO: false,
      cfoSync: "failed",
      cfoSyncError: code,
    };
  }
}

const upload = multer({
  dest: financialReportsUploadTempRoot(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const safe = sanitizeFinancialFilename(file.originalname);
    if (!safe) {
      cb(Object.assign(new Error("invalid_file_type"), { status: 400 }));
      return;
    }
    cb(null, true);
  },
});

function handleUploadError(err, res) {
  if (err?.message === "invalid_file_type") {
    res.status(400).json({ error: "invalid_file_type" });
    return true;
  }
  if (err?.code === "LIMIT_FILE_SIZE") {
    res.status(400).json({ error: "file_too_large" });
    return true;
  }
  return false;
}

/**
 * @param {import('express').Express} app
 */
export function registerFinancialReportsRoutes(app) {
  app.post(
    "/financial-reports/upload",
    (req, res, next) => {
      upload.single("file")(req, res, (err) => {
        if (err) {
          if (handleUploadError(err, res)) return;
          next(err);
          return;
        }
        next();
      });
    },
    async (req, res) => {
      try {
        if (!req.file) {
          res.status(400).json({ error: "file_required" });
          return;
        }

        const demoId =
          typeof req.body?.demoId === "string" ? req.body.demoId : null;
        const mode = typeof req.body?.mode === "string" ? req.body.mode : null;

        let userId;
        let projectId = null;
        let featureId = null;

        if (mode === "demo" && demoId) {
          const ctx = await resolveDemoProjectContext(demoId);
          if (!ctx?.userId) {
            res.status(503).json({ error: "demo_user_not_seeded" });
            return;
          }
          userId = ctx.userId;
          projectId = ctx.projectId;
          featureId = ctx.featureId;
        } else {
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
          userId = user.id;
          if (typeof req.body?.projectId === "string") {
            projectId = req.body.projectId;
          }
          if (typeof req.body?.featureId === "string") {
            featureId = req.body.featureId;
          }
        }

        const result = await persistFinancialReport({
          userId,
          tempPath: req.file.path,
          originalFilename: req.file.originalname,
          projectId,
          featureId,
        });

        const syncRequested =
          req.body?.syncToCfo !== "false" && req.body?.syncToCfo !== false;
        let uploadedToCFO = false;
        let cfoSync = "skipped";
        let cfoSyncError = undefined;
        if (syncRequested) {
          const cfoUserId = resolveCfoCredentialUserId(req, userId);
          const sync = await tryPublishToCfo(cfoUserId, result.reportId);
          uploadedToCFO = sync.uploadedToCFO;
          cfoSync = sync.cfoSync;
          cfoSyncError = sync.cfoSyncError;
        }

        res.status(201).json({
          reportId: result.reportId,
          location: result.location,
          originalFilename: result.originalFilename,
          projectId,
          featureId,
          uploadedToCFO,
          cfoSync,
          ...(cfoSyncError ? { cfoSyncError } : {}),
        });
      } catch (err) {
        console.error(err);
        if (err?.status === 400) {
          res.status(400).json({ error: err.message });
          return;
        }
        res.status(500).json({ error: "upload_failed" });
      }
    }
  );

  app.post(
    "/financial-reports/:reportId/publish-to-cfo",
    authMiddleware,
    async (req, res) => {
      try {
        const reportId = Number(req.params.reportId);
        if (!Number.isFinite(reportId)) {
          res.status(400).json({ error: "invalid_report_id" });
          return;
        }
        const { getFinancialReportRow } = await import(
          "./cfo/publish-financial-report.js"
        );
        const row = await getFinancialReportRow(reportId);
        if (!row || row.user_id !== req.user.id) {
          res.status(404).json({ error: "report_not_found" });
          return;
        }
        const published = await publishFinancialReportToCfo(
          req.user.id,
          reportId
        );
        res.json({
          reportId,
          uploadedToCFO: true,
          alreadyUploaded: Boolean(published.alreadyUploaded),
        });
      } catch (err) {
        console.error(err);
        if (err?.status === 401) {
          res.status(401).json({ error: "cfo_needs_auth" });
          return;
        }
        if (err?.status === 404) {
          res.status(404).json({ error: "report_not_found" });
          return;
        }
        if (err?.status === 409) {
          res.status(409).json({ error: "cfo_needs_confirmation" });
          return;
        }
        if (err?.status === 400) {
          res.status(400).json({ error: err.message });
          return;
        }
        res.status(500).json({ error: "cfo_publish_failed" });
      }
    }
  );

  app.delete("/financial-reports/:reportId", authMiddleware, async (req, res) => {
    try {
      const reportId = Number(req.params.reportId);
      if (!Number.isFinite(reportId)) {
        res.status(400).json({ error: "invalid_report_id" });
        return;
      }
      const removed = await deleteFinancialReport(req.user.id, reportId);
      if (!removed) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "delete_failed" });
    }
  });
}
