# Market Analysis — Step 1 (Crustdata) — Design Spec

**Status:** Approved in conversation (§1–§3)  
**Date:** 2026-10-12  
**Scope:** Server-driven Crustdata market analysis with dual strategies (B + C) for testing; regression gating; full-mode project/feature persistence.

---

## Summary

ProductSense adds **Market Analysis · Step 1** after the regression agent-prompt step. The **backend** calls the **Crustdata HTTP API** and **CommandCode** to produce competitive / market-signal reports focused on the **feature under validation**. For the **testing phase**, each run executes **both**:

| Strategy | Name | Behavior |
|----------|------|----------|
| **B** | Fixed queries | Deterministic Crustdata pulls → LLM synthesis |
| **C** | LLM-planned | CommandCode plans allowlisted Crustdata calls → execute → synthesize |

The UI shows **two full reports stacked vertically** (B then C). Later, one strategy will be pinned and the dual-run UX removed.

**Demo mode:** feature and context come from the selected demo product (`ProductValidationData`).  
**Full mode:** feature and context come from the user’s form; **project** and **feature** rows are created when entering regression.

---

## User flow & UI (§1)

### Step labels

| Step | Demo | Full |
|------|------|------|
| 1 | Sample product + form review | Multi-step form |
| 2 | Agent regression prompt | Agent regression prompt (+ DB bootstrap) |
| 3 | Market Analysis · Step 1 | Market Analysis · Step 1 |

Routes (proposed):

- `/demo/agent-prompt`, `/full/agent-prompt` — Step 2
- `/demo/market-analysis`, `/full/market-analysis` — Step 3

### Regression page (Step 2)

- Existing copyable agent prompt behavior remains.
- Display **`promptId`** returned from `POST /regression/agent-prompt`.
- **Check for report** — user clicks; server confirms a saved regression report:
  - **Demo:** match by **`promptId`** (`regression_reports.prompt_id`). `regression_report_submitted` is always `1` on demo rows; gating is “report exists for this prompt.”
  - **Full:** match by **`featureId`** + auth; `regression_report_submitted = 1` (set on POST).
- **Go ahead** — navigates to Market Analysis; **disabled** until Check succeeds.
- **Skip** — sets `regressionSkipped: true` in session storage; navigates to Market Analysis without a report (session flag for future “regression incomplete” UX).

### Market Analysis page (Step 3, testing)

- On mount: validate session; redirect if missing.
- **Auto-start** Step 1 processing (no separate Run button): `POST /market-analysis/run`.
- Loading UI with substeps for B and C.
- Render **Strategy B** block, then **Strategy C** block below (sections per report JSON schema).
- Per-strategy errors do not hide the other strategy’s block when partial success.

### Auth

- **Full:** JWT required for bootstrap (project/feature), regression Check by feature, market analysis run.
- **Demo:** anonymous; correlate via `promptId`, `demoId`, session `productData`.

---

## Data model & APIs (§2)

### Users

- Keep `users.id` as **INTEGER** (no UUID migration in this phase).

### `projects`

| Column | Type | Notes |
|--------|------|--------|
| `id` | TEXT PK (UUID) | |
| `user_id` | INTEGER NOT NULL | FK → `users(id)` |
| `application_name` | TEXT | |
| `application_description` | TEXT | |
| `team_size` | INTEGER NULL | |
| `target_market` | TEXT | |
| `geography` | TEXT | |
| `primary_buyer` | TEXT | |
| `competitor_companies` | TEXT | Comma-separated as entered |
| `created_at` | TEXT | |

### `features`

| Column | Type | Notes |
|--------|------|--------|
| `id` | TEXT PK (UUID) | |
| `project_id` | TEXT NOT NULL | FK → `projects(id)` |
| `feature_name` | TEXT | |
| `feature_description` | TEXT | |
| `feature_document_name` | TEXT NULL | Metadata only |
| `personas_json` | TEXT NULL | Serialized personas + new-install persona for step 2b later |
| `created_at` | TEXT | |

**Full mode:** create one project + one feature when the user first enters regression (fold into extended `POST /regression/agent-prompt` unless a separate bootstrap route is preferred at implementation time).

**Demo mode:** no `projects` / `features` rows.

### `regression_prompts`

- Unchanged role; `id` is the UI **`promptId`**.
- Optional: add `project_id`, `feature_id` on insert for full mode.

### `regression_reports` (replaced shape)

| Column | Type | Notes |
|--------|------|--------|
| `id` | INTEGER PK AUTOINCREMENT | |
| `user_id` | INTEGER NULL | From JWT on POST when present |
| `project_id` | TEXT UUID NULL | Full only |
| `feature_id` | TEXT UUID NULL | Full only |
| `prompt_id` | INTEGER NULL | FK → `regression_prompts(id)` |
| `demo_id` | TEXT NULL | Demo only |
| `regression_report_submitted` | INTEGER | Full: `1` on successful POST. Demo: always `1` when row exists |
| `report_url` | TEXT NOT NULL | v1: file under `data/reports/regression/{id}.json` |
| `created_at` | TEXT | |

- Agent JSON stored at `report_url`, not inline `payload`.
- **Migration:** dev may recreate table or one-time migrate legacy `payload` rows to files; implementation plan chooses approach.

### `market_analysis_runs`

| Column | Type | Notes |
|--------|------|--------|
| `id` | INTEGER PK | |
| `user_id` | INTEGER NULL | |
| `project_id` | TEXT NULL | Full |
| `feature_id` | TEXT NULL | Full |
| `demo_id` | TEXT NULL | Demo |
| `strategy_b_report_url` | TEXT NULL | Synthesis JSON |
| `strategy_c_report_url` | TEXT NULL | Synthesis JSON |
| `strategy_b_raw_url` | TEXT NULL | Crustdata bundle |
| `strategy_c_raw_url` | TEXT NULL | Crustdata bundle |
| `status` | TEXT | `pending` \| `partial` \| `completed` \| `failed` |
| `error_b` | TEXT NULL | |
| `error_c` | TEXT NULL | |
| `created_at` | TEXT | |

Files: `data/reports/market/{runId}/strategy-b.json`, `strategy-b-raw.json`, etc.

### Session storage extension

```ts
type ValidationSession = {
  mode: "demo" | "full";
  demoId: string | null;
  data: ProductValidationData;
  promptId?: number;
  projectId?: string;
  featureId?: string;
  regressionSkipped?: boolean;
  regressionCheckPassed?: boolean;
};
```

### API surface

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/regression/agent-prompt` | Full: required; Demo: open | Extended: create project+feature (full), return `promptId`, `projectId`, `featureId` |
| `POST` | `/regression/reports` | Optional JWT | Save report file; set `prompt_id`, flags, FKs; require `promptId` in body |
| `GET` | `/regression/reports/status` | Demo: `?promptId=`; Full: `?featureId=` + JWT | `{ found, reportId? }` for Check button |
| `POST` | `/market-analysis/run` | Full: JWT; Demo: open | Run B then C; return `{ runId, strategyB, strategyC, errors? }` |
| `GET` | `/market-analysis/runs/:id` | Same as run | Reload persisted run |

### Environment

- `CRUSTDATA_API_KEY` — server only
- Existing: `COMMANDCODE_API_KEY`, `COMMANDCODE_MODEL`, `PUBLIC_API_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`

---

## Crustdata pipelines (§3)

### Shared inputs

From `productData`: `featureName`, `featureDescription`, `targetMarket`, `geography`, `competitorCompanies`, `applicationName`, `applicationDescription`.

- Parse competitors: comma-split, trim, dedupe.
- **Cap:** max 5 competitors (`MARKET_ANALYSIS_MAX_COMPETITORS`, default 5).
- If no competitors: B uses one `company_search` NL query; C may plan discovery (noted in `dataLimitations`).

### Server module

- `crustdata-client.js` — REST client aligned with Crustdata tool semantics.
- MCP used during development for query tuning; production path is API-only on server.

### Strategy B — fixed pipeline

1. **Identify** each competitor (≤5): `company_identify` → `crustdata_company_id`.
2. **Enrich:** `company_enrich` by id with a **fixed, plan-safe `fields` list** (no gated fields).
3. **Jobs:** `job_search` — competitor ids + feature title/description tokens; `[.]` for exact tokens; max 15 postings per competitor batch, 30 total.
4. **Landscape (if &lt;3 competitors resolved):** one `company_search` NL, limit 10.
5. Save raw bundle → `strategy_b_raw_url`.
6. **Synthesize** via CommandCode → strict JSON schema → `strategy_b_report_url`.

Partial raw data is allowed; synthesis fills `dataLimitations`.

### Strategy C — planned pipeline

1. **Plan:** CommandCode outputs JSON `{ steps: [{ tool, params }, ...] }` with allowlist: `company_identify`, `company_enrich`, `company_search`, `job_search`, `web_search_live`. Limits: ≤12 steps, ≤3 enrich, ≤2 job_search, ≤1 web_search_live.
2. **Execute:** sequential, validated; record errors per step.
3. Save raw → `strategy_c_raw_url`.
4. **Synthesize** with `planSummary` → `strategy_c_report_url`.

Invalid plan → `error_c`, no C synthesis; B may still complete.

### Report JSON schema (both strategies)

```json
{
  "strategy": "fixed_b",
  "generatedAt": "ISO-8601",
  "feature": { "name": "", "description": "" },
  "executiveSummary": "",
  "competitorLandscape": [
    { "name": "", "positioning": "", "relevantMoves": [], "sources": [] }
  ],
  "marketSignals": [
    { "signal": "", "evidence": "", "implicationForFeature": "", "source": "" }
  ],
  "gapsAndOpportunities": [],
  "risks": [],
  "dataLimitations": [],
  "planSummary": null
}
```

- `strategy`: `"fixed_b"` | `"planned_c"`.
- `planSummary`: string, C only.

### Orchestration

1. Insert `market_analysis_runs` (`pending`).
2. Run B end-to-end.
3. Run C end-to-end.
4. Set `status`: `completed` | `partial` | `failed`.
5. Return both JSON bodies to client.

**Timeout:** ~120s server (testing).  
**Credits:** log per-request usage server-side; optional metadata on run for manual comparison.

**Authorization:** full-mode runs verify `featureId` belongs to authenticated user’s project.

### Regression agent POST body

Prompts must instruct the agent to include:

```json
{
  "promptId": 0,
  "featureId": "uuid-or-null",
  "applicationName": "",
  "featureName": "",
  "...": "existing regression schema fields"
}
```

---

## Out of scope (this spec)

- Market Analysis step 2b (persona agent fleet).
- Pinning a single strategy (B or C) and removing dual-run UI.
- Cloud storage for `report_url` (local files only in v1).
- User-facing credit billing UI.

---

## Testing plan (manual)

1. **Demo:** select LedgerLite → agent prompt → POST report with `promptId` → Check → Go ahead → verify B and C sections load.
2. **Demo Skip:** Skip without report → market page still runs; `regressionSkipped` set.
3. **Full:** login → form → regression → POST with `featureId` → Check → market run persisted with `feature_id`.
4. Compare B vs C quality and credit usage; choose pinned strategy later.

---

## Decisions log

| Topic | Decision |
|-------|----------|
| Execution | Server-driven Crustdata API (A) |
| Synthesis | B + C both, manual test (pin later) |
| Dual UI | Both reports, stacked vertically |
| Regression gate | Check button; Go ahead after success; Skip with session flag |
| Demo Check | `promptId` incremental id |
| Demo submitted flag | Always true on row; gate = report exists |
| Full submitted flag | Set on POST (1A) |
| Project/feature | Full only on regression entry (A) |
| Orchestration | Sequential B then C (approach 1) |
