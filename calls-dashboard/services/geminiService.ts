import { AiInsight, CallItem } from '../types';
import { supabase } from '../../services/supabaseClient';

interface AIAnalysisResult {
  success: boolean;
  error?: string;
  scorecard_used?: {
    id: string;
    name: string;
    description: string;
  };
  overall_score?: number;
  max_possible_score?: number;
  general_comment?: string;
  detailed_analysis?: string;
  criteria_analysis?: Array<{
    criterion_id: string;
    criterion_name: string;
    criterion_description: string;
    weight: number;
    achieved_score: number;
    percentage: number;
    analysis: string;
  }>;
  criteria_count?: number;
  fallback_analysis?: {
    score: number;
    comment: string;
    analysis: string;
  };
}

// Interface para critérios do scorecard
interface ScorecardCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
  order_index: number;
}

// Interface para scorecard
interface Scorecard {
  id: string;
  name: string;
  description: string;
  conversation_type: string;
  active: boolean;
}

// Análise de IA avançada usando scorecard
export async function analyzeCallWithAI(call: CallItem): Promise<AiInsight[]> {
  await new Promise((r) => setTimeout(r, 500)); // Simular processamento
  
  const insights: AiInsight[] = [];
  
  // Verificar se a chamada é muito curta (menos de 3 minutos)
  if (!call.durationSec || call.durationSec < 180) {
    insights.push({
      title: 'Chamada muito curta para análise',
      content: `Duração de ${call.durationSec ? Math.floor(call.durationSec/60) : 0} minutos é insuficiente para análise detalhada com scorecard.`,
      severity: 'warning'
    });
    return insights;
  }
  
  // Verificar se há transcrição
  if (!call.transcription || call.transcription.length < 100) {
    insights.push({
      title: 'Transcrição insuficiente',
      content: 'Não há transcrição adequada para realizar análise com scorecard.',
      severity: 'warning'
    });
    return insights;
  }
  
  try {
    // Usar nova função de análise IA otimizada
    const { data: analysisResult, error } = await supabase.rpc('perform_full_ai_analysis', {
      call_id_param: call.id
    });

    if (error) {
      console.error('Erro na análise IA:', error);
      return await fallbackAnalysis(call);
    }

    const result = analysisResult as AIAnalysisResult;

    if (!result.success) {
      if (result.fallback_analysis) {
        insights.push({
          title: 'Análise Básica',
          content: `${result.fallback_analysis.comment} - Score: ${result.fallback_analysis.score}/10`,
          severity: 'info'
        });
        insights.push({
          title: 'Detalhes da Análise',
          content: result.fallback_analysis.analysis,
          severity: 'info'
        });
      } else {
        return await fallbackAnalysis(call);
      }
      return insights;
    }

    // Processar resultado da análise otimizada
    return processOptimizedAnalysis(result);
    
  } catch (error) {
    console.error('Erro na análise IA:', error);
    return await fallbackAnalysis(call);
  }
}

// Buscar scorecard apropriado
async function getAppropriateScorecard(callType: string): Promise<Scorecard | null> {
  try {
    const { data, error } = await supabase.rpc('get_scorecard_by_call_type', {
      p_call_type: callType
    });
    
    if (error) {
      console.error('Erro ao buscar scorecard:', error);
      return null;
    }
    
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Erro inesperado ao buscar scorecard:', error);
    return null;
  }
}

// Buscar critérios do scorecard
async function getScorecardCriteria(scorecardId: string): Promise<ScorecardCriteria[] | null> {
  try {
    const { data, error } = await supabase.rpc('get_scorecard_criteria', {
      p_scorecard_id: scorecardId
    });
    
    if (error) {
      console.error('Erro ao buscar critérios:', error);
      return null;
    }
    
    return data || [];
  } catch (error) {
    console.error('Erro inesperado ao buscar critérios:', error);
    return null;
  }
}

// Análise com scorecard
async function analyzeWithScorecard(call: CallItem, scorecard: Scorecard, criteria: ScorecardCriteria[]): Promise<AiInsight[]> {
  const insights: AiInsight[] = [];
  const transcription = call.transcription!.toLowerCase();
  
  let totalScore = 0;
  let maxPossibleScore = 0;
  let analyzedCriteria = 0;
  
  // Analisar cada critério
  for (const criterion of criteria) {
    const score = analyzeCriterion(transcription, criterion);
    totalScore += score;
    maxPossibleScore += criterion.max_score;
    analyzedCriteria++;
    
    // Adicionar insight específico do critério se relevante
    if (score === 0) {
      insights.push({
        title: `Critério não atendido: ${criterion.name}`,
        content: criterion.description || 'Este critério não foi identificado na conversa.',
        severity: 'error'
      });
    } else if (score === criterion.max_score) {
      insights.push({
        title: `Excelente: ${criterion.name}`,
        content: 'Este critério foi muito bem executado na conversa.',
        severity: 'success'
      });
    }
  }
  
  // Calcular nota final (0-10)
  const finalScore = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 10) : 0;
  
  // Insight principal com a nota
  if (finalScore >= 8) {
    insights.unshift({
      title: `Análise Scorecard: ${finalScore}/10 - Excelente`,
      content: `Chamada analisada com scorecard "${scorecard.name}". Performance excepcional em ${analyzedCriteria} critérios.`,
      severity: 'success'
    });
  } else if (finalScore >= 6) {
    insights.unshift({
      title: `Análise Scorecard: ${finalScore}/10 - Bom`,
      content: `Chamada analisada com scorecard "${scorecard.name}". Boa performance com oportunidades de melhoria.`,
      severity: 'info'
    });
  } else {
    insights.unshift({
      title: `Análise Scorecard: ${finalScore}/10 - Precisa Melhorar`,
      content: `Chamada analisada com scorecard "${scorecard.name}". Vários critérios precisam de atenção.`,
      severity: 'error'
    });
  }
  
  // Adicionar insights gerais
  const duration = Math.floor(call.durationSec! / 60);
  insights.push({
    title: 'Duração da conversa',
    content: `Chamada de ${duration} minutos permitiu análise detalhada com ${analyzedCriteria} critérios.`,
    severity: 'info'
  });
  
  return insights;
}

// Analisar critério específico
function analyzeCriterion(transcription: string, criterion: ScorecardCriteria): number {
  const criterionName = criterion.name.toLowerCase();
  
  // Palavras-chave por tipo de critério
  const keywordMaps: Record<string, string[]> = {
    'apresentou': ['apresento', 'meu nome', 'sou da', 'empresa', 'trabalho'],
    'tempo': ['tempo', 'minutos', 'disponível', 'ocupado', 'pressa'],
    'objetivo': ['objetivo', 'motivo', 'ligação', 'chamada', 'contato'],
    'problema': ['problema', 'dificuldade', 'desafio', 'dor', 'questão'],
    'solução': ['solução', 'resolver', 'ajudar', 'atender', 'proposta'],
    'faturamento': ['faturamento', 'receita', 'vendas', 'milhões', 'mil'],
    'equipe': ['equipe', 'vendedores', 'time', 'pessoas', 'funcionários'],
    'agenda': ['agenda', 'reunião', 'encontro', 'horário', 'disponibilidade'],
    'email': ['email', 'e-mail', 'endereço', 'contato']
  };
  
  // Identificar tipo de critério e buscar palavras-chave
  let foundKeywords = 0;
  let totalKeywords = 0;
  
  for (const [type, keywords] of Object.entries(keywordMaps)) {
    if (criterionName.includes(type)) {
      totalKeywords = keywords.length;
      foundKeywords = keywords.filter(keyword => transcription.includes(keyword)).length;
      break;
    }
  }
  
  // Se não encontrou tipo específico, usar análise geral
  if (totalKeywords === 0) {
    // Análise baseada em palavras do próprio critério
    const criterionWords = criterionName.split(' ').filter(word => word.length > 3);
    totalKeywords = criterionWords.length;
    foundKeywords = criterionWords.filter(word => transcription.includes(word)).length;
  }
  
  // Calcular score baseado na proporção de palavras-chave encontradas
  if (totalKeywords === 0) return Math.floor(criterion.max_score / 2); // Score médio se não conseguir analisar
  
  const proportion = foundKeywords / totalKeywords;
  
  if (proportion >= 0.7) return criterion.max_score;
  if (proportion >= 0.4) return Math.floor(criterion.max_score * 0.7);
  if (proportion >= 0.2) return Math.floor(criterion.max_score * 0.4);
  
  return 0;
}

// Análise de fallback (quando não há scorecard)
async function fallbackAnalysis(call: CallItem): Promise<AiInsight[]> {
  const insights: AiInsight[] = [];
  
  insights.push({
    title: 'Análise Básica',
    content: 'Scorecard não encontrado. Realizando análise básica da chamada.',
    severity: 'info'
  });
  
  // Análise de duração
  if (call.durationSec && call.durationSec > 300) {
    insights.push({
      title: 'Boa duração de conversa',
      content: `Chamada de ${Math.floor(call.durationSec/60)} minutos indica bom engajamento.`,
      severity: 'success'
    });
  }
  
  // Análise básica de transcrição
  if (call.transcription) {
    const transcription = call.transcription.toLowerCase();
    
    if (transcription.includes('agenda') || transcription.includes('reunião')) {
      insights.push({
        title: 'Próximos passos identificados',
        content: 'Chamada teve encaminhamento para próximos passos.',
        severity: 'success'
      });
    }
    
    if (transcription.includes('problema') || transcription.includes('desafio')) {
      insights.push({
        title: 'Descoberta de necessidades',
        content: 'SDR identificou problemas ou desafios do cliente.',
        severity: 'success'
      });
    }
  }
  
  return insights;
}

// Nova função para processar análise otimizada
function processOptimizedAnalysis(result: AIAnalysisResult): AiInsight[] {
  const insights: AiInsight[] = [];

  // Insight principal com score
  insights.push({
    title: `Análise IA - Score: ${result.overall_score}/10`,
    content: result.general_comment || 'Análise concluída com sucesso.',
    severity: result.overall_score && result.overall_score >= 7 ? 'success' : 
              result.overall_score && result.overall_score >= 5 ? 'warning' : 'error'
  });

  // Scorecard utilizado
  if (result.scorecard_used) {
    insights.push({
      title: `Scorecard: ${result.scorecard_used.name}`,
      content: `Análise baseada em ${result.criteria_count || 0} critérios. ${result.detailed_analysis}`,
      severity: 'info'
    });
  }

  // Análise por critério
  if (result.criteria_analysis && result.criteria_analysis.length > 0) {
    result.criteria_analysis.forEach((criterion, index) => {
      const severity = criterion.percentage >= 80 ? 'success' : 
                     criterion.percentage >= 60 ? 'warning' : 'error';
      
      insights.push({
        title: `${index + 1}. ${criterion.criterion_name} (${criterion.percentage}%)`,
        content: `${criterion.analysis} - Score: ${criterion.achieved_score}/10 (Peso: ${criterion.weight})`,
        severity: severity
      });
    });
  }

  // Resumo final
  if (result.criteria_analysis && result.criteria_analysis.length > 0) {
    const excellentCriteria = result.criteria_analysis.filter(c => c.percentage >= 80).length;
    const goodCriteria = result.criteria_analysis.filter(c => c.percentage >= 60 && c.percentage < 80).length;
    const poorCriteria = result.criteria_analysis.filter(c => c.percentage < 60).length;

    insights.push({
      title: 'Resumo da Performance',
      content: `Critérios excelentes: ${excellentCriteria} | Bons: ${goodCriteria} | Precisam melhorar: ${poorCriteria}`,
      severity: 'info'
    });
  }

  return insights;
}


