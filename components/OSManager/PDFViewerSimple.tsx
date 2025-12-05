import React, { useState } from 'react';

interface PDFViewerSimpleProps {
    pdfUrl: string;
    fileName: string;
}

/**
 * Visualizador Simples de PDF
 * Abre em nova aba - Solução prática e confiável
 */
const PDFViewerSimple: React.FC<PDFViewerSimpleProps> = ({ pdfUrl, fileName }) => {
    const [opened, setOpened] = useState(false);

    const handleOpenPDF = () => {
        window.open(pdfUrl, '_blank', 'noopener,noreferrer');
        setOpened(true);
    };

    return (
        <div className="h-full flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-12">
                {/* PDF Icon */}
                <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                    <svg className="w-20 h-20 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                        <path d="M14 2v6h6"/>
                        <text x="12" y="17" fontSize="6" fontWeight="bold" fill="white" textAnchor="middle">PDF</text>
                    </svg>
                </div>

                {/* Document Info */}
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">
                        Documento PDF
                    </h2>
                    <p className="text-lg text-slate-600 mb-2">
                        {fileName}
                    </p>
                    <p className="text-sm text-slate-500">
                        Clique abaixo para visualizar o documento
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                    <button
                        onClick={handleOpenPDF}
                        className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-lg transition-all hover:shadow-2xl hover:scale-105 group"
                    >
                        <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Abrir PDF em Nova Aba
                    </button>

                    <a
                        href={pdfUrl}
                        download={fileName}
                        className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-slate-700 text-white rounded-xl hover:bg-slate-800 font-semibold text-lg transition-all hover:shadow-2xl hover:scale-105 group"
                    >
                        <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Baixar PDF para Computador
                    </a>
                </div>

                {/* Success Message */}
                {opened && (
                    <div className="mt-8 p-6 bg-green-50 border-2 border-green-300 rounded-xl animate-fadeIn">
                        <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm text-green-800 font-medium">
                                PDF aberto em nova aba! Após revisar, volte aqui para continuar.
                            </p>
                        </div>
                    </div>
                )}

                {/* Help Text */}
                <div className="mt-10 pt-8 border-t border-slate-200">
                    <p className="text-sm text-slate-500 text-center leading-relaxed">
                        <strong className="text-slate-700">💡 Dica:</strong> O documento abrirá no visualizador nativo do seu navegador, onde você terá acesso completo a zoom, impressão e outras ferramentas.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PDFViewerSimple;

