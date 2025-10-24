/**
 * Serviço de Análise de Scorecard com OpenAI GPT
 * Analisa transcrições de chamadas usando critérios de scorecard
 */

import { supabase } from '../../services/supabaseClient';
import { callOpenAI } from './openaiService';

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
  final_grade: number | null; // 0-10 ou null se análise falhou
  criteria_analysis: CriterionAnalysis[];
  general_feedback: string;
  strengths: string[];
  improvements: string[];
  confidence: number; // 0-1
}

// Função para chamar IA (agora usando OpenAI GPT)
async function callAIAPI(prompt: string): Promise<string> {
  console.log('🤖 Iniciando chamada para OpenAI GPT...');
  
  try {
    const response = await callOpenAI(prompt);
    console.log('✅ OpenAI GPT respondeu com sucesso!');
    return response;
  } catch (error) {
    console.error('❌ Erro ao chamar OpenAI:', error);
    throw new Error('API OpenAI indisponível. Verifique a configuração da chave em app_settings.');
  }
}

// Tentar extrair e reparar JSON retornado pelo modelo
function extractJson(text: string): any {
  try {
    console.log('🔍 Tentando extrair JSON da resposta:', (text || '').substring(0, 200) + '...');
  } catch {
    console.log('🔍 Tentando extrair JSON da resposta: [conteúdo indisponível]');
  }
  
  const tryParse = (s: string): any => {
    try { 
      const parsed = JSON.parse(s);
      console.log('✅ JSON válido encontrado!');
      return parsed;
    } catch (e) { 
      console.log('❌ JSON inválido:', e.message);
      return null; 
    }
  };

  // 1) Bloco ```json ... ```
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```\s*([\s\S]*?)\s*```/i);
  if (fenced && fenced[1]) {
    console.log('🔍 Tentando bloco fenced JSON...');
    const parsed = tryParse(fenced[1].trim());
    if (parsed) return parsed;
  }

  // 2) Encontrar primeiro objeto JSON equilibrado
  const start = text.indexOf('{');
  if (start !== -1) {
    console.log('🔍 Tentando encontrar objeto JSON...');
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          const candidate = text.slice(start, i + 1);
          try { console.log('🔍 Candidato JSON:', (candidate || '').substring(0, 100) + '...'); } catch {}
          const parsed = tryParse(candidate);
          if (parsed) return parsed;
          
          // 2b) Reparos simples: remover vírgulas finais
          const repaired = candidate
            .replace(/,\s*([}\]])/g, '$1')
            .replace(/\t/g, ' ')
            .replace(/\n\s*\n/g, '\n');
          try { console.log('🔍 JSON reparado:', (repaired || '').substring(0, 100) + '...'); } catch {}
          const parsedRepaired = tryParse(repaired);
          if (parsedRepaired) return parsedRepaired;
          break;
        }
      }
    }
  }

  // 3) Tentativa final: remover linhas de comentário acidentais
  const noComments = text.replace(/^\s*\/\/.*$/gm, '').replace(/^\s*#.*$/gm, '');
  console.log('🔍 Tentando sem comentários...');
  const parsedNoComments = tryParse(noComments);
  if (parsedNoComments) return parsedNoComments;

  // 4) Fallback: criar JSON básico se nada funcionar
  console.log('⚠️ Criando JSON de fallback...');
  return {
    criteria_analysis: [],
    general_feedback: 'Análise automática indisponível. Resposta do modelo não pôde ser processada.',
    strengths: ['Chamada realizada com sucesso'],
    improvements: ['Revisar configuração do modelo de IA'],
    confidence: 0.3,
    analysis_failed: true // Flag para indicar que a análise falhou
  };
}

// Buscar scorecard inteligente baseado nos dados da chamada
async function getActiveScorecard(callData?: any): Promise<Scorecard | null> {
  try {
    console.log('🔍 Buscando scorecard inteligente para:', {
      call_type: callData?.call_type,
      pipeline: callData?.pipeline,
      cadence: callData?.cadence
    });

    // Usar nossa nova função inteligente
    const { data: scorecardMatch, error: matchError } = await supabase.rpc('get_scorecard_smart', {
      call_type_param: callData?.call_type || null,
      pipeline_param: callData?.pipeline || null,
      cadence_param: callData?.cadence || null
    });
    
    if (matchError) {
      console.warn('⚠️ Erro ao buscar scorecard inteligente:', matchError);
      return null;
    }
    
    if (!scorecardMatch || scorecardMatch.length === 0) {
      console.warn('⚠️ Nenhum scorecard encontrado');
      return null;
    }
    
    const match = Array.isArray(scorecardMatch) ? scorecardMatch[0] : scorecardMatch;
    console.log('✅ Scorecard inteligente selecionado:', {
      name: match.name,
      match_score: match.match_score,
      id: match.id
    });
    
    // Retornar o scorecard diretamente (já vem completo da função)
    return {
      id: match.id,
      name: match.name,
      description: match.description,
      active: match.is_active
    };
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
Você é um especialista em análise de vendas B2B com 15+ anos de experiência. Analise esta transcrição de chamada comercial usando o scorecard "${scorecard.name}".

CONTEXTO DA ANÁLISE:
- Scorecard: ${scorecard.name}
- Descrição: ${scorecard.description}
- Objetivo: Avaliar performance da ligação comercial

TRANSCRIÇÃO DA CHAMADA:
"""
${transcription}
"""

CRITÉRIOS DE AVALIAÇÃO (${criteria.length} critérios):
${criteria.map((c, i) => `
${i + 1}. 📊 ${c.name} (Peso: ${c.weight}/3, Pontuação máxima: ${c.max_score}/3)
   🎯 Descrição: ${c.description}
   💡 O que avaliar: Busque evidências concretas na transcrição
`).join('')}

ESCALA DE PONTUAÇÃO:
- 0 pontos: Critério não atendido ou não abordado
- 1 ponto: Critério parcialmente atendido
- 2 pontos: Critério bem atendido
- 3 pontos: Critério excelentemente atendido (apenas quando excepcional)

DIRETRIZES DE ANÁLISE:
✅ SEJA RIGOROSO: Pontuações altas devem ser bem justificadas
✅ USE EVIDÊNCIAS: Cite trechos específicos da transcrição
✅ SEJA CONSTRUTIVO: Sugestões práticas e acionáveis
✅ CONSIDERE CONTEXTO: Tipo de ligação, etapa do pipeline, perfil do cliente
✅ AVALIE NATURALIDADE: Conversas forçadas devem ter pontuação menor

IMPORTANTE: RESPONDA APENAS COM JSON VÁLIDO. SEM TEXTO ADICIONAL.

Formato JSON obrigatório:
{
  "criteria_analysis": [
    {
      "criterion_id": "id_do_criterio",
      "achieved_score": 2,
      "analysis": "Análise objetiva baseada em evidências da transcrição",
      "evidence": ["'Trecho exato da transcrição que comprova'", "'Outro trecho relevante'"],
      "suggestions": ["Sugestão específica e acionável", "Melhoria com exemplo prático"]
    }
  ],
  "general_feedback": "Resumo executivo da performance: pontos fortes, principais gaps e próximos passos",
  "strengths": ["Ponto forte específico com evidência", "Habilidade demonstrada na ligação"],
  "improvements": ["Oportunidade de melhoria com ação específica", "Técnica para aplicar na próxima ligação"],
  "confidence": 0.85
}

VALIDAÇÃO OBRIGATÓRIA:
- Todos os criterion_id devem corresponder aos critérios fornecidos
- achieved_score deve estar entre 0 e max_score de cada critério
- evidence deve conter trechos literais da transcrição
- confidence deve refletir a qualidade da transcrição e clareza da análise
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

  // Buscar scorecard inteligente baseado nos dados da chamada
  const callData = await supabase.rpc('get_call_detail', { p_call_id: callId });
  const scorecard = await getActiveScorecard(callData?.data?.[0]);
  if (!scorecard) {
    throw new Error('Nenhum scorecard ativo encontrado. Configure um scorecard primeiro.');
  }

  // Buscar critérios
  const criteria = await getScorecardCriteria(scorecard.id);
  if (criteria.length === 0) {
    throw new Error(`Scorecard "${scorecard.name}" não possui critérios configurados.`);
  }

  console.log('📋 Scorecard encontrado:', scorecard.name, 'com', criteria.length, 'critérios');

  // Criar prompt e chamar OpenAI GPT
  const prompt = createAnalysisPrompt(transcription, scorecard, criteria);
  
  try {
    const response = await callAIAPI(prompt);
    const parsed = extractJson(response);
    
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

    // Verificar se a análise falhou
    const analysisFailed = parsed.analysis_failed === true;
    
    // Calcular pontuações apenas se a análise não falhou
    let totalScore = 0;
    let maxPossibleScore = 0;
    let finalGrade = 0;
    
    if (!analysisFailed) {
      // ✅ CALCULAR COM PESOS: score ponderado pela importância de cada critério
      totalScore = criteriaAnalysis.reduce((sum, c, index) => {
        const criterion = criteria[index];
        const weightedScore = c.achieved_score * (criterion.weight || 1);
        return sum + weightedScore;
      }, 0);
      
      maxPossibleScore = criteriaAnalysis.reduce((sum, c, index) => {
        const criterion = criteria[index];
        const weightedMaxScore = c.max_score * (criterion.weight || 1);
        return sum + weightedMaxScore;
      }, 0);
      
      finalGrade = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) / 10 : 0;
      
      console.log('📊 Cálculo com pesos:', {
        totalScore,
        maxPossibleScore, 
        finalGrade,
        criteriaCount: criteria.length
      });
    } else {
      console.log('⚠️ Análise falhou - não calculando nota');
    }

    const result: ScorecardAnalysisResult = {
      scorecard_used: {
        id: scorecard.id,
        name: scorecard.name,
        description: scorecard.description
      },
      overall_score: totalScore,
      max_possible_score: maxPossibleScore,
      final_grade: analysisFailed ? null : finalGrade, // null quando análise falha
      criteria_analysis: criteriaAnalysis,
      general_feedback: parsed.general_feedback || (analysisFailed ? 'Análise automática indisponível' : 'Análise concluída com sucesso'),
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || [],
      confidence: analysisFailed ? 0 : Math.min(Math.max(0, parsed.confidence || 0.7), 1)
    };

    console.log('✅ Análise concluída:', {
      scorecard: scorecard.name,
      finalGrade: finalGrade,
      totalCriteria: criteriaAnalysis.length,
      confidence: result.confidence
    });

    return result;

  } catch (error) {
    console.error('❌ Erro na análise com OpenAI GPT:', error);
    
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
      overall_score: null, // ✅ NULL ao invés de 0
      max_possible_score: null, // ✅ NULL ao invés de 0
      final_grade: null, // Sem nota quando análise falha
      criteria_analysis: fallbackAnalysis,
      general_feedback: 'Análise automática indisponível. Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
      strengths: ['Chamada realizada com sucesso'],
      improvements: ['Configurar chave da API OpenAI para análise detalhada'],
      confidence: 0.3,
      analysis_failed: true // ✅ Flag para indicar falha
    };
  }
}
