/**
 * @param {number[]} sortedAsc
 * @param {number} q 0-1 quintile boundary
 */
function quintileSlice(sortedAsc, q) {
  if (!sortedAsc.length) return [];
  const n = sortedAsc.length;
  const start = Math.floor(q * n);
  const end = Math.max(start + 1, Math.floor((q + 0.2) * n));
  const lo = Math.min(start, n - 1);
  const hi = Math.min(end, n);
  return sortedAsc.slice(lo, hi);
}

/**
 * @param {Array<{ agentId: string; archetypeType: string; compositeScore: number; verdict: string }>} agentRows
 * @param {number} [maxQuotes]
 */
export function selectRepresentativeQuotes(agentRows, maxQuotes = 25) {
  const quotes = [];
  const used = new Set();

  const byArchetype = new Map();
  for (const row of agentRows) {
    if (!byArchetype.has(row.archetypeType)) {
      byArchetype.set(row.archetypeType, []);
    }
    byArchetype.get(row.archetypeType).push(row);
  }

  for (const [, rows] of byArchetype) {
    const sorted = [...rows].sort((a, b) => a.compositeScore - b.compositeScore);
    const pickFrom = (slice) => {
      for (const row of slice) {
        if (quotes.length >= maxQuotes) return;
        if (used.has(row.agentId)) continue;
        const text = String(row.verdict ?? "").trim();
        if (!text) continue;
        used.add(row.agentId);
        quotes.push({
          agentId: row.agentId,
          archetypeType: row.archetypeType,
          compositeScore: Math.round(row.compositeScore * 10) / 10,
          text,
        });
      }
    };
    pickFrom(quintileSlice(sorted, 0.8).slice(-2));
    pickFrom(quintileSlice(sorted, 0).slice(0, 2));
  }

  if (quotes.length < maxQuotes) {
    const middle = [...agentRows].sort(
      (a, b) => a.compositeScore - b.compositeScore
    );
    const midStart = Math.floor(middle.length * 0.4);
    const midEnd = Math.ceil(middle.length * 0.6);
    for (const row of middle.slice(midStart, midEnd)) {
      if (quotes.length >= maxQuotes) break;
      if (used.has(row.agentId)) continue;
      const text = String(row.verdict ?? "").trim();
      if (!text) continue;
      used.add(row.agentId);
      quotes.push({
        agentId: row.agentId,
        archetypeType: row.archetypeType,
        compositeScore: Math.round(row.compositeScore * 10) / 10,
        text,
      });
    }
  }

  return quotes.slice(0, maxQuotes);
}
