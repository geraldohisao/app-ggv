/**
 * Serviço de Análise de Scorecard com Gemini AI
 * Analisa transcrições de chamadas usando critérios de scorecard
 */

import { supabase } from '../../services/supabaseClient';

// Interfaces
interface ScorecardCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  max_score: number;
  order_index: number;
}

interface Scorecard {
  id: string;
  name: string;
  description: string;
  conversation_type: string;
  active: boolean;
}

export interface CriterionAnalysis {
  criterion_id: string;
  criterion_name: string;
  criterion_description: string;
  achieved_score: number;
  max_score: number;
  percentage: number;
  analysis: string;
  suggestions: string[];
  evidence: string[];
}

export interface ScorecardAnalysisResult {
  scorecard_used: {
    id: string;
    name: string;
    description: string;
  };
  overall_score: number;
  max_possible_score: number;
  final_grade: number; // 0-10
  criteria_analysis: CriterionAnalysis[];
  general_feedback: string;
  strengths: string[];
  improvements: string[];
  confidence: number; // 0-1
}

// Função para obter chave da API Gemini
const getGeminiApiKey = async (): Promise<string | null> => {
  // Fallback para configuração local
  const local: any = (globalThis as any).APP_CONFIG_LOCAL;
  if (local && typeof local.GEMINI_API_KEY === 'string') return local.GEMINI_API_KEY;
  
  // Fallback para variáveis de ambiente
  const envKey = process.env.VITE_GEMINI_API_KEY || 
                 (import.meta as any)?.env?.VITE_GEMINI_API_KEY;
  if (envKey) return envKey;
  
  return null;
};

// Função para chamar Gemini API
async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = await getGeminiApiKey();
  
  if (!apiKey) {
    throw new Error('Chave da API Gemini não encontrada. Configure em Settings → Gerenciar Chaves de API');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.2, // Baixa temperatura para análise consistente
        maxOutputTokens: 4000,
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro na API Gemini (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Resposta inválida da API Gemini');
  }

  return data.candidates[0].content.parts[0].text;
}

// Buscar scorecard ativo
async function getActiveScorecard(): Promise<Scorecard | null> {
  try {
    const { data, error } = await supabase
      .from('scorecards')
      .select('*')
      .eq('active', true)
      .single();
    
    if (error) {
      console.warn('⚠️ Erro ao buscar scorecard:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.warn('⚠️ Erro ao buscar scorecard:', error);
    return null;
  }
}

// Buscar critérios do scorecard
async function getScorecardCriteria(scorecardId: string): Promise<ScorecardCriterion[]> {
  try {
    const { data, error } = await supabase.rpc('get_scorecard_criteria', {
      scorecard_id_param: scorecardId
    });
    
    if (error) {
      console.warn('⚠️ Erro ao buscar critérios:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.warn('⚠️ Erro ao buscar critérios:', error);
    return [];
  }
}

// Criar prompt para análise
function createAnalysisPrompt(
  transcription: string, 
  scorecard: Scorecard, 
  criteria: ScorecardCriterion[]
): string {
  return `
Você é um especialista em análise de vendas e deve avaliar esta transcrição de chamada comercial usando o scorecard "${scorecard.name}".

TRANSCRIÇÃO DA CHAMADA:
"""
${transcription}
"""

SCORECARD: ${scorecard.name}
DESCRIÇÃO: ${scorecard.description}

CRITÉRIOS PARA AVALIAÇÃO:
${criteria.map((c, i) => `
${i + 1}. ${c.name} (Peso: ${c.weight}, Pontuação máxima: ${c.max_score})
   Descrição: ${c.description}
`).join('')}

INSTRUÇÕES:
1. Analise a transcrição cuidadosamente
2. Para cada critério, atribua uma pontuação de 0 até a pontuação máxima
3. Identifique evidências específicas na transcrição
4. Forneça análise detalhada e sugestões de melhoria
5. Identifique pontos fortes e oportunidades gerais

RESPONDA APENAS COM JSON no seguinte formato:
{
  "criteria_analysis": [
    {
      "criterion_id": "id_do_criterio",
      "achieved_score": 8,
      "analysis": "Análise detalhada do que foi observado",
      "evidence": ["Trecho específico da transcrição que comprova", "Outro trecho relevante"],
      "suggestions": ["Sugestão específica de melhoria", "Outra sugestão"]
    }
  ],
  "general_feedback": "Feedback geral sobre a performance na chamada",
  "strengths": ["Ponto forte identificado", "Outro ponto forte"],
  "improvements": ["Área de melhoria", "Outra oportunidade"],
  "confidence": 0.85
}

Seja específico, objetivo e construtivo. Use evidências da transcrição para justificar as pontuações.
`;
}

// Função principal de análise
export async function analyzeScorecardWithAI(
  callId: string,
  transcription: string,
  sdrName?: string,
  clientName?: string
): Promise<ScorecardAnalysisResult> {
  
  console.log('🎯 Iniciando análise de scorecard com IA para:', callId);
  
  if (!transcription?.trim()) {
    throw new Error('Transcrição não disponível para análise');
  }

  // Buscar scorecard ativo
  const scorecard = await getActiveScorecard();
  if (!scorecard) {
    throw new Error('Nenhum scorecard ativo encontrado. Configure um scorecard primeiro.');
  }

  // Buscar critérios
  const criteria = await getScorecardCriteria(scorecard.id);
  if (criteria.length === 0) {
    throw new Error(`Scorecard "${scorecard.name}" não possui critérios configurados.`);
  }

  console.log('📋 Scorecard encontrado:', scorecard.name, 'com', criteria.length, 'critérios');

  // Criar prompt e chamar Gemini
  const prompt = createAnalysisPrompt(transcription, scorecard, criteria);
  
  try {
    const response = await callGeminiAPI(prompt);
    
    // Extrair JSON da resposta
    let jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonMatch[0] = jsonMatch[1];
      }
    }

    if (!jsonMatch) {
      throw new Error('Não foi possível extrair JSON da resposta do Gemini');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Processar resultado
    const criteriaAnalysis: CriterionAnalysis[] = criteria.map(criterion => {
      const analysis = parsed.criteria_analysis?.find((a: any) => 
        a.criterion_id === criterion.id || 
        a.criterion_name === criterion.name ||
        parsed.criteria_analysis?.indexOf(a) === criteria.indexOf(criterion)
      ) || parsed.criteria_analysis?.[criteria.indexOf(criterion)];

      const achievedScore = Math.min(
        Math.max(0, analysis?.achieved_score || 0), 
        criterion.max_score
      );

      return {
        criterion_id: criterion.id,
        criterion_name: criterion.name,
        criterion_description: criterion.description,
        achieved_score: achievedScore,
        max_score: criterion.max_score,
        percentage: Math.round((achievedScore / criterion.max_score) * 100),
        analysis: analysis?.analysis || 'Análise não disponível',
        suggestions: analysis?.suggestions || [],
        evidence: analysis?.evidence || []
      };
    });

    // Calcular pontuações
    const totalScore = criteriaAnalysis.reduce((sum, c) => sum + c.achieved_score, 0);
    const maxPossibleScore = criteriaAnalysis.reduce((sum, c) => sum + c.max_score, 0);
    const finalGrade = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) / 10 : 0;

    const result: ScorecardAnalysisResult = {
      scorecard_used: {
        id: scorecard.id,
        name: scorecard.name,
        description: scorecard.description
      },
      overall_score: totalScore,
      max_possible_score: maxPossibleScore,
      final_grade: finalGrade,
      criteria_analysis: criteriaAnalysis,
      general_feedback: parsed.general_feedback || 'Análise concluída com sucesso',
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || [],
      confidence: Math.min(Math.max(0, parsed.confidence || 0.7), 1)
    };

    console.log('✅ Análise concluída:', {
      scorecard: scorecard.name,
      finalGrade: finalGrade,
      totalCriteria: criteriaAnalysis.length,
      confidence: result.confidence
    });

    return result;

  } catch (error) {
    console.error('❌ Erro na análise com Gemini:', error);
    
    // Fallback: análise básica sem IA
    const fallbackAnalysis: CriterionAnalysis[] = criteria.map(criterion => ({
      criterion_id: criterion.id,
      criterion_name: criterion.name,
      criterion_description: criterion.description,
      achieved_score: Math.floor(criterion.max_score * 0.6), // 60% como fallback
      max_score: criterion.max_score,
      percentage: 60,
      analysis: 'Análise automática indisponível. Revise manualmente.',
      suggestions: ['Revisar gravação manualmente', 'Aplicar critérios do scorecard'],
      evidence: []
    }));

    const totalScore = fallbackAnalysis.reduce((sum, c) => sum + c.achieved_score, 0);
    const maxPossibleScore = fallbackAnalysis.reduce((sum, c) => sum + c.max_score, 0);

    return {
      scorecard_used: {
        id: scorecard.id,
        name: scorecard.name,
        description: scorecard.description
      },
      overall_score: totalScore,
      max_possible_score: maxPossibleScore,
      final_grade: 6.0,
      criteria_analysis: fallbackAnalysis,
      general_feedback: 'Análise automática indisponível. Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
      strengths: ['Chamada realizada com sucesso'],
      improvements: ['Configurar chave da API Gemini para análise detalhada'],
      confidence: 0.3
    };
  }
}
