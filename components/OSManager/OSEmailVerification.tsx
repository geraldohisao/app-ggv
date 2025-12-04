import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
    EnvelopeIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon
} from '../ui/icons';

interface OSEmailVerificationProps {
    signerEmail: string;
    signerName: string;
    onVerified: () => void;
}

/**
 * Componente de Verificação de E-mail para Assinantes Externos
 * Envia código de 6 dígitos para validar identidade
 */
const OSEmailVerification: React.FC<OSEmailVerificationProps> = ({
    signerEmail,
    signerName,
    onVerified
}) => {
    const [step, setStep] = useState<'send' | 'verify'>('send');
    const [code, setCode] = useState('');
    const [sentCode, setSentCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [attempts, setAttempts] = useState(0);

    const generateCode = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    };

    const sendVerificationCode = async () => {
        try {
            setLoading(true);
            setError('');

            const verificationCode = generateCode();
            setSentCode(verificationCode);

            // Enviar e-mail com código via Netlify Function
            const response = await fetch('/.netlify/functions/send-os-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: signerEmail,
                    toName: signerName,
                    subject: 'Código de Verificação - Assinatura de Documento',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                            <h1 style="color: #1a1a1a; font-size: 24px; font-weight: 700; text-align: center; margin-bottom: 30px;">
                                Código de Verificação
                            </h1>
                            
                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                                Olá <strong>${signerName}</strong>,
                            </p>
                            
                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                                Para assinar o documento, utilize o código de verificação abaixo:
                            </p>
                            
                            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 30px; text-align: center; margin-bottom: 30px;">
                                <p style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">
                                    Seu código de verificação:
                                </p>
                                <p style="color: #1a1a1a; font-size: 42px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">
                                    ${verificationCode}
                                </p>
                            </div>
                            
                            <p style="color: #6b7280; font-size: 14px; text-align: center; margin-bottom: 20px;">
                                Este código é válido por 10 minutos.
                            </p>
                            
                            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 40px;">
                                Se você não solicitou este código, ignore este e-mail.
                            </p>
                        </div>
                    `
                })
            });

            if (!response.ok) {
                throw new Error('Falha ao enviar código de verificação');
            }

            setStep('verify');
            
            // Salvar temporariamente no sessionStorage com timestamp
            sessionStorage.setItem(`verify_${signerEmail}`, JSON.stringify({
                code: verificationCode,
                timestamp: Date.now(),
                expiresIn: 600000 // 10 minutos
            }));

        } catch (err: any) {
            console.error('Erro ao enviar código:', err);
            setError('Erro ao enviar código. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const verifyCode = () => {
        setError('');
        
        // Buscar código salvo
        const savedData = sessionStorage.getItem(`verify_${signerEmail}`);
        if (!savedData) {
            setError('Código expirado. Solicite um novo código.');
            setStep('send');
            return;
        }

        const { code: savedCode, timestamp, expiresIn } = JSON.parse(savedData);
        
        // Verificar expiração (10 minutos)
        if (Date.now() - timestamp > expiresIn) {
            setError('Código expirado. Solicite um novo código.');
            sessionStorage.removeItem(`verify_${signerEmail}`);
            setStep('send');
            return;
        }

        // Verificar código
        if (code === savedCode) {
            sessionStorage.removeItem(`verify_${signerEmail}`);
            sessionStorage.setItem(`email_verified_${signerEmail}`, 'true');
            onVerified();
        } else {
            setAttempts(prev => prev + 1);
            
            if (attempts >= 2) {
                setError('Muitas tentativas incorretas. Solicite um novo código.');
                setStep('send');
                setAttempts(0);
            } else {
                setError('Código incorreto. Tente novamente.');
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                {/* Logo */}
                <div className="text-center mb-8">
                    <svg width="180" height="60" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
                        <text x="100" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" textAnchor="middle" fill="#1a1a1a">
                            GRUPO GGV
                        </text>
                    </svg>
                </div>

                {step === 'send' ? (
                    <>
                        <div className="text-center mb-8">
                            <EnvelopeIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                            <h1 className="text-2xl font-bold text-slate-900 mb-2">
                                Verificação de E-mail
                            </h1>
                            <p className="text-slate-600">
                                Para assinar este documento, precisamos verificar sua identidade.
                            </p>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-4 mb-6">
                            <p className="text-sm text-slate-600 mb-2">
                                <strong>Documento solicitado para:</strong>
                            </p>
                            <p className="text-lg font-semibold text-slate-900 mb-1">{signerName}</p>
                            <p className="text-sm text-slate-600">{signerEmail}</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <button
                            onClick={sendVerificationCode}
                            disabled={loading}
                            className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Enviando...' : 'Enviar Código de Verificação'}
                        </button>

                        <p className="text-xs text-slate-500 text-center mt-4">
                            Enviaremos um código de 6 dígitos para seu e-mail.
                        </p>
                    </>
                ) : (
                    <>
                        <div className="text-center mb-8">
                            <EnvelopeIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
                            <h1 className="text-2xl font-bold text-slate-900 mb-2">
                                Digite o Código
                            </h1>
                            <p className="text-slate-600">
                                Enviamos um código de 6 dígitos para:
                            </p>
                            <p className="text-blue-600 font-semibold mt-2">{signerEmail}</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <div className="mb-6">
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                                placeholder="000000"
                                maxLength={6}
                                className="w-full text-center text-4xl font-bold tracking-widest py-4 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                                autoFocus
                            />
                        </div>

                        <button
                            onClick={verifyCode}
                            disabled={code.length !== 6}
                            className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4"
                        >
                            Verificar Código
                        </button>

                        <button
                            onClick={() => {
                                setStep('send');
                                setCode('');
                                setError('');
                            }}
                            className="w-full py-2 text-slate-600 hover:text-slate-800 font-medium"
                        >
                            Enviar novo código
                        </button>

                        <p className="text-xs text-slate-500 text-center mt-4">
                            O código expira em 10 minutos.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default OSEmailVerification;

