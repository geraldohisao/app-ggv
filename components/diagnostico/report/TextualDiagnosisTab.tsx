import React from 'react';
import { SummaryInsights } from '../../../types';
import { LoadingSpinner } from '../../ui/Feedback';
import MarkdownRenderer from '../../ui/MarkdownRenderer';
import { DocumentTextIcon, FlagIcon } from '../../ui/icons';

interface TextualDiagnosisTabProps {
    summaryInsights: SummaryInsights | null;
    isLoading: boolean;
}

export const TextualDiagnosisTab: React.FC<TextualDiagnosisTabProps> = ({ summaryInsights, isLoading }) => {
    if (isLoading) {
        return <LoadingSpinner text="Nossa IA está cruzando seus dados com benchmarks de mercado para criar uma análise inicial." />;
    }
    if (!summaryInsights) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl">
                <p className="font-semibold">Análise preliminar (modo offline)</p>
                <p className="text-sm mt-1">Não conseguimos contactar a IA no tempo esperado. Exibimos um resumo local para não atrasar sua experiência. Você pode tentar novamente mais tarde.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <ReportCard title="Análise do Especialista GGV" icon={<DocumentTextIcon className="w-5 h-5" />} className="no-break">
                <MarkdownRenderer text={summaryInsights.specialistInsight} />
            </ReportCard>
            <ReportCard title="Comparativo de Mercado" icon={<FlagIcon className="w-5 h-5" />} className="no-break">
                <MarkdownRenderer text={summaryInsights.marketBenchmark} />
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
