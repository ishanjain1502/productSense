const RULES = [
  { label: "price", pattern: /\b(price|budget|cost|expensive|afford)\b/i },
  { label: "complexity", pattern: /\b(complex|difficult|learning|steep)\b/i },
  { label: "fit", pattern: /\b(fit|relevant|useful|need|value)\b/i },
  { label: "trust", pattern: /\b(trust|security|reliable|safe)\b/i },
  { label: "timing", pattern: /\b(time|soon|later|wait|delay)\b/i },
];

/**
 * @param {string[]} verdicts
 */
export function keywordThemeFallback(verdicts) {
  const counts = new Map();
  for (const v of verdicts) {
    const text = String(v ?? "");
    let matched = false;
    for (const rule of RULES) {
      if (rule.pattern.test(text)) {
        counts.set(rule.label, (counts.get(rule.label) ?? 0) + 1);
        matched = true;
        break;
      }
    }
    if (!matched) {
      counts.set("other", (counts.get("other") ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([label, approxCount]) => ({
    label,
    sentiment: "mixed",
    approxCount,
  }));
}
