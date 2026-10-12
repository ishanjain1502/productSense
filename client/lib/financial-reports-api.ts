import { API_BASE, getStoredToken } from "@/lib/auth";

export type FinancialReportUploadResponse = {
  reportId: number;
  location: string;
  originalFilename: string;
  projectId: string | null;
  featureId: string | null;
  uploadedToCFO: boolean;
};

export async function uploadFinancialReport(input: {
  mode: "demo" | "full";
  demoId: string | null;
  file: File;
}): Promise<FinancialReportUploadResponse> {
  const form = new FormData();
  form.append("file", input.file);
  form.append("mode", input.mode);
  if (input.mode === "demo" && input.demoId) {
    form.append("demoId", input.demoId);
  }

  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (input.mode === "full") {
    if (!token) {
      throw new Error("Sign in to upload a financial report.");
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/financial-reports/upload`, {
    method: "POST",
    headers,
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = typeof data.error === "string" ? data.error : "upload_failed";
    switch (code) {
      case "invalid_file_type":
        throw new Error("Use a CSV or Excel workbook (.csv, .xlsx, .xls).");
      case "file_too_large":
        throw new Error("File is too large (max 25 MB).");
      case "demo_user_not_seeded":
        throw new Error("Demo data is not seeded on the server. Run npm run seed:demo.");
      case "unauthorized":
        throw new Error("Sign in to upload a financial report.");
      default:
        throw new Error("Could not upload financial report.");
    }
  }

  return data as FinancialReportUploadResponse;
}

export async function deleteFinancialReport(reportId: number): Promise<void> {
  const token = getStoredToken();
  if (!token) {
    throw new Error("Sign in to remove the report.");
  }
  const res = await fetch(`${API_BASE}/financial-reports/${reportId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("Could not remove financial report.");
  }
}
