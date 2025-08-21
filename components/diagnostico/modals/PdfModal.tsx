import React, { useEffect } from 'react';
import { XMarkIcon, ArrowDownTrayIcon } from '../../ui/icons';
import { CoverTab, DashboardTab, SegmentedAnalysisTab, TextualDiagnosisTab, AIAnalysisTab } from '../report';

interface PdfModalProps {
    onClose: () => void;
    reportData: any; // Consider creating a specific type for this
}

export const PdfModal: React.FC<PdfModalProps> = ({ onClose, reportData }) => {
    useEffect(() => {
        // Adicionar estilos de impressão quando o modal abre
        const style = document.createElement('style');
        style.innerHTML = `
            @media print {
                body * { visibility: hidden; }
                #pdf-content, #pdf-content * { visibility: visible; }
                #pdf-content { 
                    position: absolute; 
                    left: 0; 
                    top: 0; 
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                .page-break { 
                    page-break-before: always; 
                    break-before: page;
                }
                .no-break { 
                    page-break-inside: avoid; 
                    break-inside: avoid;
                }
                @page {
                    size: A4;
                    margin: 1.5cm;
                }
                /* Ocultar elementos de interface */
                .print-hidden { display: none !important; }
            }
            
            /* Estilos para visualização no modal */
            .pdf-page {
                width: 210mm;
                min-height: 297mm;
                padding: 1.5cm;
                margin: 0 auto 2cm auto;
                background: white;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
                display: flex;
                flex-direction: column;
                position: relative;
            }
            
            .pdf-page-content {
                flex: 1;
                overflow: hidden;
            }
            
            /* Melhorar tipografia para PDF */
            .pdf-page h1, .pdf-page h2, .pdf-page h3 {
                color: #1e293b;
                line-height: 1.2;
            }
            
            .pdf-page p {
                line-height: 1.5;
                margin-bottom: 0.5em;
            }
        `;
        document.head.appendChild(style);
        
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    const handlePrint = () => {
        window.print();
    };

    // Verificar se reportData existe e tem dados válidos
    if (!reportData || !reportData.companyData) {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Dados Indisponíveis</h2>
                    <p className="text-slate-600 mb-4">Os dados do relatório não estão disponíveis para geração do PDF.</p>
                    <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        Fechar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] relative animate-fade-in-up flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 flex justify-between items-center p-6 border-b border-slate-200 print-hidden">
                    <h2 className="text-xl font-bold text-slate-800">Visualização do Relatório PDF</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrint} className="flex items-center gap-2 text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            <ArrowDownTrayIcon className="w-5 h-5" /> Salvar como PDF
                        </button>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>
                
                <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
                    <div id="pdf-content">
                        {/* Página 1: Capa */}
                        <div className="pdf-page">
                            <div className="pdf-page-content no-break">
                                <CoverTab 
                                    companyData={reportData.companyData} 
                                    specialistName={reportData.specialistName} 
                                />
                            </div>
                        </div>
                        
                        {/* Página 2: Dashboard */}
                        <div className="pdf-page">
                            <div className="pdf-page-content">
                                <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard Geral</h1>
                                <DashboardTab 
                                    maturity={reportData.maturity} 
                                    totalScore={reportData.totalScore} 
                                    scoresByArea={reportData.scoresByArea} 
                                    segment={reportData.segment} 
                                />
                            </div>
                        </div>
                        
                        {/* Página 3: Análise Segmentada */}
                        <div className="pdf-page">
                            <div className="pdf-page-content">
                                <h1 className="text-2xl font-bold text-slate-800 mb-6">Análise Segmentada</h1>
                                <SegmentedAnalysisTab 
                                    scoresByArea={reportData.scoresByArea} 
                                    detailedAnalysis={reportData.detailedAnalysis} 
                                    isLoading={!reportData.detailedAnalysis} 
                                />
                            </div>
                        </div>
                        
                        {/* Página 4: Diagnóstico Textual */}
                        <div className="pdf-page">
                            <div className="pdf-page-content">
                                <h1 className="text-2xl font-bold text-slate-800 mb-6">Diagnóstico Textual</h1>
                                <TextualDiagnosisTab 
                                    summaryInsights={reportData.summaryInsights} 
                                    isLoading={!reportData.summaryInsights} 
                                />
                            </div>
                        </div>
                        
                        {/* Página 5: Análise IA (se disponível) */}
                        {reportData.detailedAnalysis && (
                            <div className="pdf-page">
                                <div className="pdf-page-content">
                                    <h1 className="text-2xl font-bold text-slate-800 mb-6">Análise IA</h1>
                                    <AIAnalysisTab 
                                        detailedAnalysis={reportData.detailedAnalysis} 
                                        isGenerating={false} 
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};