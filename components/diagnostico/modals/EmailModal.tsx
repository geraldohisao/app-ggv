import React, { useState } from 'react';
import { XMarkIcon, CheckCircleIcon } from '../../ui/icons';
import { FormInput } from '../../ui/Form';
import { sendEmailViaGmail, forceGmailReauth, checkGmailSetup } from '../../../services/gmailService';
import { createPublicReport } from '../../../services/supabaseService';
import { LOGO_URLS } from '../../../config/logos';
import { CompanyData } from '../../../types';

interface EmailModalProps {
    onClose: () => void;
    companyData: CompanyData;
    reportData?: any;
    dealId?: string;
}

export const EmailModal: React.FC<EmailModalProps> = ({ onClose, companyData, reportData, dealId }) => {
    const [email, setEmail] = useState(companyData.email);
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [gmailStatus, setGmailStatus] = useState<'checking' | 'configured' | 'not-configured'>('checking');

    // Verificar status do Gmail ao carregar
    React.useEffect(() => {
        checkGmailStatus();
    }, []);

    const checkGmailStatus = async () => {
        try {
            const status = await checkGmailSetup();
            setGmailStatus(status.configured ? 'configured' : 'not-configured');
        } catch {
            setGmailStatus('not-configured');
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email || !/\S+@\S+\.\S+/.test(email)) {
            setError("Por favor, insira um e-mail válido.");
            return;
        }
        try {
            setLoading(true);
            
            // Forçar uso do novo domínio em produção
            const isProduction = window.location.hostname === 'app.grupoggv.com';
            const baseUrl = isProduction ? 'https://app.grupoggv.com' : window.location.origin;
            
            let publicUrl = baseUrl;
            if (reportData) {
                // Gerar token seguro para o email
                const generateSecureToken = (dealId: string) => {
                    const timestamp = Date.now();
                    const randomSalt = Math.random().toString(36).substring(2, 15);
                    const dataToHash = `${dealId}-${timestamp}-${randomSalt}`;
                    
                    let hash = 0;
                    for (let i = 0; i < dataToHash.length; i++) {
                        const char = dataToHash.charCodeAt(i);
                        hash = ((hash << 5) - hash) + char;
                        hash = hash & hash;
                    }
                    
                    const shortDealId = dealId ? dealId.substring(0, 3) : 'dia';
                    return `${timestamp}-${Math.abs(hash).toString(36)}-${shortDealId}`;
                };
                
                const secureToken = dealId ? generateSecureToken(dealId) : undefined;
                const { token } = await createPublicReport(reportData, email, undefined, dealId, secureToken);
                publicUrl = `${baseUrl}/r/${token}`;
            }
            
            console.log('📧 EMAIL - URL do relatório:', publicUrl);
            
            const subject = `Seu Diagnóstico Comercial – ${companyData.companyName}`;
            const html = `
              <!DOCTYPE html>
              <html lang="pt-BR">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Diagnóstico Comercial - GGV Inteligência</title>
              </head>
              <body style="margin:0;padding:0;background-color:#f8fafc;font-family:Arial,sans-serif">
                <div style="max-width:640px;margin:0 auto;background-color:#ffffff">
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #1e40af 0%, #0f766e 100%);padding:32px 24px;text-align:center">
                    <div style="margin-bottom:16px">
                      <img src="https://ggvinteligencia.com.br/wp-content/uploads/2023/12/image-1.svg" 
                           alt="GGV Inteligência" 
                           style="max-width:200px;height:auto;display:block;margin:0 auto;border:0"/>
                    </div>
                    <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0;letter-spacing:-0.5px">Inteligência em Vendas</h1>
                  </div>
                  
                  <!-- Content -->
                  <div style="padding:32px 24px">
                    <h2 style="color:#1e293b;font-size:20px;font-weight:600;margin:0 0 16px 0">Olá,</h2>
                    
                    <p style="color:#475569;line-height:1.6;margin:0 0 24px 0">
                      Preparamos o seu diagnóstico comercial com base nas respostas e benchmarks do mercado. 
                      Acesse pelo botão abaixo:
                    </p>
                    
                    <!-- CTA Button -->
                    <div style="text-align:center;margin:32px 0">
                      <a href="${publicUrl}" 
                         style="display:inline-block;background: linear-gradient(135deg, #0f766e 0%, #0891b2 100%);color:#ffffff;padding:16px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:0.5px;box-shadow:0 4px 12px rgba(15, 118, 110, 0.3)">
                        📊 Abrir relatório
                      </a>
                    </div>
                    
                    <div style="background:#f1f5f9;border-left:4px solid #0f766e;padding:16px;margin:24px 0;border-radius:0 8px 8px 0">
                      <p style="color:#475569;margin:0;font-size:14px">
                        💡 <strong>Dica:</strong> Salve este e-mail para acessar seu diagnóstico sempre que precisar.
                      </p>
                    </div>
                    
                    <p style="color:#475569;line-height:1.6;margin:24px 0 0 0">
                      Se precisar de qualquer ajuda, basta responder este e-mail.
                    </p>
                  </div>
                  
                  <!-- Footer -->
                  <div style="background:#f8fafc;padding:24px;text-align:center;border-top:1px solid #e2e8f0">
                    <p style="color:#64748b;font-size:12px;margin:0">
                      Enviado por <strong>GGV Inteligência em Vendas</strong><br>
                      <a href="https://ggvinteligencia.com.br" style="color:#0f766e;text-decoration:none">ggvinteligencia.com.br</a>
                    </p>
                  </div>
                </div>
              </body>
              </html>`;
            
            console.log('📧 EMAIL - Enviando e-mail para:', email);
            await sendEmailViaGmail({ to: email, subject, html });
            setIsSent(true);
            setTimeout(() => onClose(), 2000);
        } catch (err: any) {
            console.error('❌ EMAIL - Erro ao enviar:', err);
            
            // Tratar erros específicos do Gmail
            if (err?.message?.includes('insufficient authentication scopes') || err?.message?.includes('insufficient permissions')) {
                setError('Gmail API: Permissões insuficientes. Clique em "Reautenticar" para resolver.');
            } else {
                setError(err?.message || 'Falha ao enviar e-mail pelo Gmail.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleReauth = async () => {
        try {
            setLoading(true);
            setError('');
            await forceGmailReauth();
            await checkGmailStatus();
            setError('Reautenticação concluída. Tente enviar o e-mail novamente.');
        } catch (err: any) {
            setError('Erro na reautenticação: ' + (err?.message || 'Erro desconhecido'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md relative animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center pb-4 mb-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">Enviar Relatório por E-mail</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                {!isSent ? (
                    <form onSubmit={handleSend}>
                        <p className="text-slate-600 mb-4">O relatório completo será enviado para o endereço de e-mail abaixo.</p>
                        
                        {/* Status do Gmail */}
                        {gmailStatus === 'checking' && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-blue-700 text-sm">Verificando configuração do Gmail...</p>
                            </div>
                        )}
                        
                        {gmailStatus === 'not-configured' && (
                            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-yellow-700 text-sm">⚠️ Gmail não configurado. Entre em contato com o suporte.</p>
                            </div>
                        )}
                        
                        {gmailStatus === 'configured' && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-green-700 text-sm">✅ Gmail configurado e pronto para uso.</p>
                            </div>
                        )}
                        
                        <FormInput
                            id="send-email"
                            name="email"
                            type="email"
                            label="Endereço de E-mail"
                            value={email}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                            error={error}
                            required
                        />
                        
                        <div className="flex justify-end gap-4 mt-6">
                            <button type="button" onClick={onClose} className="bg-slate-200 text-slate-800 font-bold py-2 px-5 rounded-lg hover:bg-slate-300 transition-colors">Cancelar</button>
                            
                            {/* Botão de reautenticação se houver erro de permissão */}
                            {error.includes('insufficient authentication scopes') || error.includes('insufficient permissions') ? (
                                <button 
                                    type="button" 
                                    onClick={handleReauth} 
                                    disabled={loading}
                                    className="bg-orange-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-60"
                                >
                                    {loading ? 'Reautenticando...' : 'Reautenticar'}
                                </button>
                            ) : (
                                <button 
                                    type="submit" 
                                    disabled={loading || gmailStatus === 'not-configured'} 
                                    className="bg-blue-900 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-60"
                                >
                                    {loading ? 'Enviando...' : 'Enviar'}
                                </button>
                            )}
                        </div>
                    </form>
                ) : (
                    <div className="text-center py-8">
                        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-800">Relatório Enviado!</h3>
                        <p className="text-slate-500 mt-2">Verifique sua caixa de entrada em alguns instantes.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
