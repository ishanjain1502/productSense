import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  writeReportFile,
  readReportFile,
} from "../report-storage.js";

const TMP = path.join(process.cwd(), "data/reports/test-task1");

test("writeReportFile then readReportFile round-trips JSON", async () => {
  process.env.REPORTS_ROOT = TMP;
  await fs.rm(TMP, { recursive: true, force: true });
  const rel = "regression/99.json";
  const payload = { ok: true, n: 1 };
  const url = await writeReportFile(rel, payload);
  assert.match(url, /regression\/99\.json$/);
  const back = await readReportFile(rel);
  assert.deepEqual(back, payload);
});
