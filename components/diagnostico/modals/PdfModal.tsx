import React from 'react';
import { XMarkIcon, ArrowDownTrayIcon } from '../../ui/icons';
import { CoverTab, DashboardTab, SegmentedAnalysisTab, TextualDiagnosisTab, AIAnalysisTab } from '../report';

interface PdfModalProps {
    onClose: () => void;
    reportData: any; // Consider creating a specific type for this
}

export const PdfModal: React.FC<PdfModalProps> = ({ onClose, reportData }) => {
    const handlePrint = () => {
        console.log('🖨️ PDF - Iniciando processo de impressão...');
        
        try {
            // Método 1: Tentar window.print() diretamente
            const printContent = document.getElementById('pdf-content');
            if (!printContent) {
                console.error('❌ PDF - Elemento pdf-content não encontrado');
                alert('Erro: Conteúdo do PDF não disponível para impressão');
                return;
            }
            
            console.log('📄 PDF - Conteúdo encontrado, iniciando impressão...');
            
            // Criar uma nova janela para impressão com estilos otimizados
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            
            if (!printWindow) {
                console.error('❌ PDF - Popup bloqueado, tentando método alternativo...');
                // Fallback: usar window.print() na janela atual
                const originalContents = document.body.innerHTML;
                document.body.innerHTML = printContent.innerHTML;
                window.print();
                document.body.innerHTML = originalContents;
                return;
            }
            
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Diagnóstico Comercial - ${reportData?.companyData?.companyName || 'Relatório'}</title>
                    <meta charset="UTF-8">
                    <style>
                        * { box-sizing: border-box; }
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
                            margin: 0; 
                            padding: 20px; 
                            line-height: 1.6;
                            color: #333;
                        }
                        .page-break { 
                            page-break-before: always; 
                            margin-top: 40px;
                        }
                        .no-print { display: none !important; }
                        h1, h2, h3 { color: #1e40af; margin-top: 0; }
                        .bg-slate-50, .bg-slate-100 { background: #f8fafc !important; }
                        .text-slate-600 { color: #475569 !important; }
                        .rounded-lg, .rounded-xl { border-radius: 8px; }
                        .shadow-sm { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
                        
                        @media print {
                            body { margin: 0; padding: 15px; }
                            .page-break { page-break-before: always; margin-top: 0; }
                            .no-print { display: none !important; }
                            .shadow-sm { box-shadow: none !important; }
                        }
                        
                        @page {
                            margin: 1.5cm;
                            size: A4;
                        }
                    </style>
                </head>
                <body>
                    ${printContent.innerHTML}
                </body>
                </html>
            `;
            
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            
            // Aguardar carregamento e então imprimir
            printWindow.onload = () => {
                console.log('✅ PDF - Janela carregada, iniciando impressão...');
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    
                    // Fechar a janela após impressão (com delay para permitir cancelamento)
                    setTimeout(() => {
                        printWindow.close();
                    }, 1000);
                }, 500);
            };
            
        } catch (error) {
            console.error('❌ PDF - Erro durante impressão:', error);
            alert('Erro ao gerar PDF. Tente novamente ou use Ctrl+P para imprimir a página.');
        }
    };

    if (!reportData) {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
                <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Dados não disponíveis</h2>
                    <p className="text-slate-600 mb-4">Os dados do relatório ainda não estão prontos.</p>
                    <button onClick={onClose} className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800">
                        Fechar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[95vh] relative animate-fade-in-up flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 flex justify-between items-center p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">Visualização do Relatório</h2>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handlePrint} 
                            className="flex items-center gap-2 text-sm font-semibold bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
                        >
                            <ArrowDownTrayIcon className="w-5 h-5" /> Salvar como PDF
                        </button>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto bg-slate-50">
                    <div id="pdf-content" className="bg-white mx-4 my-6 p-8 rounded-lg shadow-sm space-y-12">
                        <CoverTab companyData={reportData.companyData} specialistName="Especialista GGV" />
                        <div className="page-break"></div>
                        <DashboardTab 
                            maturity={reportData.maturity} 
                            totalScore={reportData.totalScore} 
                            scoresByArea={reportData.scoresByArea} 
                            segment={reportData.segment} 
                        />
                        <div className="page-break"></div>
                        <SegmentedAnalysisTab 
                            scoresByArea={reportData.scoresByArea} 
                            detailedAnalysis={reportData.detailedAnalysis} 
                            isLoading={false} 
                        />
                        <div className="page-break"></div>
                        <TextualDiagnosisTab 
                            summaryInsights={reportData.summaryInsights} 
                            isLoading={false} 
                        />
                        {reportData.detailedAnalysis && (
                            <>
                                <div className="page-break"></div>
                                <AIAnalysisTab 
                                    detailedAnalysis={reportData.detailedAnalysis} 
                                    isGenerating={false} 
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
