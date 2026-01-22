/**
 * Serviço de Análise de Transcrição de Check-in com IA
 * Usa OpenAI para extrair informações de transcrições e preencher automaticamente o formulário
 */

import { callOpenAI } from '../../../calls-dashboard/services/openaiService';

export interface CheckinAnalysisResult {
  summary: string;
  achievements: string;
  blockers: string;
  decisions_taken: string;
  next_focus: string;
  health: 'verde' | 'amarelo' | 'vermelho';
  health_reason?: string;
  notes?: string;
  // Campos de Governança
  learnings?: string;
  okr_misalignments?: string;
  keep_doing?: string;
  stop_doing?: string;
  adjust_doing?: string;
  strategic_recommendations?: string;
  identified_risks?: string;
}

/**
 * Analisa uma transcrição e extrai informações para o check-in
 */
export async function analyzeCheckinTranscription(
  transcription: string,
  isGovernance: boolean = false
): Promise<CheckinAnalysisResult> {
  console.log('🤖 Analisando transcrição com IA...');

  if (!transcription || transcription.trim().length < 50) {
    throw new Error('Transcrição muito curta. Forneça pelo menos 50 caracteres.');
  }

  const prompt = isGovernance ? buildGovernancePrompt(transcription) : buildExecutionPrompt(transcription);

  try {
    const responseText = await callOpenAI(prompt);
    const result = JSON.parse(responseText);

    console.log('✅ Análise concluída com sucesso!');
    return result;
  } catch (error) {
    console.error('❌ Erro ao analisar transcrição:', error);
    throw new Error('Não foi possível analisar a transcrição. Tente novamente.');
  }
}

/**
 * Prompt para análise de check-in de EXECUÇÃO (operacional)
 */
function buildExecutionPrompt(transcription: string): string {
  return `Você é um especialista em análise de check-ins de sprints e ciclos de trabalho.

Analise a seguinte transcrição de um check-in operacional e extraia as informações estruturadas.

TRANSCRIÇÃO:
"""
${transcription}
"""

INSTRUÇÕES:
1. Identifique o que foi entregue/concluído neste ciclo
2. Identifique bloqueios, impedimentos ou problemas enfrentados
3. Identifique decisões importantes que foram tomadas
4. Determine qual será o próximo foco
5. Avalie a saúde do ciclo:
   - "verde" = No prazo, sem problemas críticos
   - "amarelo" = Atenção, alguns bloqueios ou atrasos
   - "vermelho" = Crítico, bloqueios sérios ou metas comprometidas
6. Se a saúde for amarelo ou vermelho, explique o motivo

FORMATO DE RESPOSTA (JSON):
{
  "summary": "Resumo executivo do check-in em 1-2 frases",
  "achievements": "Lista em bullet points (•) das entregas e conquistas. Cada item em uma linha.",
  "blockers": "Lista em bullet points (•) dos impedimentos e bloqueios. Cada item em uma linha. Se não houver, retorne string vazia.",
  "decisions_taken": "Lista em bullet points (•) das decisões tomadas. Cada item em uma linha. Se não houver, retorne string vazia.",
  "next_focus": "Lista em bullet points (•) do que será priorizado no próximo ciclo. Cada item em uma linha.",
  "health": "verde|amarelo|vermelho",
  "health_reason": "Motivo do status (obrigatório se amarelo ou vermelho, vazio se verde)",
  "notes": "Observações adicionais relevantes que não se encaixam nos outros campos. Se não houver, retorne string vazia."
}

IMPORTANTE:
- Use bullet points (•) para listas
- Seja objetivo e direto
- Priorize informações acionáveis
- Se alguma informação não estiver na transcrição, retorne string vazia para aquele campo
- RESPONDA APENAS COM JSON VÁLIDO, SEM TEXTO ADICIONAL`;
}

/**
 * Prompt para análise de check-in de GOVERNANÇA (estratégico)
 */
function buildGovernancePrompt(transcription: string): string {
  return `Você é um consultor estratégico especializado em análise de ciclos de governança e OKRs.

Analise a seguinte transcrição de uma revisão estratégica e extraia as informações estruturadas.

TRANSCRIÇÃO:
"""
${transcription}
"""

INSTRUÇÕES:
1. Identifique os principais aprendizados e insights do ciclo
2. Identifique OKRs ou metas que estão desalinhadas da realidade
3. Determine o que está funcionando e deve ser mantido
4. Determine o que não está gerando valor e deve ser descontinuado
5. Identifique o que precisa ser ajustado ou otimizado
6. Extraia recomendações estratégicas para o próximo ciclo
7. Identifique riscos que podem impactar os objetivos
8. Avalie a saúde estratégica:
   - "verde" = Estratégia alinhada, progresso saudável
   - "amarelo" = Ajustes necessários, alguns desalinhamentos
   - "vermelho" = Desalinhamento crítico, mudanças urgentes

FORMATO DE RESPOSTA (JSON):
{
  "summary": "Resumo executivo da revisão estratégica em 1-2 frases",
  "learnings": "Lista em bullet points (•) dos principais aprendizados. Cada item em uma linha.",
  "okr_misalignments": "Lista em bullet points (•) de OKRs desalinhados da realidade. Cada item em uma linha. Se não houver, retorne string vazia.",
  "keep_doing": "Lista em bullet points (•) de práticas que estão funcionando. Cada item em uma linha.",
  "stop_doing": "Lista em bullet points (•) de atividades que devem ser descontinuadas. Cada item em uma linha. Se não houver, retorne string vazia.",
  "adjust_doing": "Lista em bullet points (•) de processos que precisam ajuste. Cada item em uma linha. Se não houver, retorne string vazia.",
  "strategic_recommendations": "Lista em bullet points (•) de recomendações para o próximo ciclo. Cada item em uma linha.",
  "identified_risks": "Lista em bullet points (•) de riscos identificados. Cada item em uma linha. Se não houver, retorne string vazia.",
  "health": "verde|amarelo|vermelho",
  "health_reason": "Motivo do status estratégico (obrigatório se amarelo ou vermelho, vazio se verde)",
  "notes": "Observações estratégicas adicionais. Se não houver, retorne string vazia."
}

IMPORTANTE:
- Use bullet points (•) para listas
- Foque em aspectos estratégicos, não operacionais
- Priorize insights de alto nível
- Se alguma informação não estiver na transcrição, retorne string vazia para aquele campo
- RESPONDA APENAS COM JSON VÁLIDO, SEM TEXTO ADICIONAL`;
}
