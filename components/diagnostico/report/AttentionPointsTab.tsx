import React from 'react';
import { DetailedAIAnalysis, SummaryInsights, CompanyData, MaturityResult, MarketSegment } from '../../../types';
import { DIAGNOSTIC_AREAS, BENCHMARK_DATA } from '../../../constants';
import { DIAGNOSTIC_IMPLICATIONS, getAttentionPoints } from '../../../data/diagnosticImplications';
import { DiagnosticArea } from '../../../types';
import { LoadingSpinner } from '../../ui/Feedback';
import MarkdownRenderer from '../../ui/MarkdownRenderer';
import { ExclamationTriangleIcon, ChartBarIcon, LightBulbIcon, UserCircleIcon, DocumentCheckIcon, ComputerDesktopIcon, ChatBubbleBottomCenterTextIcon, UsersIcon, ClipboardDocumentListIcon, PresentationChartLineIcon, AcademicCapIcon, HeartIcon, MagnifyingGlassIcon, TrendingUpIcon } from '../../ui/icons';
import { MaturityCoverSection } from './MaturityCoverSection';

interface AttentionPointsTabProps {
    companyData: CompanyData;
    maturity: MaturityResult;
    totalScore: number;
    segment: MarketSegment;
    scoresByArea: Record<string, { score: number; count: number }>;
    detailedAnalysis: DetailedAIAnalysis | null;
    summaryInsights: SummaryInsights | null;
    specialistName?: string;
    isLoading: boolean;
}

export const AttentionPointsTab: React.FC<AttentionPointsTabProps> = ({ 
    companyData,
    maturity,
    totalScore,
    segment,
    scoresByArea, 
    detailedAnalysis,
    summaryInsights,
    specialistName,
    isLoading 
}) => {
    // Função para determinar a cor baseada na porcentagem
    const getColorByPercentage = (percentage: number) => {
        if (percentage === 100) return 'green';
        if (percentage >= 50) return 'yellow';
        return 'red'; // < 50%
    };

    // Mapeamento de ícones específicos por área
    const getAreaIcon = (area: string) => {
        const iconMap: Record<string, React.ReactNode> = {
            "Processos": <DocumentCheckIcon className="w-5 h-5" />,
            "Tecnologia": <ComputerDesktopIcon className="w-5 h-5" />,
            "Padronização": <ChatBubbleBottomCenterTextIcon className="w-5 h-5" />,
            "Pessoas": <UsersIcon className="w-5 h-5" />,
            "Gestão": <ClipboardDocumentListIcon className="w-5 h-5" />,
            "Monitoramento": <PresentationChartLineIcon className="w-5 h-5" />,
            "Desenvolvimento": <AcademicCapIcon className="w-5 h-5" />,
            "Relacionamento": <HeartIcon className="w-5 h-5" />,
            "Prospecção": <MagnifyingGlassIcon className="w-5 h-5" />
        };
        return iconMap[area] || <ChartBarIcon className="w-5 h-5" />;
    };

    return (
        <div className="space-y-8">
            {/* Capa com Maturidade */}
            <MaturityCoverSection 
                companyData={companyData}
                maturity={maturity}
                totalScore={totalScore}
                segment={segment}
                specialistName={specialistName}
            />

            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">🎯 Pontos de Atenção</h1>
                <p className="text-slate-600">Identificação e análise dos principais aspectos do seu comercial</p>
            </div>

            {DIAGNOSTIC_AREAS.map(area => {
                const areaData = scoresByArea[area];
                const score = areaData?.score ?? 0;
                const maxScore = (areaData?.count ?? 1) * 10;
                const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                const marketAvg = BENCHMARK_DATA.marketAverage[area as DiagnosticArea] / 10 * 100;
                const topPerformers = BENCHMARK_DATA.topPerformers[area as DiagnosticArea] / 10 * 100;
                const implication = DIAGNOSTIC_IMPLICATIONS[area as DiagnosticArea];
                const attentionPoints = getAttentionPoints(score, maxScore, area as DiagnosticArea);
                const colorTheme = getColorByPercentage(percentage);

                // Definir classes de cor baseado no tema
                const colorClasses = {
                    red: {
                        border: 'border-red-200 bg-red-50/30',
                        icon: 'bg-red-100 text-red-800',
                        percentage: 'text-red-600',
                        bar: 'bg-red-500',
                        attention: 'bg-red-100 text-red-800 border-red-200'
                    },
                    yellow: {
                        border: 'border-yellow-200 bg-yellow-50/30',
                        icon: 'bg-yellow-100 text-yellow-800',
                        percentage: 'text-yellow-600',
                        bar: 'bg-yellow-500',
                        attention: 'bg-yellow-100 text-yellow-800 border-yellow-200'
                    },
                    green: {
                        border: 'border-green-200 bg-green-50/30',
                        icon: 'bg-green-100 text-green-800',
                        percentage: 'text-green-600',
                        bar: 'bg-green-500',
                        attention: 'bg-green-100 text-green-800 border-green-200'
                    }
                };

                const colors = colorClasses[colorTheme];

                return (
                    <div key={area} className={`bg-white p-6 rounded-2xl shadow-lg border-2 ${colors.border}`}>
                        {/* Cabeçalho com Pontuação */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${colors.icon}`}>
                                    {getAreaIcon(area)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">{implication.title}</h2>
                                    <p className="text-sm text-slate-600">{implication.category || area}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-3xl font-black ${colors.percentage} flex items-baseline gap-2`}>
                                    <span>{percentage.toFixed(0)}%</span>
                                    <span className="text-sm font-normal text-slate-500">
                                        (Top: {topPerformers.toFixed(0)}%)
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Barra de Progresso */}
                        <div className="mb-6">
                            <div className="w-full bg-slate-200 rounded-full h-3">
                                <div 
                                    className={`h-3 rounded-full transition-all duration-300 ${colors.bar}`}
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                <span>0%</span>
                                <span className="font-medium">Média do mercado: {marketAvg.toFixed(0)}%</span>
                                <span>100%</span>
                            </div>
                        </div>

                        {/* Pontos de Atenção */}
                        <div className="mb-4">
                            <p className="text-slate-700 leading-relaxed mb-4">
                                {attentionPoints}
                            </p>
                            
                            {/* Impacto Esperado integrado */}
                            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUpIcon className="w-4 h-4 text-blue-600" />
                                    <span className="font-semibold text-blue-800 text-sm">Impacto Esperado</span>
                                </div>
                                <p className="text-blue-700 text-sm">
                                    {implication.expectedImpact}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Análise Completa do Especialista */}
            {summaryInsights && (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                        <UserCircleIcon className="w-6 h-6 text-blue-600" />
                        Análise Completa do Especialista GGV
                    </h2>
                    <div className="bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200 p-4 rounded-lg">
                        <MarkdownRenderer text={summaryInsights.specialistInsight} />
                    </div>
                </div>
            )}

            <ReportFooter />
        </div>
    );
};

const ReportFooter: React.FC = () => (
    <div className="text-center mt-8 pt-4 border-t border-slate-200/80">
        <p className="text-sm text-slate-500">
            💡 <strong>Próximo passo:</strong> Elaboração do detalhamento do projeto para implementação das melhorias identificadas
        </p>
    </div>
);
