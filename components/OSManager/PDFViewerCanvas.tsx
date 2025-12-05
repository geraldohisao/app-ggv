import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface PDFViewerCanvasProps {
    pdfUrl: string;
    fileName: string;
}

/**
 * Visualizador de PDF usando PDF.js
 * Renderiza PDF como Canvas - SEM iframe, SEM problemas de CSP!
 */
const PDFViewerCanvas: React.FC<PDFViewerCanvasProps> = ({ pdfUrl, fileName }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.5);
    const [pdfDocument, setPdfDocument] = useState<any>(null);

    useEffect(() => {
        loadPDF();
        return () => {
            if (pdfDocument) {
                pdfDocument.destroy();
            }
        };
    }, [pdfUrl]);

    useEffect(() => {
        if (pdfDocument) {
            renderPage(currentPage);
        }
    }, [currentPage, scale, pdfDocument]);

    const loadPDF = async () => {
        try {
            setLoading(true);
            setError(false);

            console.log('📄 [PDF.js] Carregando PDF:', pdfUrl);

            const loadingTask = pdfjsLib.getDocument(pdfUrl);
            const pdf = await loadingTask.promise;

            console.log('✅ [PDF.js] PDF carregado! Páginas:', pdf.numPages);

            setPdfDocument(pdf);
            setNumPages(pdf.numPages);
            setCurrentPage(1);
        } catch (err) {
            console.error('❌ [PDF.js] Erro ao carregar:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    const renderPage = async (pageNum: number) => {
        if (!pdfDocument || !canvasRef.current) return;

        try {
            const page = await pdfDocument.getPage(pageNum);
            const viewport = page.getViewport({ scale });

            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (!context) return;

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            await page.render(renderContext).promise;
            console.log(`✅ [PDF.js] Página ${pageNum} renderizada`);
        } catch (err) {
            console.error('❌ [PDF.js] Erro ao renderizar página:', err);
        }
    };

    const handleZoomIn = () => {
        setScale(prev => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = () => {
        setScale(prev => Math.max(prev - 0.25, 0.5));
    };

    const handlePrevPage = () => {
        setCurrentPage(prev => Math.max(prev - 1, 1));
    };

    const handleNextPage = () => {
        setCurrentPage(prev => Math.min(prev + 1, numPages));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-100">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-600">Carregando PDF...</p>
                    <p className="text-xs text-slate-500 mt-2">Usando PDF.js</p>
                </div>
            </div>
        );
    }

    if (error || !pdfDocument) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 bg-slate-100">
                <svg className="w-16 h-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Erro ao carregar PDF
                </h3>
                <p className="text-sm text-slate-600 mb-6">
                    Não foi possível carregar o documento.
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
        <div className="h-full flex flex-col bg-slate-100">
            {/* Toolbar */}
            <div className="border-b border-slate-200 px-4 py-3 flex items-center gap-4 bg-white shrink-0">
                {/* Zoom Controls */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleZoomOut}
                        className="p-2 hover:bg-slate-100 rounded transition-colors" 
                        title="Diminuir zoom"
                    >
                        <span className="text-lg font-bold">−</span>
                    </button>
                    <span className="px-3 text-sm text-slate-600 min-w-[60px] text-center">
                        {Math.round(scale * 100)}%
                    </span>
                    <button 
                        onClick={handleZoomIn}
                        className="p-2 hover:bg-slate-100 rounded transition-colors" 
                        title="Aumentar zoom"
                    >
                        <span className="text-lg font-bold">+</span>
                    </button>
                </div>

                {/* Page Navigation */}
                <div className="flex items-center gap-2 border-l border-slate-300 pl-4">
                    <button
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                        ←
                    </button>
                    <span className="text-sm text-slate-600 min-w-[80px] text-center">
                        {currentPage} / {numPages}
                    </span>
                    <button
                        onClick={handleNextPage}
                        disabled={currentPage === numPages}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                        →
                    </button>
                </div>

                {/* File Name */}
                <div className="ml-auto text-sm text-slate-600 truncate max-w-md">
                    {fileName}
                </div>

                {/* Download Button */}
                <a
                    href={pdfUrl}
                    download={fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium shrink-0"
                >
                    Baixar
                </a>
            </div>

            {/* Canvas Container */}
            <div className="flex-1 overflow-auto p-8">
                <div className="flex justify-center">
                    <canvas 
                        ref={canvasRef}
                        className="shadow-2xl bg-white"
                    />
                </div>
            </div>

            {/* Footer Info */}
            <div className="border-t border-slate-200 px-4 py-2 bg-white text-center shrink-0">
                <p className="text-xs text-slate-500">
                    Renderizado com PDF.js - Página {currentPage} de {numPages}
                </p>
            </div>
        </div>
    );
};

export default PDFViewerCanvas;

