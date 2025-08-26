const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY; // set in Netlify env

const supabase = (SUPABASE_URL && SERVICE_ROLE) ? createClient(SUPABASE_URL, SERVICE_ROLE) : null;

async function fetchCallAndScorecard(callId) {
  const { data: call, error: e1 } = await supabase.from('calls').select('*').eq('id', callId).single();
  if (e1) throw e1;
  // Scorecard ativo (simples): o mais recente ativo
  const { data: sc, error: e2 } = await supabase.from('scorecards').select('*').eq('active', true).order('updated_at', { ascending: false }).limit(1).single();
  if (e2) throw e2;
  const { data: criteria, error: e3 } = await supabase.from('scorecard_criteria').select('*').eq('scorecard_id', sc.id).eq('archived', false).order('order_index');
  if (e3) throw e3;
  return { call, scorecard: sc, criteria };
}

async function callDeepseek(prompt) {
  if (!DEEPSEEK_API_KEY) throw new Error('Missing DEEPSEEK_API_KEY');
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], temperature: 0.2 })
  });
  if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}`);
  const j = await res.json();
  return j?.choices?.[0]?.message?.content || '';
}

function buildPrompt(call, criteria) {
  const trans = call.transcription || '';
  const head = `Você é um avaliador de calls. Avalie a ligação com base nos critérios abaixo. Para cada critério, responda com um JSON: {id, score, justification}. Score permitido: 0, 5, 10. Seja rigoroso e use somente a transcrição fornecida.`;
  const crit = criteria.map(c => `- ${c.id}: ${c.text} (peso ${c.weight}%)`).join('\n');
  return `${head}\n\nCRITÉRIOS:\n${crit}\n\nTRANSCRIÇÃO:\n${trans}\n\nResponda com um array JSON puro, sem comentários.`;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    if (!supabase) return { statusCode: 500, body: 'Supabase not configured' };
    const { callId } = JSON.parse(event.body || '{}');
    if (!callId) return { statusCode: 400, body: 'Missing callId' };

    const { call, scorecard, criteria } = await fetchCallAndScorecard(callId);
    const prompt = buildPrompt(call, criteria);
    let raw = await callDeepseek(prompt);
    // sanitizar e parsear
    const jsonStart = raw.indexOf('[');
    const jsonEnd = raw.lastIndexOf(']');
    const arr = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

    // persistir por critério e calcular total ponderado
    let total = 0; let weightSum = 0;
    for (const it of arr) {
      const criterion = criteria.find(c => c.id === it.id);
      if (!criterion) continue;
      const score = Number(it.score || 0);
      total += score * (criterion.weight || 0);
      weightSum += (criterion.weight || 0);
      await supabase.from('call_scores').insert({ call_id: call.id, scorecard_id: scorecard.id, criterion_id: criterion.id, score, justification: String(it.justification || '').slice(0, 2000) });
    }
    const finalScore = weightSum ? Math.round(total / weightSum) : 0;

    // salvar no calls.scorecard (resumo)
    const payload = { scorecard_id: scorecard.id, final_score: finalScore, evaluated_at: new Date().toISOString() };
    await supabase.from('calls').update({ scorecard: payload, ai_status: 'done' }).eq('id', call.id);

    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, finalScore }) };
  } catch (e) {
    console.error('[analyze-call]', e);
    return { statusCode: 500, body: 'Internal Error' };
  }
}


