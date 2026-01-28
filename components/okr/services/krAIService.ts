import { supabase } from '../../../services/supabaseClient';

// ============================================
// API KEYS
// ============================================

const isValidKey = (key?: string | null) => {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (!trimmed) return false;
  // Evitar usar placeholders comuns
  return !/SUBSTITUA|PLACEHOLDER|REPLACE|YOUR_API_KEY/i.test(trimmed);
};

const normalizeKey = (value: any): string | null => {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    if (typeof value.apiKey === 'string') return value.apiKey.trim();
    if (typeof value.key === 'string') return value.key.trim();
    if (typeof value.value === 'string') return value.value.trim();
  }
  return null;
};

const getApiKey = async (provider: 'openai' | 'gemini'): Promise<string | null> => {
  const keyName = provider === 'openai' ? 'openai_api_key' : 'gemini_api_key';

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', keyName)
      .maybeSingle();

    if (error) {
      console.error(`❌ ${provider.toUpperCase()} - Erro ao buscar API Key:`, error);
    }

    const dbKey = normalizeKey(data?.value);
    if (isValidKey(dbKey)) {
      console.log(`✅ ${provider.toUpperCase()} - API Key encontrada no Supabase (mascarada).`);
      return dbKey!;
    }
  } catch (err) {
    console.error(`❌ ${provider.toUpperCase()} - Erro inesperado ao buscar key:`, err);
  }

  // Fallback 1: variáveis de ambiente (Vite/Node)
  const envKey =
    (provider === 'openai'
      ? process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || (import.meta as any)?.env?.VITE_OPENAI_API_KEY
      : process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || (import.meta as any)?.env?.VITE_GEMINI_API_KEY) as
    | string
    | undefined;

  if (isValidKey(envKey)) return envKey!;

  // Fallback 2: configs locais injetadas (APP_CONFIG_LOCAL ou LOCAL_CONFIG)
  const localConfig: any =
    (globalThis as any).APP_CONFIG_LOCAL ||
    (globalThis as any).LOCAL_CONFIG ||
    (typeof window !== 'undefined' ? (window as any).APP_CONFIG_LOCAL || (window as any).LOCAL_CONFIG : undefined);

  const localKey =
    provider === 'openai'
      ? normalizeKey(localConfig?.OPENAI_API_KEY) || normalizeKey(localConfig?.openaiApiKey)
      : normalizeKey(localConfig?.GEMINI_API_KEY);

  if (isValidKey(localKey)) {
    console.log(`✅ ${provider.toUpperCase()} - API Key encontrada em config local.`);
    return localKey;
  }

  console.warn(`⚠️ ${provider.toUpperCase()} - API Key não configurada ou placeholder detectado.`);
  return null;
};

// ============================================
// SCHEMA DE KEY RESULTS
// ============================================

const krSuggestionSchema = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          type: { type: 'string', enum: ['numeric', 'percentage', 'currency', 'activity'] },
          direction: { type: 'string', enum: ['increase', 'decrease'] },
          start_value: { type: 'number' },
          target_value: { type: 'number' },
          unit: { type: 'string' },
          rationale: { type: 'string' },
        },
        required: ['title', 'type', 'target_value'],
      },
    },
  },
  required: ['suggestions'],
};

// ============================================
// OPENAI
// ============================================

async function suggestKRsWithOpenAI(objective: string, description?: string | null): Promise<any> {
  const apiKey = await getApiKey('openai');
  if (!apiKey) throw new Error('OpenAI API Key não configurada');

  const extraContext = (description || '').trim();
  const prompt = `Você é um especialista em OKRs (Objectives and Key Results).

OBJETIVO DO USUÁRIO:
"${objective}"

${extraContext ? `DESCRIÇÃO/CONTEXTO (OPCIONAL):
"${extraContext}"

` : ''}TAREFA:
Sugira entre 3 e 5 Key Results (KRs) SMART para este objetivo.

REGRAS:
1. Cada KR deve ser específico, mensurável e com meta numérica clara
2. Tipos disponíveis:
   - "numeric": quantidade (leads, SQL, contratos)
   - "percentage": percentual (conversão, NPS, churn)
   - "currency": valores em R$ (receita, ticket médio)
   - "activity": atividade binária (implantar sistema, lançar campanha)

3. Direção:
   - "increase": mais é melhor (receita, conversão, leads)
   - "decrease": menos é melhor (churn, tempo de ciclo, cancelamentos)

4. Para metas "de X para Y", preencha start_value e target_value
5. Para atividades, apenas target_value=1 (0=não feito, 1=feito)

EXEMPLO DE RESPOSTA (JSON puro):
{
  "suggestions": [
    {
      "title": "Aumentar conversão SQL → Won",
      "type": "percentage",
      "direction": "increase",
      "start_value": 20,
      "target_value": 35,
      "unit": "%",
      "rationale": "Meta ambiciosa mas alcançável com melhoria no pitch"
    }
  ]
}

Retorne APENAS o JSON sem explicações adicionais.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um especialista em OKRs. Responda SEMPRE em JSON válido.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('❌ OpenAI Error Response:', error);
    throw new Error(`OpenAI Error: ${error?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI retornou resposta vazia');

  return JSON.parse(content);
}

// ============================================
// GEMINI (Fallback)
// ============================================

async function suggestKRsWithGemini(objective: string, description?: string | null): Promise<any> {
  const apiKey = await getApiKey('gemini');
  if (!apiKey) throw new Error('Gemini API Key não configurada');

  const extraContext = (description || '').trim();
  const prompt = `Sugira entre 3 e 5 Key Results para este objetivo: "${objective}".
${extraContext ? `\nContexto/descrição do OKR: "${extraContext}".\n` : '\n'}

Retorne JSON no formato:
{
  "suggestions": [
    {
      "title": "Nome do KR",
      "type": "numeric" | "percentage" | "currency" | "activity",
      "direction": "increase" | "decrease",
      "start_value": number,
      "target_value": number,
      "unit": "string",
      "rationale": "string"
    }
  ]
}`;

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash']; // Modelos atualizados

  for (const model of models) {
    try {
      console.log(`🔄 Tentando Gemini modelo: ${model}`);
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: krSuggestionSchema,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Resposta vazia do Gemini');
        return JSON.parse(text);
      } else {
        const err = await response.json().catch(() => ({}));
        console.warn(`⚠️ Gemini ${model} falhou:`, err);
      }
    } catch (error) {
      console.warn(`⚠️ Gemini modelo ${model} exceção:`, error);
    }
  }

  throw new Error('Todos os modelos Gemini falharam');
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

export async function suggestKeyResults(objective: string, description?: string | null): Promise<{
  title: string;
  type: string;
  direction?: string;
  start_value?: number;
  current_value?: number;
  target_value?: number;
  unit?: string;
  rationale?: string;
}[]> {
  console.log('🤖 IA - Iniciando sugestão de KRs para:', objective);

  try {
    // Tenta OpenAI
    console.log('🔵 Tentando OpenAI...');
    try {
      const result = await suggestKRsWithOpenAI(objective, description);
      console.log('✅ OpenAI retornou sugestões!');
      return result.suggestions || [];
    } catch (openAIError) {
      console.warn('⚠️ OpenAI falhou, iniciando fallback para Gemini...', openAIError);
    }

    // Fallback Gemini
    console.log('🟣 Tentando Gemini...');
    try {
      const result = await suggestKRsWithGemini(objective, description);
      console.log('✅ Gemini retornou sugestões!');
      return result.suggestions || [];
    } catch (geminiError) {
      console.error('❌ Gemini também falhou.', geminiError);
      throw new Error(`Falha em ambos provedores (OpenAI e Gemini). Verifique chaves de API.`);
    }

  } catch (finalError) {
    console.error('❌ Erro fatal ao sugerir KRs:', finalError);
    throw new Error('Não foi possível gerar sugestões de KRs no momento.');
  }
}

