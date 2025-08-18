import React, { useState, useEffect } from 'react';
import { GGVInteligenciaBrand } from './ui/BrandLogos';

interface PublicResultData {
    companyName: string;
    email: string;
    totalScore: number;
    maturityLevel: 'Baixa' | 'Média' | 'Alta';
    maturityPercentage: string; // Ex: "75%"
    diagnosticAnswers: {
        maturidade: string; // "Sim", "Não", "Parcialmente"
        mapeamento_processos: string;
        crm: string;
        script_comercial: string;
        teste_perfil_comportamental: string;
        plano_metas_comissionamento: string;
        indicadores_comerciais: string;
        treinamentos_periodicos: string;
        acao_pos_venda: string;
        prospeccao_ativa: string;
    };
    resultUrl: string;
    dealId?: string;
}

const PublicResultPage: React.FC = () => {
    const [resultData, setResultData] = useState<PublicResultData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const dealId = urlParams.get('deal_id');
        
        if (!dealId) {
            setError('ID da oportunidade não encontrado');
            setLoading(false);
            return;
        }

        // Simular carregamento dos dados do resultado
        // Em produção, isso viria de uma API ou banco de dados
        setTimeout(() => {
            setResultData({
                companyName: 'Empresa Exemplo',
                email: 'contato@empresa.com',
                totalScore: 75,
                maturityLevel: 'Alta',
                maturityPercentage: '75%',
                diagnosticAnswers: {
                    maturidade: 'Sim',
                    mapeamento_processos: 'Parcialmente',
                    crm: 'Sim',
                    script_comercial: 'Parcialmente',
                    teste_perfil_comportamental: 'Sim',
                    plano_metas_comissionamento: 'Parcialmente',
                    indicadores_comerciais: 'Sim',
                    treinamentos_periodicos: 'Sim',
                    acao_pos_venda: 'Parcialmente',
                    prospeccao_ativa: 'Parcialmente',
                },
                resultUrl: window.location.href,
                dealId: dealId,
            });
            setLoading(false);
        }, 1000);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando resultado do diagnóstico...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 text-6xl mb-4">⚠️</div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Erro</h1>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    if (!resultData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">Nenhum resultado encontrado</p>
                </div>
            </div>
        );
    }

    const getMaturityColor = (level: string) => {
        switch (level) {
            case 'Alta': return 'text-green-600 bg-green-100';
            case 'Média': return 'text-yellow-600 bg-yellow-100';
            case 'Baixa': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getAnswerColor = (answer: string) => {
        switch (answer) {
            case 'Sim': return 'text-green-600';
            case 'Parcialmente': return 'text-yellow-600';
            case 'Não': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <GGVInteligenciaBrand className="w-48 mx-auto mb-6" />
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">
                            Resultado do Diagnóstico Comercial
                        </h1>
                        <p className="text-gray-600">
                            {resultData.companyName} • {resultData.email}
                        </p>
                    </div>

                    {/* Score Principal */}
                    <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
                        <div className="text-center">
                            <div className="text-6xl font-bold text-blue-600 mb-4">
                                {resultData.maturityPercentage}
                            </div>
                            <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getMaturityColor(resultData.maturityLevel)}`}>
                                Maturidade {resultData.maturityLevel}
                            </div>
                        </div>
                    </div>

                    {/* Detalhamento por Área */}
                    <div className="bg-white rounded-2xl shadow-lg p-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Análise Detalhada por Área</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                                    <span className="font-medium">Maturidade</span>
                                    <span className={`font-bold ${getAnswerColor(resultData.diagnosticAnswers.maturidade)}`}>
                                        {resultData.diagnosticAnswers.maturidade}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                                    <span className="font-medium">Mapeamento de Processos</span>
                                    <span className={`font-bold ${getAnswerColor(resultData.diagnosticAnswers.mapeamento_processos)}`}>
                                        {resultData.diagnosticAnswers.mapeamento_processos}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                                    <span className="font-medium">CRM</span>
                                    <span className={`font-bold ${getAnswerColor(resultData.diagnosticAnswers.crm)}`}>
                                        {resultData.diagnosticAnswers.crm}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                                    <span className="font-medium">Script Comercial</span>
                                    <span className={`font-bold ${getAnswerColor(resultData.diagnosticAnswers.script_comercial)}`}>
                                        {resultData.diagnosticAnswers.script_comercial}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                                    <span className="font-medium">Teste de Perfil Comportamental</span>
                                    <span className={`font-bold ${getAnswerColor(resultData.diagnosticAnswers.teste_perfil_comportamental)}`}>
                                        {resultData.diagnosticAnswers.teste_perfil_comportamental}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                                    <span className="font-medium">Plano de Metas/Comissionamento</span>
                                    <span className={`font-bold ${getAnswerColor(resultData.diagnosticAnswers.plano_metas_comissionamento)}`}>
                                        {resultData.diagnosticAnswers.plano_metas_comissionamento}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                                    <span className="font-medium">Indicadores Comerciais</span>
                                    <span className={`font-bold ${getAnswerColor(resultData.diagnosticAnswers.indicadores_comerciais)}`}>
                                        {resultData.diagnosticAnswers.indicadores_comerciais}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                                    <span className="font-medium">Treinamentos Periódicos</span>
                                    <span className={`font-bold ${getAnswerColor(resultData.diagnosticAnswers.treinamentos_periodicos)}`}>
                                        {resultData.diagnosticAnswers.treinamentos_periodicos}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                                    <span className="font-medium">Ação de Pós-Venda</span>
                                    <span className={`font-bold ${getAnswerColor(resultData.diagnosticAnswers.acao_pos_venda)}`}>
                                        {resultData.diagnosticAnswers.acao_pos_venda}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                                    <span className="font-medium">Prospecção Ativa</span>
                                    <span className={`font-bold ${getAnswerColor(resultData.diagnosticAnswers.prospeccao_ativa)}`}>
                                        {resultData.diagnosticAnswers.prospeccao_ativa}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-8 text-gray-500 text-sm">
                        <p>Diagnóstico gerado pela GGV Inteligência</p>
                        {resultData.dealId && (
                            <p>ID da Oportunidade: {resultData.dealId}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicResultPage;
