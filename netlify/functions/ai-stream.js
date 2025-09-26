// Netlify Function: AI stream router with DeepSeek support
// Endpoint alias: /api/ai/stream -> /.netlify/functions/ai-stream

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true }) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const message = String(body.message || '').slice(0, 8000);
    const personaId = body.personaId || (body.persona && body.persona.id) || 'sdr';
    const history = Array.isArray(body.history) ? body.history : [];
    const knowledgeBase = String(body.knowledgeBase || '');
    const requestId = body.requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const flags = body.flags || {};

    // Build final prompt with minimal policy (frontend already builds richer prompts for Gemini fallback)
    const userPrompt = `You are the ${personaId.toUpperCase()} assistant for GGV Inteligência em Vendas.
Use the provided knowledge base when relevant. Answer in Brazilian Portuguese.

CONHECIMENTO:
${knowledgeBase ? knowledgeBase.slice(0, 16000) : 'Nenhum documento relevante encontrado.'}

HISTÓRICO:
${history.slice(-8).map(h => `${h.role === 'user' ? 'Usuário' : 'Assistente'}: ${h.content}`).join('\n')}

PERGUNTA DO USUÁRIO:
${message}`;

    // Provider selection: start with Gemini if key is available; else fallback to DeepSeek
    const geminiKey = process.env.GEMINI_API_KEY || '';
    const deepseekKey = process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_KEY || process.env.DEEPSEEK || '';

    // Prepare stream in NDJSON lines: {type: 'text'|'meta'|'done', data}
    const encoder = new TextEncoder();

    async function streamGemini() {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${geminiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4000 }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API Gemini (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Resposta não disponível';
      
      // Simular streaming palavra por palavra
      const words = text.split(' ');
      const chunks = [];
      let full = '';
      
      for (const word of words) {
        chunks.push({ type: 'text', data: word + ' ' });
        full += word + ' ';
      }
      
      return { chunks, full };
    }

    async function streamDeepseek() {
      const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'Você é um assistente especializado da GGV Inteligência em Vendas. Responda em Português do Brasil, em Markdown claro, direto e com bullets quando apropriado.' },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          stream: true,
        })
      });
      if (!resp.ok || !resp.body) {
        const text = await resp.text().catch(() => '');
        throw new Error(`DeepSeek HTTP ${resp.status}: ${text}`);
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n');
        buffer = parts.pop() || '';
        for (const line of parts) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          // DeepSeek streams with SSE lines prefixed by 'data: '
          const payload = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;
          if (payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload);
            const deltas = json.choices?.[0]?.delta?.content || json.choices?.[0]?.message?.content || '';
            if (deltas) {
              full += deltas;
              chunks.push({ type: 'text', data: deltas });
            }
          } catch {
            // ignore non-JSON keep-alives
          }
        }
      }
      return { chunks, full };
    }

    let resultChunks = [];
    let fullText = '';
    
    // Try Gemini first if key is available
    if (geminiKey) {
      try {
        const { chunks, full } = await streamGemini();
        resultChunks = chunks;
        fullText = full;
      } catch (e) {
        console.log('Gemini failed, trying DeepSeek fallback:', e.message);
        // Fallback to DeepSeek if Gemini fails
        if (deepseekKey) {
          try {
            const { chunks, full } = await streamDeepseek();
            resultChunks = chunks;
            fullText = full;
          } catch (e2) {
            // DeepSeek also failed, try simple one-shot
            const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${deepseekKey}`,
              },
              body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                  { role: 'system', content: 'Você é um assistente da GGV. Responda em Português do Brasil, em Markdown.' },
                  { role: 'user', content: userPrompt }
                ],
                temperature: 0.7
              })
            });
            const j = await r.json().catch(() => ({}));
            const text = j.choices?.[0]?.message?.content || 'Falha ao obter resposta da IA.';
            fullText = text;
            resultChunks = [{ type: 'text', data: text }];
          }
        } else {
          fullText = 'Erro: Gemini falhou e DeepSeek não configurado.';
          resultChunks = [{ type: 'text', data: fullText }];
        }
      }
    } else if (deepseekKey) {
      // No Gemini key, try DeepSeek directly
      try {
        const { chunks, full } = await streamDeepseek();
        resultChunks = chunks;
        fullText = full;
      } catch (e) {
        // fallback to simple one-shot if streaming fails
        const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: 'Você é um assistente da GGV. Responda em Português do Brasil, em Markdown.' },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7
          })
        });
        const j = await r.json().catch(() => ({}));
        const text = j.choices?.[0]?.message?.content || 'Falha ao obter resposta da IA.';
        fullText = text;
        resultChunks = [{ type: 'text', data: text }];
      }
    } else {
      // No keys configured
      fullText = 'Configuração ausente: Configure GEMINI_API_KEY ou DEEPSEEK_API_KEY nas variáveis do Netlify.';
      resultChunks = [{ type: 'text', data: fullText }];
    }

    // Build NDJSON body
    const lines = [];
    for (const c of resultChunks) {
      lines.push(JSON.stringify(c));
    }
    lines.push(JSON.stringify({ type: 'done', data: { requestId } }));

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: lines.join('\n')
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'AI stream failure', message: err.message })
    };
  }
};


