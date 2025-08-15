type Sample = { step: string; ms: number };

const store: Record<string, number[]> = {};
let count = 0;

export function addSample(s: Sample) {
  if (!store[s.step]) store[s.step] = [];
  store[s.step].push(s.ms);
  if (store[s.step].length > 200) store[s.step].shift();
  count++;
  if (count % 10 === 0) {
    // eslint-disable-next-line no-console
    if ((import.meta as any)?.env?.DEV) console.debug('[AI][summary]', getSummary());
  }
}

function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((sorted.length - 1) * p);
  return Math.round(sorted[idx]);
}

export function getSummary() {
  const result: Record<string, { count: number; p50: number; p95: number }> = {};
  for (const [step, arr] of Object.entries(store)) {
    result[step] = { count: arr.length, p50: percentile(arr, 0.5), p95: percentile(arr, 0.95) };
  }
  return result;
}


