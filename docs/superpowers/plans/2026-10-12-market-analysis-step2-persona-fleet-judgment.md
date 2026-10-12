# Persona Fleet Judgment (Market Analysis Step 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a completed persona fleet run, compose one final fleet judgment from N agent scores and verdicts (server-side), expose GET/POST judgment APIs with file cache, and show the result in the client with a 4-hour `localStorage` TTL.

**Architecture:** Pure-JS Layer 1 aggregation (`aggregate.js`) over `agent_runs`; Layer 2 theme map via batched CommandCode calls plus deterministic quote selection and keyword fallback; Layer 3 single CommandCode synthesis (`judgment-synthesis.js`) that must not override threshold-based `recommendation`. Orchestrator `compose-judgment.js` loads fleet row + runs, writes `data/reports/persona-fleet/{fleetRunId}/judgment.json` via existing `report-storage.js`. Client fetches on fleet complete, caches with `fleet-judgment-cache.ts`, renders on `persona-fleet-page.tsx`.

**Tech Stack:** Node 18+ ESM, Express 5, sqlite3 (`agent_fleet_runs`, `agent_runs`), CommandCode (`commandcode.js`), Next.js client, shadcn UI, `node:test`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-12-market-analysis-step2-persona-fleet-judgment-design.md`
- Fleet size **10–1000** (existing); judgment only when `status === 'completed'` and `agents_completed === agents_total`
- Recommendation thresholds on **fleet composite mean**: ≥ **70** → `proceed`; **40–69** → `iterate`; &lt; **40** → `reconsider` (LLM must not change)
- Theme batches: **50** verdicts per batch; Layer 2 parallel concurrency **5**
- Representative quotes: max **25**, quintile-based per `archetypeType`
- `localStorage` key: `ps:fleet-judgment:{mode}:{scopeId}:{fleetRunId}`; TTL **4 hours** (`4 * 60 * 60 * 1000` ms)
- Judgment file cache: `persona-fleet/{fleetRunId}/judgment.json` under `data/reports/` (no new SQLite table in v1)
- Auth: same as persona fleet — full JWT + `featureId` ownership; demo open
- Trace names: `persona-fleet-judgment-aggregate`, `persona-fleet-judgment-themes`, `persona-fleet-judgment-synthesize`

---

## File map

| File | Responsibility |
|------|----------------|
| `server/persona-fleet/stats.js` | median, percentile, histogram bucket helpers |
| `server/persona-fleet/aggregate.js` | Layer 1: per-question stats, composites, segments, recommendation |
| `server/persona-fleet/quotes.js` | Deterministic representative quote selection |
| `server/persona-fleet/theme-fallback.js` | Keyword bucket counts when theme map fails |
| `server/persona-fleet/theme-map.js` | Batch theme LLM calls + merge |
| `server/persona-fleet/judgment-synthesis.js` | Layer 3 CommandCode JSON synthesis |
| `server/persona-fleet/compose-judgment.js` | Load DB rows, run layers, write cache file |
| `server/persona-fleet/judgment-path.js` | `judgmentRelativePath(fleetRunId)` |
| `server/persona-fleet-routes.js` | Add POST/GET judgment; optional `judgmentReady` on status |
| `server/test/persona-fleet-aggregate.test.js` | Layer 1 unit tests |
| `server/test/persona-fleet-quotes.test.js` | Quote selection tests |
| `server/test/persona-fleet-theme-merge.test.js` | Theme merge + fallback tests |
| `client/lib/fleet-judgment-types.ts` | `FleetJudgment`, cache types |
| `client/lib/fleet-judgment-cache.ts` | load / save / TTL |
| `client/lib/persona-fleet-api.ts` | `composePersonaFleetJudgment`, `fetchPersonaFleetJudgment` |
| `client/components/validation/fleet-judgment-panel.tsx` | Renders judgment UI |
| `client/components/validation/persona-fleet-page.tsx` | Auto-compose on complete + cache hydrate |

---

### Task 1: Stats helpers

**Files:**
- Create: `server/persona-fleet/stats.js`
- Create: `server/test/persona-fleet-stats.test.js`

**Interfaces:**
- Produces: `median(nums)`, `percentile(nums, p)`, `histogramBucket(score)`, `mean(nums)`

- [ ] **Step 1: Write failing test**

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { median, percentile, histogramBucket, mean } from "../persona-fleet/stats.js";

describe("stats", () => {
  it("median and mean", () => {
    assert.equal(mean([10, 20, 30]), 20);
    assert.equal(median([10, 20, 30]), 20);
    assert.equal(median([10, 20]), 15);
  });
  it("percentile linear", () => {
    const xs = [0, 10, 20, 30, 40];
    assert.equal(percentile(xs, 25), 10);
    assert.equal(percentile(xs, 75), 30);
  });
  it("histogram buckets", () => {
    assert.equal(histogramBucket(0), "0-19");
    assert.equal(histogramBucket(19), "0-19");
    assert.equal(histogramBucket(80), "80-100");
  });
});
```

- [ ] **Step 2: Run test (expect FAIL)**

Run: `cd server && npm test -- test/persona-fleet-stats.test.js`  
Expected: FAIL — cannot find module `stats.js`

- [ ] **Step 3: Implement `server/persona-fleet/stats.js`**

```js
const BUCKETS = ["0-19", "20-39", "40-59", "60-79", "80-100"];

export function mean(nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function median(nums) {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function percentile(nums, p) {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

export function histogramBucket(score) {
  const n = Math.max(0, Math.min(100, Math.round(score)));
  if (n <= 19) return "0-19";
  if (n <= 39) return "20-39";
  if (n <= 59) return "40-59";
  if (n <= 79) return "60-79";
  return "80-100";
}

export function emptyHistogram() {
  return Object.fromEntries(BUCKETS.map((b) => [b, 0]));
}

export function buildHistogram(scores) {
  const h = emptyHistogram();
  for (const s of scores) {
    h[histogramBucket(s)] += 1;
  }
  return h;
}
```

- [ ] **Step 4: Run test (expect PASS)**

Run: `cd server && npm test -- test/persona-fleet-stats.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/persona-fleet/stats.js server/test/persona-fleet-stats.test.js
git commit -m "feat(persona-fleet): add stats helpers for judgment aggregation"
```

---

### Task 2: Layer 1 aggregation

**Files:**
- Create: `server/persona-fleet/aggregate.js`
- Create: `server/test/persona-fleet-aggregate.test.js`

**Interfaces:**
- Consumes: `stats.js` helpers
- Produces:
  - `recommendationFromCompositeMean(mean)` → `"proceed"|"iterate"|"reconsider"`
  - `buildAgentRows(agentRuns, personas, questions)` → enriched rows with `compositeScore`, `archetypeType`, scores map
  - `aggregateFleetJudgment({ fleetRunId, questions, personas, agentRuns, productData })` → Layer 1 object (without LLM fields): `recommendation`, `fleetComposite`, `perQuestion`, `segments`, `methodology`, `feature`, `quality`

- [ ] **Step 1: Write failing test**

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  recommendationFromCompositeMean,
  aggregateFleetJudgment,
} from "../persona-fleet/aggregate.js";

describe("recommendationFromCompositeMean", () => {
  it("maps thresholds", () => {
    assert.equal(recommendationFromCompositeMean(70), "proceed");
    assert.equal(recommendationFromCompositeMean(69), "iterate");
    assert.equal(recommendationFromCompositeMean(40), "iterate");
    assert.equal(recommendationFromCompositeMean(39), "reconsider");
  });
});

describe("aggregateFleetJudgment", () => {
  it("aggregates two agents across one question", () => {
    const questions = [{ key: "fit", text: "Fit?" }];
    const personas = [
      { agentId: "a1", archetypeType: "persona_1", name: "P1" },
      { agentId: "a2", archetypeType: "persona_2", name: "P2" },
    ];
    const agentRuns = [
      { agent_id: "a1", value_json: JSON.stringify({ fit: 80, verdict: "yes" }) },
      { agent_id: "a2", value_json: JSON.stringify({ fit: 60, verdict: "maybe" }) },
    ];
    const out = aggregateFleetJudgment({
      fleetRunId: 1,
      questions,
      personas,
      agentRuns,
      productData: { featureName: "F", featureDescription: "D" },
    });
    assert.equal(out.perQuestion[0].mean, 70);
    assert.equal(out.fleetComposite.mean, 70);
    assert.equal(out.recommendation, "proceed");
    assert.equal(out.fleetComposite.percentLikelyAdopt, 50);
    assert.equal(out.segments.length, 2);
  });
});
```

- [ ] **Step 2: Run test (expect FAIL)**

Run: `cd server && npm test -- test/persona-fleet-aggregate.test.js`  
Expected: FAIL — module not found

- [ ] **Step 3: Implement `server/persona-fleet/aggregate.js`**

Implement:
- Parse `value_json` per run; validate question keys exist (skip or throw — throw in compose path, test uses valid data).
- `compositeScore` = mean of question values for agent.
- `percentLikelyAdopt` = round(100 * count(composite >= 70) / n).
- `perQuestion`: mean, median, p25, p75, histogram via `buildHistogram`.
- `segments`: group agent rows by `archetypeType`; `label` from persona `name` prefix before ` · v` or archetype type; `perQuestionMeans` object; `compositeMean`.
- `feature`: `{ name: productData.featureName, description: productData.featureDescription }`.
- `methodology`: fixed strings per spec.
- `quality`: `{ agentsTotal, agentsCompleted, agentsMissing: 0, confidenceNote?: string }` when any segment `count < 5`.

- [ ] **Step 4: Run test (expect PASS)**

Run: `cd server && npm test -- test/persona-fleet-aggregate.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/persona-fleet/aggregate.js server/test/persona-fleet-aggregate.test.js
git commit -m "feat(persona-fleet): add Layer 1 judgment aggregation"
```

---

### Task 3: Representative quotes + theme fallback

**Files:**
- Create: `server/persona-fleet/quotes.js`
- Create: `server/persona-fleet/theme-fallback.js`
- Create: `server/test/persona-fleet-quotes.test.js`
- Create: `server/test/persona-fleet-theme-merge.test.js`

**Interfaces:**
- Produces:
  - `selectRepresentativeQuotes(agentRows, maxQuotes = 25)` → `{ agentId, archetypeType, compositeScore, text }[]`
  - `keywordThemeFallback(verdicts)` → `{ label, sentiment, approxCount }[]`
  - `mergeThemeBatches(batchResults)` → merged themes (normalize label: trim + lower case key; sum `countHint` → `approxCount`)

- [ ] **Step 1: Write failing tests**

`persona-fleet-quotes.test.js`: 8 agents with known composites across 2 archetypes → at most 25 quotes, includes high and low composite per archetype when possible.

`persona-fleet-theme-merge.test.js`:

```js
import { mergeThemeBatches } from "../persona-fleet/theme-map.js";
import { keywordThemeFallback } from "../persona-fleet/theme-fallback.js";

// merge: two batches same label different case → summed approxCount
// fallback: verdict containing "price" → price bucket count >= 1
```

- [ ] **Step 2: Run tests (expect FAIL)**

Run: `cd server && npm test -- test/persona-fleet-quotes.test.js test/persona-fleet-theme-merge.test.js`

- [ ] **Step 3: Implement quotes + fallback + merge**

`quotes.js`: quintile via sorted composites; per archetype pick up to 2 from top quintile and 2 from bottom; fill to 25 from middle quintile for under-represented archetypes.

`theme-fallback.js`: simple regex/keyword map:
- `price|budget|cost` → `price`
- `complex|difficult|learning` → `complexity`
- `fit|relevant|useful` → `fit`
- `trust|security|reliable` → `trust`
- `time|soon|later` → `timing`
- else `other`
Sentiment default `mixed` for fallback.

`theme-map.js` (merge only in this task): export `mergeThemeBatches`; defer LLM `mapVerdictBatch` to Task 4.

- [ ] **Step 4: Run tests (expect PASS)**

- [ ] **Step 5: Commit**

```bash
git add server/persona-fleet/quotes.js server/persona-fleet/theme-fallback.js server/persona-fleet/theme-map.js server/test/persona-fleet-quotes.test.js server/test/persona-fleet-theme-merge.test.js
git commit -m "feat(persona-fleet): quote selection and theme merge helpers"
```

---

### Task 4: Layer 2 theme map (LLM batches)

**Files:**
- Modify: `server/persona-fleet/theme-map.js`

**Interfaces:**
- Produces:
  - `mapVerdictBatch(verdictTexts)` → CommandCode → `{ themes: [{ id, label, sentiment, countHint }] }`
  - `mapAllVerdictThemes(verdicts, { batchSize: 50, concurrency: 5 })` → merged themes array

- [ ] **Step 1: Implement `mapVerdictBatch`**

Use `commandCodeChat` + `extractJson` from `json-utils.js`. System prompt: output only JSON with themes array; each theme one short label; `countHint` is count of verdicts in **this batch** that match theme (approximate).

- [ ] **Step 2: Implement `mapAllVerdictThemes`**

Slice verdicts into batches of 50; run with `Promise` pool concurrency 5 (same pattern as `processAgentBatches` in `run.js`). On any batch failure, throw to trigger fallback in compose.

- [ ] **Step 3: Manual smoke (no unit test for LLM)**

Document in commit message; optional skip automated test with env `COMMANDCODE_API_KEY` integration test out of scope for CI.

- [ ] **Step 4: Commit**

```bash
git add server/persona-fleet/theme-map.js
git commit -m "feat(persona-fleet): batched LLM theme mapping for judgments"
```

---

### Task 5: Layer 3 synthesis + judgment path

**Files:**
- Create: `server/persona-fleet/judgment-synthesis.js`
- Create: `server/persona-fleet/judgment-path.js`
- Create: `server/persona-fleet/judgment-constants.js` (schema hint string for system prompt)

**Interfaces:**
- Produces:
  - `judgmentRelativePath(fleetRunId)` → `persona-fleet/${fleetRunId}/judgment.json`
  - `synthesizeFleetJudgment(input)` → full judgment JSON (merges Layer 1 + LLM narrative fields)

`synthesizeFleetJudgment` input:

```js
{
  layer1,           // from aggregateFleetJudgment (partial)
  recommendation,   // duplicate for prompt emphasis
  themes,
  representativeQuotes,
  productData,
}
```

LLM fills: `executiveSummary`, `strengths`, `blockers`, `segmentInsights`, `dataLimitations`; copies through numeric fields from `layer1` unchanged (validate after parse: `recommendation` and `fleetComposite.mean` must match layer1 or overwrite from layer1).

- [ ] **Step 1: Add `judgment-constants.js` with `JUDGMENT_SCHEMA_HINT`** (mirror `market-analysis/constants.js` style)

- [ ] **Step 2: Implement `judgment-synthesis.js`** using `commandCodeChat`, `extractJson`, neatlogs child trace `persona-fleet-judgment-synthesize`.

- [ ] **Step 3: Implement `judgment-path.js`**

```js
export function judgmentRelativePath(fleetRunId) {
  return `persona-fleet/${fleetRunId}/judgment.json`;
}
```

- [ ] **Step 4: Commit**

```bash
git add server/persona-fleet/judgment-synthesis.js server/persona-fleet/judgment-path.js server/persona-fleet/judgment-constants.js
git commit -m "feat(persona-fleet): judgment synthesis and report path"
```

---

### Task 6: Compose orchestrator + file cache

**Files:**
- Create: `server/persona-fleet/compose-judgment.js`
- Modify: `server/.gitignore` — ensure `data/reports/persona-fleet/` ignored if not already covered by `data/reports/`

**Interfaces:**
- Produces:
  - `loadFleetJudgmentFromCache(fleetRunId)` → judgment | null
  - `composeFleetJudgment(fleetRunId, { force?: boolean })` → judgment JSON

Flow inside `composeFleetJudgment`:
1. Load `agent_fleet_runs` by id; 404 if missing.
2. If `status !== 'completed'` → throw `{ status: 409, code: 'judgment_not_ready' }`.
3. If cached file exists and `!force` → return cached.
4. `SELECT * FROM agent_runs WHERE fleet_run_id = ? ORDER BY id`.
5. Parse `questions_json`, `personas_json`.
6. Trace `persona-fleet-judgment-aggregate` → `aggregateFleetJudgment`.
7. Build verdict list in agent order; `selectRepresentativeQuotes`.
8. Trace `persona-fleet-judgment-themes` → try `mapAllVerdictThemes`; catch → `keywordThemeFallback`.
9. Trace synthesize → `synthesizeFleetJudgment`.
10. Set `fleetRunId`, `generatedAt`.
11. `writeReportFile(judgmentRelativePath(fleetRunId), judgment)`.
12. Return judgment.

- [ ] **Step 1: Implement `compose-judgment.js`**

- [ ] **Step 2: Commit**

```bash
git add server/persona-fleet/compose-judgment.js
git commit -m "feat(persona-fleet): compose fleet judgment with file cache"
```

---

### Task 7: HTTP routes + status extension

**Files:**
- Modify: `server/persona-fleet-routes.js`
- Modify: `server/persona-fleet/run.js` (`getFleetRunStatus` only)

**Interfaces:**
- `POST /market-analysis/persona-fleet/:id/judgment` — body optional `{ force: boolean }`; calls `composeFleetJudgment`
- `GET /market-analysis/persona-fleet/:id/judgment` — returns cached or `404` `{ ready: false, error: "judgment_not_found" }`
- `GET .../status` adds `judgmentReady: boolean` via `loadFleetJudgmentFromCache` !== null

Reuse `resolveAuth` + `assertFeatureOwnedByUser` from existing routes. For GET judgment on completed fleet with no cache yet, return `404` `{ ready: false }` (client uses POST to compose).

Error mapping:
- `409` + `{ error: "judgment_not_ready" }`
- `403` forbidden
- `404` not found

- [ ] **Step 1: Wire routes**

- [ ] **Step 2: Extend `getFleetRunStatus`**

- [ ] **Step 3: Manual API test**

```bash
# After a completed fleetRunId=1 in local DB:
curl -s -X POST http://localhost:1337/market-analysis/persona-fleet/1/judgment | head
curl -s http://localhost:1337/market-analysis/persona-fleet/1/judgment | head
```

- [ ] **Step 4: Commit**

```bash
git add server/persona-fleet-routes.js server/persona-fleet/run.js
git commit -m "feat(persona-fleet): judgment compose GET/POST API"
```

---

### Task 8: Client types, cache, API

**Files:**
- Create: `client/lib/fleet-judgment-types.ts`
- Create: `client/lib/fleet-judgment-cache.ts`
- Modify: `client/lib/persona-fleet-api.ts`

**Interfaces:**
- `FLEET_JUDGMENT_TTL_MS = 4 * 60 * 60 * 1000`
- `fleetJudgmentCacheKey(mode, scopeId, fleetRunId)`
- `loadFleetJudgmentCache(key)`, `saveFleetJudgmentCache(key, judgment)`, `clearExpiredFleetJudgmentCache(key)`
- `composePersonaFleetJudgment(fleetRunId, mode, { force?: boolean })`
- `fetchPersonaFleetJudgment(fleetRunId, mode)`

- [ ] **Step 1: Add types matching server schema** (all fields from spec)

- [ ] **Step 2: Implement cache module** — on `load`, if `Date.now() > expiresAt`, `removeItem` and return null

- [ ] **Step 3: Extend persona-fleet-api** with POST/GET judgment endpoints using `authHeaders(mode)`

- [ ] **Step 4: Commit**

```bash
git add client/lib/fleet-judgment-types.ts client/lib/fleet-judgment-cache.ts client/lib/persona-fleet-api.ts
git commit -m "feat(client): fleet judgment API and localStorage cache"
```

---

### Task 9: Judgment UI + persona fleet page integration

**Files:**
- Create: `client/components/validation/fleet-judgment-panel.tsx`
- Modify: `client/components/validation/persona-fleet-page.tsx`

**UI (shadcn):**
- Recommendation badge: `proceed` (default/green tone), `iterate` (secondary), `reconsider` (destructive outline)
- Fleet composite: mean, median, `percentLikelyAdopt`
- Table or cards for `perQuestion` (mean + mini histogram bars optional)
- Segments list with `compositeMean` and count
- Themes chips with sentiment
- `executiveSummary`, bullet lists for strengths/blockers
- Collapsible `representativeQuotes`

**Page behavior:**
- State: `judgment`, `judgmentLoading`, `judgmentError`
- On mount: if `personaFleetRunId` + session scopeId, try `loadFleetJudgmentCache`; if valid, set judgment
- When poll reaches `completed`: call `composePersonaFleetJudgment` once (guard with ref `judgmentRequested`); on success `saveFleetJudgmentCache`
- If cache hit but stale fleet id in session, ignore cache
- Show loading card during compose ("Composing final judgment…")

- [ ] **Step 1: Build `fleet-judgment-panel.tsx`**

- [ ] **Step 2: Wire `persona-fleet-page.tsx`**

- [ ] **Step 3: Manual UI test** (demo mode, N=10 for speed if API key available)

- [ ] **Step 4: Commit**

```bash
git add client/components/validation/fleet-judgment-panel.tsx client/components/validation/persona-fleet-page.tsx
git commit -m "feat(client): display persona fleet final judgment"
```

---

### Task 10: Docs + regression checklist

**Files:**
- Modify: `docs/superpowers/specs/2026-10-12-market-analysis-step2-persona-fleet-judgment-design.md` — add line under Related docs pointing to this plan
- Modify: `discussionDocs/guide.md` — one sentence: judgment composed after fleet completes (optional, keep brief)

- [ ] **Step 1: Link plan in spec Related docs**

- [ ] **Step 2: Run full server tests**

Run: `cd server && npm test`  
Expected: all PASS

- [ ] **Step 3: Manual checklist** (from spec)

1. Demo N=20: judgment shape complete  
2. localStorage TTL: reload within 4h shows without re-compose  
3. New fleetRunId: new cache key  
4. Full mode: 403 for wrong user  
5. N=1000 smoke when feasible  

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-10-12-market-analysis-step2-persona-fleet-judgment-design.md discussionDocs/guide.md
git commit -m "docs: link persona fleet judgment plan and guide note"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Layer 1 numeric aggregation | Task 2 |
| Threshold recommendation | Task 2 |
| Theme batches 50, concurrency 5 | Task 4 |
| Max 25 quotes, quintile logic | Task 3 |
| Keyword fallback | Task 3 |
| Single synthesis LLM | Task 5 |
| File cache `persona-fleet/{id}/judgment.json` | Task 6 |
| POST/GET judgment API | Task 7 |
| `judgmentReady` on status | Task 7 |
| localStorage 4h TTL | Task 8 |
| UI on fleet complete | Task 9 |
| neatlogs traces | Tasks 4–6 |
| No judgment on incomplete fleet | Task 6–7 |

**Deferred (spec out of scope):** SQLite judgment table, PDF export, next-step navigation, weighted questions.

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-10-12-market-analysis-step2-persona-fleet-judgment.md`.

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  

**2. Inline Execution** — implement in this session with executing-plans checkpoints  

Which approach do you want?
