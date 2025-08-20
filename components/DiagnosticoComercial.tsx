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
    
    // Estados para busca manual de deal_id
    const [manualDealId, setManualDealId] = useState<string>('');
    const [isSearchingDeal, setIsSearchingDeal] = useState<boolean>(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [manualSearchData, setManualSearchData] = useState<any>(null);
    
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

    // Função para buscar dados manualmente por deal_id
    const handleSearchDeal = async () => {
        if (!manualDealId.trim()) {
            setSearchError('Por favor, insira um Deal ID válido');
            return;
        }

        setIsSearchingDeal(true);
        setSearchError(null);

        try {
            const response = await fetch(`https://app.grupoggv.com/.netlify/functions/diag-ggv-register?deal_id=${encodeURIComponent(manualDealId.trim())}`);
            
            if (!response.ok) {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('🔍 BUSCA MANUAL - Dados recebidos:', data);

            // Aplicar dados encontrados
            setPrefill({
                companyName: data.companyName || data.empresa || '',
                email: data.email || '',
                activityBranch: data.ramo_de_atividade || '',
                activitySector: data['setor_de_atuação'] || data.setor_de_atuacao || '',
                monthlyBilling: data.faturamento_mensal || '',
                salesTeamSize: data.tamanho_equipe_comercial || '',
                salesChannels: data.salesChannels || [],
            });

            // Salvar dados da busca manual para exibir mensagem de sucesso
            setManualSearchData({
                ...data,
                _searchedDealId: manualDealId.trim(),
                _searchTimestamp: new Date().toISOString()
            });

            // Atualizar URL para incluir o deal_id
            const url = new URL(window.location.href);
            url.searchParams.set('deal_id', manualDealId.trim());
            window.history.replaceState({}, '', url.toString());

            console.log('✅ BUSCA MANUAL - Dados aplicados com sucesso');

        } catch (err: any) {
            console.error('❌ BUSCA MANUAL - Erro:', err);
            setSearchError(err.message || 'Erro ao buscar dados do deal');
        } finally {
            setIsSearchingDeal(false);
        }
    };

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
            
            // N8N será enviado após análise IA ser gerada (movido para ResultsView)
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
                            
                            {/* Seção para buscar dados por Deal ID */}
                            {!dealId && !pipedriveData && (
                                <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3">
                                        💼 Tem uma oportunidade no Pipedrive? Insira o Deal ID para carregar os dados automaticamente:
                                    </h3>
                                    <div className="flex gap-2 max-w-md mx-auto">
                                        <input
                                            type="text"
                                            value={manualDealId}
                                            onChange={(e) => setManualDealId(e.target.value)}
                                            placeholder="Ex: 62719"
                                            className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            disabled={isSearchingDeal}
                                        />
                                        <button
                                            onClick={handleSearchDeal}
                                            disabled={isSearchingDeal || !manualDealId.trim()}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md flex items-center gap-1"
                                        >
                                            {isSearchingDeal ? (
                                                <>
                                                    <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full"></div>
                                                    Buscando...
                                                </>
                                            ) : (
                                                <>
                                                    🔍 Buscar
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    
                                    {/* Erro de busca manual */}
                                    {searchError && (
                                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                                            ❌ {searchError}
                                        </div>
                                    )}
                                    
                                    <p className="mt-2 text-xs text-slate-500">
                                        Ou continue sem Deal ID para preencher manualmente
                                    </p>
                                </div>
                            )}
                            
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


                            
                            {/* Sucesso do Pipedrive ou busca manual */}
                            {((pipedriveData && !pipedriveLoading) || manualSearchData || prefill) && !isSearchingDeal ? (
                                <div className={`mt-4 p-3 rounded-lg ${
                                    // Determinar cor baseado no tipo de dados
                                    (pipedriveData as any)?._mockData || (manualSearchData?._mockData) 
                                        ? 'bg-blue-50 border border-blue-200' 
                                        : 'bg-green-50 border border-green-200'
                                }`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <p className={`text-sm ${
                                                (pipedriveData as any)?._mockData || (manualSearchData?._mockData)
                                                    ? 'text-blue-700' 
                                                    : 'text-green-700'
                                            }`}>
                                                {(() => {
                                                    // Dados da busca manual
                                                    if (manualSearchData) {
                                                        const dealId = manualSearchData._searchedDealId || manualSearchData._dealId;
                                                        return manualSearchData._mockData 
                                                            ? `🧪 Dados simulados do Deal ID ${dealId} carregados para teste!`
                                                            : `✅ Dados da oportunidade ${dealId} carregados com sucesso!`;
                                                    }
                                                    // Dados do hook automático
                                                    if (pipedriveData) {
                                                        return (pipedriveData as any)._mockData 
                                                            ? '🧪 Dados simulados carregados para teste!'
                                                            : `✅ Dados da oportunidade ${(pipedriveData as any)._dealId ? `(Deal ID: ${(pipedriveData as any)._dealId})` : ''} carregados!`;
                                                    }
                                                    // Fallback para quando só há prefill (dados carregados mas sem fonte específica)
                                                    if (prefill && prefill.companyName) {
                                                        const dealIdFromUrl = new URLSearchParams(window.location.search).get('deal_id');
                                                        return dealIdFromUrl 
                                                            ? `✅ Dados da oportunidade ${dealIdFromUrl} carregados com sucesso!`
                                                            : '✅ Dados da empresa carregados com sucesso!';
                                                    }
                                                    return '';
                                                })()}
                                                {' Os campos serão preenchidos automaticamente.'}
                                            </p>
                                            
                                            {/* Detalhes da empresa */}
                                            {(() => {
                                                const data = manualSearchData || pipedriveData;
                                                const isReal = data?._realData && !data?._mockData;
                                                const companyName = data?.companyName || data?.empresa || prefill?.companyName;
                                                const email = data?.email || prefill?.email;
                                                
                                                if (isReal && companyName) {
                                                    return (
                                                        <p className="text-xs text-green-600 mt-1">
                                                            📊 <strong>Empresa:</strong> {companyName} {email && `| `}<strong>Email:</strong> {email}
                                                        </p>
                                                    );
                                                }
                                                
                                                // Mostrar dados do prefill mesmo sem fonte específica
                                                if (companyName && !data?._mockData) {
                                                    return (
                                                        <p className="text-xs text-green-600 mt-1">
                                                            📊 <strong>Empresa:</strong> {companyName} {email && `| `}<strong>Email:</strong> {email}
                                                        </p>
                                                    );
                                                }
                                                
                                                if (data?._mockData) {
                                                    return (
                                                        <p className="text-xs text-blue-600 mt-1">
                                                            💡 Estes são dados de exemplo para teste.
                                                        </p>
                                                    );
                                                }
                                                
                                                return null;
                                            })()}
                                        </div>
                                        
                                        {/* Botão para buscar outro deal */}
                                        <button
                                            onClick={() => {
                                                setPrefill(null);
                                                setManualDealId('');
                                                setSearchError(null);
                                                setManualSearchData(null);
                                                const url = new URL(window.location.href);
                                                url.searchParams.delete('deal_id');
                                                window.history.replaceState({}, '', url.toString());
                                            }}
                                            className="text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded flex items-center gap-1"
                                            title="Buscar outro Deal ID"
                                        >
                                            🔄 Outro Deal
                                        </button>
                                    </div>
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
                        dealId={dealId}
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
