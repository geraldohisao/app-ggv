import React from 'react';
import { XMarkIcon, ArrowDownTrayIcon } from '../../ui/icons';
import { CoverTab, DashboardTab, SegmentedAnalysisTab, TextualDiagnosisTab, AIAnalysisTab } from '../report';

interface PdfModalProps {
    onClose: () => void;
    reportData: any; // Consider creating a specific type for this
}

export const PdfModal: React.FC<PdfModalProps> = ({ onClose, reportData }) => {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] relative animate-fade-in-up flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 flex justify-between items-center p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">Visualização do Relatório</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => window.print()} className="flex items-center gap-2 text-sm font-semibold bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors">
                            <ArrowDownTrayIcon className="w-5 h-5" /> Salvar como PDF
                        </button>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>
                <div id="pdf-root" className="flex-1 overflow-y-auto mt-6 px-6">
                    <div className="space-y-8">
                        <CoverTab companyData={reportData.companyData} />
                        <div className="page-break"></div>
                        <DashboardTab maturity={reportData.maturity} totalScore={reportData.totalScore} scoresByArea={reportData.scoresByArea} segment={reportData.segment} />
                        <div className="page-break"></div>
                        <SegmentedAnalysisTab scoresByArea={reportData.scoresByArea} detailedAnalysis={reportData.detailedAnalysis} isLoading={!reportData.detailedAnalysis} />
                        <div className="page-break"></div>
                        <TextualDiagnosisTab summaryInsights={reportData.summaryInsights} isLoading={!reportData.summaryInsights} />
                        {reportData.detailedAnalysis && (
                            <>
                                <div className="page-break"></div>
                                <AIAnalysisTab detailedAnalysis={reportData.detailedAnalysis} isGenerating={false} />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
