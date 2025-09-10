import React from 'react';
import { GGVInteligenciaBrand } from '../../ui/BrandLogos';
import { CompanyData, MaturityResult, MarketSegment } from '../../../types';
import { MATURITY_GIFS } from '../../../constants';
import { CalendarDaysIcon, ChartBarIcon, ChartPieIcon } from '../../ui/icons';
import { BarChart } from '../charts/BarChart';
import { RadarChart } from '../charts/RadarChart';

interface UnifiedCoverDashboardTabProps {
    companyData: CompanyData;
    maturity: MaturityResult;
    totalScore: number;
    segment: MarketSegment;
    scoresByArea: Record<string, { score: number; count: number }>;
    specialistName?: string;
}

export const UnifiedCoverDashboardTab: React.FC<UnifiedCoverDashboardTabProps> = ({ 
    companyData, 
    maturity, 
    totalScore, 
    segment,
    scoresByArea,
    specialistName 
}) => {
    const maturityPercentage = Math.round((totalScore / 90) * 100);

    // Determinar status da maturidade comercial
    const getMaturityStatus = (percentage: number): string => {
        if (percentage >= 70) return 'Estruturado';
        if (percentage >= 40) return 'Em Desenvolvimento';
        return 'Crítico';
    };

    const maturityStatus = getMaturityStatus(maturityPercentage);

    return (
        <div className="space-y-8 no-break">
            {/* Bloco Principal - Logo + Título + Dados da Empresa + Maturidade */}
            <div className="bg-gradient-to-br from-blue-900 via-teal-700 to-teal-500 text-white p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                {/* GIF de fundo com opacidade */}
                <img src={MATURITY_GIFS[maturity.level]} alt={maturity.level} className="absolute top-0 left-0 w-full h-full object-cover opacity-10" />
                
                {/* Conteúdo principal */}
                <div className="relative z-10">
                    {/* Logo GGV no topo */}
                    <div className="text-center mb-8">
                        <GGVInteligenciaBrand className="w-48 mx-auto filter brightness-0 invert contrast-125" />
                    </div>
                    
                    {/* Título */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Diagnóstico Comercial</h1>
                    </div>
                    
                    {/* Seção de Maturidade Comercial */}
                    <div className="text-center mb-8">
                        {/* GIF da Maturidade */}
                        <div className="mb-6">
                            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30 inline-block">
                                <img src={MATURITY_GIFS[maturity.level]} alt={maturity.level} className="w-24 h-24 rounded-xl object-cover shadow-lg" />
                            </div>
                        </div>
                        
                        {/* Pontuação */}
                        <div className="text-6xl md:text-7xl font-black tracking-tighter mb-3">{maturityPercentage}%</div>
                        
                        {/* Status */}
                        <div className="mb-4">
                            <span className={`text-lg font-bold ${maturity.color} bg-white/90 px-4 py-2 rounded-full`}>
                                Status: {maturityStatus}
                            </span>
                        </div>
                        

                        
                        {/* Comparativo */}
                        <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm border border-white/30 inline-block">
                            <p className="font-semibold text-sm">📊 Comparativo de Mercado</p>
                            <p className="text-sm text-teal-100">Média: {segment.benchmarkMedio}% | Top Performers: {segment.topPerformers}%</p>
                        </div>
                    </div>

                    {/* Dados da Empresa */}
                    <div className="bg-white/15 p-6 rounded-xl backdrop-blur-sm border border-white/30 max-w-2xl mx-auto">
                        <h2 className="text-2xl font-bold mb-4 text-center">{companyData.companyName}</h2>
                        <div className="space-y-2 text-teal-100">
                            <p><strong>Setor:</strong> {companyData.activityBranch}{companyData.activitySector ? ` • ${companyData.activitySector}` : ''}</p>
                            <p><strong>Canais:</strong> {companyData.salesChannels.join(' / ')}</p>
                            <p><strong>Equipe:</strong> {companyData.salesTeamSize}</p>
                            <p><strong>Faturamento:</strong> {companyData.monthlyBilling}</p>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-white/20 text-sm">
                            <div className="flex justify-between">
                                <span>Especialista: {specialistName || 'GGV Inteligência'}</span>
                                <span>{new Date().toLocaleDateString('pt-BR')}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Branding */}
                    <p className="text-xs text-white/70 text-center mt-8">by GGV Inteligência em Vendas</p>
                </div>
            </div>

            {/* Seção de Gráficos */}
            <div className="space-y-8">
                {/* Gráfico de Barras */}
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-lg text-blue-800">
                            <ChartBarIcon className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Pontuação por Área vs. Benchmark</h3>
                    </div>
                    <BarChart scoresByArea={scoresByArea} />
                </div>

                {/* Gráfico de Radar */}
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 flex items-center justify-center bg-teal-100 rounded-lg text-teal-800">
                            <ChartPieIcon className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Radar de Maturidade Comercial</h3>
                    </div>
                    <RadarChart scoresByArea={scoresByArea} />
                </div>
            </div>

            {/* CTA Simplificado */}
            <div className="bg-gradient-to-r from-[#04296a] to-blue-600 text-white p-8 rounded-2xl shadow-xl text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <CalendarDaysIcon className="w-8 h-8" />
                    <h2 className="text-2xl font-bold">Próximo Passo</h2>
                </div>
                <p className="text-lg max-w-4xl mx-auto leading-relaxed">
                    <strong>Elaboração do detalhamento do projeto para implementação das melhorias identificadas</strong>
                </p>
            </div>
        </div>
    );
};
