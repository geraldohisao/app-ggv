import { supabase } from './supabaseClient';
import { StrategicMap } from '../types';

// Função para obter API Key da OpenAI
const getOpenAIApiKey = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'openai_api_key')
      .maybeSingle();

    if (error) {
      console.error('❌ OPENAI - Erro ao buscar API Key:', error);
      return null;
    }

    if (!data) {
      console.warn('⚠️ OPENAI - API Key não encontrada em app_settings');
      return null;
    }

    return data.value;
  } catch (err) {
    console.error('❌ OPENAI - Erro inesperado:', err);
    return null;
  }
};

// Função para chamar OpenAI API para gerar mapa estratégico
async function callOpenAIForStrategicMap(context: string): Promise<StrategicMap> {
  console.log('🔑 OPENAI - Obtendo API Key...');
  const apiKey = await getOpenAIApiKey();
  
  if (!apiKey) {
    console.error('❌ OPENAI - API Key NÃO CONFIGURADA!');
    throw new Error('OpenAI API Key não configurada');
  }
  
  console.log('✅ OPENAI - API Key obtida');
  
  const model = 'gpt-4o-mini';
  console.log('📋 OPENAI - Usando modelo:', model);
  
  const endpoint = 'https://api.openai.com/v1/chat/completions';
  
  const systemPrompt = `Você é um especialista em planejamento estratégico empresarial da GGV Inteligência em Vendas.
Sua função é criar mapas estratégicos completos e estruturados baseados no contexto fornecido.

Você deve SEMPRE retornar um JSON válido com a seguinte estrutura EXATA:

{
  "company_name": "Nome da empresa extraído do contexto",
  "date": "Data atual no formato YYYY-MM-DD",
  "mission": "Missão da empresa (propósito)",
  "vision": "Visão da empresa (onde quer chegar)",
  "values": ["Valor 1", "Valor 2", "Valor 3"],
  "motors": [
    {
      "id": "motor-1",
      "name": "Motor 1",
      "strategies": [
        {"id": "strategy-1-1", "text": "Estratégia 1"},
        {"id": "strategy-1-2", "text": "Estratégia 2"}
      ]
    }
  ],
  "objectives": [
    {
      "id": "objective-1",
      "title": "Objetivo Estratégico",
      "kpis": [
        {
          "id": "kpi-1-1",
          "name": "Nome do KPI",
          "frequency": "Mensal",
          "target": "Meta específica"
        }
      ]
    }
  ],
  "actionPlans": [
    {
      "id": "plan-q1",
      "quarter": "Q1",
      "actions": ["Ação 1", "Ação 2", "Ação 3"]
    }
  ],
  "roles": [
    {
      "id": "role-1",
      "title": "Cargo/Papel",
      "responsibility": "Responsabilidade principal",
      "metrics": [
        {
          "id": "metric-1-1",
          "name": "Métrica",
          "target": "Meta"
        }
      ]
    }
  ],
  "rituals": [
    {
      "id": "ritual-1",
      "name": "Nome do ritual",
      "frequency": "Diário"
    }
  ],
  "tracking": []
}

IMPORTANTE:
- Crie um plano REALISTA e EXECUTÁVEL
- Use dados do contexto fornecido
- Seja específico nas metas (números, percentuais, valores)
- Crie pelo menos 3 motores estratégicos
- Cada motor deve ter 2-3 estratégias
- Crie 3-4 objetivos estratégicos com KPIs mensuráveis
- Defina ações trimestrais (Q1, Q2, Q3, Q4)
- Especifique papéis-chave e suas responsabilidades
- Inclua rituais de gestão (reuniões, reviews)
`;

  const userPrompt = `Com base no contexto abaixo, crie um mapa estratégico completo e estruturado:

CONTEXTO:
${context}

Retorne APENAS o JSON com a estrutura solicitada, sem texto adicional antes ou depois.`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    console.log(`📊 OPENAI - Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ OPENAI - Erro na resposta:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('OpenAI retornou resposta vazia');
    }

    console.log('✅ OPENAI - Resposta recebida');
    
    // Parse do JSON
    const strategicMap = JSON.parse(content) as StrategicMap;
    
    // Garantir que a data está no formato correto
    if (!strategicMap.date) {
      strategicMap.date = new Date().toISOString().split('T')[0];
    }

    return strategicMap;

  } catch (error) {
    console.error('❌ OPENAI - Erro ao gerar mapa estratégico:', error);
    throw error;
  }
}

/**
 * Gera um mapa estratégico usando IA com base no contexto fornecido
 */
export async function generateStrategicMapWithAI(context: string): Promise<StrategicMap> {
  console.log('🎯 OKR AI - Iniciando geração de mapa estratégico...');
  
  if (!context || context.trim().length < 50) {
    throw new Error('Contexto muito curto. Forneça mais detalhes sobre a empresa e seus objetivos (mínimo 50 caracteres).');
  }

  try {
    const strategicMap = await callOpenAIForStrategicMap(context);
    console.log('✅ OKR AI - Mapa estratégico gerado com sucesso!');
    return strategicMap;
  } catch (error) {
    console.error('❌ OKR AI - Erro ao gerar mapa:', error);
    throw new Error(`Erro ao gerar mapa estratégico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Salva um mapa estratégico no Supabase
 */
export async function saveStrategicMap(map: StrategicMap, userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('strategic_maps')
      .insert({
        user_id: userId,
        company_name: map.company_name,
        date: map.date,
        mission: map.mission,
        vision: map.vision,
        values: map.values,
        motors: map.motors,
        objectives: map.objectives,
        action_plans: map.actionPlans,
        roles: map.roles,
        rituals: map.rituals,
        tracking: map.tracking
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Erro ao salvar mapa estratégico:', error);
      throw error;
    }

    console.log('✅ Mapa estratégico salvo com sucesso!');
    return data.id;
  } catch (error) {
    console.error('❌ Erro ao salvar mapa estratégico:', error);
    throw error;
  }
}

/**
 * Lista mapas estratégicos do usuário
 */
export async function listStrategicMaps(userId: string): Promise<StrategicMap[]> {
  try {
    const { data, error } = await supabase
      .from('strategic_maps')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao listar mapas estratégicos:', error);
      throw error;
    }

    return data as StrategicMap[];
  } catch (error) {
    console.error('❌ Erro ao listar mapas estratégicos:', error);
    throw error;
  }
}

