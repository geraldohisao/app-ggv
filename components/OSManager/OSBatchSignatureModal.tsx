import React, { useState } from 'react';
import { ServiceOrder, OSSigner, SignerStatus } from '../../types';
import { supabase } from '../../services/supabaseClient';
import {
    XMarkIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArrowRightIcon,
    DocumentTextIcon
} from '../ui/icons';

interface OSBatchSignatureModalProps {
    orders: Array<{order: ServiceOrder, signer: OSSigner}>;
    onClose: () => void;
    onComplete: () => void;
}

/**
 * Modal de Assinatura em Lote
 * Processa múltiplos documentos com uma única confirmação
 */
const OSBatchSignatureModal: React.FC<OSBatchSignatureModalProps> = ({
    orders,
    onClose,
    onComplete
}) => {
    const [step, setStep] = useState<'form' | 'token' | 'processing' | 'success'>('form');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    
    const [fullName, setFullName] = useState(orders[0].signer.name || '');
    const [cpf, setCpf] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [sentCode, setSentCode] = useState('');

    const validateCPF = (cpf: string): boolean => {
        const cleanCPF = cpf.replace(/\D/g, '');
        if (cleanCPF.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
        
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
        }
        let digit = 11 - (sum % 11);
        if (digit >= 10) digit = 0;
        if (digit !== parseInt(cleanCPF.charAt(9))) return false;
        
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
        }
        digit = 11 - (sum % 11);
        if (digit >= 10) digit = 0;
        if (digit !== parseInt(cleanCPF.charAt(10))) return false;
        
        return true;
    };

    const formatCPF = (value: string): string => {
        const numbers = value.replace(/\D/g, '');
        return numbers
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
            .substring(0, 14);
    };

    const formatDate = (value: string): string => {
        const numbers = value.replace(/\D/g, '');
        return numbers
            .replace(/(\d{2})(\d)/, '$1/$2')
            .replace(/(\d{2})(\d)/, '$1/$2')
            .substring(0, 10);
    };

    const validateForm = (): boolean => {
        setError('');

        if (!fullName.trim() || fullName.trim().split(' ').length < 2) {
            setError('Digite seu nome completo.');
            return false;
        }

        if (!validateCPF(cpf)) {
            setError('CPF inválido.');
            return false;
        }

        return true;
    };

    const sendVerificationCode = async () => {
        try {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            setSentCode(code);

            // Enviar código via Netlify Function
            await fetch('/.netlify/functions/send-os-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: orders[0].signer.email,
                    toName: fullName,
                    subject: 'Código de Verificação - Assinatura em Lote',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                            <h1 style="text-align: center; color: #1a1a1a; margin-bottom: 30px;">Código de Verificação</h1>
                            <p style="color: #4b5563; margin-bottom: 30px;">Olá <strong>${fullName}</strong>,</p>
                            <p style="color: #4b5563; margin-bottom: 30px;">Para assinar ${orders.length} documento(s), utilize o código:</p>
                            <div style="background: #f3f4f6; padding: 30px; text-align: center; border-radius: 8px; margin-bottom: 30px;">
                                <p style="font-size: 42px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: monospace; color: #1a1a1a;">
                                    ${code}
                                </p>
                            </div>
                            <p style="color: #6b7280; font-size: 14px; text-align: center;">Válido por 10 minutos</p>
                        </div>
                    `
                })
            });

            sessionStorage.setItem(`batch_verify_${orders[0].signer.email}`, JSON.stringify({
                code,
                timestamp: Date.now(),
                expiresIn: 600000
            }));

            setStep('token');
        } catch (err) {
            setError('Erro ao enviar código. Tente novamente.');
        }
    };

    const handleSubmitForm = async () => {
        if (!validateForm()) return;
        await sendVerificationCode();
    };

    const verifyTokenAndSign = async () => {
        setError('');
        
        const savedData = sessionStorage.getItem(`batch_verify_${orders[0].signer.email}`);
        if (!savedData) {
            setError('Código expirado. Tente novamente.');
            return;
        }

        const { code, timestamp, expiresIn } = JSON.parse(savedData);
        
        if (Date.now() - timestamp > expiresIn) {
            setError('Código expirado. Tente novamente.');
            sessionStorage.removeItem(`batch_verify_${orders[0].signer.email}`);
            return;
        }

        if (verificationCode !== code) {
            setError('Código incorreto.');
            return;
        }

        // Processar assinaturas em lote
        await processSignatures();
    };

    const processSignatures = async () => {
        try {
            setLoading(true);
            setStep('processing');
            setError('');

            // Dados de prova
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const { ip } = await ipResponse.json();

            const signatureData = {
                fullName: fullName.trim(),
                cpf: cpf.replace(/\D/g, ''),
                birthDate: birthDate || null,
                signedAt: new Date().toISOString(),
                ipAddress: ip,
                userAgent: navigator.userAgent,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };

            // Hash
            const signatureString = JSON.stringify(signatureData);
            const encoder = new TextEncoder();
            const data = encoder.encode(signatureString);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const signatureHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            // Assinar cada documento
            for (let i = 0; i < orders.length; i++) {
                const { order, signer } = orders[i];

                await supabase
                    .from('os_signers')
                    .update({
                        status: SignerStatus.Signed,
                        signed_at: signatureData.signedAt,
                        ip_address: signatureData.ipAddress,
                        user_agent: signatureData.userAgent,
                        signature_hash: signatureHash,
                        signature_data: signatureData
                    })
                    .eq('id', signer.id);

                await supabase.rpc('log_os_event', {
                    p_os_id: order.id,
                    p_signer_id: signer.id,
                    p_event_type: 'signed',
                    p_event_description: `Assinado em lote por ${fullName}`
                });

                setProgress(Math.round(((i + 1) / orders.length) * 100));
            }

            sessionStorage.removeItem(`batch_verify_${orders[0].signer.email}`);
            setStep('success');
        } catch (err: any) {
            console.error('Erro ao processar assinaturas:', err);
            setError('Erro ao processar assinaturas. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                            {step === 'form' && 'Confirme seus dados'}
                            {step === 'token' && 'Token de autenticação'}
                            {step === 'processing' && 'Processando assinaturas...'}
                            {step === 'success' && 'Assinatura feita com sucesso!'}
                        </h2>
                        <p className="text-sm text-slate-600 mt-1">
                            Assinando {orders.length} documento(s)
                        </p>
                    </div>
                    {step !== 'processing' && (
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-8">
                    {/* STEP: Formulário */}
                    {step === 'form' && (
                        <>
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

                            {/* Lista de documentos */}
                            <div className="bg-slate-50 rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
                                <p className="text-sm font-semibold text-slate-700 mb-3">
                                    Documentos selecionados:
                                </p>
                                <div className="space-y-2">
                                    {orders.map((item, index) => (
                                        <div key={item.order.id} className="flex items-center gap-2 text-sm text-slate-600">
                                            <CheckCircleIcon className="w-4 h-4 text-green-600" />
                                            <span>{index + 1}. {item.order.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Formulário */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Nome completo
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        CPF
                                    </label>
                                    <input
                                        type="text"
                                        value={cpf}
                                        onChange={(e) => setCpf(formatCPF(e.target.value))}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
                                        placeholder="000.000.000-00"
                                        maxLength={14}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Data de Nascimento (DD/MM/AAAA)
                                    </label>
                                    <input
                                        type="text"
                                        value={birthDate}
                                        onChange={(e) => setBirthDate(formatDate(e.target.value))}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
                                        placeholder="21/11/1991"
                                        maxLength={10}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSubmitForm}
                                disabled={loading}
                                className="w-full mt-6 py-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold text-lg transition-colors flex items-center justify-center gap-2"
                            >
                                Avançar
                                <ArrowRightIcon className="w-5 h-5" />
                            </button>
                        </>
                    )}

                    {/* STEP: Token */}
                    {step === 'token' && (
                        <>
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircleIcon className="w-10 h-10 text-green-600" />
                                </div>
                                <p className="text-slate-600 mb-2">
                                    Enviado para <strong>{orders[0].signer.email}</strong>
                                </p>
                                <p className="text-sm text-slate-500">
                                    Insira o token para finalizar
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-2 justify-center mb-6">
                                {[...Array(6)].map((_, i) => (
                                    <input
                                        key={i}
                                        type="text"
                                        maxLength={1}
                                        value={verificationCode[i] || ''}
                                        onChange={(e) => {
                                            const newCode = verificationCode.split('');
                                            newCode[i] = e.target.value.replace(/\D/g, '');
                                            setVerificationCode(newCode.join(''));
                                            
                                            // Auto-focus próximo campo
                                            if (e.target.value && i < 5) {
                                                const next = e.target.parentElement?.nextElementSibling?.querySelector('input');
                                                next?.focus();
                                            }
                                        }}
                                        className="w-14 h-16 text-center text-2xl font-bold border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                ))}
                            </div>

                            <button
                                onClick={verifyTokenAndSign}
                                disabled={verificationCode.length !== 6 || loading}
                                className="w-full py-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? 'Processando...' : 'Finalizar'}
                            </button>

                            <button
                                onClick={() => {
                                    setStep('form');
                                    setVerificationCode('');
                                }}
                                className="w-full mt-4 text-slate-600 hover:text-slate-900 text-sm"
                            >
                                Reenviar token via email →
                            </button>
                        </>
                    )}

                    {/* STEP: Processing */}
                    {step === 'processing' && (
                        <div className="text-center py-8">
                            <div className="mb-6">
                                <div className="animate-spin w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full mx-auto"></div>
                            </div>
                            <p className="text-lg font-semibold text-slate-900 mb-2">
                                Assinando documentos...
                            </p>
                            <p className="text-slate-600 mb-6">
                                Processando {orders.length} documento(s)
                            </p>
                            <div className="max-w-md mx-auto">
                                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="bg-green-600 h-full transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-sm text-slate-600 mt-2">{progress}%</p>
                            </div>
                        </div>
                    )}

                    {/* STEP: Success */}
                    {step === 'success' && (
                        <div className="text-center py-8">
                            <CheckCircleIcon className="w-20 h-20 text-green-600 mx-auto mb-6" />
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">
                                Assinatura feita com sucesso!
                            </h3>
                            <p className="text-slate-600 mb-8">
                                {orders.length} documento(s) assinado(s) com sucesso!
                            </p>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-left mb-6">
                                <p className="text-sm text-green-900 mb-3 font-semibold">
                                    Documentos assinados:
                                </p>
                                <div className="space-y-2">
                                    {orders.map((item, index) => (
                                        <div key={item.order.id} className="flex items-center gap-2 text-sm text-green-800">
                                            <CheckCircleIcon className="w-4 h-4" />
                                            <span>{item.order.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={onComplete}
                                className="px-8 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold"
                            >
                                Concluir
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {(step === 'form' || step === 'token') && (
                    <div className="border-t border-slate-200 px-8 py-4 bg-slate-50">
                        <p className="text-xs text-slate-500 text-center">
                            🔒 Ambiente seguro Clicksign
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OSBatchSignatureModal;

