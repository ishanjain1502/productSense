# Market Analysis Step 1 (Crustdata) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-driven Crustdata market analysis (strategies B and C) after regression, with project/feature persistence in full mode, regression Check/Skip/Go ahead gating, and stacked dual reports on the Market Analysis page.

**Architecture:** Extend Express with SQLite tables (`projects`, `features`, new `regression_reports`, `market_analysis_runs`), file-backed report storage under `data/reports/`, a `crustdata-client.js` REST wrapper, and `market-analysis/` modules for fixed (B) and planned (C) pipelines plus CommandCode synthesis. Next.js client gets extended session storage, regression page controls, and auto-run market analysis on mount.

**Tech Stack:** Node 18+ ESM, Express 5, sqlite3, Next.js client (existing), Crustdata REST API, CommandCode (existing `commandcode.js`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-12-market-analysis-step1-design.md`
- Demo: feature from `DEMO_APPLICATIONS` / session `productData`; no `projects`/`features` rows
- Full: JWT required for agent-prompt bootstrap, regression Check by `featureId`, market run
- Testing phase: run **both** B and C sequentially; UI stacks B then C
- Max **5** competitors (`MARKET_ANALYSIS_MAX_COMPETITORS`, default `5`)
- Job limits: 15 per competitor batch, 30 total (strategy B)
- Strategy C: ≤12 steps, ≤3 `company_enrich`, ≤2 `job_search`, ≤1 `web_search_live`
- `regression_report_submitted`: full = set on POST; demo = always `1` when row exists
- Demo Check: `GET /regression/reports/status?promptId=`
- Full Check: `GET /regression/reports/status?featureId=` + JWT
- `CRUSTDATA_API_KEY` server-only; never expose to client
- Keep `users.id` INTEGER; project/feature PKs are TEXT UUIDs

---

## File map

| File | Responsibility |
|------|----------------|
| `server/report-storage.js` | Write/read JSON under `data/reports/` |
| `server/projects.js` | Migrate + create project/feature from `productData` |
| `server/regression.js` | Schema migrate regression tables; save report to file |
| `server/regression-routes.js` | agent-prompt bootstrap, status, POST reports |
| `server/crustdata-client.js` | REST calls to Crustdata |
| `server/market-analysis/constants.js` | Caps, allowlists, enrich field lists |
| `server/market-analysis/parse-competitors.js` | Parse competitor string |
| `server/market-analysis/strategy-b.js` | Fixed pipeline + synthesis |
| `server/market-analysis/strategy-c.js` | Plan, execute, synthesize |
| `server/market-analysis/synthesis.js` | Shared CommandCode JSON synthesis |
| `server/market-analysis/run.js` | Orchestrate run + DB row |
| `server/market-analysis-routes.js` | HTTP routes |
| `server/test/*.test.js` | node:test unit tests |
| `client/lib/validation-session.ts` | Extended session type |
| `client/lib/regression-api.ts` | status check, extended prompt response |
| `client/lib/market-analysis-api.ts` | run + get run |
| `client/components/validation/agent-prompt-page.tsx` | Check, Skip, Go ahead |
| `client/components/validation/market-analysis-page.tsx` | Auto-run + render reports |
| `client/app/demo/market-analysis/page.tsx` | Route shell |
| `client/app/full/market-analysis/page.tsx` | Route shell |
| `server/.env.example` | `CRUSTDATA_API_KEY`, `CRUSTDATA_API_BASE`, `MARKET_ANALYSIS_MAX_COMPETITORS` |
| `server/.gitignore` | `data/reports/` |

---

### Task 1: Report storage + test harness

**Files:**
- Create: `server/report-storage.js`
- Create: `server/test/report-storage.test.js`
- Modify: `server/package.json` (add `"test": "node --test test/**/*.test.js"`)
- Modify: `server/.gitignore` (add `data/`)

**Interfaces:**
- Produces: `writeReportFile(relativePath, data)`, `readReportFile(relativePath)`, `ensureReportsRoot()`

- [ ] **Step 1: Write failing test**

Create `server/test/report-storage.test.js`:

```js
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
```

- [ ] **Step 2: Run test (expect FAIL)**

Run: `cd server && npm test`  
Expected: FAIL — cannot find module `report-storage.js`

- [ ] **Step 3: Implement `server/report-storage.js`**

```js
import fs from "node:fs/promises";
import path from "node:path";

function reportsRoot() {
  return process.env.REPORTS_ROOT || path.join(process.cwd(), "data/reports");
}

export async function ensureReportsRoot() {
  await fs.mkdir(reportsRoot(), { recursive: true });
}

export async function writeReportFile(relativePath, data) {
  await ensureReportsRoot();
  const full = path.join(reportsRoot(), relativePath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(data, null, 2), "utf8");
  return relativePath.replace(/\\/g, "/");
}

export async function readReportFile(relativePath) {
  const full = path.join(reportsRoot(), relativePath);
  const raw = await fs.readFile(full, "utf8");
  return JSON.parse(raw);
}
```

- [ ] **Step 4: Run test (expect PASS)**

Run: `cd server && npm test`

- [ ] **Step 5: Commit**

```bash
git add server/report-storage.js server/test/report-storage.test.js server/package.json server/.gitignore
git commit -m "feat(server): add file-backed report storage"
```

---

### Task 2: Database schema (projects, features, regression, market runs)

**Files:**
- Create: `server/projects.js`
- Modify: `server/regression.js` — replace `migrateRegressionSchema`, update exports
- Modify: `server/index.js` — call `migrateProjectsSchema`

**Interfaces:**
- Produces: `migrateProjectsSchema()`, `createProjectAndFeature(userId, productData)` → `{ projectId, featureId }`

- [ ] **Step 1: Write failing test for competitor parser (used by market later)**

Create `server/test/parse-competitors.test.js` (implement file in Task 6 early) — skip if doing strictly in order; otherwise add in Task 6.

- [ ] **Step 2: Implement `migrateProjectsSchema` in `server/projects.js`**

```js
import { randomUUID } from "node:crypto";
import { dbRun } from "./db-helpers.js";

export async function migrateProjectsSchema() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      application_name TEXT,
      application_description TEXT,
      team_size INTEGER,
      target_market TEXT,
      geography TEXT,
      primary_buyer TEXT,
      competitor_companies TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  await dbRun(`
    CREATE TABLE IF NOT EXISTS features (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      feature_name TEXT,
      feature_description TEXT,
      feature_document_name TEXT,
      personas_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
}

export async function createProjectAndFeature(userId, productData) {
  const projectId = randomUUID();
  const featureId = randomUUID();
  const teamSize =
    productData.teamSize === "" ? null : Number(productData.teamSize);
  await dbRun(
    `INSERT INTO projects (
      id, user_id, application_name, application_description, team_size,
      target_market, geography, primary_buyer, competitor_companies
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId,
      userId,
      productData.applicationName ?? null,
      productData.applicationDescription ?? null,
      teamSize,
      productData.targetMarket ?? null,
      productData.geography ?? null,
      productData.primaryBuyer ?? null,
      productData.competitorCompanies ?? null,
    ]
  );
  await dbRun(
    `INSERT INTO features (
      id, project_id, feature_name, feature_description,
      feature_document_name, personas_json
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      featureId,
      projectId,
      productData.featureName ?? null,
      productData.featureDescription ?? null,
      productData.featureDocumentName ?? null,
      JSON.stringify({
        personas: productData.personas,
        newInstallPersona: productData.newInstallPersona,
        personasDocumentName: productData.personasDocumentName,
      }),
    ]
  );
  return { projectId, featureId };
}

export async function assertFeatureOwnedByUser(featureId, userId) {
  const { dbGet } = await import("./db-helpers.js");
  const row = await dbGet(
    `SELECT f.id FROM features f
     JOIN projects p ON p.id = f.project_id
     WHERE f.id = ? AND p.user_id = ?`,
    [featureId, userId]
  );
  return Boolean(row);
}
```

- [ ] **Step 3: Replace regression migration in `server/regression.js`**

Drop legacy table in dev (document in commit): run once:

```sql
DROP TABLE IF EXISTS regression_reports;
```

New `regression_reports` + extend `regression_prompts`:

```js
await dbRun(`ALTER TABLE regression_prompts ADD COLUMN project_id TEXT`);
await dbRun(`ALTER TABLE regression_prompts ADD COLUMN feature_id TEXT`);
-- ignore errors if columns exist (wrap in try/catch per column)

await dbRun(`
  CREATE TABLE IF NOT EXISTS regression_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    project_id TEXT,
    feature_id TEXT,
    prompt_id INTEGER,
    demo_id TEXT,
    regression_report_submitted INTEGER NOT NULL DEFAULT 0,
    report_url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (prompt_id) REFERENCES regression_prompts(id)
  )
`);

await dbRun(`
  CREATE TABLE IF NOT EXISTS market_analysis_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    project_id TEXT,
    feature_id TEXT,
    demo_id TEXT,
    strategy_b_report_url TEXT,
    strategy_c_report_url TEXT,
    strategy_b_raw_url TEXT,
    strategy_c_raw_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error_b TEXT,
    error_c TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
```

Use a small helper `ignoreDuplicateColumn(err)` when adding columns to `regression_prompts`.

- [ ] **Step 4: Wire `migrateProjectsSchema` in `server/index.js`**

```js
import { migrateProjectsSchema } from "./projects.js";
// after migrateAuthSchema:
await migrateProjectsSchema();
```

- [ ] **Step 5: Manual verify**

Run: `cd server && npm run dev`  
Expected: server starts without SQL errors.

- [ ] **Step 6: Commit**

```bash
git add server/projects.js server/regression.js server/index.js
git commit -m "feat(server): add projects, features, market run schema"
```

---

### Task 3: Regression POST + status + file storage

**Files:**
- Modify: `server/regression.js` — `saveRegressionReport`, `findRegressionReportStatus`
- Modify: `server/regression-routes.js`

**Interfaces:**
- Produces: `saveRegressionReport(payload, { userId, promptId, demoId, projectId, featureId })`
- Produces: `getRegressionReportStatus({ promptId, featureId, userId })` → `{ found, reportId? }`

- [ ] **Step 1: Write failing test**

`server/test/regression-status.test.js` — use in-memory DB if too heavy, else integration via supertest later; minimal test:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCompetitors } from "../market-analysis/parse-competitors.js";

test("parseCompetitors splits commas", () => {
  assert.deepEqual(parseCompetitors("A, B ,C"), ["A", "B", "C"]);
});
```

(Create `parse-competitors.js` in same task before test.)

- [ ] **Step 2: Update `saveRegressionReport`**

- Require `promptId` in payload (number).
- Write full payload to `regression/{id}.json` via `writeReportFile`.
- Insert row with `regression_report_submitted = 1` always for demo (`demoId` set); full when `featureId` present.
- Resolve `project_id`/`feature_id` from prompt row if missing in body.

- [ ] **Step 3: Add `GET /regression/reports/status`**

```js
app.get("/regression/reports/status", async (req, res) => {
  const promptId = req.query.promptId ? Number(req.query.promptId) : null;
  const featureId = typeof req.query.featureId === "string" ? req.query.featureId : null;
  // demo: promptId required
  // full: featureId + authMiddleware logic inline
  const result = await getRegressionReportStatus({ ... });
  res.json(result);
});
```

Demo query: `SELECT id FROM regression_reports WHERE prompt_id = ? LIMIT 1`  
Full query: join projects for ownership + `feature_id = ? AND regression_report_submitted = 1`

- [ ] **Step 4: Commit**

```bash
git add server/regression.js server/regression-routes.js server/market-analysis/parse-competitors.js server/test/
git commit -m "feat(server): regression reports on disk with status endpoint"
```

---

### Task 4: Full-mode bootstrap on agent-prompt + promptId in response

**Files:**
- Modify: `server/regression-routes.js`
- Modify: `server/regression.js` — `saveRegressionPrompt` accepts projectId/featureId
- Modify: `server/demo-regression-prompts.js` + `regression.js` demo prompt meta — require `promptId` in POST JSON
- Modify: `client/lib/regression-api.ts`
- Modify: `client/lib/validation-session.ts`
- Modify: `client/components/validation/agent-prompt-page.tsx` — persist `promptId`, `projectId`, `featureId` to session

**Interfaces:**
- `AgentPromptResponse` adds `projectId?: string`, `featureId?: string`

- [ ] **Step 1: Full mode branch before prompt generation**

```js
const { projectId, featureId } = await createProjectAndFeature(user.id, productData);
const promptId = await saveRegressionPrompt({
  userId: user.id,
  mode: "full",
  demoId: null,
  applicationName: productData.applicationName,
  featureName: productData.featureName,
  prompt,
  projectId,
  featureId,
});
res.json({ prompt, promptId, mode: "full", generatedBy: "commandcode", projectId, featureId });
```

- [ ] **Step 2: Append to demo + full prompt templates** (in `demo-regression-prompts.js` POST section and `generateFullRegressionPrompt` user message):

```
Include in the JSON POST body: "promptId": <the numeric prompt id shown to the user>,
and when applicable "featureId": "<uuid>".
```

Pass `promptId` into demo template replace or add footer in `getDemoRegressionPrompt(demoId, backendUrl, promptId)`.

- [ ] **Step 3: Client saves IDs to session after fetch**

```ts
saveValidationSession({
  ...loaded,
  promptId: result.promptId,
  projectId: result.projectId ?? undefined,
  featureId: result.featureId ?? undefined,
});
```

- [ ] **Step 4: Manual test**

Demo flow → agent prompt shows `promptId` badge.

- [ ] **Step 5: Commit**

```bash
git add server/ client/lib/ client/components/validation/agent-prompt-page.tsx
git commit -m "feat: bootstrap project/feature and expose promptId for regression POST"
```

---

### Task 5: Crustdata HTTP client

**Files:**
- Create: `server/crustdata-client.js`
- Modify: `server/.env.example`

**Interfaces:**
- Produces: `crustdataPost(path, body)` → parsed JSON
- Env: `CRUSTDATA_API_BASE` default `https://api.crustdata.com`, `CRUSTDATA_API_KEY`

- [ ] **Step 1: Implement client**

```js
const BASE = process.env.CRUSTDATA_API_BASE || "https://api.crustdata.com";

export async function crustdataPost(path, body) {
  const key = process.env.CRUSTDATA_API_KEY;
  if (!key) {
    const err = new Error("CRUSTDATA_API_KEY is not set");
    err.status = 503;
    throw err;
  }
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${key}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data?.message || data?.error || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  const credits = res.headers.get("x-credits-used");
  if (credits) console.info(`[crustdata] ${path} credits=${credits}`);
  return data;
}

export function companyIdentify(names) {
  return crustdataPost("/company/identify", { names, fields: ["crustdata_company_id", "basic_info"] });
}

export function companyEnrichByIds(ids) {
  return crustdataPost("/company/enrich", {
    crustdata_company_ids: ids,
    exact_match: true,
    fields: ["crustdata_company_id", "basic_info", "headcount", "funding", "competitors"],
  });
}

export function jobSearch(filters, limit = 15) {
  return crustdataPost("/job/search", { filters, limit, fields: ["job_details", "company", "content"] });
}

export function companySearchNl(query, limit = 10) {
  return crustdataPost("/company/search", {
    search: { query, mode: "semantic" },
    limit,
    fields: ["basic_info", "headcount"],
  });
}

export function webSearchLive(query) {
  return crustdataPost("/web/search/live", { query, limit: 5 });
}
```

**Note:** If auth header format fails in manual test, switch to `Bearer` per Crustdata docs (`account_usage_event` redacted headers).

- [ ] **Step 2: Add env vars to `.env.example`**

```
CRUSTDATA_API_KEY=
CRUSTDATA_API_BASE=https://api.crustdata.com
MARKET_ANALYSIS_MAX_COMPETITORS=5
```

- [ ] **Step 3: Commit**

```bash
git add server/crustdata-client.js server/.env.example
git commit -m "feat(server): Crustdata REST client"
```

---

### Task 6: Strategy B (fixed pipeline)

**Files:**
- Create: `server/market-analysis/constants.js`
- Create: `server/market-analysis/strategy-b.js`
- Create: `server/market-analysis/synthesis.js`

**Interfaces:**
- `runStrategyB(productData)` → `{ raw, report }` or throws with partial raw

- [ ] **Step 1: `constants.js`**

```js
export const MAX_COMPETITORS = Number(process.env.MARKET_ANALYSIS_MAX_COMPETITORS) || 5;
export const JOB_LIMIT_TOTAL = 30;
export const JOB_LIMIT_PER_BATCH = 15;
export const REPORT_JSON_SCHEMA_HINT = `...`; // paste schema from spec
```

- [ ] **Step 2: `strategy-b.js` pipeline**

1. `parseCompetitors(productData.competitorCompanies).slice(0, MAX_COMPETITORS)`
2. Loop `companyIdentify([name])` — collect top match id per name
3. `companyEnrichByIds(ids)` in one call if possible
4. Build `job_search` filters: `in_` on `company.basic_info.company_id` + title `any_of` feature tokens
5. If identified competitors < 3: `companySearchNl` from feature + targetMarket
6. Return raw bundle

- [ ] **Step 3: `synthesis.js`**

```js
import { commandCodeChat } from "../commandcode.js";

const SYSTEM = `You are a PM market analyst. Output ONLY valid JSON matching the schema. Ground claims in provided data only.`;

export async function synthesizeMarketReport({ strategy, productData, rawBundle, planSummary = null }) {
  const userContent = JSON.stringify({ productData, rawBundle, planSummary });
  const text = await commandCodeChat([
    { role: "system", content: SYSTEM },
    { role: "user", content: userContent },
  ]);
  // strip markdown fences if present
  const json = JSON.parse(extractJson(text));
  json.strategy = strategy;
  json.generatedAt = new Date().toISOString();
  return json;
}
```

- [ ] **Step 4: Wire `runStrategyB` to call synthesize with `strategy: "fixed_b"`

- [ ] **Step 5: Commit**

```bash
git add server/market-analysis/
git commit -m "feat(server): market analysis strategy B"
```

---

### Task 7: Strategy C (planned pipeline)

**Files:**
- Create: `server/market-analysis/strategy-c.js`
- Create: `server/market-analysis/plan-executor.js`

**Interfaces:**
- `runStrategyC(productData)` → `{ raw, report, planSummary }`

- [ ] **Step 1: Plan prompt** — CommandCode returns JSON `{ steps: [{ tool, params }] }` with allowlist enforcement in executor.

- [ ] **Step 2: `plan-executor.js`**

```js
const ALLOWED = new Set([
  "company_identify",
  "company_enrich",
  "company_search",
  "job_search",
  "web_search_live",
]);

export async function executePlan(steps) {
  const results = [];
  let enrichCount = 0;
  let jobCount = 0;
  let webCount = 0;
  for (const step of steps) {
    if (!ALLOWED.has(step.tool)) throw new Error(`disallowed_tool:${step.tool}`);
    // increment caps; map tool name → crustdataPost path
    results.push({ step, result: await runTool(step.tool, step.params) });
  }
  return { results, errors: [] };
}
```

Map tools to `crustdata-client.js` functions; `company_search` accepts filters or NL from params.

- [ ] **Step 3: Synthesize with `planSummary` string describing chosen steps**

- [ ] **Step 4: Commit**

```bash
git add server/market-analysis/strategy-c.js server/market-analysis/plan-executor.js
git commit -m "feat(server): market analysis strategy C"
```

---

### Task 8: Run orchestration + routes

**Files:**
- Create: `server/market-analysis/run.js`
- Create: `server/market-analysis-routes.js`
- Modify: `server/index.js`

**Interfaces:**
- `POST /market-analysis/run` body: `{ mode, demoId, productData, projectId?, featureId? }`
- `GET /market-analysis/runs/:id`

- [ ] **Step 1: `run.js`**

```js
export async function runMarketAnalysis(ctx) {
  const runId = await insertPendingRun(ctx);
  let errorB = null;
  let errorC = null;
  let rawB, reportB, rawC, reportC;
  try {
    ({ raw: rawB, report: reportB } = await runStrategyB(ctx.productData));
    await writeReportFile(`market/${runId}/strategy-b-raw.json`, rawB);
    await writeReportFile(`market/${runId}/strategy-b.json`, reportB);
  } catch (e) {
    errorB = e.message;
  }
  try {
    ({ raw: rawC, report: reportC } = await runStrategyC(ctx.productData));
    await writeReportFile(`market/${runId}/strategy-c-raw.json`, rawC);
    await writeReportFile(`market/${runId}/strategy-c.json`, reportC);
  } catch (e) {
    errorC = e.message;
  }
  const status =
    reportB && reportC ? "completed" : reportB || reportC ? "partial" : "failed";
  await updateRun(runId, { status, errorB, errorC, urls... });
  return { runId, strategyB: reportB, strategyC: reportC, errorB, errorC };
}
```

- [ ] **Step 2: Auth in routes** — full: verify JWT + `assertFeatureOwnedByUser(featureId, user.id)`

- [ ] **Step 3: Register routes + migrate on startup**

- [ ] **Step 4: Manual API test**

```bash
curl -X POST http://localhost:1337/market-analysis/run \
  -H "Content-Type: application/json" \
  -d '{"mode":"demo","demoId":"ledgerlite","productData":{...}}'
```

- [ ] **Step 5: Commit**

```bash
git add server/market-analysis/run.js server/market-analysis-routes.js server/index.js
git commit -m "feat(server): market analysis run endpoint"
```

---

### Task 9: Regression page UI (Check, Skip, Go ahead)

**Files:**
- Modify: `client/components/validation/agent-prompt-page.tsx`
- Modify: `client/lib/regression-api.ts`

- [ ] **Step 1: Add `checkRegressionReport`**

```ts
export async function checkRegressionReport(input: {
  mode: "demo" | "full";
  promptId?: number;
  featureId?: string;
}): Promise<{ found: boolean; reportId?: number }> {
  const qs =
    input.mode === "demo"
      ? `promptId=${input.promptId}`
      : `featureId=${encodeURIComponent(input.featureId!)}`;
  const headers: Record<string, string> = {};
  if (input.mode === "full") {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}/regression/reports/status?${qs}`, { headers });
  ...
}
```

- [ ] **Step 2: UI controls below prompt card**

- Show `promptId` in Badge
- Button **Check for report** → sets `regressionCheckPassed` on success
- **Go ahead to market analysis** → `router.push(\`/${mode}/market-analysis\`)` disabled until check passed
- **Skip regression** → `saveValidationSession({ ...session, regressionSkipped: true })` then navigate (enabled always)

- [ ] **Step 3: Update step label** — `Demo mode · Step 2 · Regression` (optional copy tweak)

- [ ] **Step 4: Commit**

```bash
git add client/components/validation/agent-prompt-page.tsx client/lib/regression-api.ts
git commit -m "feat(client): regression check, skip, and go ahead"
```

---

### Task 10: Market Analysis page (auto-run, stacked reports)

**Files:**
- Create: `client/lib/market-analysis-api.ts`
- Create: `client/components/validation/market-analysis-page.tsx`
- Create: `client/app/demo/market-analysis/page.tsx`
- Create: `client/app/full/market-analysis/page.tsx`
- Create: `client/components/validation/market-report-section.tsx` (render schema sections)

- [ ] **Step 1: `market-analysis-api.ts`**

```ts
export async function runMarketAnalysis(body: {
  mode: "demo" | "full";
  demoId: string | null;
  productData: ProductValidationData;
  projectId?: string;
  featureId?: string;
}) { ... }
```

- [ ] **Step 2: `MarketAnalysisPage`**

- `useEffect` on mount: load session, call `runMarketAnalysis` once (guard with ref to avoid double-run in Strict Mode)
- Loading states: "Running fixed analysis (B)…" / "Running planned analysis (C)…" from response timing or single spinner with copy
- Render `MarketReportSection` for B then C with titles **Strategy B — fixed queries** / **Strategy C — LLM-planned queries**
- Show `errorB` / `errorC` alerts without hiding sibling report

- [ ] **Step 3: Route pages**

```tsx
export default function DemoMarketAnalysisPage() {
  return <MarketAnalysisPage mode="demo" />;
}
```

- [ ] **Step 4: Shell label** — `Demo mode · Step 3 · Market analysis`

- [ ] **Step 5: Manual E2E** per spec testing plan

- [ ] **Step 6: Commit**

```bash
git add client/
git commit -m "feat(client): market analysis page with dual reports"
```

---

### Task 11: Documentation + discussion guide

**Files:**
- Modify: `discussionDocs/guide.md` — note step 2a implemented

- [ ] **Step 1: Add short pointer to spec and env vars**

- [ ] **Step 2: Commit**

```bash
git add discussionDocs/guide.md
git commit -m "docs: market analysis step 1 pointer"
```

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Server-driven Crustdata | 5, 6, 7, 8 |
| B + C sequential | 8 |
| Stacked UI | 10 |
| Regression Check / Go ahead / Skip | 3, 4, 9 |
| Demo promptId Check | 3, 9 |
| Full featureId Check + auth | 3, 4, 8 |
| Project/feature on regression entry | 2, 4 |
| report_url file storage | 1, 3 |
| Agent POST promptId | 4 |
| Auto-run on market page | 10 |
| Env CRUSTDATA_API_KEY | 5 |
| MAX_COMPETITORS 5 | 6 |

**Gaps intentionally deferred:** cloud `reportUrl`, pinning single strategy, step 2b persona fleet.

## Manual test checklist (post-implementation)

- [ ] Demo LedgerLite → prompt → POST regression with `promptId` via curl → Check → Go ahead → two reports
- [ ] Demo Skip without POST → market page still runs; `regressionSkipped` in sessionStorage
- [ ] Full login → form → prompt returns `featureId` → POST → Check → market run with JWT
- [ ] Missing `CRUSTDATA_API_KEY` → 503 with clear error on market run
- [ ] Compare B vs C output quality for same demo product
