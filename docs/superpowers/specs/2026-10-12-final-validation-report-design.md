# Final validation report (one-pager) — Design Spec

**Status:** Approved (locked 2026-10-12)  
**Date:** 2026-10-12  
**Scope:** Step 4 after financial analysis — user clicks **Generate report** to compose regression, Crustdata (Strategy C), persona fleet, and financial findings into one on-screen one-pager with a dual headline verdict; persist on server and in `localStorage`.

**Prerequisites:** Validation session (`sessionStorage`), regression report (optional / skipped), market analysis run, persona fleet run, financial analysis (client cache).

---

## Locked decisions (from product review)

| Topic | Decision |
|--------|----------|
| Input assembly | **Client-hydrate:** server loads **regression** and **market (Strategy C)** from DB/files using session IDs; client **POSTs** `fleetJudgment` and `financialAnalysis` from `localStorage` (server does not re-compose fleet/financial if client omits them). |
| Market section | **Strategy C only** (LLM-planned Crustdata queries). Strategy B is not included in the final report narrative. |
| Persistence | **Server JSON file + DB row**, plus **client `localStorage` cache** (TTL aligned with other steps: **4 hours**). |
| UX | **Generate report** button at bottom of financial analysis when complete → navigates to **`/demo\|full/final-report?generate=1`**; report renders on that page. |
| Demo read | **`GET /final-report/:reportId`** returns stored JSON for demo (optional `demoId` query); demo users reload from server via `session.finalReportId`. |
| Regenerate | **New DB row every generate**; `report_id` INTEGER AUTOINCREMENT; rows include **`user_id`**, **`project_id`**, **`feature_id`**. |
| Headline verdict | **Dual:** (1) fleet-aligned **recommendation** (`proceed` \| `iterate` \| `reconsider`) and (2) separate **executive ship verdict** (`ship` \| `ship_with_conditions` \| `iterate` \| `do_not_ship`). |
| Regression skipped | Section `status: skipped` with explicit copy; not treated as `missing`. Final report may still generate; `dataLimitations` must mention skipped regression. |

---

## Summary

After financial analysis, the user sees **Generate report** at the bottom of the financial analysis page (and/or a dedicated `/demo|full/final-report` route — see UI). One server workflow:

1. **Gather** — Load regression JSON by `promptId` / `featureId`; load market run by `marketAnalysisRunId` and **Strategy C** report file only; accept client-supplied `fleetJudgment` and `financialAnalysis`; read `regressionSkipped` from session body.
2. **Normalize** — Build a single **evidence bundle** (trimmed JSON per section, size caps).
3. **Synthesize** — One **CommandCode** call outputs strict JSON per `FINAL_REPORT_SCHEMA_HINT` in `server/final-report/constants.js` (extended for dual verdict fields — see schema below).
4. **Persist** — Write `data/reports/final-report/{reportId}.json`, insert `final_validation_reports` row, return payload + `reportId`.
5. **Display** — One-pager UI; cache in `localStorage` keyed by validation scope + optional `reportId`.

No assumptions beyond what is stored today; gaps surface as `missing` / `skipped` section status and `dataLimitations`.

---

## User flow

| Step | Behavior |
|------|----------|
| Entry | From financial analysis: **Generate report →** navigates to final report page **or** triggers inline generation (implementation: dedicated page recommended for long-running CommandCode). |
| Preconditions | Valid `sessionStorage` session for `mode`; `marketAnalysisRunId` and `personaFleetRunId` expected for a “complete” run but not hard-blocked unless we add soft warnings later. |
| Client payload | POST includes: `mode`, `demoId`, `productData` (or minimal feature ids), `promptId`, `featureId`, `projectId`, `marketAnalysisRunId`, `personaFleetRunId`, `regressionSkipped`, `fleetJudgment?`, `financialAnalysis?`. |
| Generate | Button shows loading; on success render one-pager; save cache. |
| Revisit | Within TTL, load from `localStorage`; optional **Regenerate** clears cache and creates a new server row. |
| Auth | Demo: no JWT; correlate via `demoId` + `promptId` / run ids. Full: JWT + `featureId` ownership on server-loaded artifacts. |

---

## Section inputs (source of truth)

### 1. Code regression

| Field | Source |
|--------|--------|
| Availability | `regressionSkipped === true` → `status: skipped`. Else server `loadRegressionReportByPromptId(promptId)` or by `featureId` + user. |
| Content | Existing regression JSON (`summary`, `blastRadius`, `impactedComponents`, `apiAndDataImpact`, `regressionTests`, `rolloutRisks`, `recommendedMitigations`, `entireInsights`). |
| Missing | No report and not skipped → `status: missing`. |

**Note:** There is **no** public GET regression report API today; composition **must** use server helpers (`loadRegressionReportByPromptId`, extend with `loadRegressionReportByFeatureId` if needed).

### 2. Crustdata / market (Strategy C only)

| Field | Source |
|--------|--------|
| Run | `marketAnalysisRunId` from session → `getMarketAnalysisRun` + `readReportFile(strategy_c_report_url)`. |
| Errors | If `error_c` set or file missing → section `missing` or `available` with limitation string (no Strategy B fallback per decision). |
| Content | `MarketReport` shape from `client/lib/market-analysis-api.ts` (executiveSummary, competitorLandscape, marketSignals, gapsAndOpportunities, risks, dataLimitations). |

### 3. Persona fleet

| Field | Source |
|--------|--------|
| Primary | Client POST `fleetJudgment` from `localStorage` (`ps:fleet-judgment:...`). |
| Fallback | If omitted, server may `loadFleetJudgmentFromCache(personaFleetRunId)` from `data/reports/persona-fleet/{id}/judgment.json` if present. |
| Missing | No judgment → `status: missing`. |

### 4. Financial

| Field | Source |
|--------|--------|
| Primary | Client POST `financialAnalysis` from `localStorage` (`ps:financial-analysis:...`). |
| Missing | No payload → `status: missing` (do not re-run financial analysis automatically on this step). |

---

## Output schema (extends `FINAL_REPORT_SCHEMA_HINT`)

Add top-level dual verdict (CommandCode must output both):

```json
{
  "fleetRecommendation": "proceed" | "iterate" | "reconsider",
  "finalVerdict": "ship" | "ship_with_conditions" | "iterate" | "do_not_ship",
  "verdictRationale": "string — how fleet recommendation and ship verdict relate"
}
```

Rules for synthesis:

- **fleetRecommendation** should align with persona fleet judgment when `sections.personaFleet.status === available` (may restate, not contradict without explanation in `verdictRationale`).
- **finalVerdict** weighs all four sections; skipped regression must not auto-`ship` without `ship_with_conditions` or explicit limitations.
- **sections.market** summarizes Strategy C only; do not reference Strategy B.

Existing `sections.*.status` values: `available` \| `skipped` (regression only) \| `missing`.

---

## API

### `POST /final-report/generate`

**Request body (illustrative):**

```json
{
  "mode": "demo" | "full",
  "demoId": "ledgerlite",
  "promptId": 12,
  "projectId": "uuid",
  "featureId": "uuid",
  "marketAnalysisRunId": 18,
  "personaFleetRunId": 3,
  "regressionSkipped": false,
  "productData": { /* ProductValidationData — used for feature header */ },
  "fleetJudgment": { /* optional FleetJudgment */ },
  "financialAnalysis": { /* optional FinancialAnalysis */ }
}
```

**Response:**

```json
{
  "reportId": 1,
  "report": { /* FinalValidationReport JSON */ },
  "generatedAt": "ISO-8601"
}
```

### `GET /final-report/:reportId`

Return stored JSON for full mode (auth + ownership). Demo may allow read by `reportId` + `demoId` query if tied in DB.

---

## Database

New table `final_validation_reports` (names may match migration style in `regression.js`):

| Column | Purpose |
|--------|---------|
| `id` | PK |
| `user_id` | nullable for demo |
| `mode` | demo \| full |
| `demo_id` | nullable |
| `project_id`, `feature_id` | nullable FKs |
| `prompt_id`, `market_analysis_run_id`, `persona_fleet_run_id` | correlation |
| `report_url` | path under `data/reports/final-report/` |
| `created_at` | timestamp |

---

## Client

| Artifact | Responsibility |
|----------|----------------|
| `final-report-types.ts` | Mirror server report type + dual verdict |
| `final-report-cache.ts` | 4h TTL, key `ps:final-report:{mode}:{scopeId}` |
| `final-report-api.ts` | `generateFinalReport`, optional `fetchFinalReport` |
| `final-report-page.tsx` | One-pager layout: executive block, four sections, limitations |
| `financial-analysis-page.tsx` | **Generate report** footer → navigate to final report route with generate on mount or pass `?generate=1` |

**sessionStorage:** Optionally store `finalReportId` on session after first generate (for GET refresh).

---

## Synthesis pipeline (server)

| Module | Role |
|--------|------|
| `final-report/gather.js` | Load all section evidence; build capped bundle |
| `final-report/synthesize.js` | CommandCode → JSON; validate required fields |
| `final-report/persist.js` | File + DB insert |
| `final-report-routes.js` | HTTP |

**Size caps (recommended):** Truncate long regression `entireInsights`, cap market competitor list entries, do not embed raw Crustdata payloads — only synthesized `MarketReport` fields.

**Neatlogs:** Trace span `final_report_synthesize` (match persona-fleet / financial-analysis patterns).

---

## UI one-pager (content order)

1. Feature title + application name  
2. Dual verdict badges + `verdictRationale`  
3. `executiveSummary`  
4. Four section cards (regression, market, persona fleet, financial) — each: status chip, summary, highlights, risks where applicable  
5. `crossCuttingThemes`, `conditions`  
6. `dataLimitations`  

Print-friendly CSS optional (future); v1 is scrollable single page.

---

## Out of scope (v1)

- GTM intake fields as a fifth section (not in your four-item list). **Confirm if GTM should be added later.**
- PDF / email export  
- Re-running Crustdata or fleet from this page  
- Strategy B in any form  

---

## Spec self-review

- [x] Four sections mapped to concrete data sources  
- [x] Locked decisions recorded; no silent Strategy B  
- [x] Dual verdict defined  
- [x] Regression skip behavior explicit  
- [x] UX, demo GET, and DB row policy locked  

---

## Implementation

See `docs/superpowers/plans/2026-10-12-final-validation-report.md` (implemented in codebase).
