import React from 'react';
import { DetailedAIAnalysis } from '../../../types';
import { DIAGNOSTIC_AREAS, BENCHMARK_DATA } from '../../../constants';
import { DiagnosticArea } from '../../../types';
import { LoadingSpinner } from '../../ui/Feedback';
import MarkdownRenderer from '../../ui/MarkdownRenderer';
import { ChartPieIcon, BoltIcon } from '../../ui/icons';

interface SegmentedAnalysisTabProps {
    scoresByArea: Record<string, { score: number; count: number }>;
    detailedAnalysis: DetailedAIAnalysis | null;
    isLoading: boolean;
}

export const SegmentedAnalysisTab: React.FC<SegmentedAnalysisTabProps> = ({ scoresByArea, detailedAnalysis, isLoading }) => {
    return (
        <div className="space-y-8">
            <ReportCard title="Pontuação por Área" icon={<ChartPieIcon className="w-5 h-5" />} className="no-break">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {DIAGNOSTIC_AREAS.map(area => {
                        const areaData = scoresByArea[area];
                        const score = areaData?.score ?? 0;
                        const maxScore = (areaData?.count ?? 1) * 10;
                        const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                        const marketAvg = BENCHMARK_DATA.marketAverage[area as DiagnosticArea] / 10 * 100;

                        return (
                            <div key={area} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="flex justify-between items-baseline">
                                    <h4 className="font-bold text-slate-800">{area}</h4>
                                    <p className="font-bold text-lg text-blue-900">{score}/{maxScore}</p>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2 my-2">
                                    <div className="bg-blue-800 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                                </div>
                                {score < marketAvg && (
                                    <p className="text-xs text-amber-600 font-semibold text-center">Abaixo da média ({marketAvg.toFixed(0)}%)</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </ReportCard>
            <ReportCard title="Recomendações Prioritárias" icon={<BoltIcon className="w-5 h-5" />} className="no-break">
                {isLoading ? (
                    <LoadingSpinner text="Gerando recomendações..." />
                ) : detailedAnalysis ? (
                    <div className="space-y-4">
                        {detailedAnalysis.strategicRecommendations.filter(r => r.priority === 'Alta').slice(0, 3).map((rec, index) => (
                            <div key={index} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold">{index + 1}</div>
                                <div>
                                    <MarkdownRenderer text={rec.recommendation} />
                                    <p className="text-sm text-slate-600 mt-1"><strong>Área:</strong> {rec.area}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-500 text-center py-4">Não foi possível carregar as recomendações da IA.</p>
                )}
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
