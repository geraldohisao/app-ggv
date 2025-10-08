
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

// ============================================================================
// OPENAI API - Configuração e Funções
// ============================================================================

// Função para obter a chave da API OpenAI do Supabase
const getOpenAIApiKey = async (): Promise<string | null> => {
  console.log('🔑 OPENAI - Buscando API Key...');
  
  try {
    const value = await SupabaseService.getAppSetting('openai_api_key');
    console.log('📊 OPENAI - Valor retornado do Supabase:', typeof value, value ? '(existe)' : '(null)');
    
    if (typeof value === 'string') {
      console.log('✅ OPENAI - Chave obtida do Supabase (string):', value.substring(0, 20) + '...');
      return value;
    }
    if (value && typeof value === 'object' && typeof (value as any).apiKey === 'string') {
      console.log('✅ OPENAI - Chave obtida do Supabase (objeto):', (value as any).apiKey.substring(0, 20) + '...');
      return (value as any).apiKey;
    }
    
    console.warn('⚠️ OPENAI - Valor do Supabase não é uma chave válida');
  } catch (err) {
    console.error('❌ OPENAI - Erro ao buscar do Supabase:', err);
  }
  
  const local: any = (globalThis as any).APP_CONFIG_LOCAL;
  if (local && typeof local.OPENAI_API_KEY === 'string') {
    console.log('✅ OPENAI - Chave obtida de config local');
    return local.OPENAI_API_KEY;
  }
  
  console.error('❌ OPENAI - NENHUMA CHAVE ENCONTRADA!');
  return null;
};

// Função para chamar OpenAI API com JSON mode
async function callOpenAIJson(prompt: string, schema: any): Promise<any> {
  console.log('🔑 OPENAI - Obtendo API Key...');
  const apiKey = await getOpenAIApiKey();
  
  if (!apiKey) {
    console.error('❌ OPENAI - API Key NÃO CONFIGURADA!');
    throw new Error('OpenAI API Key não configurada');
  }
  
  console.log('✅ OPENAI - API Key obtida:', apiKey.substring(0, 20) + '...');
  
  const model = 'gpt-4o-mini'; // Melhor custo-benefício
  console.log('📋 OPENAI - Usando modelo:', model);
  
  const endpoint = 'https://api.openai.com/v1/chat/completions';
  console.log('📍 OPENAI - Endpoint:', endpoint);
  
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
            content: 'Você é um especialista em diagnóstico comercial da GGV Inteligência em Vendas. Responda SEMPRE em JSON válido com EXATAMENTE a estrutura solicitada no prompt, sem adicionar wrappers ou níveis extras. Retorne o objeto JSON diretamente com as propriedades especificadas.'
          },
          {
            role: 'user',
            content: prompt + '\n\n**IMPORTANTE**: Retorne o JSON DIRETAMENTE com as propriedades solicitadas, sem wrapper adicional. Não envolva em objetos como {"diagnostic": ...} ou {"response": ...}. Retorne o objeto raiz com as propriedades especificadas.'
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 3000 // Aumentado para suportar análises mais detalhadas
      })
    });

    console.log(`📊 OPENAI - Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ OPENAI - Erro:`, errorData);
      throw new Error(`Erro na API OpenAI (${response.status}): ${errorData?.error?.message || 'Erro desconhecido'}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('❌ OPENAI - Resposta vazia');
      throw new Error('Resposta vazia da OpenAI');
    }
    
    console.log(`✅ OPENAI - Sucesso! Tokens usados:`, data.usage);
    let parsedResult = JSON.parse(content);
    console.log(`📊 OPENAI - JSON parseado (bruto):`, parsedResult);
    console.log(`🔍 OPENAI - Chaves do objeto:`, Object.keys(parsedResult));
    
    // Se a OpenAI envolveu em um wrapper (ex: {diagnostic: {...}}), extrair o conteúdo
    if (parsedResult && typeof parsedResult === 'object' && Object.keys(parsedResult).length === 1) {
      const wrapperKey = Object.keys(parsedResult)[0];
      const innerObject = parsedResult[wrapperKey];
      
      // Se o objeto interno tem as propriedades esperadas do schema, usá-lo
      if (innerObject && typeof innerObject === 'object') {
        console.log(`🔧 OPENAI - Detectado wrapper "${wrapperKey}", extraindo conteúdo interno`);
        parsedResult = innerObject;
      }
    }
    
    console.log(`📊 OPENAI - JSON final (após unwrap):`, parsedResult);
    return parsedResult;
  } catch (e: any) {
    console.error('💥 OPENAI - Erro na chamada:', e?.message);
    throw e;
  }
}

// ============================================================================
// GEMINI API - Configuração e Funções (Mantido como Fallback)
// ============================================================================

// Função para obter a chave da API Gemini do Supabase (ou de fallback local)
const getGeminiApiKey = async (): Promise<string | null> => {
  console.log('🔑 GEMINI - Buscando API Key...');
  
  try {
    if ((import.meta as any)?.env?.DEV) enableWebDebug(true);
    console.log('📥 GEMINI - Consultando Supabase...');
    const value = await SupabaseService.getAppSetting('gemini_api_key');
    console.log('📊 GEMINI - Valor retornado do Supabase:', typeof value, value ? '(existe)' : '(null)');
    
    if (typeof value === 'string') {
      console.log('✅ GEMINI - Chave obtida do Supabase (string):', value.substring(0, 20) + '...');
      return value;
    }
    if (value && typeof value === 'object' && typeof (value as any).apiKey === 'string') {
      console.log('✅ GEMINI - Chave obtida do Supabase (objeto):', (value as any).apiKey.substring(0, 20) + '...');
      return (value as any).apiKey;
    }
    
    console.warn('⚠️ GEMINI - Valor do Supabase não é uma chave válida');
  } catch (err) {
    console.error('❌ GEMINI - Erro ao buscar do Supabase:', err);
  }
  
  console.log('🔍 GEMINI - Tentando configuração local...');
  const local: any = (globalThis as any).APP_CONFIG_LOCAL;
  if (local && typeof local.GEMINI_API_KEY === 'string') {
    console.log('✅ GEMINI - Chave obtida de config local');
    return local.GEMINI_API_KEY;
  }
  
  console.error('❌ GEMINI - NENHUMA CHAVE ENCONTRADA!');
  return null;
};

// Função para fazer chamada direta à API do Gemini
const callGeminiAPI = async (prompt: string, apiKey: string): Promise<string> => {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
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
  console.log('🤖 GEMINI - getSummaryInsights INICIADO');
  console.log('📊 GEMINI - Dados recebidos:', { companyName: companyData.companyName, totalScore, hasSegment: !!segment });
  console.log('🔍 GEMINI - Dados do cliente:', {
    situacao: companyData.situacao?.substring(0, 50) + '...',
    problema: companyData.problema?.substring(0, 50) + '...',
    perfil: companyData.perfil_do_cliente?.substring(0, 50) + '...'
  });
  
  const getText = (score: number) => score === 10 ? 'Sim' : score === 5 ? 'Parcialmente/Às vezes' : 'Não';
  const prompt = `Você é um especialista em diagnóstico comercial da GGV Inteligência em Vendas.
Sua tarefa é gerar uma análise concisa e um comparativo de mercado com base nos dados fornecidos.

**REGRAS DE FORMATAÇÃO:**
- Use markdown com **negrito** para destacar pontos importantes
- Estruture o texto com parágrafos claros e bem organizados
- Use listas com "-" para enumerar pontos quando necessário
- Mantenha tom profissional e consultivo

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

**Informações do Setor de Atuação (${segment?.name || 'Geral'}):**
- Características: ${segment?.characteristics || '-'}
- Tendências: ${segment?.trends || '-'}
- Desafios Comuns: ${segment?.challenges || '-'}

Pontuação Total: ${totalScore} de 90.

Respostas do Diagnóstico:
${diagnosticQuestions.map(q => `- Pergunta: "${q.text}" | Resposta: ${getText(answers[q.id] ?? 0)} (Pontuação: ${answers[q.id] ?? 0})`).join('\n')}

**SCHEMA DO JSON A RETORNAR:**
{
  "specialistInsight": "string - Análise profunda e personalizada do especialista",
  "marketBenchmark": "string - Comparativo de mercado contextualizado"
}`;

  const schema = {
    type: 'object',
    properties: {
      specialistInsight: { type: 'string' },
      marketBenchmark: { type: 'string' }
    },
    required: ['specialistInsight','marketBenchmark']
  } as const;

  // Tentar OpenAI primeiro (mais rápido), depois Gemini, depois fallback local
  const timeoutMs = 15000; // 15s é suficiente para OpenAI
  
  try {
    console.log('🚀 AI - Tentando OpenAI primeiro...');
    const timer = new Promise<SummaryInsights>((_, reject) => setTimeout(() => {
      console.warn('⏰ AI - TIMEOUT após 15 segundos');
      reject(new Error('timeout'));
    }, timeoutMs));
    
    const result = await Promise.race([callOpenAIJson(prompt, schema) as Promise<SummaryInsights>, timer]);
    console.log('✅ OPENAI - Resposta recebida com sucesso!');
    console.log('📊 OPENAI - Resultado:', result);
    return result as SummaryInsights;
  } catch (openaiError: any) {
    console.warn('⚠️ OPENAI - Falhou:', openaiError?.message);
    console.log('🔄 Tentando Gemini como fallback...');
    
    try {
      const geminiTimer = new Promise<SummaryInsights>((_, reject) => setTimeout(() => {
        console.warn('⏰ GEMINI - TIMEOUT após 25 segundos');
        reject(new Error('timeout'));
      }, 25000));
      
      const result = await Promise.race([callGeminiJson(prompt, schema) as Promise<SummaryInsights>, geminiTimer]);
      console.log('✅ GEMINI - Resposta recebida com sucesso (fallback)!');
      return result as SummaryInsights;
    } catch (geminiError: any) {
      console.error('❌ GEMINI - Também falhou:', geminiError?.message);
      console.warn('🔄 Usando FALLBACK LOCAL');
      
      // Fallback local instantâneo
      const pct = Math.round((totalScore / 90) * 100);
      return {
        specialistInsight: `Análise preliminar: com base nas respostas, sua maturidade comercial está em ${pct}%. As maiores oportunidades estão nas áreas com menor pontuação relativa. Foque em padronização de processos, adoção de tecnologia e rotina de gestão.`,
        marketBenchmark: `Comparativo rápido: seu resultado está ${pct > 60 ? 'acima' : pct >= 40 ? 'na média' : 'abaixo'} da média estimada do mercado no setor ${segment?.name || 'geral'}.`
      };
    }
  }
};

export const getDetailedAIAnalysis = async (
    companyData: CompanyData,
    answers: Record<number, number>,
    totalScore: number,
    summary: SummaryInsights,
    segment: MarketSegment | null
): Promise<DetailedAIAnalysis> => {
    console.log('🤖 GEMINI - getDetailedAIAnalysis INICIADO');
    console.log('📊 GEMINI - Dados recebidos:', { companyName: companyData.companyName, totalScore });
    
    const getText = (score: number) => score === 10 ? 'Sim' : score === 5 ? 'Parcialmente/Às vezes' : 'Não';
    const prompt = `Você é um consultor de vendas sênior e estrategista da GGV Inteligência em Vendas. Sua missão é transformar os dados brutos de um diagnóstico comercial em um plano de ação estratégico e profundo para o cliente. A análise deve ser completa, bem estruturada e fornecer insights acionáveis e sofisticados.

**IMPORTANTE - REGRAS DE FORMATAÇÃO:**
- Para listas (strengths, criticalGaps, nextSteps): use texto simples SEM símbolos, números ou asteriscos
- Para executiveSummary: use markdown com **negrito** para destacar pontos importantes
- Para nextSteps: cada item deve ser uma ação clara SEM numeração (a numeração será feita pela interface)
- Mantenha frases concisas e diretas nas listas

**DADOS COMPLETOS PARA ANÁLISE PROFUNDA:**

1. Dados da Empresa Cliente:
   - Empresa: ${JSON.stringify(companyData)}
   - Setor de Atuação: ${JSON.stringify(segment)}
   
   🆕 Contexto Adicional do Cliente:
   ${companyData.situacao ? `- Situação Atual: ${companyData.situacao}` : ''}
   ${companyData.problema ? `- Problema/Desafio: ${companyData.problema}` : ''}
   ${companyData.perfil_do_cliente ? `- Perfil do Cliente: ${companyData.perfil_do_cliente}` : ''}

2. Resultado do Diagnóstico:
   - Pontuação Total: ${totalScore}/90
   - Resumo Inicial do Especialista: ${JSON.stringify(summary)}

3. Respostas Detalhadas do Questionário (Pergunta, Área, Resposta e Pontuação):
${diagnosticQuestions.map(q => `- Área: ${q.area} | Pergunta: "${q.text}" | Resposta: ${getText(answers[q.id] ?? 0)} (Score: ${answers[q.id] ?? 0})`).join('\n')}

**SCHEMA EXATO DO JSON A RETORNAR:**
{
  "executiveSummary": "string - Resumo executivo completo",
  "strengths": ["array de strings - Pontos fortes identificados"],
  "criticalGaps": ["array de strings - Lacunas críticas"],
  "strategicRecommendations": [
    {
      "priority": "Alta/Média/Baixa",
      "area": "string - Área",
      "timeline": "string - Prazo",
      "recommendation": "string - Recomendação",
      "expectedImpact": "string - Impacto esperado"
    }
  ],
  "quickWins": ["array de strings - Ganhos rápidos"],
  "riskAssessment": "string - Avaliação de riscos",
  "sectorInsights": "string - Insights do setor",
  "maturityRoadmap": "string - Roadmap de maturidade",
  "nextSteps": ["array de strings - Próximos passos"]
}`;

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

    // Tentar OpenAI primeiro (mais rápido e confiável), depois Gemini, depois fallback
    const timeoutMs = 20000; // 20s é suficiente para OpenAI
    
    try {
      console.log('🚀 AI - Tentando OpenAI para análise detalhada...');
      const timer = new Promise<DetailedAIAnalysis>((_, reject) => setTimeout(() => {
        console.warn('⏰ AI - TIMEOUT detalhado após 20 segundos');
        reject(new Error('timeout'));
      }, timeoutMs));
      
      const result = await Promise.race([callOpenAIJson(prompt, schema) as Promise<DetailedAIAnalysis>, timer]);
      console.log('✅ OPENAI - Análise detalhada recebida com sucesso!');
      console.log('🔍 OPENAI - Estrutura do resultado:', result);
      console.log('🔍 OPENAI - Tem strategicRecommendations?', 'strategicRecommendations' in result);
      console.log('🔍 OPENAI - Todas as chaves:', Object.keys(result));
      return result as DetailedAIAnalysis;
    } catch (openaiError: any) {
      console.warn('⚠️ OPENAI - Falhou na análise detalhada:', openaiError?.message);
      console.log('🔄 Tentando Gemini como fallback...');
      
      try {
        const geminiTimer = new Promise<DetailedAIAnalysis>((_, reject) => setTimeout(() => {
          console.warn('⏰ GEMINI - TIMEOUT detalhado após 30 segundos');
          reject(new Error('timeout'));
        }, 30000));
        
        const result = await Promise.race([callGeminiJson(prompt, schema) as Promise<DetailedAIAnalysis>, geminiTimer]);
        console.log('✅ GEMINI - Análise detalhada recebida (fallback)!');
        return result as DetailedAIAnalysis;
      } catch (geminiError: any) {
        console.error('❌ GEMINI - Também falhou:', geminiError?.message);
        console.warn('🔄 Usando FALLBACK LOCAL');
        
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
    }
};

// ---- Robustez: chamada com tentativas e fallback de modelo ----
async function callGeminiJson(prompt: string, schema: any): Promise<any> {
  console.log('🔑 GEMINI - Obtendo API Key...');
  const apiKey = await getGeminiApiKey();
  
  if (!apiKey) {
    console.error('❌ GEMINI - API Key NÃO CONFIGURADA!');
    throw new Error('Gemini API Key não configurada');
  }
  
  console.log('✅ GEMINI - API Key obtida:', apiKey.substring(0, 20) + '...');
  
  // Usar API direta ao invés do SDK para evitar problemas com Vertex AI
  const models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];
  console.log('📋 GEMINI - Modelos a testar:', models);

  const tryOnce = async (modelName: string) => {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    console.log(`🔄 GEMINI - Tentando modelo: ${modelName}`);
    console.log(`📍 GEMINI - Endpoint: ${endpoint.substring(0, 80)}...`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }]}],
        generationConfig: { 
          responseMimeType: 'application/json',
          responseSchema: schema
        }
      })
    });

    console.log(`📊 GEMINI - Response status (${modelName}): ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ GEMINI - Erro no modelo ${modelName}:`, errorText);
      throw new Error(`Erro na API Gemini (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log(`✅ GEMINI - Sucesso com modelo: ${modelName}`);
    return JSON.parse(text || '{}');
  };

  let lastErr: any = null;
  for (const m of models) {
    console.log(`🔁 GEMINI - Testando modelo: ${m}`);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`  🎯 GEMINI - Tentativa ${attempt + 1}/3 para ${m}`);
        const result = await tryOnce(m);
        console.log(`  ✅ GEMINI - SUCESSO com ${m} na tentativa ${attempt + 1}`);
        return result;
      } catch (e: any) {
        lastErr = e;
        console.log(`  ❌ GEMINI - Falha na tentativa ${attempt + 1} com ${m}:`, e?.message);
        const message = String(e?.message || '').toLowerCase();
        // Aguardar com backoff se for 429/503 ou falha de rede
        const delay = 500 * Math.pow(2, attempt) + Math.round(Math.random() * 200);
        if (message.includes('503') || message.includes('overload') || message.includes('unavailable') || message.includes('fetch')) {
          console.log(`  ⏳ GEMINI - Aguardando ${delay}ms antes de retry...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        console.log(`  🚫 GEMINI - Erro não recuperável, próximo modelo...`);
        break;
      }
    }
  }
  console.error('💥 GEMINI - TODOS OS MODELOS FALHARAM!');
  console.error('💥 GEMINI - Último erro:', lastErr);
  throw lastErr || new Error('Falha ao consultar Gemini');
}
