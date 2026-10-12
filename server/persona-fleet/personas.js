import { randomBytes } from "node:crypto";

const FLAVOR = [
  "Works at a mid-market company with a lean ops team.",
  "Recently changed roles and is re-evaluating tooling.",
  "Manages a cross-functional squad with tight deadlines.",
  "Prefers self-serve onboarding over sales-led setup.",
  "Reports to a budget-conscious executive sponsor.",
  "Uses several integrations daily and cares about reliability.",
  "Has limited time for training on new software.",
  "Influences purchase decisions but is not the final signer.",
];

/**
 * @param {number} n
 * @param {number} buckets
 */
export function allocateCounts(n, buckets) {
  if (buckets <= 0 || n < 0) return [];
  const base = Math.floor(n / buckets);
  let remainder = n % buckets;
  const counts = Array.from({ length: buckets }, () => base);
  for (let i = 0; remainder > 0; i += 1, remainder -= 1) {
    counts[i % buckets] += 1;
  }
  return counts;
}

function randomKey() {
  return randomBytes(8).toString("hex");
}

function pickFlavor() {
  return FLAVOR[Math.floor(Math.random() * FLAVOR.length)];
}

/**
 * @param {Record<string, unknown>} productData
 * @param {number} n
 */
export function buildPersonaFleet(productData, n) {
  const personas = Array.isArray(productData.personas)
    ? productData.personas
    : [];
  const newInstall = productData.newInstallPersona;
  const archetypes = [
    ...personas.map((p, i) => ({
      type: `persona_${i + 1}`,
      name: String(p?.name ?? `Persona ${i + 1}`),
      description: String(p?.description ?? ""),
    })),
    {
      type: "new_install",
      name: String(newInstall?.name ?? "New install"),
      description: String(newInstall?.description ?? ""),
    },
  ].filter((a) => a.name || a.description);

  if (archetypes.length === 0) {
    archetypes.push({
      type: "default",
      name: "Prospective customer",
      description: String(productData.targetMarket ?? "Target market user"),
    });
  }

  const counts = allocateCounts(n, archetypes.length);
  const fleet = [];
  let variant = 1;

  for (let i = 0; i < archetypes.length; i += 1) {
    const archetype = archetypes[i];
    for (let j = 0; j < counts[i]; j += 1) {
      const agentId = `agent_${randomKey()}`;
      fleet.push({
        agentId,
        archetypeType: archetype.type,
        name: `${archetype.name} · v${variant}`,
        description: `${archetype.description} ${pickFlavor()}`.trim(),
      });
      variant += 1;
    }
  }

  return fleet;
}
