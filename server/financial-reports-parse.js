import { readFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";

/**
 * @param {string} absolutePath
 * @param {string} originalFilename
 */
export async function financialWorkbookToCsv(absolutePath, originalFilename) {
  const ext = path.extname(originalFilename).toLowerCase();
  if (ext === ".csv") {
    const csv = await readFile(absolutePath, "utf8");
    if (!csv.trim()) {
      throw Object.assign(new Error("empty_workbook"), { status: 400 });
    }
    return { csv, csvFilename: path.basename(originalFilename, ext) + ".csv" };
  }

  if (ext === ".xlsx" || ext === ".xls") {
    const buffer = await readFile(absolutePath);
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw Object.assign(new Error("empty_workbook"), { status: 400 });
    }
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ",", RS: "\n" });
    if (!csv.trim()) {
      throw Object.assign(new Error("empty_workbook"), { status: 400 });
    }
    const base = path.basename(originalFilename, ext);
    return { csv, csvFilename: `${base}.csv` };
  }

  throw Object.assign(new Error("invalid_file_type"), { status: 400 });
}
