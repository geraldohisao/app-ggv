import React, { useState, useRef } from 'react';
import { ServiceOrder, OSSigner, SignerStatus } from '../../types';
import { supabase } from '../../services/supabaseClient';
import {
    DocumentTextIcon,
    CheckCircleIcon,
    PencilIcon,
    ArrowDownTrayIcon,
    ExclamationTriangleIcon
} from '../ui/icons';

interface OSSignatureFormProps {
    order: ServiceOrder;
    signer: OSSigner;
    onComplete: () => void;
}

/**
 * Formulário de Assinatura Digital
 * Coleta CPF, nome completo e confirmação
 * Registra assinatura com hash e dados de prova
 */
const OSSignatureForm: React.FC<OSSignatureFormProps> = ({ order, signer, onComplete }) => {
    const [step, setStep] = useState<'review' | 'form' | 'confirm' | 'success'>('review');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Dados do formulário
    const [fullName, setFullName] = useState(signer.name || '');
    const [cpf, setCpf] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);

    const handleDownloadPDF = async () => {
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
            console.error('Erro ao baixar PDF:', err);
            alert('Erro ao baixar documento. Tente novamente.');
        }
    };

    const validateCPF = (cpf: string): boolean => {
        const cleanCPF = cpf.replace(/\D/g, '');
        
        if (cleanCPF.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(cleanCPF)) return false; // CPF com dígitos repetidos
        
        // Validação dos dígitos verificadores
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

    const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCpf(formatCPF(e.target.value));
    };

    const validateForm = (): boolean => {
        if (!fullName.trim()) {
            setError('Por favor, preencha seu nome completo.');
            return false;
        }

        if (fullName.trim().split(' ').length < 2) {
            setError('Por favor, digite seu nome completo (nome e sobrenome).');
            return false;
        }

        if (!validateCPF(cpf)) {
            setError('CPF inválido. Verifique o número digitado.');
            return false;
        }

        if (!acceptTerms) {
            setError('Você precisa aceitar os termos para assinar.');
            return false;
        }

        return true;
    };

    const handleProceedToForm = () => {
        setStep('form');
        setError('');
    };

    const handleSubmitForm = () => {
        if (validateForm()) {
            setStep('confirm');
            setError('');
        }
    };

    const handleConfirmSignature = async () => {
        try {
            setLoading(true);
            setError('');

            // Coletar dados de contexto para auditoria
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const { ip } = await ipResponse.json();
            
            const signatureData = {
                fullName: fullName.trim(),
                cpf: cpf.replace(/\D/g, ''),
                signedAt: new Date().toISOString(),
                ipAddress: ip,
                userAgent: navigator.userAgent,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };

            // Gerar hash da assinatura para integridade
            const signatureString = JSON.stringify(signatureData);
            const encoder = new TextEncoder();
            const data = encoder.encode(signatureString);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const signatureHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            // Atualizar registro do assinante
            const { error: updateError } = await supabase
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

            if (updateError) throw updateError;

            // Registrar no log de auditoria
            await supabase.rpc('log_os_event', {
                p_os_id: order.id,
                p_signer_id: signer.id,
                p_event_type: 'signed',
                p_event_description: `Documento assinado por ${fullName}`,
                p_metadata: {
                    cpf: cpf.replace(/\D/g, '').substring(0, 3) + '***',
                    ip: ip,
                    timestamp: signatureData.signedAt
                }
            });

            setStep('success');
        } catch (err: any) {
            console.error('Erro ao registrar assinatura:', err);
            setError('Erro ao processar assinatura. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Não definido';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    // Renderização baseada no step
    if (step === 'success') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
                <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center">
                        <CheckCircleIcon className="w-24 h-24 text-green-600 mx-auto mb-6" />
                        <h1 className="text-3xl font-bold text-slate-900 mb-4">
                            Documento Assinado com Sucesso!
                        </h1>
                        <p className="text-lg text-slate-600 mb-8">
                            Sua assinatura foi registrada e validada.
                        </p>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-left mb-8">
                            <h3 className="font-semibold text-green-900 mb-4">Detalhes da Assinatura:</h3>
                            <div className="space-y-2 text-sm text-green-800">
                                <p><strong>Nome:</strong> {fullName}</p>
                                <p><strong>CPF:</strong> {cpf}</p>
                                <p><strong>Documento:</strong> {order.title}</p>
                                <p><strong>Data:</strong> {new Date().toLocaleString('pt-BR')}</p>
                            </div>
                        </div>

                        <p className="text-sm text-slate-600">
                            Um comprovante foi enviado para seu e-mail.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
                    <div className="text-center mb-6">
                        <svg width="180" height="60" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
                            <text x="100" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" textAnchor="middle" fill="#1a1a1a">
                                GRUPO GGV
                            </text>
                        </svg>
                        <h1 className="text-3xl font-bold text-slate-900">
                            Assinatura de Documento
                        </h1>
                    </div>

                    {/* Informações do Documento */}
                    <div className="bg-slate-50 rounded-lg p-6">
                        <div className="flex items-start gap-4">
                            <DocumentTextIcon className="w-12 h-12 text-blue-600 shrink-0" />
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-slate-900 mb-2">{order.title}</h2>
                                {order.description && (
                                    <p className="text-slate-600 mb-4">{order.description}</p>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-slate-600">Arquivo:</span>
                                        <span className="ml-2 font-medium text-slate-900">{order.file_name}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-600">Válido até:</span>
                                        <span className="ml-2 font-medium text-slate-900">{formatDate(order.expires_at)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDownloadPDF}
                                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                >
                                    <ArrowDownTrayIcon className="w-4 h-4" />
                                    Baixar PDF para Revisar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Formulário */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {step === 'review' && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-6">Revisar Documento</h2>
                            
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                                <p className="text-blue-900 mb-4">
                                    <strong>Antes de assinar:</strong>
                                </p>
                                <ul className="space-y-2 text-sm text-blue-800">
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-600 mt-1">•</span>
                                        <span>Baixe e leia o documento PDF com atenção</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-600 mt-1">•</span>
                                        <span>Certifique-se de que concorda com todos os termos</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-600 mt-1">•</span>
                                        <span>Tenha seu CPF em mãos para validação</span>
                                    </li>
                                </ul>
                            </div>

                            <button
                                onClick={handleProceedToForm}
                                className="w-full py-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold text-lg transition-colors"
                            >
                                Prosseguir para Assinatura
                            </button>
                        </div>
                    )}

                    {step === 'form' && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-6">Dados para Assinatura</h2>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                    <div className="flex items-start gap-3">
                                        <ExclamationTriangleIcon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-6">
                                {/* Nome Completo */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Nome Completo *
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Digite seu nome completo"
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        maxLength={200}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Deve ser idêntico ao nome no documento de identidade
                                    </p>
                                </div>

                                {/* CPF */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        CPF *
                                    </label>
                                    <input
                                        type="text"
                                        value={cpf}
                                        onChange={handleCPFChange}
                                        placeholder="000.000.000-00"
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                                        maxLength={14}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Seu CPF será usado para validação da assinatura
                                    </p>
                                </div>

                                {/* E-mail (somente leitura) */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        E-mail
                                    </label>
                                    <input
                                        type="email"
                                        value={signer.email}
                                        disabled
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-100 text-slate-600"
                                    />
                                </div>

                                {/* Termo de Aceite */}
                                <div className="bg-slate-50 rounded-lg p-6">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={acceptTerms}
                                            onChange={(e) => setAcceptTerms(e.target.checked)}
                                            className="mt-1 w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-slate-700 leading-relaxed">
                                            Declaro que li e concordo com o conteúdo do documento, e que as informações fornecidas são verdadeiras. Estou ciente de que esta assinatura digital tem validade jurídica equivalente à assinatura manuscrita.
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-8">
                                <button
                                    onClick={() => setStep('review')}
                                    className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-semibold transition-colors"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={handleSubmitForm}
                                    className="flex-1 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold transition-colors"
                                >
                                    Continuar
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'confirm' && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-6">Confirmar Assinatura</h2>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
                                <div className="flex items-start gap-3">
                                    <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 shrink-0" />
                                    <div>
                                        <p className="font-semibold text-amber-900 mb-2">
                                            Atenção: Esta ação não pode ser desfeita
                                        </p>
                                        <p className="text-sm text-amber-800">
                                            Ao confirmar, você estará assinando digitalmente este documento com validade jurídica.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Resumo dos dados */}
                            <div className="bg-slate-50 rounded-lg p-6 mb-6">
                                <h3 className="font-semibold text-slate-900 mb-4">Confirme seus dados:</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Nome Completo:</span>
                                        <span className="font-semibold text-slate-900">{fullName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">CPF:</span>
                                        <span className="font-semibold text-slate-900 font-mono">{cpf}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">E-mail:</span>
                                        <span className="font-semibold text-slate-900">{signer.email}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Documento:</span>
                                        <span className="font-semibold text-slate-900">{order.title}</span>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        setStep('form');
                                        setError('');
                                    }}
                                    disabled={loading}
                                    className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-semibold transition-colors disabled:opacity-50"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={handleConfirmSignature}
                                    disabled={loading}
                                    className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                                            Processando...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircleIcon className="w-5 h-5" />
                                            Confirmar Assinatura
                                        </>
                                    )}
                                </button>
                            </div>

                            <p className="text-xs text-slate-500 text-center mt-6">
                                Ao confirmar, seus dados serão registrados com hash criptográfico para comprovação futura.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OSSignatureForm;

