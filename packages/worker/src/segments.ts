import { TranscriptResult } from '@calls-mvp/shared';

export function processSegments(t: TranscriptResult) {
  if (!t.text) return [] as Array<{ label: string; startSec: number; endSec: number; excerpt: string }>;
  // Very naive: single segment covering entire call
  const end = t.words.length ? Math.ceil(t.words[t.words.length - 1].endSec) : 0;
  return [{ label: 'geral', startSec: 0, endSec: end, excerpt: t.text.slice(0, 200) }];
}
