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

export const DeepSeekProvider: LLMProvider = {
  name: () => 'deepseek',
  async generate(p: GenParams): Promise<GenResult> {
    try {
      const url = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1/chat/completions';
      const modelName = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: p.prompt }],
          temperature: p.temperature ?? 0.6,
          response_format: p.responseMimeType === 'application/json' ? { type: 'json_object' } : undefined,
          max_tokens: p.maxOutputTokens ?? 2048,
        })
      });
      if (!res.ok) {
        const txt = await res.text();
        const retriable = [429,500,502,503,504].includes(res.status);
        return { ok: false, provider: 'deepseek', model: modelName, error: { message: txt, code: String(res.status), retriable } };
      }
      const data: any = await res.json();
      const text: string = data?.choices?.[0]?.message?.content ?? '';
      let json: any = parseJsonResilient(text);
      return { ok: true, provider: 'deepseek', model: modelName, rawText: text, json };
    } catch (e: any) {
      const retriable = true;
      return { ok: false, provider: 'deepseek', model: String(process.env.DEEPSEEK_MODEL || 'deepseek-chat'), error: { message: e?.message ?? 'deepseek error', retriable } };
    }
  }
};


