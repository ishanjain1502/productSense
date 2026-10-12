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
