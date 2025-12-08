import React, { useState } from 'react';
import { ServiceOrder, OSSigner, SignerStatus } from '../../types';
import { supabase } from '../../services/supabaseClient';
import {
    XMarkIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArrowRightIcon
} from '../ui/icons';

interface OSSignatureModalProps {
    order: ServiceOrder;
    signer: OSSigner;
    onClose: () => void;
    onComplete: () => void;
}

/**
 * Modal de Confirmação de Dados para Assinatura
 * Estilo ClickSign
 */
const OSSignatureModal: React.FC<OSSignatureModalProps> = ({
    order,
    signer,
    onClose,
    onComplete
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [fullName, setFullName] = useState(signer.name || '');
    const [cpf, setCpf] = useState('');
    const [birthDate, setBirthDate] = useState('');

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

    const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCpf(formatCPF(e.target.value));
    };

    const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBirthDate(formatDate(e.target.value));
    };

    const validateForm = (): boolean => {
        setError('');

        if (!fullName.trim()) {
            setError('Preencha seu nome completo.');
            return false;
        }

        if (fullName.trim().split(' ').length < 2) {
            setError('Digite seu nome completo (nome e sobrenome).');
            return false;
        }

        if (!validateCPF(cpf)) {
            setError('CPF inválido.');
            return false;
        }

        if (birthDate) {
            const dateParts = birthDate.split('/');
            if (dateParts.length !== 3) {
                setError('Data de nascimento inválida.');
                return false;
            }
            const day = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]);
            const year = parseInt(dateParts[2]);
            
            if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
                setError('Data de nascimento inválida.');
                return false;
            }
        }

        return true;
    };

    React.useEffect(() => {
        // 1) Prefill com dados já presentes no signer (signature_data)
        const sigData: any = (signer as any).signature_data;
        if (sigData) {
            if (sigData.fullName) setFullName(sigData.fullName);
            if (sigData.cpf) setCpf(formatCPF(sigData.cpf));
            if (sigData.birthDate) setBirthDate(formatDate(sigData.birthDate));
            return;
        }

        // 2) Buscar último cadastro assinado desse e-mail para reaproveitar
        const loadLastSignedData = async () => {
            try {
                const { data, error } = await supabase
                    .from('os_signers')
                    .select('signature_data')
                    .eq('email', signer.email)
                    .eq('status', SignerStatus.Signed)
                    .order('signed_at', { ascending: false })
                    .limit(1)
                    .single();

                if (!error && data?.signature_data) {
                    const prev: any = data.signature_data;
                    if (prev.fullName) setFullName(prev.fullName);
                    if (prev.cpf) setCpf(formatCPF(prev.cpf));
                    if (prev.birthDate) setBirthDate(formatDate(prev.birthDate));
                }
            } catch (err) {
                console.warn('Prefill signature data falhou (ignorado):', err);
            }
        };

        loadLastSignedData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signer.email]);

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            setLoading(true);
            setError('');

            // Coletar dados de prova
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const { ip } = await ipResponse.json();
            
            const signatureData = {
                fullName: fullName.trim(),
                cpf: cpf.replace(/\D/g, ''),
                birthDate: birthDate || null,
                signedAt: new Date().toISOString(),
                ipAddress: ip,
                userAgent: navigator.userAgent,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                screenResolution: `${window.screen.width}x${window.screen.height}`
            };

            // Gerar hash SHA-256
            const signatureString = JSON.stringify(signatureData);
            const encoder = new TextEncoder();
            const data = encoder.encode(signatureString);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const signatureHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            // Atualizar registro
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

            // Log de auditoria
            await supabase.rpc('log_os_event', {
                p_os_id: order.id,
                p_signer_id: signer.id,
                p_event_type: 'signed',
                p_event_description: `Assinado por ${fullName}`,
                p_metadata: {
                    cpf_partial: cpf.substring(0, 7) + '***',
                    ip: ip
                }
            });

            onComplete();
        } catch (err: any) {
            console.error('Erro ao assinar:', err);
            setError('Erro ao processar assinatura. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Confirme seus dados</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 shrink-0" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                )}

                {/* Formulário */}
                <div className="space-y-4">
                    {/* Nome Completo */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Nome completo
                        </label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Digite seu nome completo"
                        />
                    </div>

                    {/* CPF */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            CPF
                        </label>
                        <input
                            type="text"
                            value={cpf}
                            onChange={handleCPFChange}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                            placeholder="000.000.000-00"
                            maxLength={14}
                        />
                    </div>

                    {/* Data de Nascimento */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Data de Nascimento (DD/MM/AAAA)
                        </label>
                        <input
                            type="text"
                            value={birthDate}
                            onChange={handleBirthDateChange}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                            placeholder="21/11/1991"
                            maxLength={10}
                        />
                    </div>
                </div>

                {/* Botão */}
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full mt-8 py-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                            Processando...
                        </>
                    ) : (
                        <>
                            Avançar
                            <ArrowRightIcon className="w-5 h-5" />
                        </>
                    )}
                </button>

                {/* Footer */}
                <p className="text-xs text-slate-500 text-center mt-4">
                    🔒 Ambiente seguro Grupo GGV
                </p>
            </div>
        </div>
    );
};

export default OSSignatureModal;

