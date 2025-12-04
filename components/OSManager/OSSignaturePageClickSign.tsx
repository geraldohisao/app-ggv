import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ServiceOrder, OSSigner, SignerStatus } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { useUser } from '../../contexts/DirectUserContext';
import OSSignatureModal from './OSSignatureModal';
import OSEmailVerification from './OSEmailVerification';
import PDFViewer from './PDFViewer';
import {
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XMarkIcon,
    ArrowLeftIcon
} from '../ui/icons';

/**
 * Página de Assinatura Estilo ClickSign
 * Layout com sidebar + PDF viewer inline
 */
const OSSignaturePageClickSign: React.FC = () => {
    const { orderId, signerId } = useParams<{ orderId: string; signerId: string }>();
    const { user } = useUser();

    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<ServiceOrder | null>(null);
    const [signer, setSigner] = useState<OSSigner | null>(null);
    const [allSigners, setAllSigners] = useState<OSSigner[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string>('');
    
    const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [currentStep, setCurrentStep] = useState<'review' | 'confirm' | 'token'>('review');

    useEffect(() => {
        loadSignatureData();
    }, [orderId, signerId]);

    const loadSignatureData = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!orderId || !signerId) {
                setError('Link inválido.');
                return;
            }

            // Buscar OS
            const { data: orderData, error: orderError } = await supabase
                .from('service_orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (orderError || !orderData) {
                setError('Documento não encontrado.');
                return;
            }

            // Buscar assinante específico
            const { data: signerData, error: signerError } = await supabase
                .from('os_signers')
                .select('*')
                .eq('id', signerId)
                .eq('os_id', orderId)
                .single();

            if (signerError || !signerData) {
                setError('Assinante não encontrado.');
                return;
            }

            // Buscar todos os assinantes para mostrar progresso
            const { data: allSignersData } = await supabase
                .from('os_signers')
                .select('*')
                .eq('os_id', orderId)
                .order('order_index');

            setOrder(orderData);
            setSigner(signerData);
            setAllSigners(allSignersData || []);

            // Verificações de status
            if (orderData.status === 'CANCELLED') {
                setError('Este documento foi cancelado.');
                return;
            }

            if (orderData.status === 'EXPIRED') {
                setError('Este documento expirou.');
                return;
            }

            if (signerData.status === 'SIGNED') {
                setError('Você já assinou este documento.');
                return;
            }

            // Gerar URL pública do PDF
            const { data: urlData } = await supabase.storage
                .from('service-orders')
                .createSignedUrl(orderData.file_path, 3600); // Válido por 1 hora

            if (urlData?.signedUrl) {
                setPdfUrl(urlData.signedUrl);
            }

            // Verificar se precisa de verificação de e-mail
            if (!user) {
                setNeedsEmailVerification(true);
            } else if (user.email === signerData.email) {
                setIsEmailVerified(true);
            } else {
                setNeedsEmailVerification(true);
            }

        } catch (err: any) {
            console.error('Erro ao carregar:', err);
            setError('Erro ao carregar documento.');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailVerified = () => {
        setIsEmailVerified(true);
        setNeedsEmailVerification(false);
    };

    const handleSignatureComplete = () => {
        loadSignatureData();
    };

    const signedCount = allSigners.filter(s => s.status === 'SIGNED').length;
    const totalSigners = allSigners.length;

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-600">Carregando documento...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center">
                    <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">
                        {error.includes('já assinou') ? 'Documento Já Assinado' : 'Atenção'}
                    </h1>
                    <p className="text-slate-600 mb-6">{error}</p>
                    
                    {error.includes('já assinou') && signer && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
                            <CheckCircleIcon className="w-6 h-6 text-green-600 mb-2" />
                            <p className="text-sm text-green-800">
                                Assinado em: {new Date(signer.signed_at!).toLocaleString('pt-BR')}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (!order || !signer) return null;

    // Verificação de e-mail para usuários externos
    if (needsEmailVerification && !isEmailVerified) {
        return (
            <OSEmailVerification
                signerEmail={signer.email}
                signerName={signer.name}
                onVerified={handleEmailVerified}
            />
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <header className="border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => window.history.back()}
                        className="text-slate-600 hover:text-slate-900"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <img 
                        src="https://ggvinteligencia.com.br/wp-content/uploads/2025/08/Logo-Grupo-GGV-Preto-Vertical-1.png"
                        alt="Grupo GGV"
                        className="h-10"
                    />
                </div>
                
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-600">
                        {signedCount}/{totalSigners} Assinaturas
                    </span>
                    <button className="text-slate-600 hover:text-slate-900">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
            </header>

            {/* Main Content: Sidebar + PDF Viewer */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar de Progresso */}
                <aside className="w-64 border-r border-slate-200 bg-slate-50 p-6">
                    <nav className="space-y-4">
                        {/* Step 1: Revisar */}
                        <div className={`flex items-start gap-3 ${currentStep === 'review' ? 'opacity-100' : 'opacity-50'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                currentStep === 'review' ? 'bg-orange-500 text-white' : 'bg-white border-2 border-slate-300 text-slate-600'
                            }`}>
                                {currentStep !== 'review' ? '✓' : '●'}
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">Revisar</p>
                                <p className="text-xs text-slate-600">1 documento nesta etapa</p>
                            </div>
                        </div>

                        {/* Step 2: Confirmar dados */}
                        <div className={`flex items-start gap-3 ${currentStep === 'confirm' ? 'opacity-100' : 'opacity-50'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                currentStep === 'confirm' ? 'bg-orange-500 text-white' : 'bg-white border-2 border-slate-300 text-slate-600'
                            }`}>
                                {currentStep === 'token' ? '✓' : '●'}
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">Confirmar dados</p>
                                <p className="text-xs text-slate-600">Informações pessoais</p>
                            </div>
                        </div>

                        {/* Step 3: Token */}
                        <div className={`flex items-start gap-3 ${currentStep === 'token' ? 'opacity-100' : 'opacity-50'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                currentStep === 'token' ? 'bg-orange-500 text-white' : 'bg-white border-2 border-slate-300 text-slate-600'
                            }`}>
                                ●
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">Token via e-mail</p>
                                <p className="text-xs text-slate-600">Autenticação</p>
                            </div>
                        </div>
                    </nav>
                </aside>

                {/* PDF Viewer Area */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    {/* PDF Toolbar */}
                    <div className="border-b border-slate-200 px-4 py-2 flex items-center gap-2 bg-slate-50">
                        <button className="p-2 hover:bg-slate-200 rounded" title="Zoom In">
                            <span className="text-lg">+</span>
                        </button>
                        <button className="p-2 hover:bg-slate-200 rounded" title="Zoom Out">
                            <span className="text-lg">−</span>
                        </button>
                        <button className="p-2 hover:bg-slate-200 rounded" title="Pesquisar">
                            🔍
                        </button>
                        <div className="ml-auto text-sm text-slate-600">
                            {order.file_name}
                        </div>
                    </div>

                    {/* PDF Viewer */}
                    <div className="flex-1 overflow-hidden">
                        {pdfUrl ? (
                            <PDFViewer pdfUrl={pdfUrl} fileName={order.file_name} />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                    <p className="text-slate-600">Carregando PDF...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Botão Assinar Fixo */}
                    <div className="border-t border-slate-200 p-6 bg-white">
                        <div className="max-w-md mx-auto">
                            <button
                                onClick={() => setShowSignatureModal(true)}
                                className="w-full py-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold text-lg transition-colors"
                            >
                                Assinar
                            </button>
                            <p className="text-xs text-slate-500 text-center mt-3">
                                🔒 Ambiente seguro ClickSign
                            </p>
                        </div>
                    </div>
                </main>
            </div>

            {/* Modal de Assinatura */}
            {showSignatureModal && (
                <OSSignatureModal
                    order={order}
                    signer={signer}
                    onClose={() => setShowSignatureModal(false)}
                    onComplete={() => {
                        setShowSignatureModal(false);
                        setCurrentStep('token');
                        handleSignatureComplete();
                    }}
                />
            )}
        </div>
    );
};

export default OSSignaturePageClickSign;

