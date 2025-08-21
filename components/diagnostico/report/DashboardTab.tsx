import React from 'react';
import { MaturityResult, MarketSegment } from '../../../types';
import { MATURITY_GIFS } from '../../../constants';
import { BarChart } from '../charts/BarChart';
import { RadarChart } from '../charts/RadarChart';
import { ChartBarIcon, ChartPieIcon } from '../../ui/icons';

interface DashboardTabProps {
    maturity: MaturityResult;
    totalScore: number;
    scoresByArea: Record<string, { score: number; count: number }>;
    segment: MarketSegment;
}

const MAX_SCORE = 90; // Should be imported or calculated

export const DashboardTab: React.FC<DashboardTabProps> = ({ maturity, totalScore, scoresByArea, segment }) => {
    const maturityPercentage = Math.round((totalScore / MAX_SCORE) * 100);

    return (
        <div className="space-y-8 no-break">
            <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-900 via-teal-700 to-teal-500 text-white text-center shadow-2xl relative overflow-hidden flex flex-col items-center justify-center">
                <img src={MATURITY_GIFS[maturity.level]} alt={maturity.level} className="absolute top-0 left-0 w-full h-full object-cover opacity-10" />
                <div className="relative z-10 flex flex-col items-center">
                    <div className="p-2 bg-white/20 rounded-2xl mb-4 backdrop-blur-sm border border-white/30">
                        <img src={MATURITY_GIFS[maturity.level]} alt={maturity.level} className="w-32 h-32 rounded-xl object-cover shadow-lg" />
                    </div>
                    <p className={`text-xl font-bold ${maturity.color} bg-white/90 inline-block px-4 py-1 rounded-full`}>{maturity.description}</p>
                    <h1 className="text-7xl md:text-8xl font-black tracking-tighter my-2">{maturityPercentage}%</h1>
                    <h2 className="text-3xl font-bold tracking-tight">Maturidade Comercial: {maturity.level}</h2>
                    <div className="mt-6 bg-white/20 p-4 rounded-xl backdrop-blur-sm border border-white/30 inline-block">
                        <p className="font-bold">Comparativo de Mercado</p>
                        <p className="text-sm text-teal-100">Média do setor: {segment.benchmarkMedio}% | Top Performers: {segment.topPerformers}%</p>
                    </div>
                    <p className="text-xs text-white/70 mt-4">by GGV Inteligência em Vendas</p>
                </div>
            </div>
            <ReportCard title="Pontuação por Área vs. Benchmark" icon={<ChartBarIcon className="w-5 h-5" />}>
                <BarChart scoresByArea={scoresByArea} />
            </ReportCard>
            <div className="mt-8"></div>
            <ReportCard title="Radar de Maturidade Comercial" icon={<ChartPieIcon className="w-5 h-5" />} className="no-break">
                <RadarChart scoresByArea={scoresByArea} />
            </ReportCard>
        </div>
    );
};

const ReportCard: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode, className?: string }> = ({ title, icon, children, className }) => (
    <div className={`bg-white p-6 rounded-2xl shadow-lg border border-slate-200/50 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-lg text-blue-800">{icon}</div>
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        </div>
        <div>
            {children}
        </div>
    </div>
);
