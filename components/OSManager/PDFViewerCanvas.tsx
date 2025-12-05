import React, { useEffect, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';

interface PDFViewerCanvasProps {
    pdfUrl: string;
    fileName: string;
}

// Worker local para evitar bloqueio de CSP (usa script-src 'self')
if (GlobalWorkerOptions.workerSrc !== workerSrc) {
    GlobalWorkerOptions.workerSrc = workerSrc;
}

/**
 * Visualizador de PDF usando PDF.js (canvas inline, com worker local)
 */
const PDFViewerCanvas: React.FC<PDFViewerCanvasProps> = ({ pdfUrl, fileName }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.25);
    const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);

    useEffect(() => {
        let mounted = true;
        let task: any;

        const loadPDF = async () => {
            try {
                setLoading(true);
                setError(false);

                task = getDocument({
                    url: pdfUrl,
                    withCredentials: false,
                    isEvalSupported: false,
                    useWorkerFetch: true
                });

                const pdf = await task.promise;
                if (!mounted) return;

                setPdfDocument(pdf);
                setNumPages(pdf.numPages);
                setCurrentPage(1);
            } catch (err: any) {
                console.error('❌ [PDF.js] Erro ao carregar PDF:', err);
                setError(true);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadPDF();

        return () => {
            mounted = false;
            if (task) {
                task.destroy();
            }
            if (pdfDocument) {
                pdfDocument.destroy();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pdfUrl]);

    useEffect(() => {
        if (pdfDocument) {
            renderPage(currentPage);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, scale, pdfDocument]);

    const renderPage = async (pageNum: number) => {
        if (!pdfDocument || !canvasRef.current) return;

        try {
            const page = await pdfDocument.getPage(pageNum);
            const viewport = page.getViewport({ scale });

            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            if (!context) return;

            const dpr = window.devicePixelRatio || 1;
            canvas.width = viewport.width * dpr;
            canvas.height = viewport.height * dpr;
            canvas.style.width = `${viewport.width}px`;
            canvas.style.height = `${viewport.height}px`;

            context.scale(dpr, dpr);
            const renderContext = { canvasContext: context, viewport };
            await page.render(renderContext).promise;
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

