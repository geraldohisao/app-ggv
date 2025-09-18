import React, { useState, useEffect } from 'react';
import { DiagnosticoComercial } from '../DiagnosticoComercial';

interface DealIdManagerProps {
    // Props opcionais para futuras extensões
}

export const DealIdManager: React.FC<DealIdManagerProps> = () => {
    console.log('🛡️ DEAL_ID_MANAGER - Componente iniciado');
    
    const [dealId, setDealId] = useState<string | null>(null);
    const [manualDealId, setManualDealId] = useState('');
    const [showManualInput, setShowManualInput] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Verificar deal_id na URL
        const urlParams = new URLSearchParams(window.location.search);
        const dealIdFromUrl = urlParams.get('deal_id');
        
        console.log('🔍 DEAL_ID_MANAGER - URL atual:', window.location.href);
        console.log('🔍 DEAL_ID_MANAGER - Deal ID da URL:', dealIdFromUrl);
        
        if (dealIdFromUrl && dealIdFromUrl.trim() !== '') {
            const cleanDealId = dealIdFromUrl.trim();
            console.log('✅ DEAL_ID_MANAGER - Deal ID válido encontrado:', cleanDealId);
            setDealId(cleanDealId);
            
            // Limpar localStorage de diagnósticos antigos sem deal_id
            clearOldDiagnostics();
        } else {
            console.log('⚠️ DEAL_ID_MANAGER - Nenhum deal_id na URL');
            
            // Verificar se há diagnóstico salvo com deal_id válido
            const savedDiagnostic = getSavedDiagnosticWithDealId();
            if (savedDiagnostic) {
                console.log('📥 DEAL_ID_MANAGER - Diagnóstico salvo encontrado com deal_id:', savedDiagnostic.dealId);
                setDealId(savedDiagnostic.dealId);
                
                // Atualizar URL para incluir deal_id
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set('deal_id', savedDiagnostic.dealId);
                window.history.replaceState({}, '', newUrl.toString());
                console.log('🔄 DEAL_ID_MANAGER - URL atualizada com deal_id:', newUrl.toString());
            } else {
                console.log('❌ DEAL_ID_MANAGER - Nenhum deal_id válido encontrado');
                // Limpar qualquer diagnóstico antigo sem deal_id
                clearOldDiagnostics();
            }
        }
    }, []);

    const clearOldDiagnostics = () => {
        try {
            const savedState = localStorage.getItem('ggv_diagnostic_state');
            if (savedState) {
                const state = JSON.parse(savedState);
                if (!state.dealId || state.dealId.trim() === '') {
                    console.log('🗑️ DEAL_ID_MANAGER - Removendo diagnóstico antigo sem deal_id');
                    localStorage.removeItem('ggv_diagnostic_state');
                }
            }
        } catch (error) {
            console.error('❌ DEAL_ID_MANAGER - Erro ao limpar diagnósticos antigos:', error);
        }
    };

    const getSavedDiagnosticWithDealId = () => {
        try {
            const savedState = localStorage.getItem('ggv_diagnostic_state');
            if (savedState) {
                const state = JSON.parse(savedState);
                if (state.dealId && state.dealId.trim() !== '') {
                    // Verificar se não é muito antigo (24 horas)
                    const maxAge = 24 * 60 * 60 * 1000;
                    if (Date.now() - state.timestamp < maxAge) {
                        return state;
                    }
                }
            }
        } catch (error) {
            console.error('❌ DEAL_ID_MANAGER - Erro ao verificar diagnóstico salvo:', error);
        }
        return null;
    };

    const handleManualDealId = () => {
        const cleanDealId = manualDealId.trim();
        
        if (!cleanDealId) {
            setError('Por favor, insira um Deal ID válido');
            return;
        }

        // Validar se é um número (Deal IDs do Pipedrive são numéricos)
        if (!/^\d+$/.test(cleanDealId)) {
            setError('Deal ID deve conter apenas números');
            return;
        }

        console.log('✅ DEAL_ID_MANAGER - Deal ID manual inserido:', cleanDealId);
        setDealId(cleanDealId);
        setError('');
        setShowManualInput(false);

        // Atualizar URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('deal_id', cleanDealId);
        window.history.replaceState({}, '', newUrl.toString());
        console.log('🔄 DEAL_ID_MANAGER - URL atualizada:', newUrl.toString());
    };

    const handleStartNewDiagnostic = () => {
        console.log('🆕 DEAL_ID_MANAGER - Limpando tudo e reiniciando...');
        
        // Limpar localStorage completamente
        localStorage.removeItem('ggv_diagnostic_state');
        localStorage.removeItem('ggv_diagnostic_timestamp');
        
        // Limpar URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('deal_id');
        
        // Recarregar página limpa
        window.location.href = newUrl.toString();
    };

    // Se temos deal_id válido, renderizar o diagnóstico
    if (dealId) {
        return <DiagnosticoComercial />;
    }

    // Tela de seleção/input de deal_id
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Diagnóstico Comercial
                    </h1>
                    <p className="text-gray-600">
                        Para iniciar o diagnóstico, é necessário um Deal ID válido
                    </p>
                </div>

                {!showManualInput ? (
                    <div className="space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                <div>
                                    <h3 className="text-sm font-medium text-yellow-800">
                                        Deal ID não encontrado
                                    </h3>
                                    <p className="text-sm text-yellow-700 mt-1">
                                        Acesse através do link com deal_id ou insira manualmente
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowManualInput(true)}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            📝 Inserir Deal ID Manualmente
                        </button>

                        <div className="text-center">
                            <p className="text-sm text-gray-500">
                                Ou acesse através do link direto:
                            </p>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                                /diagnostico?deal_id=123456
                            </code>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="dealId" className="block text-sm font-medium text-gray-700 mb-2">
                                Deal ID do Pipedrive
                            </label>
                            <input
                                type="text"
                                id="dealId"
                                value={manualDealId}
                                onChange={(e) => setManualDealId(e.target.value)}
                                placeholder="Ex: 123456"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                onKeyPress={(e) => e.key === 'Enter' && handleManualDealId()}
                            />
                            {error && (
                                <p className="text-red-600 text-sm mt-1">{error}</p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowManualInput(false)}
                                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleManualDealId}
                                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Continuar
                            </button>
                        </div>
                    </div>
                )}

                <div className="mt-6 pt-6 border-t border-gray-200">
                    <button
                        onClick={handleStartNewDiagnostic}
                        className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        🗑️ Limpar dados e começar novo diagnóstico
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DealIdManager;
