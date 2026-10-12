import { commandCodeChat } from "../commandcode.js";
import { extractJson } from "../persona-fleet/json-utils.js";
import { FINAL_REPORT_SCHEMA_HINT } from "./constants.js";

const SYSTEM = `You are a principal product strategist writing a one-page validation report.
Output ONLY valid JSON matching the schema below. No markdown fences.

Rules:
- Summarize each section from provided evidence only; do not invent metrics or quotes.
- Market section uses Strategy C (Crustdata LLM-planned) evidence only — never mention Strategy B.
- regression status skipped: section status must be skipped with honest summary; add data limitation.
- fleetRecommendation must align with persona fleet when available.
- finalVerdict is the executive ship decision weighing all sections.
- verdictRationale explains how fleetRecommendation and finalVerdict relate.
- Keep executiveSummary under 150 words.

Schema:
${FINAL_REPORT_SCHEMA_HINT}`;

/**
 * @param {Record<string, unknown>} evidence
 */
export async function synthesizeFinalReport(evidence) {
  const text = await commandCodeChat(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Compose the final validation report JSON from this evidence bundle:\n\n${JSON.stringify(evidence)}`,
      },
    ],
    { temperature: 0.35 }
  );

  const parsed = JSON.parse(extractJson(text));
  const product = evidence.product ?? {};

  const fleetRec = parsed.fleetRecommendation;
  const finalVerdict = parsed.finalVerdict;

  return {
    generatedAt: new Date().toISOString(),
    feature: {
      applicationName: String(
        parsed.feature?.applicationName ?? product.applicationName ?? ""
      ),
      name: String(parsed.feature?.name ?? product.featureName ?? ""),
      description: String(
        parsed.feature?.description ?? product.featureDescription ?? ""
      ),
    },
    fleetRecommendation:
      fleetRec === "proceed" || fleetRec === "iterate" || fleetRec === "reconsider"
        ? fleetRec
        : "iterate",
    finalVerdict:
      finalVerdict === "ship" ||
      finalVerdict === "ship_with_conditions" ||
      finalVerdict === "iterate" ||
      finalVerdict === "do_not_ship"
        ? finalVerdict
        : "iterate",
    verdictRationale: String(parsed.verdictRationale ?? ""),
    executiveSummary: String(parsed.executiveSummary ?? ""),
    sections: normalizeSections(parsed.sections, evidence),
    crossCuttingThemes: Array.isArray(parsed.crossCuttingThemes)
      ? parsed.crossCuttingThemes
      : [],
    conditions: Array.isArray(parsed.conditions) ? parsed.conditions : [],
    dataLimitations: Array.isArray(parsed.dataLimitations)
      ? parsed.dataLimitations
      : [],
  };
}

/**
 * @param {unknown} sections
 * @param {Record<string, unknown>} evidence
 */
function normalizeSections(sections, evidence) {
  const s = sections && typeof sections === "object" ? sections : {};
  const regStatus = evidence.regression?.status ?? "missing";
  return {
    regression: {
      status:
        regStatus === "skipped" || regStatus === "available"
          ? regStatus
          : s.regression?.status === "skipped"
            ? "skipped"
            : s.regression?.status === "available"
              ? "available"
              : "missing",
      summary: String(s.regression?.summary ?? ""),
      highlights: Array.isArray(s.regression?.highlights)
        ? s.regression.highlights
        : [],
      risks: Array.isArray(s.regression?.risks) ? s.regression.risks : [],
    },
    market: {
      status:
        evidence.market?.status === "available" ? "available" : "missing",
      summary: String(s.market?.summary ?? ""),
      highlights: Array.isArray(s.market?.highlights) ? s.market.highlights : [],
      risks: Array.isArray(s.market?.risks) ? s.market.risks : [],
    },
    personaFleet: {
      status:
        evidence.personaFleet?.status === "available" ? "available" : "missing",
      summary: String(s.personaFleet?.summary ?? ""),
      recommendation:
        s.personaFleet?.recommendation === "proceed" ||
        s.personaFleet?.recommendation === "iterate" ||
        s.personaFleet?.recommendation === "reconsider"
          ? s.personaFleet.recommendation
          : null,
      highlights: Array.isArray(s.personaFleet?.highlights)
        ? s.personaFleet.highlights
        : [],
    },
    financial: {
      status: evidence.financial?.status === "available" ? "available" : "missing",
      summary: String(s.financial?.summary ?? ""),
      recommendation:
        s.financial?.recommendation === "proceed" ||
        s.financial?.recommendation === "proceed_with_caution" ||
        s.financial?.recommendation === "defer" ||
        s.financial?.recommendation === "reconsider"
          ? s.financial.recommendation
          : null,
      highlights: Array.isArray(s.financial?.highlights)
        ? s.financial.highlights
        : [],
    },
  };
}
