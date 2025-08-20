import React, { useState, useEffect, useMemo } from 'react';
import { CompanyData, SummaryInsights, DetailedAIAnalysis, MaturityResult, MarketSegment, Answers } from '../../types';
import { getSummaryInsights, getDetailedAIAnalysis } from '../../services/geminiService';
import { diagnosticQuestions } from '../../data/diagnosticoQuestions.ts';
import { ArrowLeftIcon, ArrowRightIcon, EnvelopeIcon, DocumentTextIcon, RefreshIcon, ExclamationTriangleIcon } from '../ui/icons';
import { EmailModal } from './modals/EmailModal';
import { PdfModal } from './modals/PdfModal';
import { CoverTab, DashboardTab, SegmentedAnalysisTab, TextualDiagnosisTab, AIAnalysisTab } from './report';
import { getCurrentUserDisplayName, sendDiagnosticToN8n } from '../../services/supabaseService';

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

    // Enviar dados para N8N após análise IA ser concluída
    useEffect(() => {
        const sendToN8n = async () => {
            console.log('🔍 N8N CHECK - Estado atual:', {
                n8nSent,
                isLoadingSummary,
                isLoadingDetailed,
                hasSummary: !!summaryInsights,
                hasDetailed: !!detailedAnalysis,
                hasError: !!apiError,
                dealId
            });
            
            // Só enviar se:
            // 1. Ambas análises IA foram concluídas (ou houve erro) OU timeout de 15 segundos
            // 2. Ainda não foi enviado
            // 3. Não está mais carregando
            const shouldSend = !n8nSent && (
                (!isLoadingSummary && !isLoadingDetailed && (summaryInsights || detailedAnalysis || apiError)) ||
                (!isLoadingSummary && !isLoadingDetailed) || // Enviar mesmo se IA falhar
                emergencyTimeout // Enviar após timeout de emergência
            );
            
            console.log('🔍 N8N SEND CHECK - Deve enviar?', shouldSend);
            
            if (shouldSend) {
                console.log('📤 N8N - Enviando resultados após análise IA concluída');
                console.log('📊 N8N - Dados a enviar:', { companyData, segment, answers, totalScore, dealId });
                
                try {
                    const success = await sendDiagnosticToN8n({
                        companyData,
                        segment,
                        answers,
                        totalScore,
                        dealId,
                        summaryInsights,
                        detailedAnalysis,
                        timestamp: new Date().toISOString()
                    });
                    
                    if (success) {
                        console.log('✅ N8N - Resultados enviados com sucesso após análise IA');
                        setN8nSent(true);
                    } else {
                        console.error('❌ N8N - Falha ao enviar resultados após análise IA');
                    }
                } catch (error) {
                    console.error('❌ N8N - Erro ao enviar resultados:', error);
                }
            }
        };
        
        sendToN8n();
    }, [n8nSent, isLoadingSummary, isLoadingDetailed, summaryInsights, detailedAnalysis, apiError, emergencyTimeout, companyData, segment, answers, totalScore, dealId]);

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

            {showEmailModal && <EmailModal onClose={() => setShowEmailModal(false)} companyData={companyData} reportData={allDataForPdf} />}
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
