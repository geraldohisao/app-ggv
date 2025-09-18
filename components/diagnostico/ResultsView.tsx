import React, { useState, useEffect, useMemo } from 'react';
import { CompanyData, SummaryInsights, DetailedAIAnalysis, MaturityResult, MarketSegment, Answers } from '../../types';
import { getSummaryInsights, getDetailedAIAnalysis } from '../../services/geminiService';
import { diagnosticQuestions } from '../../data/diagnosticoQuestions';
import { ArrowLeftIcon, ArrowRightIcon, EnvelopeIcon, DocumentTextIcon, RefreshIcon, ExclamationTriangleIcon } from '../ui/icons';
import { EmailModal } from './modals/EmailModal';
import { CoverTab, DashboardTab, UnifiedCoverDashboardTab, SalesBottlenecksTab, TextualDiagnosisTab, AIAnalysisTab } from './report';
import { getCurrentUserDisplayName, sendDiagnosticToN8n, createPublicReport } from '../../services/supabaseService';
import { DIAGNOSTIC_FIX_VERSION } from '../../src/buildId';

// ============================================================================
// SISTEMA ANTI-ALUCINAÇÃO: CONSTANTES IMUTÁVEIS PARA VALIDAÇÃO
// ============================================================================
const DIAGNOSTIC_VALIDATION = {
    EXPECTED_QUESTION_COUNT: 9,
    VALID_ANSWER_TYPES: ['Sim', 'Não', 'Parcialmente', 'Às vezes'] as const,
    VALID_SCORES: [0, 5, 10] as const,
    REQUIRED_PAYLOAD_FIELDS: ['questionId', 'question', 'answer', 'description', 'score'] as const
} as const;

const REPORT_TABS = ["Dashboard", "Pontos de Atenção", "Análise IA"];
const MAX_SCORE_PER_QUESTION = 10;
const MAX_SCORE = diagnosticQuestions.length * MAX_SCORE_PER_QUESTION;

interface ResultsViewProps {
    companyData: CompanyData;
    segment: MarketSegment;
    answers: Answers;
    totalScore: number;
    dealId?: string;
    onRetry: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ companyData, segment, answers, totalScore, dealId, onRetry }) => {
    const [activeTab, setActiveTab] = useState(REPORT_TABS[0]);
    
    // 🚀 MELHORIA: Lógica simplificada e robusta para deal_id
    const finalDealId = useMemo(() => {
        // 1. PRIORIDADE: URL (fonte mais confiável)
        const urlParams = new URLSearchParams(window.location.search);
        const dealIdFromUrl = urlParams.get('deal_id');
        
        if (dealIdFromUrl?.trim()) {
            console.log('✅ DEAL_ID - Usando da URL:', dealIdFromUrl.trim());
            return dealIdFromUrl.trim();
        }
        
        // 2. FALLBACK: Props
        if (dealId?.trim()) {
            console.log('⚠️ DEAL_ID - Usando das props:', dealId.trim());
            return dealId.trim();
        }
        
        console.log('❌ DEAL_ID - Nenhum deal_id válido encontrado');
        return null;
    }, [dealId]); // Recalcular apenas quando dealId prop mudar
    
    console.log('🎯 DEAL_ID FINAL:', finalDealId);
    
    // VALIDAÇÃO CRÍTICA: Não renderizar ResultsView sem deal_id
    if (!finalDealId) {
        console.error('🚨 RESULTS_VIEW - Tentativa de renderizar sem deal_id válido!');
        
        return (
            <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-md text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-red-900 mb-2">Erro: Deal ID Ausente</h2>
                    <p className="text-red-700 mb-4">
                        Não é possível exibir resultados sem um Deal ID válido. 
                        Por favor, acesse através do link correto com deal_id.
                    </p>
                    <button
                        onClick={() => window.location.href = '/diagnostico'}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                        Voltar ao Início
                    </button>
                </div>
            </div>
        );
    }
    
    const [showEmailModal, setShowEmailModal] = useState(false);
    // Removido: modal de PDF em favor do relatório público em nova guia

    const [summaryInsights, setSummaryInsights] = useState<SummaryInsights | null>(null);
    const [detailedAnalysis, setDetailedAnalysis] = useState<DetailedAIAnalysis | null>(null);
    const [specialistName, setSpecialistName] = useState<string>('');
    // 🚀 MELHORIA: Estado de envio mais robusto
    const [webhookStatus, setWebhookStatus] = useState<{
        sent: boolean;
        sending: boolean;
        success: boolean;
        error: string | null;
        attempts: number;
    }>({
        sent: false,
        sending: false,
        success: false,
        error: null,
        attempts: 0
    });
    const [emergencyTimeout, setEmergencyTimeout] = useState<boolean>(false);

    useEffect(() => {
        // Busca o nome do usuário logado para exibir como Especialista na capa
        (async () => {
            const name = await getCurrentUserDisplayName();
            if (name) setSpecialistName(name);
        })();
    }, []);
    const [isLoadingSummary, setIsLoadingSummary] = useState(true);
    const [isLoadingDetailed, setIsLoadingDetailed] = useState(true);
    const [apiError, setApiError] = useState<string | null>(null);

    const maturity: MaturityResult = useMemo(() => {
        const percentage = (totalScore / MAX_SCORE) * 100;
        if (percentage <= 35) return { level: 'Baixa', color: 'text-red-600', bgColor: 'bg-red-100', description: 'Crítico' };
        if (percentage <= 60) return { level: 'Média', color: 'text-yellow-600', bgColor: 'bg-yellow-100', description: 'Em Desenvolvimento' };
        return { level: 'Alta', color: 'text-green-600', bgColor: 'bg-green-100', description: 'Avançado' };
    }, [totalScore]);

    useEffect(() => {
        const fetchInsights = async () => {
            setIsLoadingSummary(true);
            setIsLoadingDetailed(true);
            setApiError(null);
            try {
                // Buscar resumo e detalhado em paralelo, porém o detalhado depende do resumo -> usamos fallback local se o resumo atrasar
                const summaryPromise = getSummaryInsights(companyData, answers, totalScore, segment);
                const detailedPromise = summaryPromise.then(s => getDetailedAIAnalysis(companyData, answers, totalScore, s, segment));

                const summary = await summaryPromise;
                setSummaryInsights(summary);
                setIsLoadingSummary(false);

                const detailed = await detailedPromise;
                setDetailedAnalysis(detailed);
            } catch (err: any) {
                console.error("Failed to get AI analysis:", err);
                setApiError(err.message || "Falha ao obter análise da IA.");
            } finally {
                setIsLoadingSummary(false);
                setIsLoadingDetailed(false);
            }
        };
        fetchInsights();
    }, [companyData, answers, totalScore, segment]);

    // 🚀 MELHORIA: Timeout mais inteligente
    useEffect(() => {
        const timer = setTimeout(() => {
            if (webhookStatus.sent || webhookStatus.sending) return; // Já processado
            if (summaryInsights && detailedAnalysis) return; // IA ok
            console.warn('⏰ TIMEOUT: Forçando envio após 20s sem IA completa');
            setEmergencyTimeout(true);
        }, 20000); // Reduzido para 20 segundos
        return () => clearTimeout(timer);
    }, [webhookStatus.sent, webhookStatus.sending, summaryInsights, detailedAnalysis]);

    // OBS: Envio será feito **apenas** após a análise IA estar pronta.
    // O bloco de envio imediato foi removido para evitar dois webhooks.

    // 🚀 MELHORIA: Envio ÚNICO para N8N com controle robusto
    useEffect(() => {
        const sendCompleteAnalysis = async () => {
            // DEBUG CRÍTICO: Verificar deal_id
            console.log('🔍 WEBHOOK DEBUG - dealId recebido (prop):', dealId);
            console.log('🔍 WEBHOOK DEBUG - finalDealId:', finalDealId);
            console.log('🔍 WEBHOOK DEBUG - webhookStatus:', webhookStatus);
            
            // 🚀 PROTEÇÃO CRÍTICA: Evitar envio duplo ou simultâneo
            if (webhookStatus.sent || webhookStatus.sending) {
                console.log('🚫 N8N - Já processado/processando, pulando...', webhookStatus);
                return;
            }
            
            // Validar dados básicos
            if (!companyData || !answers || Object.keys(answers).length === 0) {
                console.log('⚠️ N8N - Dados incompletos, aguardando...');
                return;
            }

            // Aguardar análise IA estar pronta OU timeout de emergência
            const hasAI = summaryInsights && detailedAnalysis;
            if (!hasAI && !emergencyTimeout) {
                console.log('⏳ N8N - Aguardando análise IA ou timeout de emergência...');
                return;
            }

            // 🚀 MARCAR COMO ENVIANDO IMEDIATAMENTE para evitar race conditions
            setWebhookStatus(prev => ({ 
                ...prev, 
                sending: true, 
                attempts: prev.attempts + 1 
            }));
            
            console.log('🚀 N8N - ENVIANDO DIAGNÓSTICO ÚNICO', hasAI ? 'com análise IA' : 'por timeout');
            console.log('🔒 N8N - Status marcado como "sending" para evitar duplicação');
            
            try {
                const isProduction = window.location.hostname === 'app.grupoggv.com';
                const baseUrl = isProduction ? 'https://app.grupoggv.com' : window.location.origin;
                
                // Gerar token seguro para URL pública
                const generateSecureToken = (dealId: string) => {
                    const timestamp = Date.now();
                    const randomSalt = Math.random().toString(36).substring(2, 15);
                    const dataToHash = `${dealId}-${timestamp}-${randomSalt}`;
                    
                    let hash = 0;
                    for (let i = 0; i < dataToHash.length; i++) {
                        const char = dataToHash.charCodeAt(i);
                        hash = ((hash << 5) - hash) + char;
                        hash = hash & hash;
                    }
                    
                    const shortDealId = dealId.substring(0, 3);
                    return `${timestamp}-${Math.abs(hash).toString(36)}-${shortDealId}`;
                };
                
                const secureToken = finalDealId ? generateSecureToken(finalDealId) : 'diagnostic-' + Date.now();
                const publicReportUrl = `${baseUrl}/r/${secureToken}`;

                // Salvar relatório público
                try {
                    const reportData = {
                        companyData,
                        segment,
                        answers,
                        totalScore,
                        maturity,
                        summaryInsights,
                        detailedAnalysis,
                        scoresByArea: scoresByArea,
                        ...(finalDealId && { dealId: finalDealId })
                    };
                    
                    console.log('💾 N8N - Salvando relatório público:', { token: secureToken, hasDealId: !!dealId });
                    
                    const { createPublicReport } = await import('../../services/supabaseService');
                    await createPublicReport(reportData, undefined, undefined, dealId, secureToken);
                    console.log('✅ N8N - Relatório salvo com sucesso:', secureToken);
                } catch (tokenError) {
                    console.error('❌ N8N - ERRO CRÍTICO ao salvar relatório:', tokenError);
                }

                // Payload completo para N8N (inclui score + análise IA se disponível)
                const payload = {
                    ...(finalDealId && { deal_id: finalDealId }), // Só incluir se houver deal_id
                    timestamp: new Date().toISOString(),
                    action: 'ai_analysis_completed',
                    
                    body: {
                        results: {
                            maturityPercentage: Math.round((totalScore / 90) * 100)
                        },
                        resultUrl: publicReportUrl,
                        ...(finalDealId && { deal_id: finalDealId }), // Só incluir se houver deal_id
                        
                        // Incluir análise IA se disponível
                        ...(hasAI && {
                            aiAnalysis: {
                                summaryInsights: {
                                    specialistInsight: summaryInsights.specialistInsight || '',
                                    recommendations: (summaryInsights as any).recommendations || []
                                },
                                detailedAnalysis: {
                                    strengths: detailedAnalysis.strengths || [],
                                    improvements: (detailedAnalysis as any).improvements || [],
                                    nextSteps: detailedAnalysis.nextSteps || []
                                }
                            }
                        }),

                        // Respostas do diagnóstico
                        diagnosticAnswers: diagnosticQuestions.map((question) => {
                            const score = answers[question.id];
                            const option = question.options.find(opt => opt.score === score);
                            
                            if (!option) {
                                const fallbackMap = { 10: 'Sim', 5: 'Parcialmente', 0: 'Não' };
                                const fallbackAnswer = fallbackMap[score as keyof typeof fallbackMap] || 'Resposta inválida';
                                
                                return {
                                    questionId: question.id,
                                    question: question.text,
                                    answer: fallbackAnswer,
                                    description: `FALLBACK: Score ${score}`,
                                    score: score
                                };
                            }
                            
                            return {
                                questionId: question.id,
                                question: question.text,
                                answer: option.text,
                                description: option.description,
                                score: score
                            };
                        })
                    },
                    
                    // Dados adicionais
                    companyData: {
                        companyName: companyData.companyName,
                        email: companyData.email,
                        activityBranch: companyData.activityBranch,
                        activitySector: (companyData as any).activitySector,
                        monthlyBilling: companyData.monthlyBilling,
                        salesTeamSize: companyData.salesTeamSize,
                        salesChannels: companyData.salesChannels || [],
                        
                        // 🚀 INCLUIR TODOS os campos que antes eram enviados separadamente
                        ...(companyData as any) // Todos os outros campos do formulário
                    },
                    // 🆕 Contexto adicional do cliente - OBRIGATÓRIO para N8N!
                    clientContext: {
                        situacao: (companyData as any).situacao || 'Empresa buscando otimização dos processos comerciais',
                        problema: (companyData as any).problema || 'Necessidade de estruturação e melhoria da eficiência comercial',
                        perfil_do_cliente: (companyData as any).perfil_do_cliente || `${companyData.activityBranch || 'Empresa'} com ${companyData.salesTeamSize || 'equipe'} comercial`,
                    },
                    segment: {
                        name: segment?.name || 'Geral',
                        id: segment?.id || 'geral'
                    },
                    source: 'web-diagnostic',
                    version: DIAGNOSTIC_FIX_VERSION
                };

                            console.log('📤 N8N - Enviando payload completo:', payload);
            console.log('🔍 N8N - VERIFICAÇÃO FINAL do deal_id no payload:');
            console.log('  - payload.deal_id:', payload.deal_id);
            console.log('  - payload.body.deal_id:', payload.body.deal_id);
            console.log('  - dealId original (prop):', dealId);
            console.log('  - finalDealId (usado):', finalDealId);
            console.log('  - Tipo do finalDealId:', typeof finalDealId);
            console.log('  - URL atual completa:', window.location.href);
            
            // 🚀 VALIDAÇÃO ANTI-ALUCINAÇÃO MELHORADA
            const urlDealId = new URLSearchParams(window.location.search).get('deal_id');
            if (urlDealId && payload.deal_id !== urlDealId) {
                console.error('🚨 INCONSISTÊNCIA CRÍTICA DETECTADA!');
                console.error('  - Deal ID na URL:', urlDealId);
                console.error('  - Deal ID no payload:', payload.deal_id);
                console.error('  - Esta inconsistência pode causar dados incorretos!');
                
                // 🚀 AUTO-CORREÇÃO: Usar sempre o da URL se disponível
                if (payload.deal_id) payload.deal_id = urlDealId;
                if (payload.body.deal_id) payload.body.deal_id = urlDealId;
                console.log('🔧 AUTO-CORREÇÃO aplicada - usando deal_id da URL');
            } else if (urlDealId) {
                console.log('✅ VALIDAÇÃO OK - Deal ID do payload confere com a URL');
            }

                const webhookUrl = 'https://api-test.ggvinteligencia.com.br/webhook/diag-ggv-register';
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'GGV-Diagnostic/1.0'
                    },
                    body: JSON.stringify(payload)
                });

                console.log('📊 N8N - Status da resposta:', response.status);
                
                if (response.ok) {
                    console.log('✅ N8N - Diagnóstico enviado com sucesso');
                    setWebhookStatus(prev => ({ 
                        ...prev, 
                        sent: true, 
                        sending: false, 
                        success: true,
                        error: null 
                    }));
                } else {
                    const errorMsg = `Falha HTTP: ${response.status}`;
                    console.warn('⚠️ N8N - Falha ao enviar:', errorMsg);
                    setWebhookStatus(prev => ({ 
                        ...prev, 
                        sending: false, 
                        success: false,
                        error: errorMsg 
                    }));
                }
                
                // ADICIONAR: Envio para webhook do Pipedrive se houver deal_id
                if (finalDealId && finalDealId.trim() !== '') {
                    console.log('📤 PIPEDRIVE - Enviando para webhook do Pipedrive com deal_id:', finalDealId);
                    try {
                        const { sendDiagnosticToPipedrive } = await import('../../services/supabaseService');
                        const pipedriveSuccess = await sendDiagnosticToPipedrive(
                            companyData,
                            answers,
                            totalScore,
                            finalDealId
                        );
                        
                        if (pipedriveSuccess) {
                            console.log('✅ PIPEDRIVE - Webhook enviado com sucesso para deal_id:', finalDealId);
                        } else {
                            console.warn('⚠️ PIPEDRIVE - Falha ao enviar webhook para deal_id:', finalDealId);
                        }
                    } catch (pipedriveError) {
                        console.error('❌ PIPEDRIVE - Erro ao enviar webhook:', pipedriveError);
                    }
                } else {
                    console.log('⚠️ PIPEDRIVE - Deal ID não disponível, pulando webhook do Pipedrive');
                }

            } catch (error: any) {
                const errorMsg = error.message || 'Erro desconhecido';
                console.error('❌ N8N - Erro ao enviar:', errorMsg);
                setWebhookStatus(prev => ({ 
                    ...prev, 
                    sent: true, // Marcar como processado para não ficar tentando
                    sending: false, 
                    success: false,
                    error: errorMsg 
                }));
            }
        };

        sendCompleteAnalysis();
    }, [summaryInsights, detailedAnalysis, emergencyTimeout, webhookStatus.sent, webhookStatus.sending, companyData, answers, totalScore, finalDealId]);

    const handleNextTab = () => {
        const currentIndex = REPORT_TABS.indexOf(activeTab);
        if (currentIndex < REPORT_TABS.length - 1) setActiveTab(REPORT_TABS[currentIndex + 1]);
    };

    const handlePrevTab = () => {
        const currentIndex = REPORT_TABS.indexOf(activeTab);
        if (currentIndex > 0) setActiveTab(REPORT_TABS[currentIndex - 1]);
    };

    const scoresByArea = useMemo(() => {
        const scores: Record<string, { score: number; count: number }> = {};
        diagnosticQuestions.forEach(q => {
            if (!scores[q.area]) scores[q.area] = { score: 0, count: 0 };
            scores[q.area].score += answers[q.id] || 0;
            scores[q.area].count += 1;
        });
        return scores;
    }, [answers]);

    const allDataForPdf = { companyData, segment, answers, totalScore, maturity, summaryInsights, detailedAnalysis, scoresByArea };

    const hasAIReady = Boolean(summaryInsights && detailedAnalysis);

    const handleOpenPublicReport = async () => {
        if (!hasAIReady) return;
        try {
            const isProduction = window.location.hostname === 'app.grupoggv.com';
            const baseUrl = isProduction ? 'https://app.grupoggv.com' : window.location.origin;
            const reportData = allDataForPdf;
            const { token } = await createPublicReport(reportData, undefined, undefined, dealId);
            const url = `${baseUrl}/r/${token}`;
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (e) {
            console.error('Falha ao abrir relatório público:', e);
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto animate-fade-in space-y-6">
            <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-lg border border-slate-200/50">
                <div className="flex items-center justify-between flex-wrap gap-y-4">
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrevTab} disabled={REPORT_TABS.indexOf(activeTab) === 0} className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
                            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
                        </button>
                        <button onClick={handleNextTab} disabled={REPORT_TABS.indexOf(activeTab) === REPORT_TABS.length - 1} className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
                            <ArrowRightIcon className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 justify-center flex-grow flex-wrap">
                        {REPORT_TABS.map(tab => (
                            <TabButton key={tab} tabName={tab} activeTab={activeTab} setActiveTab={setActiveTab} isLoading={(tab === 'Diagnóstico Textual' && isLoadingSummary) || (tab === 'Análise IA' && isLoadingDetailed)} />
                        ))}
                    </div>
                </div>
            </div>

            {apiError && (
                <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-200 flex items-center gap-3">
                    <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0" />
                    <div>
                        <h3 className="font-bold">Erro na Geração da Análise por IA</h3>
                        <p className="text-sm">{apiError} Verifique a configuração da chave de API no servidor.</p>
                    </div>
                </div>
            )}

            <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-lg border border-slate-200/50 min-h-[60vh]">
                {activeTab === 'Dashboard' && <UnifiedCoverDashboardTab companyData={companyData} maturity={maturity} totalScore={totalScore} segment={segment} scoresByArea={scoresByArea} specialistName={specialistName} />}
                {activeTab === 'Pontos de Atenção' && <SalesBottlenecksTab scoresByArea={scoresByArea} detailedAnalysis={detailedAnalysis} summaryInsights={summaryInsights} isLoading={isLoadingDetailed || isLoadingSummary} />}
                {activeTab === 'Análise IA' && <AIAnalysisTab detailedAnalysis={detailedAnalysis} isGenerating={isLoadingDetailed} />}
            </div>

            {/* 🚀 NOVO: Indicador de status do envio */}
            {(webhookStatus.sending || webhookStatus.error) && (
                <div className={`bg-white p-3 rounded-2xl shadow-lg border border-slate-200/50 flex items-center gap-3 ${
                    webhookStatus.error ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'
                }`}>
                    {webhookStatus.sending && (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="text-sm text-blue-700 font-medium">
                                Enviando resultados... (Tentativa {webhookStatus.attempts})
                            </span>
                        </>
                    )}
                    {webhookStatus.error && (
                        <>
                            <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-red-700 font-medium">
                                Erro no envio: {webhookStatus.error}
                            </span>
                        </>
                    )}
                </div>
            )}
            
            <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-200/50 flex flex-wrap items-center justify-center gap-4">
                <button onClick={() => hasAIReady && setShowEmailModal(true)} disabled={!hasAIReady} className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${hasAIReady ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-50 text-slate-400 cursor-not-allowed'}`} aria-disabled={!hasAIReady}>
                    <EnvelopeIcon className="w-5 h-5" /> Enviar por E-mail
                </button>
                <button onClick={handleOpenPublicReport} disabled={!hasAIReady} className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${hasAIReady ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-50 text-slate-400 cursor-not-allowed'}`} aria-disabled={!hasAIReady}>
                    <DocumentTextIcon className="w-5 h-5" /> Abrir Relatório Público
                </button>
                <button onClick={onRetry} className="flex items-center gap-2 text-sm font-semibold bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                    <RefreshIcon className="w-5 h-5" /> Refazer
                </button>
            </div>

            {showEmailModal && <EmailModal onClose={() => setShowEmailModal(false)} companyData={companyData} reportData={allDataForPdf} dealId={dealId} />}
        </div>
    );
};

const TabButton: React.FC<{ tabName: string, activeTab: string, setActiveTab: (tab: string) => void, isLoading: boolean }> = ({ tabName, activeTab, setActiveTab, isLoading }) => (
    <button
        key={tabName}
        onClick={() => setActiveTab(tabName)}
        className={`relative px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === tabName ? 'bg-blue-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
    >
        {tabName}
        {isLoading && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span></span>}
    </button>
);
