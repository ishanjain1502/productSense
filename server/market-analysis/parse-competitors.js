/**
 * @param {string | null | undefined} raw
 * @returns {string[]}
 */
export function parseCompetitors(raw) {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
