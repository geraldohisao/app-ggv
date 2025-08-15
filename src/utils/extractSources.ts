export type ExtractedSource = { key: string; score?: number };

// Extrai marcadores [#src:<key> score=0.xx]
export function extractSourceMarkers(text: string): ExtractedSource[] {
  if (!text) return [];
  const regex = /\[#src:([^\]\s]+)(?:\s+score=([0-9.]+))?/g;
  const out: ExtractedSource[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    out.push({ key: m[1], score: m[2] ? Number(m[2]) : undefined });
  }
  return out;
}


