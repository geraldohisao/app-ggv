import { supabase } from './supabaseClient';
import { StrategicMap } from '../types';

// ============================================
// Types & Constants
// ============================================

const DEFAULT_DEEP_THINK_MODEL = 'deepseek-r1';
const FALLBACK_FAST_MODEL = 'deepseek-v3'; // ou gpt-4o-mini
const TIMEOUT_MS = 120000; // 2 minutos para pensar

// Schema JSON Unificado
const strategicMapSchema = {
  type: 'object',
  properties: {
    company_name: { type: 'string' },
    date: { type: 'string' },
    mission: { type: 'string' },
    vision: { type: 'string' },
    values: { type: 'array', items: { type: 'string' } },
    motors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          strategies: {
            type: 'array',
            items: {
              type: 'object',
              properties: { id: { type: 'string' }, text: { type: 'string' } },
              required: ['id', 'text']
            }
          }
        },
        required: ['id', 'name', 'strategies']
      }
    },
    objectives: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          kpis: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                frequency: { type: 'string' },
                target: { type: 'string' }
              },
              required: ['id', 'name', 'frequency', 'target']
            }
          }
        },
        required: ['id', 'title', 'kpis']
      }
    },
    actionPlans: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          quarter: { type: 'string' },
          actions: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'quarter', 'actions']
      }
    },
    roles: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          responsibility: { type: 'string' },
          metrics: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, target: { type: 'string' } },
              required: ['name', 'target']
            }
          }
        },
        required: ['id', 'title']
      }
    },
    rituals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          frequency: { type: 'string' }
        },
        required: ['id', 'name', 'frequency']
      }
    },
    okrs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          keyResults: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                target: { type: 'string' }
              },
              required: ['name']
            }
          }
        },
        required: ['title', 'keyResults']
      }
    }
  },
  required: ['company_name', 'date'],
  additionalProperties: true
} as const;

// ============================================
// Helpers
// ============================================

const getApiKey = async (provider: 'openai' | 'gemini'): Promise<string | null> => {
  try {
    const keyName = provider === 'openai' ? 'openai_api_key' : 'gemini_api_key';
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', keyName)
      .maybeSingle();

    if (error || !data) {
      console.warn(`⚠️ API Key for ${provider} not found.`);
      return null;
    }
    return data.value;
  } catch (err) {
    console.error(`❌ Error fetching API Key for ${provider}:`, err);
    return null;
  }
};

const buildSystemPrompt = () => `Você é um especialista em planejamento estratégico empresarial da GGV Inteligência em Vendas.
Sua função é criar mapas estratégicos completos e estruturados baseados no contexto fornecido.

Retorne APENAS um JSON válido seguindo a estrutura exata abaixo.
Seja realista e executável:
- Mínimo 3 motores com 2-3 estratégias cada
- 3-4 OKRs
- Ações por trimestre (Q1-Q4)
- Papéis e rituais

JSON Schema:
${JSON.stringify(strategicMapSchema, null, 2)}`;

const normalizeMap = (map: any): StrategicMap => {
  const normalized = { ...map };

  if (!normalized.date) normalized.date = new Date().toISOString().split('T')[0];

  // Normalizar OKRs a partir de objectives se necessário
  if ((!normalized.okrs || normalized.okrs.length === 0) && normalized.objectives?.length > 0) {
    normalized.okrs = normalized.objectives.map((obj: any, idx: number) => ({
      id: obj.id || `okr-${idx + 1}`,
      title: obj.title || `OKR ${idx + 1}`,
      keyResults: (obj.kpis || []).map((kpi: any, kIdx: number) => ({
        id: kpi.id || `kr-${idx + 1}-${kIdx + 1}`,
        name: kpi.name || '',
        target: kpi.target?.toString() || ''
      }))
    }));
  }

  return normalized as StrategicMap;
};

// ============================================
// Providers
// ============================================

const callOpenAI = async (context: string, apiKey: string): Promise<StrategicMap> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: `Contexto:\n${context}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 4000
      }),
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`OpenAI Error: ${response.status}`);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    return normalizeMap(JSON.parse(content));
  } finally {
    clearTimeout(timeoutId);
  }
};

const callGemini = async (context: string, apiKey: string): Promise<StrategicMap> => {
  const model = 'gemini-1.5-flash'; // Atualizado para modelo mais recente/estável
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: buildSystemPrompt() + `\nContexto:\n${context}` }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: strategicMapSchema
      }
    })
  });

  if (!response.ok) throw new Error(`Gemini Error: ${response.status}`);
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error('Empty response from Gemini');

  return normalizeMap(JSON.parse(text));
};

// ============================================
// Main Service
// ============================================

export async function generateStrategicMapWithAI(context: string): Promise<StrategicMap> {
  console.log('Classificando estratégia...');

  if (!context || context.trim().length < 20) {
    throw new Error('Contexto muito curto.');
  }

  // Tentativa 1: OpenAI
  try {
    const openAIKey = await getApiKey('openai');
    if (openAIKey) {
      console.log('Usando OpenAI...');
      return await callOpenAI(context, openAIKey);
    }
  } catch (err) {
    console.warn('OpenAI falhou, tentando fallback...', err);
  }

  // Tentativa 2: Gemini
  try {
    const geminiKey = await getApiKey('gemini');
    if (geminiKey) {
      console.log('Usando Gemini...');
      return await callGemini(context, geminiKey);
    }
  } catch (err) {
    console.error('Gemini falhou.', err);
  }

  throw new Error('Não foi possível gerar o mapa estratégico. Verifique as chaves de API.');
}

// ... Manter funções de persistência (saveStrategicMap, etc) sem alterações ...
// (Para economizar espaço, vou incluir apenas as funções de persistência originais abaixo, simplificadas)

export async function saveStrategicMap(map: StrategicMap, userId: string): Promise<string> {
  const mapData = {
    user_id: userId,
    company_name: map.company_name,
    date: map.date,
    mission: map.mission,
    vision: map.vision,
    values: map.values || [],
    motors: map.motors || [],
    objectives: map.objectives || [],
    okrs: map.okrs || [],
    action_plans: map.actionPlans || [],
    roles: map.roles || [],
    rituals: map.rituals || [],
    tracking: map.tracking || []
  };

  if (map.id) {
    const { error } = await supabase.from('strategic_maps').update(mapData).eq('id', map.id).eq('user_id', userId);
    if (error) throw error;
    return map.id;
  } else {
    const { data, error } = await supabase.from('strategic_maps').insert(mapData).select('id').single();
    if (error) throw error;
    return data.id;
  }
}

export async function deleteStrategicMap(mapId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('strategic_maps').delete().eq('id', mapId).eq('user_id', userId);
  if (error) throw error;
}

export async function duplicateStrategicMap(map: StrategicMap, userId: string): Promise<string> {
  const duplicatedMap = {
    ...map,
    id: undefined,
    company_name: `${map.company_name} (Cópia)`,
    date: new Date().toISOString().split('T')[0]
  };
  return await saveStrategicMap(duplicatedMap, userId);
}

export async function listStrategicMaps(userId: string): Promise<StrategicMap[]> {
  const { data, error } = await supabase.from('strategic_maps').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as StrategicMap[];
}

export async function generateExecutiveAnalysis(map: StrategicMap): Promise<string> {
  const apiKey = await getApiKey('openai');
  if (!apiKey) throw new Error('OpenAI Key required for analysis');

  const prompt = `Analise este mapa estratégico: ${map.company_name}. Identifique forças, fraquezas e oportunidades. Resuma em markdown.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Sem análise.';
}
