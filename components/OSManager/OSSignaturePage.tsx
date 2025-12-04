import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ServiceOrder, OSSigner, SignerStatus } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { useUser } from '../../contexts/DirectUserContext';
import OSSignatureForm from './OSSignatureForm';
import OSEmailVerification from './OSEmailVerification';
import {
    DocumentTextIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ClockIcon
} from '../ui/icons';

/**
 * Página Pública de Assinatura
 * Permite que assinantes assinem documentos via link único
 * Inspirado em ClickSign/Autentique
 */
const OSSignaturePage: React.FC = () => {
    const { orderId, signerId } = useParams<{ orderId: string; signerId: string }>();
    const navigate = useNavigate();
    const { user } = useUser();

    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<ServiceOrder | null>(null);
    const [signer, setSigner] = useState<OSSigner | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
    const [isEmailVerified, setIsEmailVerified] = useState(false);

    useEffect(() => {
        loadSignatureData();
    }, [orderId, signerId]);

    const loadSignatureData = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!orderId || !signerId) {
                setError('Link inválido. Parâmetros faltando.');
                return;
            }

            // Buscar OS e Signer
            const { data: orderData, error: orderError } = await supabase
                .from('service_orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (orderError || !orderData) {
                setError('Documento não encontrado.');
                return;
            }

            const { data: signerData, error: signerError } = await supabase
                .from('os_signers')
                .select('*')
                .eq('id', signerId)
                .eq('os_id', orderId)
                .single();

            if (signerError || !signerData) {
                setError('Assinante não encontrado neste documento.');
                return;
            }

            setOrder(orderData);
            setSigner(signerData);

            // Verificar status do documento
            if (orderData.status === 'CANCELLED') {
                setError('Este documento foi cancelado.');
                return;
            }

            if (orderData.status === 'EXPIRED') {
                setError('Este documento expirou.');
                return;
            }

            // Verificar se já assinou
            if (signerData.status === 'SIGNED') {
                setError('Você já assinou este documento.');
                return;
            }

            // Verificar se precisa de verificação de e-mail
            // APENAS se o usuário NÃO está logado E o email não bate
            if (!user) {
                // Não está logado - precisa verificar e-mail
                setNeedsEmailVerification(true);
                setIsEmailVerified(false);
            } else if (user.email === signerData.email) {
                // Está logado E o e-mail bate - não precisa verificar
                setNeedsEmailVerification(false);
                setIsEmailVerified(true);
            } else {
                // Está logado mas com e-mail diferente - precisa verificar
                setNeedsEmailVerification(true);
                setIsEmailVerified(false);
            }

        } catch (err: any) {
            console.error('Erro ao carregar dados:', err);
            setError('Erro ao carregar documento. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailVerified = () => {
        setIsEmailVerified(true);
        setNeedsEmailVerification(false);
    };

    const handleSignatureComplete = () => {
        // Recarregar dados para mostrar status atualizado
        loadSignatureData();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-600 text-lg">Carregando documento...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center">
                        <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">
                            {error.includes('já assinou') ? 'Documento Já Assinado' : 'Erro'}
                        </h1>
                        <p className="text-slate-600 mb-6">{error}</p>
                        
                        {error.includes('já assinou') && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <CheckCircleIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
                                <p className="text-sm text-green-700">
                                    Sua assinatura foi registrada com sucesso anteriormente.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (!order || !signer) {
        return null;
    }

    // Se precisa de verificação de e-mail
    if (needsEmailVerification && !isEmailVerified) {
        return (
            <OSEmailVerification
                signerEmail={signer.email}
                signerName={signer.name}
                onVerified={handleEmailVerified}
            />
        );
    }

    // Se já verificado, mostrar formulário de assinatura
    if (signer.status === 'SIGNED') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
                <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center">
                        <CheckCircleIcon className="w-20 h-20 text-green-600 mx-auto mb-6" />
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">
                            Documento Assinado!
                        </h1>
                        <p className="text-lg text-slate-600 mb-4">
                            Sua assinatura foi registrada com sucesso.
                        </p>
                        
                        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-left">
                            <p className="text-sm text-green-900 mb-2">
                                <strong>Documento:</strong> {order.title}
                            </p>
                            <p className="text-sm text-green-900 mb-2">
                                <strong>Assinado em:</strong> {new Date(signer.signed_at!).toLocaleString('pt-BR')}
                            </p>
                            {signer.signature_hash && (
                                <p className="text-xs text-green-700 mt-4 font-mono">
                                    Hash: {signer.signature_hash.substring(0, 32)}...
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <OSSignatureForm
            order={order}
            signer={signer}
            onComplete={handleSignatureComplete}
        />
    );
};

export default OSSignaturePage;

