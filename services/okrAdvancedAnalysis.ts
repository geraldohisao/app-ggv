import { StrategicMap } from '../types';
import { supabase } from './supabaseClient';

interface AnalysisResult {
  executiveSummary: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  recommendations: string[];
  score: number;
}

/**
 * Análise avançada com comparação histórica
 */
export const generateAdvancedAnalysis = async (
  map: StrategicMap,
  apiKey: string
): Promise<AnalysisResult> => {
  try {
    const history = await getMapHistory(map.id!);
    const trends = analyzeHistoricalTrends(map, history);
    
    const analysis = await callAdvancedAnalysisAI(map, {
      trends,
      apiKey
    });
    
    return analysis;
  } catch (error) {
    console.error('❌ Erro na análise avançada:', error);
    throw error;
  }
};

const getMapHistory = async (mapId: string): Promise<StrategicMap[]> => {
  try {
    const { data } = await supabase
      .from('strategic_maps_history')
      .select('snapshot')
      .eq('map_id', mapId)
      .order('version_number', { ascending: false })
      .limit(5);
    
    return data?.map(v => v.snapshot) || [];
  } catch (error) {
    console.warn('⚠️ Erro ao buscar histórico:', error);
    return [];
  }
};

const analyzeHistoricalTrends = (
  current: StrategicMap,
  history: StrategicMap[]
): any => {
  if (history.length === 0) {
    return {
      objectives_growth: 0,
      kpis_growth: 0,
      complexity_trend: 'stable'
    };
  }

  const previous = history[0];
  
  const currentObjectivesCount = current.objectives?.length || 0;
  const previousObjectivesCount = previous.objectives?.length || 0;
  
  const currentKpisCount = current.objectives?.reduce(
    (sum, obj) => sum + (obj.kpis?.length || 0),
    0
  ) || 0;
  
  const previousKpisCount = previous.objectives?.reduce(
    (sum, obj) => sum + (obj.kpis?.length || 0),
    0
  ) || 0;
  
  return {
    objectives_growth: currentObjectivesCount - previousObjectivesCount,
    kpis_growth: currentKpisCount - previousKpisCount,
    complexity_trend: currentKpisCount > previousKpisCount ? 'increasing' : 'stable'
  };
};

const callAdvancedAnalysisAI = async (
  map: StrategicMap,
  context: any
): Promise<AnalysisResult> => {
  const prompt = `Você é um consultor estratégico sênior. Analise o seguinte mapa estratégico:

**MAPA ATUAL:**
- Empresa: ${map.company_name}
- Objetivos: ${map.objectives?.length || 0}
- KPIs: ${map.objectives?.reduce((sum, obj) => sum + (obj.kpis?.length || 0), 0) || 0}
- Motores: ${map.motors?.length || 0}

**TENDÊNCIAS:**
- Crescimento de objetivos: ${context.trends.objectives_growth}
- Crescimento de KPIs: ${context.trends.kpis_growth}
- Tendência: ${context.trends.complexity_trend}

**ANÁLISE SOLICITADA:**
Retorne APENAS um JSON com:
{
  "executiveSummary": "3-4 frases sobre a estratégia",
  "strengths": ["ponto forte 1", "ponto forte 2", "ponto forte 3"],
  "weaknesses": ["ponto fraco 1", "ponto fraco 2", "ponto fraco 3"],
  "opportunities": ["oportunidade 1", "oportunidade 2", "oportunidade 3"],
  "threats": ["ameaça 1", "ameaça 2", "ameaça 3"],
  "recommendations": ["recomendação 1", "recomendação 2", "recomendação 3"],
  "score": 85
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${context.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um consultor estratégico sênior especializado em OKRs e análise SWOT.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = JSON.parse(data.choices?.[0]?.message?.content || '{}');

    return analysis as AnalysisResult;
  } catch (error) {
    console.error('❌ Erro ao gerar análise:', error);
    throw error;
  }
};

/**
 * Obter API Key da OpenAI
 */
export const getOpenAIApiKey = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'openai_api_key')
      .maybeSingle();

    if (error || !data) return null;
    return data.value;
  } catch (error) {
    console.error('❌ Erro ao obter API Key:', error);
    return null;
  }
};

