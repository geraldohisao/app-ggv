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
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [numPages, setNumPages] = useState(0);
    const [currentVisiblePage, setCurrentVisiblePage] = useState(1);
    const [scale, setScale] = useState(1.25);
    const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
    const [renderedPages, setRenderedPages] = useState<number[]>([]);

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
                setCurrentVisiblePage(1);
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
        if (pdfDocument && numPages > 0) {
            renderAllPages();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scale, pdfDocument, numPages]);

    const renderAllPages = async () => {
        if (!pdfDocument) return;

        const pageNumbers = Array.from({ length: numPages }, (_, i) => i + 1);
        setRenderedPages(pageNumbers);

        // Renderizar cada página com um pequeno delay para não travar a UI
        for (const pageNum of pageNumbers) {
            await renderPage(pageNum);
            // Pequeno delay para permitir que a UI responda
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    };

    const renderPage = async (pageNum: number) => {
        if (!pdfDocument) return;

        try {
            const page = await pdfDocument.getPage(pageNum);
            const viewport = page.getViewport({ scale });

            const canvas = document.getElementById(`pdf-page-${pageNum}`) as HTMLCanvasElement;
            if (!canvas) return;

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
            console.error(`❌ [PDF.js] Erro ao renderizar página ${pageNum}:`, err);
        }
    };
    
    // Detectar página visível ao rolar
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        
        const handleScroll = () => {
            const containerTop = container.scrollTop;
            const containerHeight = container.clientHeight;
            const centerY = containerTop + containerHeight / 2;
            
            // Encontrar qual página está no centro da viewport
            const canvases = container.querySelectorAll('canvas[id^="pdf-page-"]');
            canvases.forEach((canvas, idx) => {
                const rect = canvas.getBoundingClientRect();
                const canvasTop = canvas.getBoundingClientRect().top - container.getBoundingClientRect().top + containerTop;
                const canvasBottom = canvasTop + rect.height;
                
                if (centerY >= canvasTop && centerY <= canvasBottom) {
                    setCurrentVisiblePage(idx + 1);
                }
            });
        };
        
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [renderedPages]);

    const handleZoomIn = () => {
        setScale(prev => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = () => {
        setScale(prev => Math.max(prev - 0.25, 0.5));
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

                {/* Page Indicator */}
                <div className="flex items-center gap-2 border-l border-slate-300 pl-4">
                    <span className="text-sm text-slate-600">
                        Página {currentVisiblePage} de {numPages}
                    </span>
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

            {/* Canvas Container - Scroll Contínuo */}
            <div 
                ref={containerRef}
                className="flex-1 overflow-auto p-8"
            >
                <div className="flex flex-col items-center gap-4">
                    {renderedPages.map((pageNum) => (
                        <div key={pageNum} className="relative">
                            <canvas 
                                id={`pdf-page-${pageNum}`}
                                className="shadow-2xl bg-white"
                            />
                            <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs font-medium">
                                {pageNum}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer Info */}
            <div className="border-t border-slate-200 px-4 py-2 bg-white text-center shrink-0">
                <p className="text-xs text-slate-500">
                    Renderizado com PDF.js - Role para ver todas as páginas
                </p>
            </div>
        </div>
    );
};

export default PDFViewerCanvas;

