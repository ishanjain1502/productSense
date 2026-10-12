import { callCfoTool, getCfoConnectionStatus } from "../cfo/client.js";
import { withCfoMcp } from "../cfo/with-client.js";
import { getFinancialReportRow } from "../cfo/publish-financial-report.js";

/**
 * Pull workspace context from cfo.ai MCP (Ari) for financial analysis.
 *
 * @param {number | null} userId
 * @param {number | null | undefined} financialReportId
 */
export async function fetchCfoInputForAnalysis(userId, financialReportId) {
  if (!userId) {
    return {
      status: "not_connected",
      message: "No user context for cfo.ai (demo user may not be seeded).",
      payload: null,
    };
  }

  const conn = await getCfoConnectionStatus(userId);
  if (conn.status !== "connected") {
    return {
      status: "not_connected",
      message: "cfo.ai is not connected for this account.",
      payload: null,
    };
  }

  try {
    const payload = await withCfoMcp(userId, async (client) => {
      const orgs = await callCfoTool(client, "list_orgs", {});
      const orgId =
        conn.orgId ??
        (Array.isArray(orgs?.orgs) && orgs.orgs[0]?.org_id
          ? String(orgs.orgs[0].org_id)
          : null);

      const orgScope = orgId ? { org_id: orgId } : {};

      const scenarios = await callCfoTool(client, "inspect_scenarios", {
        list: true,
        ...orgScope,
      });

      const memory = await callCfoTool(client, "inspect_memory", {
        ...orgScope,
      });

      const pages = await callCfoTool(client, "inspect_pages", {
        list: true,
        ...orgScope,
      });

      let uploadedReport = null;
      if (financialReportId != null && Number.isFinite(Number(financialReportId))) {
        const row = await getFinancialReportRow(Number(financialReportId));
        if (row?.uploaded_to_cfo) {
          uploadedReport = {
            reportId: row.report_id,
            originalFilename: row.original_filename,
            integrations: await callCfoTool(client, "inspect_integrations", {
              list: true,
              ...orgScope,
            }),
          };
        } else if (row) {
          uploadedReport = {
            reportId: row.report_id,
            originalFilename: row.original_filename,
            uploadedToCfo: false,
          };
        }
      }

      return {
        orgs,
        scenarios,
        memory,
        pages,
        uploadedReport,
        fetchedAt: new Date().toISOString(),
      };
    });

    return { status: "connected", message: null, payload };
  } catch (err) {
    console.error("cfo financial analysis input failed:", err);
    return {
      status: "error",
      message: err?.message ?? "Could not read cfo.ai workspace",
      payload: null,
    };
  }
}
