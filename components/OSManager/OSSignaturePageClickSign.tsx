import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ServiceOrder, OSSigner, SignerStatus } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { useUser } from '../../contexts/DirectUserContext';
import OSSignatureModal from './OSSignatureModal';
import OSEmailVerification from './OSEmailVerification';
import PDFViewerCanvas from './PDFViewerCanvas';
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
    const [alreadySigned, setAlreadySigned] = useState(false);
    const [signedSuccess, setSignedSuccess] = useState(false);
    const [signedAtText, setSignedAtText] = useState<string | null>(null);

    const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [currentStep, setCurrentStep] = useState<'review' | 'confirm' | 'token'>('review');
    const [pendingDocs, setPendingDocs] = useState<Array<{ orderId: string; signerId: string; title: string; fileName: string }>>([]);

    useEffect(() => {
        loadSignatureData();
    }, [orderId, signerId]);

    const loadSignatureData = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('🔍 Carregando dados de assinatura...', {
                orderId,
                signerId,
                hasUser: !!user,
                userEmail: user?.email
            });

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

            // Buscar todos os assinantes para mostrar progresso (usando view protegida para evitar vazamento de PII)
            const { data: allSignersData } = await supabase
                .from('os_safe_signers_view')
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

            const isSigned = signerData.status === 'SIGNED';
            // Só setar alreadySigned se não foi um sucesso recente (evita sobrescrever mensagem de sucesso)
            if (!signedSuccess) {
                setAlreadySigned(isSigned);
            }
            setSignedAtText(isSigned && signerData.signed_at ? new Date(signerData.signed_at).toLocaleString('pt-BR') : null);

            // Gerar URL assinada do PDF (mais seguro que URL pública)
            console.log('📄 Gerando URL assinada do PDF:', orderData.file_path);

            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                .from('service-orders')
                .createSignedUrl(orderData.file_path, 3600); // 1 hora de validade

            if (signedUrlData?.signedUrl) {
                console.log('✅ URL assinada gerada');
                setPdfUrl(signedUrlData.signedUrl);
            } else {
                console.error('❌ Erro ao gerar URL assinada:', signedUrlError);
                // Fallback para publicUrl se estiver configurado como público (para não quebrar enquanto migra)
                const { data: publicUrlData } = supabase.storage
                    .from('service-orders')
                    .getPublicUrl(orderData.file_path);
                setPdfUrl(publicUrlData.publicUrl);
            }

            // Verificar se já validou o e-mail nesta sessão
            const alreadyVerified = sessionStorage.getItem(`email_verified_${signerData.email}`);

            if (isSigned) {
                // Já assinado: não precisa seguir para verificação/código
                setNeedsEmailVerification(false);
                setIsEmailVerified(true);
            } else if (alreadyVerified === 'true') {
                // Já validou antes nesta sessão
                setIsEmailVerified(true);
                setNeedsEmailVerification(false);
            } else if (!user) {
                // Não está logado - vai precisar verificar (mas não mostra modal ainda)
                console.log('ℹ️ Usuário não logado, verificação será necessária ao clicar Assinar');
                setNeedsEmailVerification(true);
                setIsEmailVerified(false);
                setShowVerificationModal(false);
            } else if (user.email === signerData.email) {
                // Está logado com e-mail correto - não precisa verificar NUNCA
                console.log('✅ Usuário logado com e-mail correto, verificação dispensada');
                setIsEmailVerified(true);
                setNeedsEmailVerification(false);
                setShowVerificationModal(false);
                sessionStorage.setItem(`email_verified_${signerData.email}`, 'true');
            } else {
                // Está logado mas com e-mail diferente - ainda assim dispensa verificação
                console.log('✅ Usuário logado (e-mail diferente), mas dispensando verificação');
                setIsEmailVerified(true);
                setNeedsEmailVerification(false);
                setShowVerificationModal(false);
                sessionStorage.setItem(`email_verified_${signerData.email}`, 'true');
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

    const handleSignatureComplete = async () => {
        setSignedSuccess(true);
        setAlreadySigned(false);
        setSignedAtText(new Date().toLocaleString('pt-BR'));
        setShowSignatureModal(false);

        // Buscar outros documentos pendentes do mesmo email
        await loadPendingDocuments();

        // Recarregar dados sem sobrescrever estado de sucesso
        setTimeout(() => loadSignatureData(), 100);
    };

    const loadPendingDocuments = async () => {
        if (!signer?.email) return;

        try {
            console.log('🔍 Buscando outros documentos pendentes para:', signer.email);

            // Buscar todos os assinantes pendentes deste email (exceto o atual)
            const { data: pendingSigners, error } = await supabase
                .from('os_signers')
                .select(`
                    id,
                    os_id,
                    email,
                    status,
                    service_orders (
                        id,
                        title,
                        file_name,
                        status
                    )
                `)
                .eq('email', signer.email)
                .eq('status', SignerStatus.Pending)
                .neq('id', signer.id);

            if (error) {
                console.error('Erro ao buscar documentos pendentes:', error);
                return;
            }

            // Filtrar documentos ativos (não cancelados/expirados)
            const activePending = (pendingSigners || [])
                .filter(s => s.service_orders &&
                    s.service_orders.status !== 'CANCELLED' &&
                    s.service_orders.status !== 'EXPIRED')
                .map(s => ({
                    orderId: s.os_id,
                    signerId: s.id,
                    title: s.service_orders.title,
                    fileName: s.service_orders.file_name
                }));

            console.log(`📋 ${activePending.length} documentos pendentes encontrados`);
            setPendingDocs(activePending);
        } catch (err) {
            console.error('Erro ao carregar documentos pendentes:', err);
        }
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

    if (alreadySigned || signedSuccess) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="max-w-2xl w-full">
                    <div className="text-center mb-6">
                        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">
                            {signedSuccess ? 'Documento assinado com sucesso' : 'Documento Já Assinado'}
                        </h1>
                        <p className="text-slate-600 mb-4">
                            {signedSuccess ? 'Assinatura registrada.' : 'Você já assinou este documento.'}
                        </p>
                        {(signedAtText || signer?.signed_at) && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left max-w-md mx-auto">
                                <p className="text-sm text-green-800">
                                    Assinado em: {signedAtText || new Date(signer!.signed_at!).toLocaleString('pt-BR')}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Lista de documentos pendentes */}
                    {pendingDocs.length > 0 && (
                        <div className="mt-8">
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                                <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                    📋 Você tem {pendingDocs.length} documento{pendingDocs.length > 1 ? 's' : ''} pendente{pendingDocs.length > 1 ? 's' : ''}
                                </h2>
                                <p className="text-sm text-blue-700 mb-4">
                                    Continue assinando os documentos abaixo:
                                </p>

                                <div className="space-y-3">
                                    {pendingDocs.map((doc, idx) => (
                                        <a
                                            key={doc.signerId}
                                            href={`/assinar/${doc.orderId}/${doc.signerId}`}
                                            className="block bg-white border border-blue-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all group"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                                                        {doc.title}
                                                    </p>
                                                    <p className="text-sm text-slate-500 mt-1">
                                                        {doc.fileName}
                                                    </p>
                                                </div>
                                                <div className="shrink-0">
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium group-hover:bg-blue-200 transition-colors">
                                                        Assinar →
                                                    </span>
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
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

    // Função para iniciar assinatura (com verificação se necessário)
    const handleStartSignature = () => {
        console.log('🖊️ Iniciando processo de assinatura...', {
            hasUser: !!user,
            userEmail: user?.email,
            signerEmail: signer?.email,
            isEmailVerified,
            needsEmailVerification,
            showVerificationModal
        });

        // PRIORIDADE 1: Se for usuário logado, SEMPRE pula verificação
        if (user) {
            console.log('✅ Usuário logado detectado, pulando verificação completamente');
            setShowVerificationModal(false);
            setShowSignatureModal(true);
            return;
        }

        // PRIORIDADE 2: Se for externo e já verificou nesta sessão, vai direto
        if (isEmailVerified) {
            console.log('✅ E-mail já verificado nesta sessão, abrindo modal de assinatura');
            setShowVerificationModal(false);
            setShowSignatureModal(true);
            return;
        }

        // PRIORIDADE 3: Se for externo e não verificou, MOSTRA modal de verificação AGORA
        if (!isEmailVerified) {
            console.log('📧 E-mail não verificado, abrindo modal de verificação');
            setShowVerificationModal(true);
            return;
        }

        // Fallback: abrir modal de assinatura
        console.log('⚠️ Fallback inesperado: abrindo modal de assinatura');
        setShowSignatureModal(true);
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <header className="border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between bg-white z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            // Voltar para dashboard se tiver acesso, senão fecha a aba
                            if (window.opener) {
                                window.close();
                            } else {
                                window.location.href = '/';
                            }
                        }}
                        className="text-slate-600 hover:text-slate-900 transition-colors"
                        title="Voltar"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <img
                        src="https://ggvinteligencia.com.br/wp-content/uploads/2025/08/Logo-Grupo-GGV-Preto-Vertical-1.png"
                        alt="Grupo GGV"
                        className="h-8 md:h-10"
                    />
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-600">
                        {signedCount}/{totalSigners} Assinaturas
                    </span>
                    <button
                        onClick={() => {
                            if (confirm('Deseja realmente sair sem assinar?')) {
                                if (window.opener) {
                                    window.close();
                                } else {
                                    window.location.href = '/';
                                }
                            }
                        }}
                        className="text-slate-600 hover:text-slate-900 transition-colors"
                        title="Fechar"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
            </header>

            {/* Main Content: Sidebar + PDF Viewer */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar de Progresso - Escondida em mobile */}
                <aside className="hidden md:block w-64 border-r border-slate-200 bg-slate-50 p-6">
                    <nav className="space-y-4">
                        {/* Step 1: Revisar */}
                        <div className={`flex items-start gap-3 ${currentStep === 'review' ? 'opacity-100' : 'opacity-50'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${currentStep === 'review' ? 'bg-orange-500 text-white' : 'bg-white border-2 border-slate-300 text-slate-600'
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
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${currentStep === 'confirm' ? 'bg-orange-500 text-white' : 'bg-white border-2 border-slate-300 text-slate-600'
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
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${currentStep === 'token' ? 'bg-orange-500 text-white' : 'bg-white border-2 border-slate-300 text-slate-600'
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
                <main className="flex-1 flex flex-col overflow-hidden relative">
                    {/* PDF Viewer */}
                    <div className="flex-1 overflow-hidden">
                        {pdfUrl ? (
                            <PDFViewerCanvas pdfUrl={pdfUrl} fileName={order.file_name} />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                    <p className="text-slate-600">Carregando PDF...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Botão Assinar Fixo - Sobreposto - Responsivo */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
                        <div className="max-w-md mx-auto pointer-events-auto">
                            <button
                                onClick={handleStartSignature}
                                className="w-full py-3 md:py-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 active:bg-slate-950 font-semibold text-base md:text-lg transition-colors shadow-xl touch-manipulation"
                            >
                                Assinar
                            </button>
                            <p className="text-xs text-slate-500 text-center mt-2 md:mt-3">
                                🔒 Ambiente seguro Grupo GGV
                            </p>
                        </div>
                    </div>
                </main>
            </div>

            {/* Modal de Verificação de E-mail (SÓ quando clicar Assinar) */}
            {showVerificationModal && needsEmailVerification && !isEmailVerified && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                        <OSEmailVerification
                            signerEmail={signer.email}
                            signerName={signer.name}
                            autoSend={true}
                            onVerified={() => {
                                handleEmailVerified();
                                setShowVerificationModal(false);
                                setShowSignatureModal(true);
                            }}
                        />
                    </div>
                </div>
            )}

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

