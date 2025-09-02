import React from 'react';
import { DetailedAIAnalysis } from '../../../types';
import { LoadingSpinner, ErrorDisplay } from '../../ui/Feedback';
import MarkdownRenderer from '../../ui/MarkdownRenderer';
import { CpuChipIcon, CheckCircleIcon, ExclamationTriangleIcon, BoltIcon, LightBulbIcon, FlagIcon, ArrowRightIcon, BuildingOffice2Icon } from '../../ui/icons';
import { GGVInteligenciaBrand } from '../../ui/BrandLogos';

interface AIAnalysisTabProps {
    detailedAnalysis: DetailedAIAnalysis | null;
    isGenerating: boolean;
}

export const AIAnalysisTab: React.FC<AIAnalysisTabProps> = ({ detailedAnalysis, isGenerating }) => {
    if (isGenerating) {
        return <LoadingSpinner text="Estamos compilando uma análise aprofundada, recomendações estratégicas e um roadmap de maturidade. Isso pode levar mais alguns segundos." />;
    }

    if (!detailedAnalysis) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl">
                <p className="font-semibold">Análise preliminar (modo offline)</p>
                <p className="text-sm mt-1">Não conseguimos contactar a IA no tempo esperado. Exibimos uma versão resumida local para não atrasar sua experiência. Tente novamente mais tarde para obter a análise completa por IA.</p>
            </div>
        );
    }

    const priorityColors = {
        Alta: "border-red-500 bg-red-50 text-red-700",
        Média: "border-yellow-500 bg-yellow-50 text-yellow-700",
        Baixa: "border-blue-500 bg-blue-50 text-blue-700",
    }

    return (
        <div className="space-y-8">
            {/* Capa sofisticada da Análise IA */}
            <div className="bg-gradient-to-br from-blue-900 via-indigo-800 to-purple-900 text-white p-8 rounded-2xl shadow-2xl no-break relative overflow-hidden">
                {/* Padrão de fundo sutil */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 right-4 w-32 h-32 bg-white rounded-full blur-3xl"></div>
                    <div className="absolute bottom-4 left-4 w-24 h-24 bg-teal-400 rounded-full blur-2xl"></div>
                </div>
                
                <div className="relative z-10 text-center">
                    {/* Logo GGV Inteligência */}
                    <div className="mb-6">
                        <GGVInteligenciaBrand className="w-48 mx-auto filter brightness-0 invert" />
                    </div>
                    
                    {/* Ícone de IA */}
                    <div className="w-16 h-16 mx-auto mb-6 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30" aria-hidden>
                        <CpuChipIcon className="w-8 h-8 text-white" />
                    </div>
                    
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">Análise Inteligente GGV</h1>
                    <p className="text-xl text-blue-200 mb-4">Insights estratégicos gerados por IA</p>
                    
                    <div className="mt-8 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20">
                        <p className="text-sm text-blue-100">
                            Esta análise foi gerada utilizando inteligência artificial avançada para fornecer 
                            insights estratégicos personalizados e recomendações baseadas em dados do mercado.
                        </p>
                    </div>
                </div>
            </div>

            <ReportCard title="Resumo Executivo" icon={<CpuChipIcon className="w-5 h-5" />} className="no-break">
                <MarkdownRenderer text={detailedAnalysis.executiveSummary} />
            </ReportCard>

            <div className="grid md:grid-cols-2 gap-8 no-break">
                <ReportCard title="Pontos Fortes" icon={<CheckCircleIcon className="w-5 h-5" />}>
                    <ul className="list-disc pl-5 space-y-2">
                        {detailedAnalysis.strengths.map((s, i) => <li key={i}><MarkdownRenderer text={s} /></li>)}
                    </ul>
                </ReportCard>
                <ReportCard title="Lacunas Críticas" icon={<ExclamationTriangleIcon className="w-5 h-5" />}>
                    <ul className="list-disc pl-5 space-y-2">
                        {detailedAnalysis.criticalGaps.map((g, i) => <li key={i}><MarkdownRenderer text={g} /></li>)}
                    </ul>
                </ReportCard>
            </div>

            <div className="no-break mt-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-lg text-blue-800"><BoltIcon className="w-5 h-5" /></div>
                    <h2 className="text-xl font-bold text-slate-800">Recomendações Estratégicas</h2>
                </div>
                <div className="space-y-4">
                    {detailedAnalysis.strategicRecommendations.map((rec, i) => (
                        <div key={i} className={`p-4 rounded-lg border-l-4 ${priorityColors[rec.priority]}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className={`text-xs font-bold uppercase`}>{rec.priority}</span>
                                    <p className="font-bold text-slate-800">{rec.area}</p>
                                </div>
                                <span className="text-xs font-semibold bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{rec.timeline}</span>
                            </div>
                            <MarkdownRenderer text={rec.recommendation} className="mt-2" />
                            <div className="mt-2 text-sm text-slate-500">
                                <strong className="text-slate-600">Impacto esperado: </strong>
                                <MarkdownRenderer text={rec.expectedImpact} inline={true} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 no-break">
                <ReportCard title="Ações Rápidas (Quick Wins)" icon={<BoltIcon className="w-5 h-5" />}>
                    <ul className="list-disc pl-5 space-y-2">
                        {detailedAnalysis.quickWins.map((qw, i) => <li key={i}><MarkdownRenderer text={qw} /></li>)}
                    </ul>
                </ReportCard>
                <ReportCard title="Avaliação de Riscos" icon={<ExclamationTriangleIcon className="w-5 h-5" />}>
                    <MarkdownRenderer text={detailedAnalysis.riskAssessment} />
                </ReportCard>
            </div>

            <ReportCard title="Insights do Setor" icon={<BuildingOffice2Icon className="w-5 h-5" />} className="no-break mt-8">
                <MarkdownRenderer text={detailedAnalysis.sectorInsights} />
            </ReportCard>
            <ReportCard title="Roadmap de Maturidade" icon={<FlagIcon className="w-5 h-5" />} className="no-break">
                <MarkdownRenderer text={detailedAnalysis.maturityRoadmap} />
            </ReportCard>
            <ReportCard title="Próximos Passos" icon={<ArrowRightIcon className="w-5 h-5" />} className="no-break">
                <ul className="list-disc pl-5 space-y-2">
                    {detailedAnalysis.nextSteps.map((step, i) => <li key={i}><MarkdownRenderer text={step} /></li>)}
                </ul>
            </ReportCard>

            <ReportFooter />
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

const ReportFooter: React.FC = () => (
    <div className="text-center mt-8 pt-4 border-t border-slate-200/80">
        {/* Logo removido */}
    </div>
);
