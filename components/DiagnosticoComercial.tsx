import React, { useState, useMemo, useEffect } from 'react';
import type { CompanyData, MarketSegment, Answers } from '../types';
import { CompanyInfoForm } from './diagnostico/CompanyInfoForm';
import { QuestionnaireView } from './diagnostico/QuestionnaireView';
import { ResultsView } from './diagnostico/ResultsView';
import { prefillFromN8n, sendDiagnosticToN8n, sendDiagnosticToPipedrive } from '../services/supabaseService';


import { GGVInteligenciaBrand } from './ui/BrandLogos';
import { usePipedriveData } from '../hooks/usePipedriveData';

export const DiagnosticoComercial: React.FC = () => {
    const [step, setStep] = useState<'start' | 'companyInfo' | 'questionnaire' | 'results'>('start');
    const [companyData, setCompanyData] = useState<CompanyData | null>(null);
    const [selectedSegment, setSelectedSegment] = useState<MarketSegment | null>(null);
    const [answers, setAnswers] = useState<Answers>({});
    const [error, setError] = useState<string | null>(null);
    const [prefill, setPrefill] = useState<Partial<CompanyData> | null>(null);
    
    // Hook para buscar dados do Pipedrive baseado no deal_id da URL
    const { data: pipedriveData, loading: pipedriveLoading, error: pipedriveError, dealId } = usePipedriveData();

    // Atualizar prefill quando dados do Pipedrive estiverem disponíveis
    useEffect(() => {
        if (pipedriveData) {
            console.log('🔄 PREFILL - Aplicando dados do Pipedrive:', pipedriveData);
            setPrefill({
                companyName: pipedriveData.companyName || '',
                email: pipedriveData.email || '',
                activityBranch: pipedriveData.activityBranch || '',
                activitySector: pipedriveData.activitySector || '',
                monthlyBilling: pipedriveData.monthlyBilling || '',
                salesTeamSize: pipedriveData.salesTeamSize || '',
                salesChannels: pipedriveData.salesChannels || [],
            });
        }
    }, [pipedriveData]);

    // Fallback para N8N quando não houver deal_id (manter compatibilidade)
    useEffect(() => {
        if (dealId) return; // Se já tem deal_id, usar Pipedrive
        
        const dealIdLegacy = new URLSearchParams(window.location.search).get('dealId');
        if (!dealIdLegacy) return;
        
        (async () => {
            console.log('🔄 FALLBACK - Usando N8N para dealId:', dealIdLegacy);
            const data = await prefillFromN8n(dealIdLegacy);
            if (data) {
                setPrefill({
                    companyName: data.companyName || data.org_name || '',
                    email: data.email || data.org_email || '',
                    activityBranch: data.activityBranch || data.ramo || '',
                    activitySector: data.activitySector || data.setor || '',
                    monthlyBilling: data.monthlyBilling || '',
                    salesTeamSize: data.salesTeamSize || '',
                    salesChannels: Array.isArray(data.salesChannels) ? data.salesChannels : [],
                });
            }
        })();
    }, [dealId]);

    const totalScore = useMemo(() => Object.values(answers).reduce((sum, score) => sum + score, 0), [answers]);
    
    const handleSelectAnswer = (questionId: number, score: number) => {
        setAnswers(prev => ({ ...prev, [questionId]: score }));
    };

    const handleCompanyInfoSubmit = (data: CompanyData, segment: MarketSegment) => {
        setCompanyData(data);
        setSelectedSegment(segment);
        setStep('questionnaire');
    };

    const handleSubmit = async () => {
        if (!companyData) return; // Should not happen
        setStep('results');
        
        try {
            // Enviar para o webhook do Pipedrive (nova funcionalidade)
            if (dealId) {
                console.log('📤 DIAGNÓSTICO - Enviando para webhook Pipedrive com deal_id:', dealId);
                const success = await sendDiagnosticToPipedrive(
                    companyData,
                    answers,
                    totalScore,
                    dealId
                );
                
                if (success) {
                    console.log('✅ DIAGNÓSTICO - Dados enviados com sucesso para Pipedrive');
                } else {
                    console.error('❌ DIAGNÓSTICO - Falha ao enviar dados para Pipedrive');
                }
            } else {
                console.log('⚠️ DIAGNÓSTICO - Nenhum deal_id encontrado, enviando apenas para N8N');
            }
            
            // Manter compatibilidade com N8N existente
            await sendDiagnosticToN8n({
                companyData,
                segment: selectedSegment,
                answers,
                totalScore,
            });
        } catch (error) {
            console.error('❌ DIAGNÓSTICO - Erro ao enviar dados:', error);
        }
    };



    const handleRetry = () => {
        setCompanyData(null);
        setSelectedSegment(null);
        setAnswers({});
        setError(null);
        setStep('companyInfo');
    };

    const renderContent = () => {
        switch(step) {
            case 'start':
                return (
                    <div className="w-full max-w-3xl mx-auto animate-fade-in">
                        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200/50 text-center">
                            <GGVInteligenciaBrand className="w-36 mx-auto mb-6" />
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Diagnóstico Comercial</h1>
                            <p className="mt-4 text-slate-700 text-lg">Você quer ter uma equipe de vendas auto gerenciável, que bate metas todos os meses?</p>
                            <p className="mt-3 text-slate-500">Responda esse questionário em apenas <span className="inline-flex items-center font-bold bg-blue-100 text-blue-900 px-2 rounded-md">1 minuto</span> e receba gratuitamente um raio-x completo da realidade comercial da sua empresa.</p>
                            
                            {/* Status do carregamento do Pipedrive */}
                            {pipedriveLoading && (
                                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center justify-center gap-2 text-blue-700">
                                        <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                        <span className="text-sm">Carregando dados da oportunidade...</span>
                                    </div>
                                </div>
                            )}
                            
                            {/* Erro do Pipedrive */}
                            {pipedriveError && (
                                <div className={`mt-4 p-3 rounded-lg ${
                                    pipedriveError.includes('Deal ID') && pipedriveError.includes('incorreto')
                                        ? 'bg-red-50 border border-red-200'
                                        : 'bg-yellow-50 border border-yellow-200'
                                }`}>
                                    <p className={`text-sm ${
                                        pipedriveError.includes('Deal ID') && pipedriveError.includes('incorreto')
                                            ? 'text-red-700'
                                            : 'text-yellow-700'
                                    }`}>
                                        {pipedriveError.includes('Deal ID') && pipedriveError.includes('incorreto') ? (
                                            <>🚫 {pipedriveError}</>
                                        ) : pipedriveError.includes('404') || pipedriveError.includes('não encontrado') ? (
                                            <>⚠️ Webhook N8N não está ativo. Usando dados simulados para teste. Você pode prosseguir preenchendo manualmente.</>
                                        ) : (
                                            <>⚠️ Não foi possível carregar os dados da oportunidade. Você pode prosseguir preenchendo manualmente.</>
                                        )}
                                    </p>
                                    {pipedriveError.includes('Deal ID') && pipedriveError.includes('incorreto') && (
                                        <p className="text-xs text-red-600 mt-1">
                                            💡 Verifique se o deal_id na URL está correto ou contate o suporte.
                                        </p>
                                    )}
                                    {pipedriveError.includes('simulados') && (
                                        <p className="text-xs text-yellow-600 mt-1">
                                            💡 Para ativar a integração real, configure o webhook N8N no endpoint correto.
                                        </p>
                                    )}
                                </div>
                            )}


                            
                            {/* Sucesso do Pipedrive */}
                            {pipedriveData && !pipedriveLoading && (
                                <div className={`mt-4 p-3 rounded-lg ${
                                    (pipedriveData as any)._mockData 
                                        ? 'bg-blue-50 border border-blue-200' 
                                        : 'bg-green-50 border border-green-200'
                                }`}>
                                    <p className={`text-sm ${
                                        (pipedriveData as any)._mockData 
                                            ? 'text-blue-700' 
                                            : 'text-green-700'
                                    }`}>
                                        {(pipedriveData as any)._mockData 
                                            ? '🧪 Dados simulados carregados para teste! Os campos serão preenchidos automaticamente.' 
                                            : '✅ Dados da oportunidade carregados! Os campos serão preenchidos automaticamente.'}
                                    </p>
                                    {(pipedriveData as any)._mockData && (
                                        <p className="text-xs text-blue-600 mt-1">
                                            💡 Estes são dados de exemplo. Configure o webhook N8N para usar dados reais do Pipedrive.
                                        </p>
                                    )}
                                </div>
                            )}
                            
                            <button
                                onClick={() => setStep('companyInfo')}
                                disabled={pipedriveLoading}
                                className="mt-8 w-full sm:w-auto px-8 py-3 rounded-lg bg-blue-900 hover:bg-blue-800 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-bold shadow-lg inline-flex items-center justify-center gap-2"
                            >
                                <span>🚀</span> 
                                {pipedriveLoading ? 'Carregando...' : 'Iniciar Diagnóstico'}
                            </button>
                            <p className="mt-4 text-xs text-slate-500">100% gratuito • Resultado em tempo real</p>
                        </div>
                    </div>
                );
            case 'companyInfo':
                return <CompanyInfoForm onSubmit={handleCompanyInfoSubmit} prefill={prefill || undefined} />;
            case 'questionnaire':
                return <QuestionnaireView 
                            answers={answers}
                            totalScore={totalScore}
                            onSelectAnswer={handleSelectAnswer}
                            onSubmit={handleSubmit}
                            error={error}
                        />;
            case 'results':
                // Render results only if we have all the necessary data
                return (companyData && selectedSegment) ? (
                    <ResultsView 
                        companyData={companyData}
                        segment={selectedSegment}
                        answers={answers}
                        totalScore={totalScore}
                        onRetry={handleRetry}
                    />
                ) : (
                    // Fallback to the first step if data is missing
                    <CompanyInfoForm onSubmit={handleCompanyInfoSubmit} prefill={prefill || undefined} />
                );
            default:
                 return (
                    <div className="w-full max-w-3xl mx-auto">
                        <button onClick={() => setStep('start')} className="px-4 py-2 rounded-md bg-blue-900 text-white font-semibold">Voltar ao início</button>
                    </div>
                 );
        }
    };
    
    return (
      <div className="flex flex-col items-center min-h-full p-4 sm:p-6 bg-slate-100/50">
          {renderContent()}
      </div>
    );
};
