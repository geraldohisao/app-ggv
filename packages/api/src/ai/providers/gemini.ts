// Lazy import to keep optional dependency flexible
let GoogleGenerativeAI: any;

async function getClient() {
  if (!GoogleGenerativeAI) {
    const mod = await import('@google/generative-ai');
    GoogleGenerativeAI = (mod as any).GoogleGenerativeAI;
  }
  const apiKey = process.env.GEMINI_API_KEY as string | undefined;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');
  return new GoogleGenerativeAI(apiKey);
}

import { LLMProvider, GenParams, GenResult } from './base.js';

function parseJsonResilient(text: string): any {
  if (!text) return null;
  
  // Try standard JSON.parse first
  try {
    return JSON.parse(text);
  } catch {}
  
  // Try to extract JSON from text (common with streaming)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {}
  }
  
  // Try JSON5 for more lenient parsing
  try {
    const JSON5 = require('json5');
    return JSON5.parse(text);
  } catch {}
  
  return null;
}

export const GeminiProvider: LLMProvider = {
  name: () => 'gemini',
  async generate(p: GenParams): Promise<GenResult> {
    try {
      const ai = await getClient();
      const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
      const model = ai.getGenerativeModel({ model: modelName });
      const { response } = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: p.prompt }]}],
        generationConfig: {
          responseMimeType: p.responseMimeType ?? 'application/json',
          ...(p.responseSchema ? { responseSchema: p.responseSchema } : {}),
          temperature: p.temperature ?? 0.6,
          maxOutputTokens: p.maxOutputTokens ?? 2048,
        },
      });
      const text = typeof (response as any)?.text === 'function' ? (response as any).text() : '';
      let json: any = parseJsonResilient(text);
      return { ok: true, provider: 'gemini', model: modelName, rawText: text, json };
    } catch (e: any) {
      const status = (e?.status ?? e?.code);
      const retriable = !!(Number(status) >= 500 || Number(status) === 429 || String(e?.message || '').toLowerCase().includes('rate'));
      return { ok: false, provider: 'gemini', model: String(process.env.GEMINI_MODEL || 'gemini-1.5-pro'), error: { message: e?.message ?? 'gemini error', code: String(status ?? ''), retriable } };
    }
  }
};


