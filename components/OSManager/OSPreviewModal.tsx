import React, { useState, useEffect } from 'react';
import { ServiceOrder } from '../../types';
import { supabase } from '../../services/supabaseClient';
import PDFViewerCanvas from './PDFViewerCanvas';
import { XMarkIcon, ArrowDownTrayIcon } from '../ui/icons';

interface OSPreviewModalProps {
    order: ServiceOrder;
    onClose: () => void;
}

/**
 * Modal de Preview de PDF para Gestores
 * Mesma visualização que os assinantes veem
 */
const OSPreviewModal: React.FC<OSPreviewModalProps> = ({ order, onClose }) => {
    const [pdfUrl, setPdfUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPDF();
    }, [order]);

    const loadPDF = async () => {
        try {
            setLoading(true);
            console.log('📄 [PREVIEW] Gerando URL para preview:', order.file_path);

            const paths = [`${order.file_path}.final.pdf`, order.file_path];
            for (const path of paths) {
                // URL assinada
                const { data: signed, error: signedError } = await supabase.storage
                    .from('service-orders')
                    .createSignedUrl(path, 3600);
                if (!signedError && signed?.signedUrl) {
                    const head = await fetch(signed.signedUrl, { method: 'HEAD' });
                    if (head.ok) {
                        console.log('✅ [PREVIEW] URL assinada válida');
                        setPdfUrl(signed.signedUrl);
                        setLoading(false);
                        return;
                    }
                }
                // Pública
                const { data: pub } = supabase.storage.from('service-orders').getPublicUrl(path);
                if (pub?.publicUrl) {
                    const head = await fetch(pub.publicUrl, { method: 'HEAD' });
                    if (head.ok) {
                        console.log('✅ [PREVIEW] URL pública válida:', pub.publicUrl);
                        setPdfUrl(pub.publicUrl);
                        setLoading(false);
                        return;
                    }
                }
            }
        } catch (err) {
            console.error('❌ [PREVIEW] Erro ao carregar PDF:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        try {
            const { data, error } = await supabase.storage
                .from('service-orders')
                .download(order.file_path);

            if (error) throw error;

            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = order.file_name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Erro ao baixar:', err);
            alert('Erro ao baixar PDF');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold truncate">{order.title}</h2>
                        <p className="text-sm text-slate-300 truncate">{order.file_name}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            Baixar
                        </button>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Badge de Preview */}
                <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 shrink-0">
                    <p className="text-sm text-blue-800">
                        <strong>Modo Preview:</strong> Esta é a visualização exata que os assinantes verão ao acessar o documento.
                    </p>
                </div>

                {/* PDF Viewer */}
                <div className="flex-1 overflow-hidden bg-slate-100">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                <p className="text-slate-600">Carregando visualização...</p>
                            </div>
                        </div>
                    ) : pdfUrl ? (
                        <PDFViewerCanvas pdfUrl={pdfUrl} fileName={order.file_name} />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-slate-600">Erro ao carregar PDF</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 shrink-0">
                    <p className="text-xs text-slate-500 text-center">
                        Esta é uma pré-visualização do documento. Os assinantes verão esta mesma interface.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OSPreviewModal;

