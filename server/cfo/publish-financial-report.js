import path from "node:path";
import { fileURLToPath } from "node:url";

import { callCfoTool } from "./client.js";
import { loadCfoCredentials } from "./credentials.js";
import { withCfoMcp } from "./with-client.js";
import { financialWorkbookToCsv } from "../financial-reports-parse.js";
import { dbGet, dbRun } from "../db-helpers.js";
import { getCfoConnectionStatus } from "./client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INLINE_CSV_MAX_BYTES = 262_144;

/**
 * @param {number} reportId
 */
export async function getFinancialReportRow(reportId) {
  return dbGet(
    `SELECT report_id, user_id, location, original_filename, uploaded_to_cfo
     FROM financial_reports WHERE report_id = ?`,
    [reportId]
  );
}

/**
 * @param {number} reportId
 */
export async function markFinancialReportUploadedToCfo(reportId) {
  await dbRun(
    `UPDATE financial_reports SET uploaded_to_cfo = 1 WHERE report_id = ?`,
    [reportId]
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {unknown} body
 */
function extractConnectionTarget(body) {
  if (!body || typeof body !== "object") return null;
  const o = body;
  if (typeof o.connection === "string" && o.connection.trim()) {
    return o.connection.trim();
  }
  if (typeof o.target === "string" && o.target.trim()) {
    return o.target.trim();
  }
  const outcome = o.outcome;
  if (outcome && typeof outcome === "object") {
    const c = outcome.connection;
    if (typeof c === "string" && c.trim()) return c.trim();
    if (c && typeof c === "object" && typeof c.ref === "string") {
      return c.ref;
    }
  }
  return null;
}

/**
 * @param {unknown} body
 */
function ingestLooksReady(body) {
  if (!body || typeof body !== "object") return false;
  const o = body;
  if (o.needs_confirmation === true) return false;
  if (o.ok === false || o.success === false) return false;
  const status = String(o.status ?? o.state ?? "").toLowerCase();
  if (status === "ready" || status === "linked" || status === "complete") {
    return true;
  }
  if (o.ingestion_complete === true || o.ready === true) return true;
  return o.ok === true || o.success === true;
}

/**
 * @param {import('@modelcontextprotocol/sdk/client/index.js').Client} client
 * @param {string | null} orgId
 * @param {string} connectionTarget
 */
async function pollIngestionReady(client, orgId, connectionTarget) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const payload = {
      ingestion: { target: connectionTarget },
      ...(orgId ? { org_id: orgId } : {}),
    };
    const status = await callCfoTool(client, "inspect_integrations", payload);
    if (ingestLooksReady(status)) {
      return status;
    }
    await sleep(Math.min(2000 + attempt * 500, 8000));
  }
  return null;
}

/**
 * Publish a stored financial report to cfo.ai via MCP ingest_csv.
 *
 * @param {number} cfoUserId User whose OAuth credentials are used (may differ from report owner in demo).
 * @param {number} reportId
 */
export async function publishFinancialReportToCfo(cfoUserId, reportId) {
  const connection = await getCfoConnectionStatus(cfoUserId);
  if (connection.status !== "connected") {
    throw Object.assign(new Error("cfo_needs_auth"), { status: 401 });
  }

  const row = await getFinancialReportRow(reportId);
  if (!row?.location) {
    throw Object.assign(new Error("report_not_found"), { status: 404 });
  }
  if (row.uploaded_to_cfo) {
    return { alreadyUploaded: true, reportId };
  }

  const absolutePath = path.join(__dirname, "..", row.location);
  const { csv, csvFilename } = await financialWorkbookToCsv(
    absolutePath,
    row.original_filename || "report.csv"
  );

  const csvBytes = Buffer.byteLength(csv, "utf8");
  if (csvBytes > INLINE_CSV_MAX_BYTES) {
    throw Object.assign(new Error("csv_too_large_for_inline_ingest"), {
      status: 400,
      bytes: csvBytes,
    });
  }

  const creds = await loadCfoCredentials(cfoUserId);
  const orgId = creds?.orgId ?? undefined;
  const userIntent =
    `Load every row and column exactly as supplied from ProductSense financial report ${reportId}. ` +
    `Preserve identifiers, dates, amounts, and text fields without retyping or dropping columns.`;

  const ingestFilename = `productsense-report-${reportId}-${csvFilename}`;

  const ingestResult = await withCfoMcp(cfoUserId, async (client) => {
    const body = await callCfoTool(client, "edit_integrations", {
      ingest_csv: {
        filename: ingestFilename,
        csv_content: csv,
        user_intent: userIntent,
      },
      ...(orgId ? { org_id: orgId } : {}),
    });

    if (body?.needs_confirmation === true) {
      throw Object.assign(new Error("cfo_needs_confirmation"), {
        status: 409,
        detail: body,
      });
    }

    const connectionTarget = extractConnectionTarget(body);
    if (connectionTarget) {
      await pollIngestionReady(client, orgId ?? null, connectionTarget);
    }

    return body;
  });

  await markFinancialReportUploadedToCfo(reportId);

  return {
    reportId,
    uploadedToCFO: true,
    ingestResult,
  };
}
