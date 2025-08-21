import React, { useState, useEffect, useMemo } from 'react';
import { CompanyData, SummaryInsights, DetailedAIAnalysis, MaturityResult, MarketSegment, Answers } from '../../types';
import { getSummaryInsights, getDetailedAIAnalysis } from '../../services/geminiService';
import { diagnosticQuestions } from '../../data/diagnosticoQuestions';
import { ArrowLeftIcon, ArrowRightIcon, EnvelopeIcon, DocumentTextIcon, RefreshIcon, ExclamationTriangleIcon } from '../ui/icons';
import { EmailModal } from './modals/EmailModal';
import { PdfModal } from './modals/PdfModal';
import { CoverTab, DashboardTab, SegmentedAnalysisTab, TextualDiagnosisTab, AIAnalysisTab } from './report';
import { getCurrentUserDisplayName, sendDiagnosticToN8n, createPublicReport } from '../../services/supabaseService';

const REPORT_TABS = ["Capa", "Dashboard Geral", "Análise Segmentada", "Diagnóstico Textual", "Análise IA"];
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
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showPdfModal, setShowPdfModal] = useState(false);

    const [summaryInsights, setSummaryInsights] = useState<SummaryInsights | null>(null);
    const [detailedAnalysis, setDetailedAnalysis] = useState<DetailedAIAnalysis | null>(null);
    const [specialistName, setSpecialistName] = useState<string>('');
    const [n8nSent, setN8nSent] = useState<boolean>(false);
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

    // Timeout de emergência para enviar mesmo se IA não responder
    useEffect(() => {
        const timer = setTimeout(() => {
            console.log('⏰ N8N - Timeout de emergência ativado (15s)');
            setEmergencyTimeout(true);
        }, 15000); // 15 segundos

        return () => clearTimeout(timer);
    }, []);

    // Envio direto para N8N - refatorado para ser mais simples e confiável
    useEffect(() => {
        const sendDiagnosticResults = async () => {
            // Só executar uma vez e quando tiver dados básicos
            if (n8nSent || !companyData || !answers || Object.keys(answers).length === 0) {
                return;
            }

            console.log('🚀 N8N - Iniciando envio dos resultados do diagnóstico');
            console.log('📊 N8N - Deal ID:', dealId);
            console.log('📊 N8N - Total Score:', totalScore);

            try {
                // 1. ENVIO IMEDIATO - Resultados básicos do diagnóstico
                const isProduction = window.location.hostname === 'app.grupoggv.com';
                const baseUrl = isProduction ? 'https://app.grupoggv.com' : window.location.origin;
                
                // Gerar token seguro para URL pública (evitar exposição direta do deal_id)
                const generateSecureToken = (dealId: string) => {
                    const timestamp = Date.now();
                    const randomSalt = Math.random().toString(36).substring(2, 15);
                    const dataToHash = `${dealId}-${timestamp}-${randomSalt}`;
                    
                    // Simular hash simples (em produção usar crypto real)
                    let hash = 0;
                    for (let i = 0; i < dataToHash.length; i++) {
                        const char = dataToHash.charCodeAt(i);
                        hash = ((hash << 5) - hash) + char;
                        hash = hash & hash; // Convert to 32bit integer
                    }
                    
                    // Formato: {timestamp}-{hash_absoluto}-{primeiros_chars_deal}
                    const shortDealId = dealId.substring(0, 3);
                    return `${timestamp}-${Math.abs(hash).toString(36)}-${shortDealId}`;
                };
                
                const secureToken = dealId ? generateSecureToken(dealId) : 'diagnostic-' + Date.now();
                const publicReportUrl = `${baseUrl}/r/${secureToken}`;

                // Salvar token seguro no banco para mapeamento futuro
                if (dealId && secureToken) {
                    try {
                        const reportData = {
                            companyData,
                            answers,
                            totalScore,
                            maturityLevel,
                            dealId
                        };
                        
                        // Importar createPublicReport dinamicamente para evitar dependência circular
                        const { createPublicReport } = await import('../../services/supabaseService');
                        await createPublicReport(reportData, undefined, undefined, dealId, secureToken);
                        console.log('✅ N8N - Token seguro salvo:', secureToken);
                    } catch (tokenError) {
                        console.warn('⚠️ N8N - Erro ao salvar token (não crítico):', tokenError);
                    }
                }

                // Estrutura EXATA que o N8N espera baseado nos mapeamentos
                const diagnosticPayload = {
                    deal_id: dealId,
                    timestamp: new Date().toISOString(),
                    action: 'diagnostic_completed',
                    
                    // Estrutura que corresponde EXATAMENTE aos mapeamentos N8N
                    body: {
                        results: {
                            maturityPercentage: Math.round((totalScore / 90) * 100)  // $('registerGGVDiag').first().json.body.results.maturityPercentage
                        },
                        resultUrl: publicReportUrl,  // $('registerGGVDiag').first().json.body.resultUrl
                        deal_id: dealId,  // Para relacionar com o negócio no Pipedrive
                        
                        // Respostas exatas das perguntas do diagnóstico
                        diagnosticAnswers: Object.entries(answers).map(([questionId, score]) => {
                            console.log(`🔍 DEBUG - questionId: ${questionId}, score: ${score}`);
                            console.log(`🔍 DEBUG - diagnosticQuestions length: ${diagnosticQuestions?.length}`);
                            
                            const question = diagnosticQuestions.find(q => q.id === parseInt(questionId));
                            console.log(`🔍 DEBUG - question found: ${!!question}, question.text: ${question?.text}`);
                            
                            const option = question?.options.find(opt => opt.score === score);
                            console.log(`🔍 DEBUG - option found: ${!!option}, option.text: ${option?.text}`);
                            
                            // Mapeamento direto das respostas baseado no score
                            let answerText = 'N/A';
                            if (option?.text) {
                                answerText = option.text;
                                console.log(`✅ Usando option.text: "${answerText}"`);
                            } else {
                                // Fallback baseado no score - algumas perguntas têm "Às vezes" = 5
                                if (score === 10) answerText = 'Sim';
                                else if (score === 5) {
                                    // Verificar se a pergunta tem "Às vezes" ou "Parcialmente"
                                    const hasAsVezes = question?.options.some(opt => opt.text === 'Às vezes');
                                    answerText = hasAsVezes ? 'Às vezes' : 'Parcialmente';
                                }
                                else if (score === 0) answerText = 'Não';
                                console.log(`⚠️ Usando fallback: "${answerText}"`);
                            }
                            
                            console.log(`📝 FINAL - Pergunta ${questionId}: score=${score}, answerText="${answerText}"`);
                            
                            return {
                                questionId: parseInt(questionId),
                                question: question?.text || `Pergunta ${questionId}`,
                                answer: answerText,  // GARANTIR que seja texto, nunca número
                                description: option?.description || '',
                                score: score
                            };
                        })
                    },
                    
                    // Dados adicionais para referência (fora do body que o N8N mapeia)
                    companyData: {
                        companyName: companyData.companyName,
                        email: companyData.email,
                        activityBranch: companyData.activityBranch,
                        monthlyBilling: companyData.monthlyBilling,
                        salesTeamSize: companyData.salesTeamSize,
                        salesChannels: companyData.salesChannels || []
                    },
                    segment: {
                        name: segment?.name || 'Geral',
                        id: segment?.id || 'geral'
                    },
                    source: 'web-diagnostic'
                };

                console.log('📤 N8N - Enviando payload completo:', diagnosticPayload);

                // Envio direto via fetch para o webhook
                const webhookUrl = 'https://api-test.ggvinteligencia.com.br/webhook/diag-ggv-register';
                
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'GGV-Diagnostic/1.0'
                    },
                    body: JSON.stringify(diagnosticPayload)
                });

                console.log('📊 N8N - Status da resposta:', response.status);
                
                if (response.ok) {
                    console.log('✅ N8N - Resultados básicos enviados com sucesso');
                    setN8nSent(true);
                } else {
                    console.warn('⚠️ N8N - POST falhou, tentando GET fallback');
                    // Fallback com GET
                    const getUrl = `${webhookUrl}?deal_id=${dealId}&action=diagnostic_completed&total_score=${totalScore}&timestamp=${Date.now()}`;
                    const getResponse = await fetch(getUrl, { method: 'GET' });
                    console.log('📊 N8N - GET fallback status:', getResponse.status);
                    setN8nSent(true);
                }

            } catch (error) {
                console.error('❌ N8N - Erro ao enviar resultados:', error);
                setN8nSent(true); // Marcar como enviado para não ficar tentando
            }
        };

        sendDiagnosticResults();
    }, [companyData, answers, totalScore, dealId, n8nSent]);

    // Envio adicional com análise IA (quando disponível)
    useEffect(() => {
        const sendAIAnalysis = async () => {
            if (!n8nSent || !summaryInsights || !detailedAnalysis) {
                return;
            }

            console.log('🤖 N8N - Enviando análise IA adicional');
            
            try {
                const isProduction = window.location.hostname === 'app.grupoggv.com';
                const baseUrl = isProduction ? 'https://app.grupoggv.com' : window.location.origin;
                
                // Gerar token seguro para URL pública (evitar exposição direta do deal_id)
                const generateSecureToken = (dealId: string) => {
                    const timestamp = Date.now();
                    const randomSalt = Math.random().toString(36).substring(2, 15);
                    const dataToHash = `${dealId}-${timestamp}-${randomSalt}`;
                    
                    // Simular hash simples (em produção usar crypto real)
                    let hash = 0;
                    for (let i = 0; i < dataToHash.length; i++) {
                        const char = dataToHash.charCodeAt(i);
                        hash = ((hash << 5) - hash) + char;
                        hash = hash & hash; // Convert to 32bit integer
                    }
                    
                    // Formato: {timestamp}-{hash_absoluto}-{primeiros_chars_deal}
                    const shortDealId = dealId.substring(0, 3);
                    return `${timestamp}-${Math.abs(hash).toString(36)}-${shortDealId}`;
                };
                
                const secureToken = dealId ? generateSecureToken(dealId) : 'diagnostic-' + Date.now();
                const publicReportUrl = `${baseUrl}/r/${secureToken}`;

                // Estrutura para análise IA também seguindo padrão N8N
                const aiPayload = {
                    deal_id: dealId,
                    timestamp: new Date().toISOString(),
                    action: 'ai_analysis_completed',
                    
                    body: {
                        resultUrl: publicReportUrl,  // $('registerGGVDiag').first().json.body.resultUrl
                        deal_id: dealId,  // Para relacionar com o negócio no Pipedrive
                        aiAnalysis: {
                            summaryInsights: {
                                specialistInsight: summaryInsights.specialistInsight || '',
                                recommendations: summaryInsights.recommendations || []
                            },
                            detailedAnalysis: {
                                strengths: detailedAnalysis.strengths || [],
                                improvements: detailedAnalysis.improvements || [],
                                nextSteps: detailedAnalysis.nextSteps || []
                            }
                        }
                    }
                };

                const webhookUrl = 'https://api-test.ggvinteligencia.com.br/webhook/diag-ggv-register';
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'GGV-Diagnostic-AI/1.0'
                    },
                    body: JSON.stringify(aiPayload)
                });

                console.log('🤖 N8N - Status análise IA:', response.status);
                if (response.ok) {
                    console.log('✅ N8N - Análise IA enviada com sucesso');
                } else {
                    console.warn('⚠️ N8N - Falha ao enviar análise IA');
                }

            } catch (error) {
                console.error('❌ N8N - Erro ao enviar análise IA:', error);
            }
        };

        sendAIAnalysis();
    }, [summaryInsights, detailedAnalysis, dealId, n8nSent]);

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
                {activeTab === 'Capa' && <CoverTab companyData={companyData} specialistName={specialistName} />}
                {activeTab === 'Dashboard Geral' && <DashboardTab maturity={maturity} totalScore={totalScore} scoresByArea={scoresByArea} segment={segment} />}
                {activeTab === 'Análise Segmentada' && <SegmentedAnalysisTab scoresByArea={scoresByArea} detailedAnalysis={detailedAnalysis} isLoading={isLoadingDetailed} />}
                {activeTab === 'Diagnóstico Textual' && <TextualDiagnosisTab summaryInsights={summaryInsights} isLoading={isLoadingSummary} />}
                {activeTab === 'Análise IA' && <AIAnalysisTab detailedAnalysis={detailedAnalysis} isGenerating={isLoadingDetailed} />}
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-200/50 flex flex-wrap items-center justify-center gap-4">
                <button onClick={() => setShowEmailModal(true)} className="flex items-center gap-2 text-sm font-semibold bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors">
                    <EnvelopeIcon className="w-5 h-5" /> Enviar por E-mail
                </button>
                <button onClick={() => setShowPdfModal(true)} className="flex items-center gap-2 text-sm font-semibold bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors">
                    <DocumentTextIcon className="w-5 h-5" /> Visualizar PDF
                </button>
                <button onClick={onRetry} className="flex items-center gap-2 text-sm font-semibold bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                    <RefreshIcon className="w-5 h-5" /> Refazer
                </button>
            </div>

            {showEmailModal && <EmailModal onClose={() => setShowEmailModal(false)} companyData={companyData} reportData={allDataForPdf} dealId={dealId} />}
            {showPdfModal && <PdfModal onClose={() => setShowPdfModal(false)} reportData={allDataForPdf} />}
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
