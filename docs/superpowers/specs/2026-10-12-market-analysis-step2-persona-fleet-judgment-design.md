# Market Analysis — Step 2 (Persona fleet judgment) — Design Spec

**Status:** Approved (locked)  
**Date:** 2026-10-12  
**Scope:** Compose a single final judgment from N persona-agent verdicts (10–1000); server-side aggregation + bounded LLM synthesis; client caches composed result in `localStorage` with 4-hour TTL.

**Prerequisites:** Persona fleet run (`agent_fleet_runs`, `agent_runs`) as implemented in `server/persona-fleet/`; UI at `/demo|full/market-analysis/persona-fleet`.

---

## Summary

After all agents complete, ProductSense **does not** send thousands of raw verdict strings to one LLM call. Instead:

1. **Layer 1 (deterministic):** Aggregate all numeric scores and segment by archetype.
2. **Layer 2 (bounded qualitative):** Bucket or batch-summarize text verdicts into themes + a capped set of representative quotes.
3. **Layer 3 (single synthesis):** One CommandCode call produces a strict JSON **fleet judgment** grounded in Layer 1–2 only.
4. **Client:** Fetch judgment from the server when the fleet completes; persist a **compact** copy in `localStorage` with **4-hour TTL** (raw per-agent rows stay in SQLite).

The **headline recommendation** (`proceed` | `iterate` | `reconsider`) is **threshold-derived from fleet composite score**; the LLM explains and narrates but must not invent percentages or counts.

---

## User flow

| Step | Behavior |
|------|----------|
| Entry | User arrives from Market Analysis Step 1 (Crustdata) via “Next” → persona fleet page (existing). |
| Fleet run | User selects N (10–1000), starts fleet; polls until `status === 'completed'` (existing). |
| Judgment | On completion, client calls **compose judgment** API (auto on complete or explicit “Compose final judgment” — implementation may auto-trigger once). |
| Display | Show composite score, recommendation badge, per-question stats, segment breakdown, executive summary, themes, representative quotes. |
| Cache | Save composed payload to `localStorage`; on revisit within TTL, render from cache without re-compose unless user starts a new fleet run. |
| New run | New `fleetRunId` invalidates prior cache key for that validation context. |

**Auth:** Same as persona fleet — full mode JWT + `featureId` ownership; demo open with `demoId` correlation.

---

## Composition pipeline

### Inputs

- `fleetRunId` → `agent_fleet_runs` row (`questions_json`, `personas_json`, `customer_count`, FKs).
- All `agent_runs` for that fleet: `agent_id`, `value_json` shaped as `{ [questionKey]: 0–100, verdict: string }`.
- Join persona metadata by `agent_id` from `personas_json` (`archetypeType`, `name`).

### Layer 1 — Numeric aggregation (no LLM)

For each question key in `questions_json`:

| Stat | Notes |
|------|--------|
| mean, median | Fleet-wide |
| p25, p75 | Optional; useful for UI spread |
| stdDev | Optional; feeds `dataLimitations` when high |
| histogram | 5 buckets: 0–19, 20–39, 40–59, 60–79, 80–100 |

**Per-agent composite:** arithmetic mean of all question scores for that agent (equal weight unless a future spec adds weights).

**Fleet composite:** mean and median of per-agent composites.

**Adoption bands (fleet-wide, on fleet composite mean):**

| Band | Range | Maps to recommendation |
|------|--------|-------------------------|
| Strong | ≥ 70 | `proceed` |
| Mixed | 40–69 | `iterate` |
| Weak | &lt; 40 | `reconsider` |

**Segments:** Repeat question + composite stats grouped by `archetypeType` (`persona_1`, `persona_2`, `persona_3`, `new_install`, or `default`). Include `count` per segment.

**Quality metadata:** `agentsTotal`, `agentsCompleted`, `agentsMissing` (if any), `confidenceNote` when segment count &lt; 5 or high variance.

### Layer 2 — Qualitative compression (bounded LLM or rules)

**Do not** concatenate all N verdicts into the synthesis prompt.

**Default (v1): map step**

- Batch verdicts in groups of **50** (same order as stored).
- Per batch, one CommandCode call returns JSON: `{ themes: [{ id, label, sentiment: "positive"|"mixed"|"negative", countHint }] }` where `countHint` is approximate themes in that batch only.
- Merge batch theme labels by normalized label (case-fold, trim); sum counts → fleet theme totals.
- **Representative quotes:** deterministic selection, max **25** strings total:
  - For each `archetypeType`, pick up to 2 agents from top quintile and bottom quintile of per-agent composite; use their `verdict` text.
  - If fewer than 25, fill from middle quintile for under-represented archetypes.

**Fallback:** If map step fails, use keyword/rule buckets (`price`, `complexity`, `fit`, `trust`, `timing`, `other`) with counts only; synthesis proceeds with aggregates + no quotes.

### Layer 3 — Final judgment synthesis (one LLM)

Module: `server/persona-fleet/judgment-synthesis.js` (mirrors `market-analysis/synthesis.js` pattern).

**System rules:**

- Output ONLY valid JSON matching schema below.
- Every numeric claim in narrative must match provided aggregates.
- Do not change `recommendation`; it is passed in from Layer 1 thresholds.
- Ground themes in Layer 2; if quotes provided, cite sparingly in `representativeQuotes` (already selected; do not invent new quotes).

**User payload (size cap ~8–12 KB):**

- `productData` subset: application + feature names/descriptions, target market.
- `questions` from fleet run.
- `aggregates` from Layer 1 (full structure).
- `recommendation` (precomputed).
- `themes` from Layer 2.
- `representativeQuotes` (≤25, each with `agentId`, `archetypeType`, `compositeScore`, `text`).

**Optional server cache:** Store composed JSON at `data/reports/persona-fleet/{fleetRunId}/judgment.json` and/or column on `agent_fleet_runs` (`judgment_url`, `judgment_composed_at`) to avoid recomputation. Re-compose only if file missing or `?force=1` (admin/debug).

---

## Judgment JSON schema

```json
{
  "fleetRunId": 0,
  "generatedAt": "ISO-8601",
  "methodology": {
    "agentCount": 0,
    "aggregation": "mean_per_question; fleet_composite = mean(agent_means); recommendation from composite thresholds"
  },
  "feature": { "name": "", "description": "" },
  "recommendation": "proceed | iterate | reconsider",
  "fleetComposite": {
    "mean": 0,
    "median": 0,
    "percentLikelyAdopt": 0
  },
  "perQuestion": [
    {
      "key": "",
      "text": "",
      "mean": 0,
      "median": 0,
      "p25": 0,
      "p75": 0,
      "histogram": { "0-19": 0, "20-39": 0, "40-59": 0, "60-79": 0, "80-100": 0 }
    }
  ],
  "segments": [
    {
      "archetypeType": "",
      "label": "",
      "count": 0,
      "compositeMean": 0,
      "perQuestionMeans": {}
    }
  ],
  "themes": [
    { "label": "", "sentiment": "positive|mixed|negative", "approxCount": 0 }
  ],
  "executiveSummary": "",
  "strengths": [],
  "blockers": [],
  "segmentInsights": [],
  "representativeQuotes": [
    { "agentId": "", "archetypeType": "", "compositeScore": 0, "text": "" }
  ],
  "dataLimitations": []
}
```

- `percentLikelyAdopt`: % of agents with composite ≥ 70 (computed in Layer 1, not by LLM).
- `segmentInsights`: LLM narrative per archetype; must reference segment `compositeMean` / counts.

---

## API surface

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/market-analysis/persona-fleet/:id/judgment` | Full: JWT + feature owner; Demo: open | Run Layer 1–3; return judgment JSON; persist file if caching enabled |
| `GET` | `/market-analysis/persona-fleet/:id/judgment` | Same | Return cached judgment if present; else `404` + `{ ready: false }` or trigger lazy compose (implementation choice: prefer explicit POST from client on complete) |

**Errors:**

- `404` — unknown `fleetRunId`
- `409` — fleet not `completed` (`judgment_not_ready`)
- `403` — full mode ownership
- `500` — synthesis failure after Layer 1 succeeded → return Layer 1 aggregates + `error` field (partial response policy: optional `GET .../judgment/aggregates` only — defer unless needed)

**Status endpoint extension (optional):** Add `judgmentReady: boolean` to `GET .../status` when cached file exists.

---

## Client: localStorage cache

**Storage:** `localStorage` (not session storage) so judgment survives tab close within TTL.

**Key:** `ps:fleet-judgment:{mode}:{scopeId}:{fleetRunId}`

- `scopeId` = `featureId` (full) or `demoId` (demo) or `"anonymous"` if missing.

**Value:**

```ts
type FleetJudgmentCache = {
  fleetRunId: number;
  composedAt: string; // ISO
  expiresAt: number;  // Date.now() + 4 * 60 * 60 * 1000
  judgment: FleetJudgment; // schema above
};
```

**TTL:** 4 hours from `composedAt`. On read, if `Date.now() > expiresAt`, remove key and refetch via API.

**Size:** Store composed judgment only (~10–50 KB). Never store full `agent_runs` array in localStorage.

**Module:** `client/lib/fleet-judgment-cache.ts` with `load`, `save`, `clearForScope`, `isValid`.

**UI:** `persona-fleet-page.tsx` — after `completed`, call compose API, `save` cache, render judgment card(s). On mount, if cache valid for current `personaFleetRunId`, show judgment immediately while optionally refreshing in background.

---

## Orchestration & performance

| N | Layer 1 | Layer 2 (50/batch) | Layer 3 |
|---|---------|-------------------|---------|
| 20 | &lt;50 ms | 1 batch call | 1 call |
| 1000 | &lt;200 ms | 20 batch calls (parallel cap 5) | 1 call |

- Run composition **on server** only.
- Parallelize Layer 2 batches with concurrency **5** (match agent batch size).
- Trace workflows: `persona-fleet-judgment-aggregate`, `persona-fleet-judgment-themes`, `persona-fleet-judgment-synthesize` (neatlogs, same as fleet run).

**Partial fleet:** Judgment requires `agents_completed === agents_total` and `status === 'completed'`. No judgment on failed/partial runs in v1.

---

## Out of scope (this spec)

- Persisting judgment in SQLite as first-class table (optional file cache only in v1).
- Weighted question scores (e.g. double `willingnessToAdopt`) — equal weights until a follow-up spec.
- Embedding/k-means clustering for themes (map-reduce batches only in v1).
- Download/export PDF of judgment.
- Next validation step after judgment (navigation target TBD).

---

## Testing plan (manual)

1. **Demo, N=20:** Complete fleet → judgment returns `recommendation`, `fleetComposite`, 5 `perQuestion` rows, segments match archetype counts.
2. **TTL:** Reload page within 4h → judgment from localStorage without flash; clear key manually → refetch from API.
3. **New fleet:** Start second run with new `fleetRunId` → new cache key; old key ignored when session `personaFleetRunId` updates.
4. **Full mode:** Unauthorized JWT cannot read judgment for another user's `featureId`.
5. **N=1000 (smoke):** Composition finishes within acceptable time; synthesis payload stays under token limits.

---

## Decisions log

| Topic | Decision |
|-------|----------|
| Composition location | Server only |
| Scale strategy | Quant-first aggregate all N; bounded qualitative; one synthesis LLM |
| Recommendation | Threshold on fleet composite mean; LLM narrates only |
| Text verdicts | Map batches of 50; max 25 representative quotes |
| Client persistence | `localStorage`, 4h TTL, composed JSON only |
| Raw agent data | Remains in `agent_runs` / SQLite |

---

## Related docs

- `discussionDocs/guide.md` — persona fleet product intent
- `docs/superpowers/specs/2026-10-12-market-analysis-step1-design.md` — Crustdata step (Step 1)
- Implementation plan: `docs/superpowers/plans/2026-10-12-market-analysis-step2-persona-fleet-judgment.md`
