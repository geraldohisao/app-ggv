
import { AIMessage, AIPersona, CompanyData, DetailedAIAnalysis, MarketSegment, SummaryInsights } from '../types';
import { diagnosticQuestions } from '../data/diagnosticoQuestions.ts';
import * as SupabaseService from './supabaseService';
import { buildContext } from '../src/rag/contextBuilder';
import { RAG_DEFAULTS } from '../src/config/rag';
import { findRelevant } from './embeddingService';
import { startStep, estimateTokensFromChars } from '../src/utils/logger';
import { getPersonaPolicy } from '../src/prompts/personas';
import { searchWeb, summarizeForContext, enableWebDebug } from '../src/services/webSearch';

export type SourceMeta = { provider: 'doc' | 'overview' | 'web'; title: string; url?: string; score?: number };
let __lastSourcesMeta: SourceMeta[] = [];
export function getLastSourcesMeta(): SourceMeta[] { return __lastSourcesMeta; }
function setLastSourcesMeta(items: SourceMeta[]) { __lastSourcesMeta = items; }

// Função para obter a chave da API Gemini do Supabase (ou de fallback local)
const getGeminiApiKey = async (): Promise<string | null> => {
  try {
    if ((import.meta as any)?.env?.DEV) enableWebDebug(true);
    const value = await SupabaseService.getAppSetting('gemini_api_key');
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && typeof (value as any).apiKey === 'string') return (value as any).apiKey;
  } catch {}
  const local: any = (globalThis as any).APP_CONFIG_LOCAL;
  if (local && typeof local.GEMINI_API_KEY === 'string') return local.GEMINI_API_KEY;
  return null;
};

// Função para fazer chamada direta à API do Gemini
const callGeminiAPI = async (prompt: string, apiKey: string): Promise<string> => {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
  const cfg = await SupabaseService.getLLMGenerationConfig();
  const body = {
    contents: [
      {
        role: 'user',
        parts: [ { text: prompt } ]
      }
    ],
    generationConfig: {
      temperature: cfg.temperature,
      topK: cfg.topK,
      topP: cfg.topP,
      maxOutputTokens: cfg.maxOutputTokens,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
    ]
  } as const;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    let details = '';
    try { const j = await response.json(); details = j?.error?.message || JSON.stringify(j); } catch {}
    throw new Error(`Erro na API Gemini: ${response.status} ${response.statusText}${details ? ' - ' + details : ''}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join(' ');
  return text || 'Resposta não disponível';
};

// Função para simular respostas de IA localmente (fallback quando não há API externa)
const generateLocalResponse = async (message: string, persona: AIPersona, history: AIMessage[], knowledgeBase: string): Promise<string> => {
  const context = `Persona: ${persona.name}\nConhecimento: ${knowledgeBase}\nHistórico: ${history.length} mensagens`;
  
  const responses = [
    "Entendo sua pergunta. Com base no contexto da GGV Inteligência em Vendas, posso ajudar você a melhorar seus processos comerciais.",
    "Excelente pergunta! Vou analisar sua situação considerando as melhores práticas da GGV.",
    "Baseado no conhecimento da GGV, aqui estão algumas recomendações para otimizar suas vendas:",
    "Vou aplicar as metodologias da GGV para responder sua consulta de forma estratégica."
  ];
  
  return responses[Math.floor(Math.random() * responses.length)] + "\n\n" + 
         "[Modo Simulação] Esta é uma resposta simulada. A chave da API do Gemini não foi encontrada no banco de dados. Configure-a nas configurações para obter respostas reais da IA.";
};

export async function* getAIAssistantResponseStream(
  message: string,
  persona: AIPersona,
  history: AIMessage[],
  knowledgeBase: string,
  options?: { forceWeb?: boolean; requestId?: string }
): AsyncGenerator<string, void, unknown> {
  try {
    // Tentar obter a chave da API do Gemini
    const apiKey = await getGeminiApiKey();
    
    let response: string;
    
    if (apiKey) {
      // Construir o prompt com contexto da persona e conhecimento
      const historyContext = history.length > 0 
        ? `\n\nHistórico da conversa:\n${history.slice(-5).map(h => `${h.role === 'user' ? 'Usuário' : 'Assistente'}: ${h.content}`).join('\n')}`
        : '';
      
      // Rebusca relevantes controlados (não altera UI): kd/ko → context builder
      let knowledgeContext: string;
      let collectedSources: SourceMeta[] = [];
      try {
        const endRag = startStep({ requestId: 'n/a' }, 'rag_pipeline_start');
        
        // Paralelizar RAG com busca web se ambas habilitadas
        const ragPromise = findRelevant({
          query: message,
          topKDocs: RAG_DEFAULTS.topKDocs,
          topKOverview: RAG_DEFAULTS.topKOverview,
        });
        
        const webSearchPromise = searchWeb(message).catch(() => [] as any[]);
        
        const [ragResult, webResult] = await Promise.all([
          Promise.race([
            ragPromise,
            new Promise(resolve => setTimeout(() => resolve({ kdDocs: [], koDocs: [], confidenceHint: 'low' as const }), 1500))
          ]),
          webSearchPromise
        ]);
        const { kdDocs, koDocs, confidenceHint } = ragResult as any;
        const built = buildContext({
          kdDocs, koDocs,
          maxDocs: RAG_DEFAULTS.maxDocs,
          maxCharsPerDoc: RAG_DEFAULTS.maxCharsPerDoc,
          minScore: RAG_DEFAULTS.minScore,
          dedupeBy: RAG_DEFAULTS.dedupeBy,
        });
        endRag();
        
        // Combinar contextos de RAG e busca web
        let combinedContext = `\n\nBASE DE CONHECIMENTO:\n${built.text}`;
        if (Array.isArray(webResult) && webResult.length > 0) {
          const webText = webResult.map((r: any) => `${r.title}: ${r.snippet}`).join('\n');
          combinedContext += `\n\nBUSCA WEB:\n${webText}`;
        }
        knowledgeContext = combinedContext;

        // Montar metadados de fontes (Base + Web)
        const addBase = (arr: any[], kind: 'doc' | 'overview') => {
          for (const it of (arr || [])) {
            const title = (it.title || it.name || 'sem-id') as string;
            collectedSources.push({ provider: kind, title, score: it.score });
          }
        };
        addBase(kdDocs as any[], 'doc');
        addBase(koDocs as any[], 'overview');
        
        // Adicionar fontes web
        if (Array.isArray(webResult)) {
          for (const source of webResult) {
            collectedSources.push({ provider: 'web', title: source.title || 'Web Result', url: source.link, score: 0.5 });
          }
        }
        // guardar hint de confiança para UI (via side-channel global simples)
        ;(globalThis as any).__RAG_CONFIDENCE__ = confidenceHint;
        ;(globalThis as any).__RAG_STATS__ = {
          kdLen: (kdDocs || []).length,
          koLen: (koDocs || []).length,
          avgScore: (() => {
            const scores: number[] = [
              ...(kdDocs || []).map((d: any) => Number(d.score || 0)),
              ...(koDocs || []).map((d: any) => Number(d.score || 0)),
            ];
            if (!scores.length) return 0;
            return scores.reduce((a, b) => a + b, 0) / scores.length;
          })(),
          confidence: confidenceHint,
        };
      } catch {
        const hasKb = knowledgeBase !== 'Nenhum documento relevante encontrado.';
        knowledgeContext = hasKb
          ? `\n\nBASE DE CONHECIMENTO:\n${knowledgeBase}`
          : '\n\nATENÇÃO: Nenhum documento foi encontrado na base de conhecimento.';
      }

      // Consulta web opcional (controlada por app_settings) + fallback local (APP_CONFIG_LOCAL)
      try {
        let wantWeb = false;
        try {
          const useWeb = await SupabaseService.getAppSetting('USE_WEB_SEARCH').catch(() => false);
          wantWeb = Boolean(useWeb === true || String(useWeb).toLowerCase() === 'true');
        } catch {}
        if (!wantWeb) {
          const local: any = (globalThis as any).APP_CONFIG_LOCAL;
          if (local && (local.USE_WEB_SEARCH === true || (typeof local.TAVILY_API_KEY === 'string' && local.TAVILY_API_KEY.trim()))) {
            wantWeb = true;
          }
        }

        // Ampliar heurística para acionar Web Search também sem acentos e com verbos comuns
        const triggerByIntent = /(metodologi|fonte|dados|estat(í|i)stic|últim|not(í|i)ci|tend(ê|e)nci|benchmark|extern|web|google|pesquis|busc|atualizad|resultado|quem ganhou|pre(ç|c)o|valor|cota(ç|c)ão)/i.test(message || '');
        const forceWeb = options?.forceWeb === true;
        const ragIsEmpty = knowledgeContext.includes('Nenhum documento');
        const ragConfidence = (globalThis as any).__RAG_CONFIDENCE__ as ('low'|'medium'|'high'|undefined);
        const ragStats = (globalThis as any).__RAG_STATS__ || { kdLen: 0, koLen: 0, avgScore: 0, confidence: ragConfidence };
        const weak = ragConfidence === 'low' || (ragStats.avgScore ?? 0) < 0.12;
        const shouldUse = wantWeb && (forceWeb || triggerByIntent || ragIsEmpty || weak);
        if ((import.meta as any)?.env?.DEV) {
          console.debug('[AI][web] decision', { useWeb: shouldUse, reason: { forceWeb, triggerByIntent, noBase: ragIsEmpty, weak, ragConfidence } });
        }
        if (shouldUse) {
          const t0 = performance.now();
          const local: any = (globalThis as any).APP_CONFIG_LOCAL;
          const hint = await SupabaseService.getAppSetting('WEB_CONTEXT_HINT').catch(() => (local?.WEB_CONTEXT_HINT || ''));
          const topK = await SupabaseService.getAppSetting('WEB_TOPK').catch(() => (typeof local?.WEB_TOPK === 'number' ? local.WEB_TOPK : 2));
          const timeoutMs = await SupabaseService.getAppSetting('WEB_TIMEOUT_MS').catch(() => (typeof local?.WEB_TIMEOUT_MS === 'number' ? local.WEB_TIMEOUT_MS : 5000));
          const apiKey = await SupabaseService.getAppSetting('G_CSE_API_KEY').catch(() => local?.G_CSE_API_KEY);
          const cx = await SupabaseService.getAppSetting('G_CSE_CX').catch(() => local?.G_CSE_CX);
          const q = `${message} ${typeof hint === 'string' ? hint : ''}`.trim();
          const sources = await searchWeb(q, { enabled: true, topK: Number(topK || 2) || 2, timeoutMs: Number(timeoutMs || 5000) || 5000, apiKey: apiKey as any, cx: cx as any });
          if (sources && sources.length > 0) {
            const lines: string[] = ['### Informações Externas'];
            sources.forEach((s, idx) => {
              collectedSources.push({ provider: 'web', title: s.title, url: s.url });
              // Incluir marcadores para o LLM considerar como contexto permitido
              lines.push(`[#src:web:${idx + 1}]\n${s.snippet}`);
            });
            knowledgeContext += `\n\n${lines.join('\n')}`;
          }
          const t1 = performance.now();
          const ms = Math.round(t1 - t0);
          if ((import.meta as any)?.env?.DEV) console.debug('[AI]', { step: 'refine_web', ms, requestId: options?.requestId || 'n/a' });
        }
        setLastSourcesMeta(collectedSources);
        if ((import.meta as any)?.env?.DEV) console.debug('[AI][sources]', getLastSourcesMeta());
      } catch {}
      
      console.log('🤖 PROMPT - Construindo prompt para IA...');
      const hasKnowledge = !knowledgeContext.includes('Nenhum documento');
      console.log('📋 Contexto incluído:', hasKnowledge ? 'SIM - Documentos encontrados' : 'NÃO - Sem documentos');
      if ((import.meta as any)?.env?.DEV) {
        const ragStats = (globalThis as any).__RAG_STATS__ || { kdLen: 0, koLen: 0, avgScore: 0, confidence: (globalThis as any).__RAG_CONFIDENCE__ };
        const snap = {
          kd: ragStats.kdLen,
          ko: ragStats.koLen,
          avgScore: ragStats.avgScore,
          confidence: ragStats.confidence,
        };
        console.debug('[AI][web] snap', snap);
      }
      
      const policy = getPersonaPolicy(persona.id as any);
      const forbidden = (policy.forbiddenTopics || []).join(', ') || '—';
      const allowed = (policy.allowedTopics || []).join(', ') || '—';
      const msgLc = (message || '').toLowerCase();
      const matchedForbidden = (policy.forbiddenTopics || []).find(t => msgLc.includes(t.toLowerCase()));
      const outOfScopeNote = matchedForbidden ? `\nObservação: Pedido potencialmente fora do escopo (termo detectado: "${matchedForbidden}"). Se confirmado, recuse brevemente.` : '';

      const fullPrompt = `${persona.systemPrompt || ''}

${persona.directives || ''}

Características da persona:
- Tom: ${persona.tone || 'profissional'}
- Traços de personalidade: ${persona.personalityTraits?.join(', ') || 'consultivo, especializado'}
- Limite de palavras: aproximadamente ${policy.wordLimit || persona.wordLimit || 500} palavras

Restrições da Persona:
- Allowed: ${allowed}
- Forbidden: ${forbidden}
- Se o pedido estiver fora do escopo, recuse de forma breve e sugira encaminhamento.
${outOfScopeNote}

${knowledgeContext}${historyContext}

Pergunta do usuário: ${message}

 Regras de resposta:
 - Priorize conteúdo da base de conhecimento; cite o documento quando usar
 - Seja direto e objetivo, no tom da persona
 - Se não houver informação nos documentos, diga explicitamente
  - Quando usar um trecho, faça referência inline ao marcador [#src:...] correspondente
              - Ao final, acrescente a seção: "Fontes:" listando os marcadores usados
 
Política de Veracidade e Citações:
- Use somente o contexto fornecido (blocos iniciados por [#src:...]).
- Se o contexto não suporta a resposta, diga explicitamente que não há base suficiente; não invente.
                - Ao final, inclua “Fontes:” listando apenas [#src:...] efetivamente utilizados (sem citar títulos/links no corpo).
                - Quando houver "Informações Externas", use esses dados para complementar a resposta (metodologias, pesquisas, fatos), mas NÃO cite as fontes no meio do texto.
                
                Formato e diagramação (obrigatório):
                - Responda em Markdown limpo, sem emojis e sem a seção “Fontes”.
                - Use H1 no topo com o tema em até 6 palavras; depois, seções com H2 (e H3 quando necessário).
                - Priorize parágrafos curtos (2–3 frases) e listas (3–7 itens) começando com "- ".
                - Destaque termos-chave com **negrito** e use números quando a ordem importar.

                Regras finais:
                - NÃO inclua tags do contexto (ex.: [#src:...]) nem anexe "Fontes" ao final.
                - Mantenha o tom ${persona.tone || 'profissional'} e seja objetivo.
 
 Responda como ${persona.name}, seguindo seu tom e diretrizes:`;

      const promptTokens = estimateTokensFromChars(fullPrompt.length);
      startStep({ requestId: 'n/a' }, 'prompt_ready', { promptChars: fullPrompt.length, promptTokens, generationConfig: (await SupabaseService.getLLMGenerationConfig()) })();
      // Fazer chamada real à API do Gemini
      const endLlm = startStep({ requestId: 'n/a' }, 'llm_call', {});
      response = await callGeminiAPI(fullPrompt, apiKey);
      const outputTokens = estimateTokensFromChars((response || '').length);
      startStep({ requestId: 'n/a' }, 'llm_done', { outputChars: (response || '').length, outputTokens })();
      endLlm();
    } else {
      // Usar resposta simulada se não há API key
      response = await generateLocalResponse(message, persona, history, knowledgeBase);
    }
    
    // Simular streaming da resposta
    const words = response.split(' ');
    for (const word of words) {
      yield word + ' ';
      await new Promise(resolve => setTimeout(resolve, 30)); // Simula delay de streaming
    }

  } catch (error) {
    console.error("Error generating AI response:", error);
    yield `Desculpe, ocorreu um erro ao me comunicar com a IA: ${error instanceof Error ? error.message : 'Erro desconhecido.'}. Por favor, tente novamente mais tarde.`;
  }
};

const getAnswerText = (score: number) => {
    if (score === 10) return "Sim";
    if (score === 5) return "Parcialmente/Às vezes";
    return "Não";
}

export const getSummaryInsights = async (
  companyData: CompanyData,
  answers: Record<number, number>,
  totalScore: number,
  segment: MarketSegment | null
): Promise<SummaryInsights> => {
  const getText = (score: number) => score === 10 ? 'Sim' : score === 5 ? 'Parcialmente/Às vezes' : 'Não';
  const prompt = `Você é um especialista em diagnóstico comercial da GGV Inteligência em Vendas.
Sua tarefa é gerar uma análise concisa e um comparativo de mercado com base nos dados fornecidos.

DADOS:
**Informações da Empresa:**
- Nome da Empresa: ${companyData.companyName}
- Ramo de Atividade: ${companyData.activityBranch}
- Setor de Atuação: ${companyData.activitySector || 'Não informado'}
- Faturamento Mensal: ${companyData.monthlyBilling}
- Tamanho da Equipe de Vendas: ${companyData.salesTeamSize}
- Canais de Vendas Utilizados: ${companyData.salesChannels.join(', ')}

**🆕 Contexto Adicional do Cliente (Pipedrive):**
${companyData.situacao ? `- Situação Atual: ${companyData.situacao}` : ''}
${companyData.problema ? `- Problema/Desafio Identificado: ${companyData.problema}` : ''}
${companyData.perfil_do_cliente ? `- Perfil do Cliente: ${companyData.perfil_do_cliente}` : ''}

**Informações do Segmento de Mercado (${segment?.name || 'Geral'}):**
- Características: ${segment?.characteristics || '-'}
- Tendências: ${segment?.trends || '-'}
- Desafios Comuns: ${segment?.challenges || '-'}

Pontuação Total: ${totalScore} de 90.

Respostas do Diagnóstico:
${diagnosticQuestions.map(q => `- Pergunta: "${q.text}" | Resposta: ${getText(answers[q.id] ?? 0)} (Pontuação: ${answers[q.id] ?? 0})`).join('\n')}`;

  const schema = {
    type: 'object',
    properties: {
      specialistInsight: { type: 'string' },
      marketBenchmark: { type: 'string' }
    },
    required: ['specialistInsight','marketBenchmark']
  } as const;

  // Timeout agressivo com fallback local para evitar spinner infinito
  const timeoutMs = 7000;
  const timer = new Promise<SummaryInsights>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs));
  try {
    const result = await Promise.race([callGeminiJson(prompt, schema) as Promise<SummaryInsights>, timer]);
    return result as SummaryInsights;
  } catch (e) {
    // Fallback local instantâneo
    const pct = Math.round((totalScore / 90) * 100);
    return {
      specialistInsight: `Análise preliminar: com base nas respostas, sua maturidade comercial está em ${pct}%. As maiores oportunidades estão nas áreas com menor pontuação relativa. Foque em padronização de processos, adoção de tecnologia e rotina de gestão.`,
      marketBenchmark: `Comparativo rápido: seu resultado está ${pct > 60 ? 'acima' : pct >= 40 ? 'na média' : 'abaixo'} da média estimada do mercado no segmento ${segment?.name || 'geral'}.`
    };
  }
};

export const getDetailedAIAnalysis = async (
    companyData: CompanyData,
    answers: Record<number, number>,
    totalScore: number,
    summary: SummaryInsights,
    segment: MarketSegment | null
): Promise<DetailedAIAnalysis> => {
    const getText = (score: number) => score === 10 ? 'Sim' : score === 5 ? 'Parcialmente/Às vezes' : 'Não';
    const prompt = `Você é um consultor de vendas sênior e estrategista da GGV Inteligência em Vendas. Sua missão é transformar os dados brutos de um diagnóstico comercial em um plano de ação estratégico e profundo para o cliente. A análise deve ser completa, bem estruturada e fornecer insights acionáveis e sofisticados.

**DADOS COMPLETOS PARA ANÁLISE PROFUNDA:**

1. Dados da Empresa Cliente:
   - Empresa: ${JSON.stringify(companyData)}
   - Segmento: ${JSON.stringify(segment)}
   
   🆕 Contexto Adicional do Cliente:
   ${companyData.situacao ? `- Situação Atual: ${companyData.situacao}` : ''}
   ${companyData.problema ? `- Problema/Desafio: ${companyData.problema}` : ''}
   ${companyData.perfil_do_cliente ? `- Perfil do Cliente: ${companyData.perfil_do_cliente}` : ''}

2. Resultado do Diagnóstico:
   - Pontuação Total: ${totalScore}/90
   - Resumo Inicial do Especialista: ${JSON.stringify(summary)}

3. Respostas Detalhadas do Questionário (Pergunta, Área, Resposta e Pontuação):
${diagnosticQuestions.map(q => `- Área: ${q.area} | Pergunta: "${q.text}" | Resposta: ${getText(answers[q.id] ?? 0)} (Score: ${answers[q.id] ?? 0})`).join('\n')}`;

    const schema = {
      type: 'object',
      properties: {
        executiveSummary: { type: 'string' },
        strengths: { type: 'array', items: { type: 'string' } },
        criticalGaps: { type: 'array', items: { type: 'string' } },
        strategicRecommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              priority: { type: 'string' },
              area: { type: 'string' },
              timeline: { type: 'string' },
              recommendation: { type: 'string' },
              expectedImpact: { type: 'string' }
            },
            required: ['priority','area','timeline','recommendation','expectedImpact']
          }
        },
        quickWins: { type: 'array', items: { type: 'string' } },
        riskAssessment: { type: 'string' },
        sectorInsights: { type: 'string' },
        maturityRoadmap: { type: 'string' },
        nextSteps: { type: 'array', items: { type: 'string' } }
      },
      required: ['executiveSummary','strengths','criticalGaps','strategicRecommendations','quickWins','riskAssessment','sectorInsights','maturityRoadmap','nextSteps']
    } as const;

    const timeoutMs = 12000;
    const timer = new Promise<DetailedAIAnalysis>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs));
    try {
      const result = await Promise.race([callGeminiJson(prompt, schema) as Promise<DetailedAIAnalysis>, timer]);
      return result as DetailedAIAnalysis;
    } catch (e) {
      // Fallback local enxuto
      const pct = Math.round((totalScore / 90) * 100);
      return {
        executiveSummary: `Análise preliminar baseada no diagnóstico: maturidade ${pct}%. Concentre esforços nas áreas com menor nota para capturar ganhos rápidos em eficiência e taxa de conversão.`,
        strengths: ['Relacionamento com clientes bem avaliado', 'Clareza no funil comercial em alguns pontos'],
        criticalGaps: ['Padronização de processos insuficiente', 'Baixa adoção de tecnologia em rotinas-chave'],
        strategicRecommendations: [
          { priority: 'Alta', area: 'Processos', timeline: '0-30 dias', recommendation: 'Mapear e padronizar o funil (SLA, critérios de passagem, playbook).', expectedImpact: 'Aumento de previsibilidade e eficiência operacional.' },
          { priority: 'Média', area: 'Tecnologia', timeline: '30-60 dias', recommendation: 'Implantar automações no CRM para tarefas repetitivas e monitoramento.', expectedImpact: 'Mais tempo consultivo do vendedor; redução de erros.' },
          { priority: 'Média', area: 'Gestão', timeline: '60-90 dias', recommendation: 'Ritual de gestão semanal com indicadores e plano de ação.', expectedImpact: 'Melhora do foco e da accountability.' }
        ],
        quickWins: ['Limpar base de leads e priorizar listas de alta propensão', 'Template único de propostas', 'Sequência de follow-up padrão'],
        riskAssessment: 'Risco de perda de oportunidades por falta de cadência e critérios de qualificação inconsistentes.',
        sectorInsights: `No segmento ${segment?.name || 'geral'}, empresas com maior padronização e uso de tecnologia tendem a ter ciclo menor e taxa de ganho maior.`,
        maturityRoadmap: 'Fase 1: Processos; Fase 2: Tecnologia/Automação; Fase 3: Gestão e Treinamento contínuo.',
        nextSteps: ['Validar metas trimestrais', 'Definir KPIs críticos', 'Planejar rollout das mudanças']
      };
    }
};

// ---- Robustez: chamada com tentativas e fallback de modelo ----
async function callGeminiJson(prompt: string, schema: any): Promise<any> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const apiKey = await getGeminiApiKey();
  if (!apiKey) throw new Error('Gemini API Key não configurada');
  const ai = new GoogleGenerativeAI(apiKey);
  const models = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-flash-latest'];

  const tryOnce = async (modelName: string) => {
    const model = ai.getGenerativeModel({ model: modelName });
    const { response } = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }]}],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema } as any
    } as any);
    return JSON.parse(response.text() || '{}');
  };

  let lastErr: any = null;
  for (const m of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await tryOnce(m);
      } catch (e: any) {
        lastErr = e;
        const message = String(e?.message || '').toLowerCase();
        // Aguardar com backoff se for 429/503 ou falha de rede
        const delay = 500 * Math.pow(2, attempt) + Math.round(Math.random() * 200);
        if (message.includes('503') || message.includes('overload') || message.includes('unavailable') || message.includes('fetch')) {
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        break;
      }
    }
  }
  throw lastErr || new Error('Falha ao consultar Gemini');
}
