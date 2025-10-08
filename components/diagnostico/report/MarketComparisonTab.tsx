import React from 'react';
import { ChartBarIcon, ChartPieIcon, CalendarDaysIcon } from '../../ui/icons';
import { BarChart } from '../charts/BarChart';
import { RadarChart } from '../charts/RadarChart';
import { SummaryInsights } from '../../../types';
import MarkdownRenderer from '../../ui/MarkdownRenderer';

interface MarketComparisonTabProps {
    scoresByArea: Record<string, { score: number; count: number }>;
    summaryInsights?: SummaryInsights | null;
}

export const MarketComparisonTab: React.FC<MarketComparisonTabProps> = ({ scoresByArea, summaryInsights }) => {
    return (
        <div className="space-y-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">📊 Comparativo de Mercado</h1>
                <p className="text-slate-600">Análise comparativa de desempenho por área</p>
            </div>

            {/* Análise Textual do Benchmark */}
            {summaryInsights?.marketBenchmark && (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                        <ChartBarIcon className="w-6 h-6 text-slate-600" />
                        Análise Comparativa
                    </h2>
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                        <MarkdownRenderer text={summaryInsights.marketBenchmark} />
                    </div>
                </div>
            )}

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

