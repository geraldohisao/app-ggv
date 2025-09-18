import React, { useState, useRef, useEffect, useMemo, useCallback, Suspense } from 'react';
import { AIMode, type AIMessage, type AIPersona, type ConversationHistories, type StoredKnowledgeDocument, Module } from '../types';
import { getAIAssistantResponseStream, getLastSourcesMeta } from '../services/aiRouterClient';
import { findMostRelevantDocuments, findRelevant } from '../services/embeddingService';
import { autoSyncSectors } from '../services/sectorKnowledgeService';
import { getLocalDocuments, syncQueuedDocuments } from '../services/localKnowledgeStore';
import * as SupabaseService from '../services/supabaseService';
import { PaperAirplaneIcon, RobotIcon, TrashIcon, ExclamationTriangleIcon, ClipboardDocumentIcon, CheckCircleIcon, RefreshIcon, PencilIcon } from './ui/icons';
import Tooltip from './ui/Tooltip';
type AssistantSettingsModalType = React.ComponentType<{ onClose: () => void }>;
const AssistantSettingsModal = React.lazy<AssistantSettingsModalType>(
  () => import('./settings/AssistantSettingsModal').then((m: any) => ({ default: m.default || m.AssistantSettingsModal })) as any
);
import AIMarkdown from './common/AIMarkdown';
import { useUser } from '../contexts/DirectUserContext';
import { LoadingSpinner, ErrorDisplay } from './ui/Feedback';
import { getAutoApplySuggestions } from '../services/preferences';
import { newRequestId, startStep } from '../src/utils/logger';
import { sanitizeOutput } from '../src/utils/sanitizeOutput';
import { stripSourceTags, formatAIResponse } from '../src/utils/aiText';
import { extractSourceMarkers } from '../src/utils/extractSources';
import { copyToClipboard } from '../src/utils/clipboard';
import Breadcrumb from './common/Breadcrumb';

const SHOW_SOURCES = false;

const SourceItem: React.FC<{ marker: { key: string; score?: number } }> = ({ marker }) => {
    const [open, setOpen] = useState(false);
    const meta = getLastSourcesMeta?.()[marker.key];
    const provider = meta?.provider === 'web' ? 'Web' : 'Base';
    const title = meta?.title || marker.key;
    const url = meta?.url;
    return (
      <div className="text-xs bg-slate-50 rounded border border-slate-200 px-2 py-1 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`px-1.5 py-0.5 rounded ${provider==='Web' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-800'}`}>{provider}</span>
          <span className="truncate" title={title}>{title}</span>
          {typeof marker.score === 'number' && (
            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 flex-shrink-0">{marker.score.toFixed(2)}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {url && (
            <button onClick={() => window.open(url, '_blank', 'noopener')} className="text-blue-700 hover:underline">Abrir</button>
          )}
          <button onClick={() => setOpen(v => !v)} className="text-slate-600 hover:underline">ver trecho</button>
        </div>
        {open && (
          <div className="mt-1 text-slate-700 col-span-2">
            <em>Trecho usado pelo modelo</em>
          </div>
        )}
      </div>
    );
};

const SourcesBlock: React.FC<{ text: string }> = ({ text }) => {
    try {
      const t0 = performance.now();
      const markers = extractSourceMarkers(text);
      if (!markers || markers.length === 0) {
        if ((import.meta as any)?.env?.DEV) console.debug('[AI]', { step: 'render_sources', count: 0 });
        return <div className="mt-2 text-xs inline-flex items-center gap-2 text-slate-500"><span className="px-2 py-0.5 bg-slate-100 rounded">Sem fontes</span></div>;
      }
      const t1 = performance.now();
      if ((import.meta as any)?.env?.DEV) console.debug('[AI]', { step: 'render_sources', count: markers.length, ms: Math.round(t1 - t0) });
      return (
        <div className="mt-3 border-t pt-2">
          <div className="text-xs font-semibold text-slate-700 mb-1">Fontes</div>
          <div className="space-y-1">
            {markers.map((m, i) => (
              <SourceItem key={`${m.key}-${i}`} marker={m} />
            ))}
          </div>
        </div>
      );
    } catch {
      return null;
    }
};

const AssistenteIA: React.FC = () => {
    const { user } = useUser();
    const [personas, setPersonas] = useState<AIPersona[]>([]);
    const [conversationHistories, setConversationHistories] = useState<ConversationHistories>({});
    const [knowledgeDocuments, setKnowledgeDocuments] = useState<StoredKnowledgeDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState(Date.now());
    const [documentsLoaded, setDocumentsLoaded] = useState(false);

    const [activePersona, setActivePersona] = useState<AIPersona | null>(null);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [justCopiedIndex, setJustCopiedIndex] = useState<number | null>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const [showAssistantSettings, setShowAssistantSettings] = useState(false);
    const animationFrameRef = useRef<number | null>(null);

  // Fail-safe: evita spinner infinito caso algum request demore demais
  const withTimeout = async <T,>(p: Promise<T>, ms = 8000): Promise<T> => {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout após ${ms}ms`)), ms))
    ]) as T;
  };

    useEffect(() => {
        const fetchData = async () => {
            if (!user) {
                setFetchError("Usuário não autenticado.");
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setFetchError(null);
            try {
                console.log('🔄 CARREGANDO - Buscando dados do assistente...');

                // Sincronizar setores no banco vetorial (não bloqueia o carregamento)
                autoSyncSectors().catch(err => 
                    console.warn('⚠️ Erro na sincronização automática de setores:', err)
                );

                // Carregar personas primeiro (com timeout)
                const personasData = await withTimeout(SupabaseService.getAIPersonas(), 8000);
                
                // Carregar documentos (Supabase + Local), overview e histórico em paralelo
                const [remoteDocs, overview, historyData] = await withTimeout(Promise.all([
                    SupabaseService.getKnowledgeDocuments().catch(() => []),
                    SupabaseService.getKnowledgeOverview().catch(() => null),
                    SupabaseService.getChatHistories(user.id).catch(err => {
                        console.warn('⚠️ Erro ao carregar histórico (continuando sem ele):', err.message);
                        return {};
                    })
                ]), 8000);

                // Merge com base local imediata e tentar sincronizar fila
                const localDocs = getLocalDocuments();
                setTimeout(() => { syncQueuedDocuments().catch(() => {}); }, 100);
                const knowledgeData = [...localDocs, ...remoteDocs];

                console.log('📚 DOCUMENTOS - Carregados:', knowledgeData.length, 'documentos');
                if (knowledgeData.length > 0) {
                    console.log('✅ BANCO VETORIAL - Documentos disponíveis para consulta');
                    knowledgeData.forEach((doc, index) => {
                        console.log(`📄 Doc ${index + 1}: ${doc.name} (${doc.content.length} chars, embedding: ${doc.embedding ? 'SIM' : 'NÃO'})`);
                    });
                } else {
                    console.log('⚠️ BANCO VETORIAL - Nenhum documento encontrado');
                }

                // Normalizar personas para garantir que todos os campos existam
                const normalizedPersonas = personasData.map(persona => ({
                    ...persona,
                    systemPrompt: persona.systemPrompt || `Você é um ${persona.name} especialista da GGV Inteligência em Vendas.`,
                    directives: persona.directives || 'Ajude o usuário com expertise em vendas.',
                    tone: persona.tone || 'profissional',
                    wordLimit: persona.wordLimit || 500,
                    personalityTraits: persona.personalityTraits || ['consultivo', 'especializado'],
                    description: persona.description || `Assistente especializado em ${persona.name.toLowerCase()}`
                }));

                setPersonas(normalizedPersonas);
                setKnowledgeDocuments(knowledgeData);
                setConversationHistories(historyData);
                // Guardar overview no estado através de closure (reuso ao montar prompt)
                (window as any).__GGV_OVERVIEW__ = overview?.content || '';
                
                console.log('✅ CARREGAMENTO - Dados carregados com sucesso');

            } catch (error: any) {
                console.warn("Falha ao carregar dados da IA (degradando graciosamente):", error?.message || error);
                // Fallback não-bloqueante: personas mínimas e contexto vazio
                const fallbackPersonas: AIPersona[] = [
                    { id: AIMode.SDR, name: 'SDR', description: 'Prospecção e qualificação', tone: 'profissional', wordLimit: 200, systemPrompt: '', directives: '', personalityTraits: ['consultivo'] },
                    { id: AIMode.Closer, name: 'Closer', description: 'Diagnóstico e fechamento', tone: 'profissional', wordLimit: 300, systemPrompt: '', directives: '', personalityTraits: ['objetivo'] },
                    { id: AIMode.Gestor, name: 'Gestor', description: 'Gestão e métricas', tone: 'profissional', wordLimit: 400, systemPrompt: '', directives: '', personalityTraits: ['analítico'] },
                ];
                setPersonas(fallbackPersonas);
                setConversationHistories({});
                setKnowledgeDocuments([]);
                (window as any).__GGV_OVERVIEW__ = '';
                // Não bloqueia a UI com erro; mostra apenas aviso no console/toast
                const t = (window as any).toast; t?.error?.('Carreguei com configurações mínimas (offline). Verifique Supabase/CSP.');
            } finally {
                setIsLoading(false);
                console.log('⏹️ CARREGAMENTO - Finalizado, isLoading=false');
            }
        };

        fetchData();
    }, [user, lastRefreshed]);

    useEffect(() => {
        if (personas.length > 0 && !activePersona) {
            setActivePersona(personas.find(p => p.id === AIMode.SDR) || personas[0] || null);
        }
    }, [personas, activePersona]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversationHistories, isTyping, activePersona]);

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    const activeHistory = useMemo(() => activePersona ? conversationHistories[activePersona.id] || [] : [], [activePersona, conversationHistories]);

    const handleSetMode = useCallback((mode: AIMode) => {
        const newPersona = personas.find(p => p.id === mode);
        if (newPersona) {
            setActivePersona(newPersona);
        }
    }, [personas]);

    const handleCopy = useCallback((text: string, index: number) => {
        navigator.clipboard.writeText(text).catch(() => {});
        setJustCopiedIndex(index);
        setTimeout(() => setJustCopiedIndex(null), 2000);
    }, []);

    const handleSendMessageLogic = useCallback(async (forceWeb = false) => {
        if (!input.trim() || isTyping || !activePersona || !user) return;

        const newUserMessage: AIMessage = { role: 'user', content: input };
        const newHistoryWithUserMessage = [...activeHistory, newUserMessage];

        setConversationHistories(prev => ({ ...prev, [activePersona.id]: newHistoryWithUserMessage }));

        const currentInput = input;
        setInput('');
        setIsTyping(true);

        try {
            const requestId = newRequestId();
            const ctx = { requestId, userId: user?.id, personaId: activePersona.id } as any;
            const endUiStart = startStep(ctx, 'ui_send_start', { msgLen: currentInput.length });
            console.log('🧠 CONHECIMENTO - Iniciando busca por documentos relevantes...');
            console.log('📚 Total de documentos disponíveis:', knowledgeDocuments.length);
            console.log('🔍 Pergunta do usuário:', currentInput);

            // 1) Tenta RAG remoto (kd_match/ko_match) com timeout curto
            let kdDocs: Array<{ id?: string; name?: string; score?: number; content?: string }> = [];
            let koDocs: Array<{ id?: string; title?: string; score?: number; content?: string }> = [];
            try {
              const rag = await Promise.race([
                findRelevant({ query: currentInput, topKDocs: 4, topKOverview: 2 }),
                new Promise(resolve => setTimeout(() => resolve({ kdDocs: [], koDocs: [], confidenceHint: 'low' as const }), 1800))
              ]) as any;
              kdDocs = Array.isArray(rag?.kdDocs) ? rag.kdDocs : [];
              koDocs = Array.isArray(rag?.koDocs) ? rag.koDocs : [];
              (globalThis as any).__RAG_CONFIDENCE__ = rag?.confidenceHint;
            } catch {
              kdDocs = [];
              koDocs = [];
            }

            // 2) Fallback local se remoto não retornou nada
            if ((kdDocs.length + koDocs.length) === 0) {
              console.warn('⚠️ RAG remoto vazio/indisponível. Usando busca local por similaridade.');
              let relevantDocs = await findMostRelevantDocuments(currentInput, knowledgeDocuments);
              if (relevantDocs.length === 0 && knowledgeDocuments.length > 0) {
                  console.warn('⚠️ Sem resultados de similaridade. Usando fallback com os primeiros documentos.');
                  relevantDocs = knowledgeDocuments.slice(0, 2) as any;
              }
              kdDocs = (relevantDocs || []).map((d: any) => ({ id: d.id, name: d.name, score: d.similarity, content: d.content }));
            }

            console.log('✅ Documentos kd selecionados:', kdDocs.length);
            kdDocs.forEach((doc, index) => {
              console.log(`📄 Doc ${index + 1}: ${(doc.name || doc.id)} (score: ${(doc as any).score?.toFixed?.(3) || 'N/A'})`);
            });

            // Truncar para evitar prompts gigantes
            const truncate = (t: string, max = 3000) => t.length > max ? t.slice(0, max) + '\n...[conteúdo truncado]' : t;
            const overviewBlock = (window as any).__GGV_OVERVIEW__
                ? `--- OVERVIEW GGV ---\n${truncate((window as any).__GGV_OVERVIEW__)}\n--- FIM OVERVIEW ---\n\n`
                : '';
            const remoteOverviewMatches = (koDocs || []).length > 0
                ? (koDocs || []).map(d => `--- OVERVIEW MATCH: ${d.title || d.id} ---\n${truncate(d.content || '')}\n--- FIM OVERVIEW MATCH ---`).join('\n\n') + '\n\n'
                : '';
            const docsBlock = (kdDocs || []).length > 0
                ? kdDocs.map(doc => `--- DOC: ${doc.name || doc.id} ---\n${truncate(doc.content || '')}\n--- FIM DOC ---`).join('\n\n')
                : 'Nenhum documento relevante encontrado.';
            const knowledgeBase = overviewBlock + remoteOverviewMatches + docsBlock;
                
            console.log('📝 Contexto enviado para IA:', knowledgeBase.substring(0, 200) + '...');

            const stream = getAIAssistantResponseStream(currentInput, activePersona, newHistoryWithUserMessage, knowledgeBase, { requestId, forceWeb });

            let fullResponse = '';
            let isFirstCharacter = true;
            let buffer = '';

            const updateUI = () => {
                fullResponse += buffer;
                buffer = '';

                setConversationHistories(prev => {
                    const newHistories = { ...prev };
                    const personaHistory = [...(newHistories[activePersona.id!] || [])];
                    if (personaHistory.length > 0 && personaHistory[personaHistory.length - 1].role === 'model') {
                        personaHistory[personaHistory.length - 1].content = fullResponse;
                        newHistories[activePersona.id!] = personaHistory;
                    }
                    return newHistories;
                });

                animationFrameRef.current = null;
            };

            for await (const char of stream) {
                if (isFirstCharacter) {
                    setIsTyping(false);
                    isFirstCharacter = false;

                    const newAiMessage: AIMessage = { role: 'model', content: '' };
                    setConversationHistories(prev => ({
                        ...prev,
                        [activePersona.id!]: [...newHistoryWithUserMessage, newAiMessage]
                    }));

                    // Auto-aplicar sugestões (placeholder para ações futuras)
                    try {
                        const autoApply = getAutoApplySuggestions();
                        if (autoApply) {
                            console.log('⚙️ Auto-aplicar sugestões: ATIVO');
                            // Aqui, quando existir uma ação sugerida (ex.: atualizar campos, criar tarefa), aplicaríamos automaticamente.
                            // No momento, a resposta é apenas texto; manter log para rastreabilidade.
                        }
                    } catch {}
                }
                buffer += char;
                if (!animationFrameRef.current) animationFrameRef.current = requestAnimationFrame(updateUI);
            }

            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (buffer.length > 0) updateUI();

            // anexar fontes meta ao último modelo
            setConversationHistories(prev => {
              const newHistories = { ...prev } as any;
              const personaHistory = [...(newHistories[activePersona.id!] || [])];
              if (personaHistory.length > 0 && personaHistory[personaHistory.length - 1].role === 'model') {
                (personaHistory[personaHistory.length - 1] as any).metaSources = getLastSourcesMeta();
                newHistories[activePersona.id!] = personaHistory;
              }
              return newHistories;
            });

            // sanitização final (após stream) + extração de fontes
            setConversationHistories(prev => {
                const newHistories = { ...prev };
                const personaHistory = [...(newHistories[activePersona.id!] || [])];
                if (personaHistory.length > 0 && personaHistory[personaHistory.length - 1].role === 'model') {
                    const raw = personaHistory[personaHistory.length - 1].content || '';
                    const sanitized = sanitizeOutput(raw, 4000);
                    personaHistory[personaHistory.length - 1].content = sanitized;
                    newHistories[activePersona.id!] = personaHistory;
                }
                return newHistories;
            });

            setTimeout(() => {
                setConversationHistories(prev => {
                    const finalHistory = prev[activePersona.id!] || [];
                    SupabaseService.saveChatHistory(user.id, activePersona.id, finalHistory).catch(console.error);
                    return prev;
                });
            }, 0);
            endUiStart();

        } catch (error) {
            const errorMessage: AIMessage = { role: 'model', content: 'Desculpe, ocorreu um erro. Tente novamente.' };
            setConversationHistories(prev => ({ ...prev, [activePersona.id!]: [...newHistoryWithUserMessage, errorMessage] }));
        } finally {
            setIsTyping(false);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        }
    }, [input, isTyping, activePersona, user, activeHistory, knowledgeDocuments]);

    const handleSendMessage = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        // Alt+Enter força Web em DEV
        const ev = e as any;
        const altForce = !!(ev?.nativeEvent && ev.nativeEvent.altKey);
        if ((import.meta as any)?.env?.DEV && altForce) console.debug('[AI][web] force=true');
        handleSendMessageLogic(altForce);
    }, [handleSendMessageLogic]);

    const clearHistory = useCallback(async () => {
        if (!activePersona || !user) return;
        if (window.confirm(`Tem certeza que deseja limpar o histórico da persona ${activePersona.name}?`)) {
            setConversationHistories(prev => ({ ...prev, [activePersona.id]: [] }));
            await SupabaseService.deleteChatHistory(user.id, activePersona.id);
        }
    }, [activePersona, user]);

    const ModeButton: React.FC<{ targetMode: AIMode; text: string }> = React.memo(({ targetMode, text }) => (
        <button
            onClick={() => handleSetMode(targetMode)}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors border-2 ${activePersona?.id === targetMode ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400'}`}
        >
            {text}
        </button>
    ));

    const visibleHistory = useMemo(() => (activeHistory.length > 100 ? activeHistory.slice(-100) : activeHistory), [activeHistory]);

    type MessageRowProps = {
      msg: AIMessage;
      index: number;
      isLast: boolean;
    };

    const MessageRow: React.FC<MessageRowProps> = React.memo(({ msg, index, isLast }) => (
      <div className={`flex gap-2 md:gap-3 items-start ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        {msg.role === 'model' && (
          <div className="w-9 h-9 rounded-full bg-blue-900 flex items-center justify-center flex-shrink-0 shadow-sm text-white font-bold text-sm">
            IA
          </div>
        )}
        <div className={`group relative max-w-2xl px-3 md:px-4 py-2.5 md:py-3 rounded-2xl shadow-sm break-words ${msg.role === 'user' ? 'bg-blue-900 text-white rounded-br-none' : 'bg-white text-slate-800 rounded-bl-none border border-slate-200/80'}`}>
          <AIMarkdown content={msg.role === 'model' ? formatAIResponse(msg.content) : msg.content} />
          {msg.role === 'model' && isLast && (
            (() => {
              const hint = (globalThis as any).__RAG_CONFIDENCE__ as ('low'|'medium'|'high'|undefined);
              if (hint === 'low') {
                return (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800">Base fraca</span>
                    <button
                      onClick={async () => {
                        const lastUserMsg = [...activeHistory].reverse().find(m => m.role==='user') || activeHistory[activeHistory.length-2];
                        if (!lastUserMsg) return;
                        setInput('');
                        setIsTyping(true);
                        try {
                          const reqId = newRequestId();
                          const stream2 = getAIAssistantResponseStream(lastUserMsg.content, activePersona!, activeHistory, 'Nenhum documento relevante encontrado.', { forceWeb: true, requestId: reqId });
                          let acc = '';
                          for await (const ch of stream2) { acc += ch; }
                          setConversationHistories(prev => ({ ...prev, [activePersona!.id]: [...activeHistory, { role:'model', content: acc }] }));
                        } finally {
                          setIsTyping(false);
                        }
                      }}
                      className="text-xs px-2 py-1 rounded border hover:bg-slate-50"
                    >
                      Refinar com Web
                    </button>
                  </div>
                );
              }
              return null;
            })()
          )}
          {msg.role === 'model' && msg.content && (
            <button
              onClick={() => handleCopy(msg.content, index)}
              title="Copiar texto"
              className="absolute -top-2 -right-2 p-1.5 bg-slate-100 text-slate-500 rounded-full border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200 hover:text-slate-700"
            >
              {justCopiedIndex === index ? (
                <CheckCircleIcon className="w-4 h-4 text-green-600" />
              ) : (
                <ClipboardDocumentIcon className="w-4 h-4" />
              )}
            </button>
          )}
          {msg.role === 'model' && msg.content && (
            <div className="mt-2 flex items-center gap-2">
              {formatAIResponse(msg.content).includes('### Resumo executivo') && (
                <button
                  onClick={async () => {
                    const text = formatAIResponse(msg.content);
                    const idx = text.indexOf('### Resumo executivo');
                    const chunk = idx >= 0 ? text.slice(idx) : text;
                    const ok = await copyToClipboard(chunk);
                    const t = (window as any).toast;
                    if (ok) { t?.success ? t.success('Copiado!') : alert('Copiado!'); }
                    else { t?.error ? t.error('Falha ao copiar') : alert('Falha ao copiar'); }
                  }}
                  className="text-xs px-2 py-1 rounded border hover:bg-slate-50"
                >
                  Copiar Resumo executivo
                </button>
              )}
            </div>
          )}
          {SHOW_SOURCES && msg.role === 'model' && msg.content && (
            <div className="mt-3 border-t pt-2">
              <div className="text-xs font-semibold text-slate-700 mb-1">Fontes</div>
              <div className="space-y-1">
                {((msg as any).metaSources || []).length === 0 ? (
                  <div className="text-xs text-slate-500 inline-flex items-center gap-2"><span className="px-2 py-0.5 bg-slate-100 rounded">Sem fontes</span></div>
                ) : (
                  ((msg as any).metaSources || []).map((s: any, i: number) => (
                    <div key={i} className="text-xs bg-slate-50 rounded border border-slate-200 px-2 py-1 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`${s.provider==='web' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-800'} px-1.5 py-0.5 rounded`}>{s.provider==='web' ? 'Web' : 'Base'}</span>
                        <span className="truncate" title={s.title}>{s.title}</span>
                        {typeof s.score === 'number' && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 flex-shrink-0">{s.score.toFixed(2)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {s.url && (
                          <button onClick={() => window.open(s.url, '_blank', 'noopener')} className="text-blue-700 hover:underline">Abrir</button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    ));

    if (isLoading) {
        return <LoadingSpinner text="Carregando dados da IA..." />;
    }

    if (fetchError) {
        return <ErrorDisplay message={fetchError} />;
    }

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <header className="p-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-5xl mx-auto">
                    <div className="mb-3">
                        <Breadcrumb 
                            items={[
                                { module: Module.Diagnostico, label: 'Início' },
                                { module: Module.Assistente, label: 'Assistente IA' }
                            ]} 
                        />
                    </div>
                    <div className="flex justify-between items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-slate-800 hidden sm:block">Assistente IA</h1>
                            <div className="flex items-center gap-2">
                                {personas.map(p => (
                                    <ModeButton key={p.id} targetMode={p.id} text={p.name.split(' ')[0]} />
                                ))}
                            </div>
                        </div>
                    <div className="flex items-center gap-1.5">
                        <Tooltip text="Atualizar dados da IA (documentos/personas)">
                          <button onClick={() => setLastRefreshed(Date.now())} className="p-2 text-slate-600 hover:text-blue-700 rounded-md hover:bg-slate-100" aria-label="Atualizar">
                            <RefreshIcon className="w-5 h-5" />
                          </button>
                        </Tooltip>
                        <Tooltip text="Editar personas e configurações">
                          <button onClick={() => setShowAssistantSettings(true)} className="p-2 text-slate-600 hover:text-emerald-700 rounded-md hover:bg-slate-100" aria-label="Editar">
                            <PencilIcon className="w-5 h-5" />
                          </button>
                        </Tooltip>
                        <Tooltip text="Limpar histórico da persona atual">
                          <button onClick={clearHistory} className="p-2 text-slate-600 hover:text-red-700 rounded-md hover:bg-slate-100" aria-label="Limpar histórico">
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </Tooltip>
                    </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-3 md:p-6 overflow-y-auto">
                <div className="space-y-6 max-w-4xl mx-auto">
                    {activeHistory.length === 0 && !isTyping && activePersona && (
                        <div className="text-center text-slate-500 pt-16 flex flex-col items-center justify-center bg-white rounded-2xl h-full min-h-[400px] border border-slate-200/80">
                            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <RobotIcon className="w-12 h-12 text-blue-900" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Assistente IA GGV</h3>
                            <p className="max-w-sm mt-1">{activePersona.description}</p>
                            <div className="mt-4 space-y-2">
                                <p className="text-sm font-semibold p-2 px-4 bg-slate-100 rounded-lg">Modo: {activePersona.name}</p>
                                {knowledgeDocuments.length > 0 && (
                                    <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 p-2 px-3 rounded-lg">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <span>Banco vetorial ativo ({knowledgeDocuments.length} documentos)</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                        {(activeHistory.length > 100 ? activeHistory.slice(-100) : activeHistory).map((msg, index) => (
                        <div key={index} className={`flex gap-2 md:gap-3 items-start ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'model' && (
                                <div className="w-9 h-9 rounded-full bg-blue-900 flex items-center justify-center flex-shrink-0 shadow-sm text-white font-bold text-sm">
                                    IA
                                </div>
                            )}
                            <div className={`group relative max-w-2xl px-3 md:px-4 py-2.5 md:py-3 rounded-2xl shadow-sm break-words ${msg.role === 'user' ? 'bg-blue-900 text-white rounded-br-none' : 'bg-white text-slate-800 rounded-bl-none border border-slate-200/80'}`}>
                                <AIMarkdown content={msg.role === 'model' ? formatAIResponse(msg.content) : msg.content} />
                                {/* Badge/Base fraca + ação */}
                                {msg.role === 'model' && index === activeHistory.length - 1 && (
                                  (() => {
                                    const hint = (globalThis as any).__RAG_CONFIDENCE__ as ('low'|'medium'|'high'|undefined);
                                    if (hint === 'low') {
                                      return (
                                        <div className="mt-2 flex items-center gap-2">
                                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800">Base fraca</span>
                                          <button
                                            onClick={async () => {
                                              const lastUserMsg = [...activeHistory].reverse().find(m => m.role==='user') || activeHistory[activeHistory.length-2];
                                              if (!lastUserMsg) return;
                                              setInput('');
                                              setIsTyping(true);
                                              try {
                                                const reqId = newRequestId();
                                                const stream2 = getAIAssistantResponseStream(lastUserMsg.content, activePersona!, activeHistory, 'Nenhum documento relevante encontrado.', { forceWeb: true, requestId: reqId });
                                                let acc = '';
                                                for await (const ch of stream2) { acc += ch; }
                                                setConversationHistories(prev => ({ ...prev, [activePersona!.id]: [...activeHistory, { role:'model', content: acc }] }));
                                              } finally {
                                                setIsTyping(false);
                                              }
                                            }}
                                            className="text-xs px-2 py-1 rounded border hover:bg-slate-50"
                                          >
                                            Refinar com Web
                                          </button>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()
                                )}
                                {msg.role === 'model' && msg.content && (
                                    <button
                                        onClick={() => handleCopy(msg.content, index)}
                                        title="Copiar texto"
                                        className="absolute -top-2 -right-2 p-1.5 bg-slate-100 text-slate-500 rounded-full border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200 hover:text-slate-700"
                                    >
                                        {justCopiedIndex === index ? (
                                            <CheckCircleIcon className="w-4 h-4 text-green-600" />
                                        ) : (
                                            <ClipboardDocumentIcon className="w-4 h-4" />
                                        )}
                                    </button>
                                )}
                                {msg.role === 'model' && msg.content && (
                                  <div className="mt-2 flex items-center gap-2">
                                    {formatAIResponse(msg.content).includes('### Resumo executivo') && (
                                      <button
                                        onClick={async () => {
                                          const text = formatAIResponse(msg.content);
                                          const idx = text.indexOf('### Resumo executivo');
                                          const chunk = idx >= 0 ? text.slice(idx) : text;
                                          const ok = await copyToClipboard(chunk);
                                          const t = (window as any).toast;
                                          if (ok) { t?.success ? t.success('Copiado!') : alert('Copiado!'); }
                                          else { t?.error ? t.error('Falha ao copiar') : alert('Falha ao copiar'); }
                                        }}
                                        className="text-xs px-2 py-1 rounded border hover:bg-slate-50"
                                      >
                                        Copiar Resumo executivo
                                      </button>
                                    )}
                                  </div>
                                )}
                                {SHOW_SOURCES && msg.role === 'model' && msg.content && (
                                  <div className="mt-3 border-t pt-2">
                                    <div className="text-xs font-semibold text-slate-700 mb-1">Fontes</div>
                                    <div className="space-y-1">
                                      {((msg as any).metaSources || []).length === 0 ? (
                                        <div className="text-xs text-slate-500 inline-flex items-center gap-2"><span className="px-2 py-0.5 bg-slate-100 rounded">Sem fontes</span></div>
                                      ) : (
                                        ((msg as any).metaSources || []).map((s: any, i: number) => (
                                          <div key={i} className="text-xs bg-slate-50 rounded border border-slate-200 px-2 py-1 flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span className={`px-1.5 py-0.5 rounded ${s.provider==='web' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-800'}`}>{s.provider==='web' ? 'Web' : 'Base'}</span>
                                              <span className="truncate" title={s.title}>{s.title}</span>
                                              {typeof s.score === 'number' && (
                                                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 flex-shrink-0">{s.score.toFixed(2)}</span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {s.url && (
                                                <button onClick={() => window.open(s.url, '_blank', 'noopener')} className="text-blue-700 hover:underline">Abrir</button>
                                              )}
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                        </div>
                        ))}

                    {isTyping && (
                        <div className="flex gap-4 items-start">
                            <div className="w-9 h-9 rounded-full bg-blue-900 flex items-center justify-center flex-shrink-0 shadow-sm text-white font-bold text-sm">
                                IA
                            </div>
                            <div className="px-4 py-3 rounded-2xl bg-white rounded-bl-none border border-slate-200/80 shadow-sm">
                                <div className="flex items-center justify-center space-x-1 h-5">
                                    <span className="w-2 h-2 bg-blue-800 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></span>
                                    <span className="w-2 h-2 bg-blue-800 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                                    <span className="w-2 h-2 bg-blue-800 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
            </main>

            {showAssistantSettings && (
              <Suspense fallback={<div className="p-4 text-sm text-slate-600">Carregando…</div>}>
                <AssistantSettingsModal onClose={() => setShowAssistantSettings(false)} />
              </Suspense>
            )}

            <footer className="p-3 md:p-4 bg-slate-100/80 backdrop-blur-sm sticky bottom-0 [padding-bottom:env(safe-area-inset-bottom)]">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 md:gap-3 max-w-4xl mx-auto p-2 bg-white rounded-xl border border-slate-300 shadow-md focus-within:ring-2 focus-within:ring-blue-800 transition-all">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessageLogic(); } }}
                        className="flex-1 bg-transparent rounded-lg px-3 md:px-4 py-2 text-slate-800 focus:outline-none placeholder-slate-400 resize-none max-h-40 overflow-y-auto"
                        placeholder={activePersona ? `Perguntar ao assistente no modo ${activePersona.name}...` : 'Carregando...'}
                        disabled={isTyping || !activePersona}
                        rows={1}
                    />
                    <button type="submit" disabled={isTyping || !input.trim() || !activePersona} className="bg-blue-900 text-white p-3 md:p-2 rounded-lg min-w-[44px] min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-800 transition-colors" aria-busy={isTyping ? 'true' : undefined}>
                        <PaperAirplaneIcon className="w-5 h-5" />
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default AssistenteIA;
