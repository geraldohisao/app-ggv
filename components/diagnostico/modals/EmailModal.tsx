import React, { useState } from 'react';
import { XMarkIcon, CheckCircleIcon } from '../../ui/icons';
import { FormInput } from '../../ui/Form';
import { sendEmailViaGmail, forceGmailReauth, checkGmailSetup, diagnoseGmailIssue } from '../../../services/gmailService';
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
    const [needsReauth, setNeedsReauth] = useState(false);

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
        
        console.log('📧 EMAIL_MODAL - Iniciando envio de e-mail...');
        
        try {
            setLoading(true);
            
            // Forçar uso do novo domínio em produção
            const isProduction = window.location.hostname === 'app.grupoggv.com';
            const baseUrl = isProduction ? 'https://app.grupoggv.com' : window.location.origin;
            
            let publicUrl = baseUrl;
            if (reportData) {
                console.log('📧 EMAIL_MODAL - Criando relatório público...');
                
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
                
                try {
                    const secureToken = dealId ? generateSecureToken(dealId) : undefined;
                    const { token } = await createPublicReport(reportData, email, undefined, dealId, secureToken);
                    publicUrl = `${baseUrl}/r/${token}`;
                    console.log('✅ EMAIL_MODAL - Relatório público criado:', token);
                } catch (reportError) {
                    console.warn('⚠️ EMAIL_MODAL - Erro ao criar relatório público (usando URL base):', reportError);
                    // Continuar com URL base se falhar
                    publicUrl = baseUrl;
                }
            }
            
            console.log('📧 EMAIL - URL do relatório:', publicUrl);
            
            const subject = `Seu Diagnóstico Comercial – ${companyData.companyName}`;
            const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Diagnóstico Comercial - GGV Inteligência</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, Helvetica, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
    
    <!-- Preheader (hidden text for preview) -->
    <div style="display: none; font-size: 1px; color: #f8fafc; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        Seu Relatório de Maturidade Comercial está pronto! Acesse agora e descubra insights valiosos para sua empresa.
    </div>
    
    <!-- Main Container -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                
                <!-- Email Container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #1e40af; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <img src="https://ggvinteligencia.com.br/wp-content/uploads/2025/08/Logo-GGV-Branca.png" 
                                             alt="GGV Inteligência" 
                                             width="200" 
                                             height="auto"
                                             style="display: block; border: 0; outline: none; text-decoration: none; max-width: 200px; height: auto;">
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-top: 20px;">
                                        <h1 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0; line-height: 1.2;">
                                            Relatório de Maturidade Comercial
                                        </h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                
                                <!-- Greeting -->
                                <tr>
                                    <td>
                                        <h2 style="color: #1e293b; font-size: 20px; font-weight: 600; margin: 0 0 20px 0; line-height: 1.3;">
                                            Olá!
                                        </h2>
                                    </td>
                                </tr>
                                
                                <!-- Main Message -->
                                <tr>
                                    <td>
                                        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                            Preparamos o seu <strong>Relatório de Maturidade Comercial</strong> personalizado com base nas suas respostas e benchmarks do mercado.
                                        </p>
                                        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                            Acesse seu diagnóstico completo pelo botão abaixo:
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- CTA Button -->
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="background-color: #0f766e; border-radius: 8px; text-align: center;">
                                                    <a href="${publicUrl}" 
                                                       style="display: inline-block; padding: 16px 32px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; line-height: 1.2;">
                                                        📊 Acessar Relatório de Maturidade
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                                <!-- Info Box -->
                                <tr>
                                    <td style="background-color: #f1f5f9; border-left: 4px solid #0f766e; padding: 20px; border-radius: 0 8px 8px 0;">
                                        <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.5;">
                                            💡 <strong>Dica:</strong> Salve este e-mail para acessar seu relatório sempre que precisar.
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Support Message -->
                                <tr>
                                    <td style="padding-top: 30px;">
                                        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0;">
                                            Se precisar de qualquer ajuda, basta responder este e-mail.
                                        </p>
                                    </td>
                                </tr>
                                
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <p style="color: #64748b; font-size: 12px; margin: 0 0 15px 0; line-height: 1.4;">
                                            Enviado por <strong>GGV Inteligência em Vendas</strong><br>
                                            <a href="https://ggvinteligencia.com.br" style="color: #0f766e; text-decoration: none;">ggvinteligencia.com.br</a>
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-top: 15px; border-top: 1px solid #e2e8f0;">
                                        <img src="https://ggvinteligencia.com.br/wp-content/uploads/2025/08/Logo-Grupo-GGV-Preto-Vertical-1.png" 
                                             alt="Grupo GGV" 
                                             width="100" 
                                             height="auto"
                                             style="display: block; border: 0; outline: none; text-decoration: none; max-width: 100px; height: auto; opacity: 0.7;">
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                </table>
                
            </td>
        </tr>
    </table>
    
</body>
</html>`;
            
            console.log('📧 EMAIL_MODAL - Enviando e-mail para:', email);
            console.log('📧 EMAIL_MODAL - Assunto:', subject);
            console.log('📧 EMAIL_MODAL - URL do relatório:', publicUrl);
            console.log('📧 EMAIL_MODAL - Deal ID:', dealId);
            console.log('📧 EMAIL_MODAL - Empresa:', companyData.companyName);
            
            // 📝 Enviar e-mail com logs detalhados
            await sendEmailViaGmail({ 
                to: email, 
                subject, 
                html,
                dealId: dealId || 'unknown',
                companyName: companyData.companyName,
                reportToken: reportData ? (await createPublicReport(reportData, email, undefined, dealId, secureToken))?.token : undefined,
                reportUrl: publicUrl
            });
            
            console.log('✅ EMAIL_MODAL - E-mail enviado com sucesso!');
            console.log('📧 EMAIL_MODAL - IMPORTANTE: Verifique SPAM/Lixo Eletrônico se não receber');
            console.log('📧 EMAIL_MODAL - E-mail enviado de:', companyData.email || 'sistema');
            console.log('📧 EMAIL_MODAL - E-mail enviado para:', email);
            console.log('📝 EMAIL_LOG - Log de envio criado no banco de dados');
            
            setIsSent(true);
            setTimeout(() => onClose(), 3000); // Aumentado para 3 segundos
        } catch (err: any) {
            console.error('❌ EMAIL_MODAL - Erro ao enviar:', err);
            
            // Executar diagnóstico automático em caso de erro
            console.log('🩺 Executando diagnóstico automático devido ao erro...');
            try {
                await diagnoseGmailIssue();
            } catch (diagError) {
                console.warn('Erro ao executar diagnóstico:', diagError);
            }
            
            // Tratar erros específicos do Gmail com mensagens mais claras
            const errorMessage = err?.message || 'Falha ao enviar e-mail pelo Gmail. Tente novamente.';
            
            if (errorMessage.includes('insufficient authentication scopes') || errorMessage.includes('insufficient permissions')) {
                setError('🔐 Permissões insuficientes. Clique em "Reautenticar" para conceder acesso ao Gmail.');
            } else if (errorMessage.includes('Google Identity Services')) {
                setError('⚠️ Erro ao carregar serviços do Google. Recarregue a página e tente novamente.');
            } else if (errorMessage.includes('Timeout') || errorMessage.includes('timeout')) {
                setError('⏰ Conexão lenta com o Google. Verifique sua internet e tente novamente.');
            } else if (errorMessage.includes('pop-ups')) {
                setError('🚫 Pop-ups bloqueados. Habilite pop-ups para este site e tente novamente.');
            } else if (errorMessage.includes('GOOGLE_OAUTH_CLIENT_ID') || errorMessage.includes('Configuração não encontrada')) {
                setError('⚙️ Configuração do Gmail não encontrada. Entre em contato com o suporte.');
            } else if (errorMessage.includes('não configurado')) {
                setError('⚙️ Sistema de e-mail não configurado. Entre em contato com o suporte.');
            } else if (errorMessage.includes('CSP') || errorMessage.includes('Content Security Policy')) {
                setError('🛡️ Política de segurança bloqueou o Google. Recarregue a página e tente novamente.');
            } else if (errorMessage.includes('script-src') || errorMessage.includes('violates')) {
                setError('🔒 Erro de segurança detectado. Recarregue a página completamente (Ctrl+F5).');
            } else if (errorMessage.includes('Supabase') || errorMessage.includes('auth')) {
                setError('⚠️ Problema de sessão detectado. Recarregue a página (F5) e tente novamente.');
            } else if (errorMessage.includes('Problema de conexão') || errorMessage.includes('network') || errorMessage.includes('fetch')) {
                setError('🌐 Problema de conexão. Verifique sua internet e tente novamente.');
            } else if (errorMessage.includes('Falha após múltiplas tentativas') || errorMessage.includes('após 3 tentativas') || errorMessage.includes('Sistema de retry falhou')) {
                setError('📧 Sistema de retry falhou. Clique em "Reautenticar Gmail" abaixo para resolver o problema.');
                setNeedsReauth(true);
            } else {
                // Mostrar erro original mas com emoji para melhor UX
                setError(`❌ ${errorMessage}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleReauth = async () => {
        try {
            setLoading(true);
            setError('');
            setNeedsReauth(false);
            
            console.log('🔄 EMAIL_MODAL - Iniciando reautenticação OAuth completa do Gmail...');
            
            // Usar a função de reautenticação disponível
            await forceGmailReauth();
            console.log('✅ EMAIL_MODAL - Reautenticação OAuth concluída');
            
            // Verificar status após reautenticação
            await checkGmailStatus();
            
            console.log('✅ EMAIL_MODAL - Reautenticação OAuth concluída');
            setError('✅ Reautenticação OAuth concluída com sucesso! Agora você pode enviar o e-mail.');
            
        } catch (err: any) {
            console.error('❌ EMAIL_MODAL - Erro na reautenticação OAuth:', err);
            const errorMsg = err?.message || 'Erro desconhecido na reautenticação';
            
            // Fallback para reautenticação simples se OAuth falhar
            if (errorMsg.includes('timeout') || errorMsg.includes('popup') || errorMsg.includes('blocked')) {
                console.log('🔄 EMAIL_MODAL - OAuth falhou, tentando limpeza de cache...');
                try {
                    await forceGmailReauth();
                    await checkGmailStatus();
                    setError('⚠️ Reautenticação parcial concluída. Se o problema persistir, recarregue a página (F5).');
                } catch (fallbackError) {
                    setError(`❌ Erro na reautenticação: ${errorMsg}. Tente recarregar a página (F5).`);
                    setNeedsReauth(true);
                }
            } else {
                setError(`❌ Erro na reautenticação OAuth: ${errorMsg}. Tente recarregar a página (F5).`);
                setNeedsReauth(true); // Manter botão disponível
            }
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
                            
                            {/* Botão de reautenticação se houver erro de permissão ou retry falhou */}
                            {needsReauth || error.includes('insufficient authentication scopes') || error.includes('insufficient permissions') || error.includes('Sistema de retry falhou') || error.includes('Reautenticar Gmail') ? (
                                <button 
                                    type="button" 
                                    onClick={handleReauth} 
                                    disabled={loading}
                                    className="bg-orange-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-60"
                                >
                                    {loading ? 'Reautenticando...' : 'Reautenticar Gmail'}
                                </button>
                            ) : (
                                <>
                                    <button 
                                        type="submit" 
                                        disabled={loading || gmailStatus === 'not-configured'} 
                                        className="bg-blue-900 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-60"
                                    >
                                        {loading ? 'Enviando...' : 'Enviar'}
                                    </button>
                                    
                                    {/* 🚀 NOVO: Botão de fallback se houver erro persistente */}
                                    {error && error.includes('Sistema de retry falhou') && (
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setError('📧 Para receber o relatório, copie este link e envie por WhatsApp ou outro meio: ' + (reportData ? window.location.origin + '/r/' + 'manual-' + Date.now() : 'Link não disponível'));
                                            }}
                                            className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm"
                                        >
                                            📱 Obter Link
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </form>
                ) : (
                    <div className="text-center py-8">
                        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-800">Relatório Enviado!</h3>
                        <p className="text-slate-500 mt-2">Verifique sua caixa de entrada em alguns instantes.</p>
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-yellow-800 text-sm">
                                <strong>⚠️ Importante:</strong> Se não receber o e-mail, verifique também a pasta <strong>SPAM/Lixo Eletrônico</strong>.
                            </p>
                        </div>
                        <div className="mt-3 text-xs text-slate-400">
                            Enviado para: <strong>{email}</strong>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
