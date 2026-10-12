# Final validation report (one-pager) Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans or subagent-driven-development in a follow-up session after the design spec is approved.

**Goal:** After financial analysis, let the user generate a single one-pager that synthesizes regression, Strategy C market analysis, persona fleet judgment, and financial analysis, with dual verdicts; persist server-side and in `localStorage`.

**Architecture:** `POST /final-report/generate` gathers server-side regression + Strategy C market data, merges client-posted fleet + financial caches, runs one CommandCode synthesis into `FinalValidationReport`, writes JSON + DB row, returns to client for render/cache. Dedicated `/demo|full/final-report` page; entry button on financial analysis footer.

**Tech Stack:** Node ESM Express, sqlite3, CommandCode (`commandcode.js`), Next.js client, shadcn UI, `node:test` for gather/synthesize unit tests where deterministic.

**Design spec:** `docs/superpowers/specs/2026-10-12-final-validation-report-design.md` (must be approved; resolve open questions first).

---

## File map

| File | Action |
|------|--------|
| `server/final-report/constants.js` | Extend schema hint with `fleetRecommendation`, `verdictRationale` |
| `server/final-report/gather.js` | **New** — load regression, market C, merge client payloads |
| `server/final-report/synthesize.js` | **New** — CommandCode formalization |
| `server/final-report/persist.js` | **New** — file + DB |
| `server/final-report/schema.js` | **New** — migrate `final_validation_reports` |
| `server/final-report-routes.js` | **New** — POST generate, GET by id |
| `server/index.js` | Register routes + migrate schema |
| `server/regression.js` | Export `loadRegressionReportByFeatureId` if missing |
| `client/lib/final-report-types.ts` | **New** |
| `client/lib/final-report-cache.ts` | **New** |
| `client/lib/final-report-api.ts` | **New** |
| `client/components/validation/final-report-page.tsx` | **New** |
| `client/components/validation/final-report-panel.tsx` | **New** — one-pager layout |
| `client/app/demo/final-report/page.tsx` | **New** |
| `client/app/full/final-report/page.tsx` | **New** |
| `client/components/validation/financial-analysis-page.tsx` | Add **Generate report** footer link |
| `client/lib/validation-session.ts` | Optional `finalReportId` |

---

## Task 1: Schema migration

**Files:** `server/final-report/schema.js`, `server/index.js`

- Add `migrateFinalReportSchema()` creating `final_validation_reports` per design spec.
- Wire into server startup alongside other migrates.

**Test:** Manual `SELECT` after boot or small migration test if pattern exists.

---

## Task 2: Extend `constants.js`

**Files:** `server/final-report/constants.js`

- Add `fleetRecommendation`, `verdictRationale` to `FINAL_REPORT_SCHEMA_HINT`.
- Document `sections.regression.status` includes `skipped`.

---

## Task 3: `gather.js` (deterministic, no LLM)

**Files:** `server/final-report/gather.js`, `server/regression.js` (export helper)

- Implement `gatherFinalReportEvidence(input)`:
  - Regression: if `regressionSkipped` → `{ status: 'skipped' }`; else load by `promptId` or `featureId`+`userId`.
  - Market: resolve run `marketAnalysisRunId`, read **only** `strategy_c_report_url`; handle `error_c`.
  - Fleet: prefer `input.fleetJudgment`; else `loadFleetJudgmentFromCache(personaFleetRunId)`.
  - Financial: `input.financialAnalysis` only.
  - Attach `productData` header fields.
  - Apply size caps (truncate long strings / array lengths).

**Tests:** `server/test/final-report-gather.test.js` with fixtures/mocks for file reads.

---

## Task 4: `synthesize.js`

**Files:** `server/final-report/synthesize.js`

- `synthesizeFinalReport(evidenceBundle)` using `commandCodeChat` + `extractJson`.
- System prompt: dual verdict rules, Strategy C only, skipped regression handling.
- Validate enums; fallback safe defaults on parse failure with `dataLimitations` entry.

**Tests:** Optional integration test gated on `COMMANDCODE_API_KEY`; unit test with injected mock chat function.

---

## Task 5: `persist.js` + orchestrator

**Files:** `server/final-report/persist.js`, `server/final-report/run.js`

- `runFinalReportGeneration(reqBody, userId)` → gather → synthesize → `writeReportFile('final-report/{id}.json')` → DB insert → return.

---

## Task 6: Routes + auth

**Files:** `server/final-report-routes.js`

- `POST /final-report/generate` — mirror auth patterns from `financial-analysis-routes.js` (demo user not required for gather; full JWT + `featureId` ownership for DB-backed regression/market).
- `GET /final-report/:id` — full auth; demo policy per spec open question #2.

---

## Task 7: Client types, API, cache

**Files:** `client/lib/final-report-*.ts`

- Types aligned with extended schema.
- `generateFinalReport()` POST with session fields + `loadFleetJudgmentCache` + `loadFinancialAnalysisCache` payloads.
- Cache save/load 4h TTL.

---

## Task 8: Final report page UI

**Files:** `final-report-page.tsx`, `final-report-panel.tsx`, app routes

- On mount: if no cache, call generate (single `useRef` guard like market analysis).
- Render dual badges, executive summary, four sections, limitations.
- **Regenerate** button: clear cache, POST again.

---

## Task 9: Financial analysis entry

**Files:** `financial-analysis-page.tsx`

- When `analysis` present (not loading), show footer **Generate report →** linking to `/${mode}/final-report`.

---

## Task 10: Manual test plan

1. **Demo, full path:** regression skip → market → fleet → financial → generate; verify regression section `skipped`.
2. **Demo, regression submitted:** POST regression JSON, check report includes highlights.
3. **Strategy C only:** Confirm Strategy B text absent.
4. **Missing fleet judgment:** Client omit cache; section `missing`; report still generates.
5. **Persistence:** Reload page within TTL (localStorage); restart browser session, GET by `reportId` if implemented.
6. **Full mode:** Unauthorized GET blocked.

---

## Dependencies / blockers

- Resolve spec **open questions** (route-only vs inline, demo GET, regenerate upsert) before Task 6–8.
- CommandCode availability in dev environment (TLS issues are environmental).

---

## Commit strategy

1. Server schema + gather + tests  
2. Synthesize + run + routes  
3. Client API + page + financial analysis button  

Do not commit until user requests.
