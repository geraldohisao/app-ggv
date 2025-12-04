import React, { useState } from 'react';

interface PDFViewerProps {
    pdfUrl: string;
    fileName: string;
}

/**
 * Visualizador de PDF inline
 * Usa object tag com fallback para diferentes navegadores
 */
const PDFViewer: React.FC<PDFViewerProps> = ({ pdfUrl, fileName }) => {
    const [error, setError] = useState(false);
    const [zoom, setZoom] = useState(100);

    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 25, 200));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 25, 50));
    };

    // Se não tem URL, mostrar loading
    if (!pdfUrl) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-600">Carregando PDF...</p>
                </div>
            </div>
        );
    }

    // Se deu erro, mostrar opção de download
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="bg-slate-100 rounded-full p-6 mb-4">
                    <svg className="w-16 h-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Visualização não disponível
                </h3>
                <p className="text-sm text-slate-600 mb-6">
                    Baixe o documento para visualizá-lo no seu computador.
                </p>
                <a
                    href={pdfUrl}
                    download={fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                    Baixar Documento
                </a>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="border-b border-slate-200 px-4 py-2 flex items-center gap-2 bg-slate-50">
                <button 
                    onClick={handleZoomIn}
                    className="p-2 hover:bg-slate-200 rounded transition-colors" 
                    title="Aumentar zoom"
                >
                    <span className="text-lg font-bold">+</span>
                </button>
                <button 
                    onClick={handleZoomOut}
                    className="p-2 hover:bg-slate-200 rounded transition-colors" 
                    title="Diminuir zoom"
                >
                    <span className="text-lg font-bold">−</span>
                </button>
                <span className="px-3 text-sm text-slate-600 border-l border-slate-300 ml-2">
                    {zoom}%
                </span>
                <div className="ml-auto text-sm text-slate-600 truncate max-w-md">
                    {fileName}
                </div>
                <a
                    href={pdfUrl}
                    download={fileName}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                >
                    Baixar
                </a>
            </div>

            {/* PDF Container */}
            <div className="flex-1 overflow-auto bg-slate-100 p-4">
                <div 
                    className="mx-auto bg-white shadow-lg rounded"
                    style={{ 
                        width: `${zoom}%`,
                        minHeight: '100%'
                    }}
                >
                    {/* Usa Google Drive Viewer para contornar CSP */}
                    <iframe
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`}
                        className="w-full min-h-screen border-0"
                        title={fileName}
                        onError={() => {
                            console.warn('Google Viewer falhou');
                            setError(true);
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default PDFViewer;

