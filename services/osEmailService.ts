import { supabase } from './supabaseClient';
import { ServiceOrder, OSSigner } from '../types';

interface EmailConfig {
    os_email_from: string;
    os_email_name: string;
    smtp_provider: string;
    smtp_host?: string;
    smtp_port?: string;
    smtp_user?: string;
    smtp_password?: string;
    smtp2go_api_key?: string;
    resend_api_key?: string;
    os_base_url: string;
}

/**
 * Service para envio de e-mails de OS
 * Usa EmailJS para envio (similar ao diagnóstico)
 */
class OSEmailService {
    private config: EmailConfig | null = null;

    /**
     * Carrega configurações do banco
     */
    private async loadConfig(): Promise<EmailConfig> {
        if (this.config) return this.config;

        try {
            const { data, error } = await supabase
                .from('email_config')
                .select('config_key, config_value');

            if (error) throw error;

            const config: any = {};
            data?.forEach(item => {
                config[item.config_key] = item.config_value;
            });

            this.config = config as EmailConfig;
            return this.config;
        } catch (error) {
            console.error('Erro ao carregar config de e-mail:', error);
            throw new Error('Falha ao carregar configurações de e-mail');
        }
    }

    /**
     * Envia e-mail para um assinante específico usando SMTP2GO API
     */
    async sendSignatureRequest(order: ServiceOrder, signer: OSSigner): Promise<void> {
        try {
            const config = await this.loadConfig();

            // Gerar link único para assinatura (futura implementação)
            const signatureLink = `${config.os_base_url}/assinar/${order.id}/${signer.id}`;

            // Formatar data de expiração
            const expiresAt = order.expires_at 
                ? new Date(order.expires_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                })
                : 'Sem prazo definido';

            // Template do e-mail
            const emailHTML = this.createEmailTemplate({
                signerName: signer.name,
                orderTitle: order.title,
                orderDescription: order.description || '',
                createdByName: order.created_by_name || 'Sistema',
                expiresAt,
                totalSigners: order.total_signers || 0,
                signatureLink
            });

            // Enviar via provider configurado
            await this.sendEmail({
                to: signer.email,
                toName: signer.name,
                subject: `📋 Nova OS para sua Assinatura - ${order.title}`,
                html: emailHTML,
                config
            });

            // Registrar no log de auditoria
            if (order.id && signer.id) {
                await supabase.rpc('log_os_event', {
                    p_os_id: order.id,
                    p_signer_id: signer.id,
                    p_event_type: 'email_sent',
                    p_event_description: `E-mail enviado para ${signer.email}`,
                    p_metadata: { email: signer.email }
                });
            }

            console.log('✅ E-mail enviado com sucesso para:', signer.email);
        } catch (error) {
            console.error('❌ Erro ao enviar e-mail:', error);
            throw error;
        }
    }

    /**
     * Envia e-mail para todos os assinantes de uma OS
     */
    async sendToAllSigners(order: ServiceOrder): Promise<{ success: number; failed: number }> {
        if (!order.signers || order.signers.length === 0) {
            throw new Error('Nenhum assinante encontrado nesta OS');
        }

        let success = 0;
        let failed = 0;

        for (const signer of order.signers) {
            try {
                await this.sendSignatureRequest(order, signer);
                success++;
                
                // Delay de 500ms entre e-mails para evitar throttling
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`Falha ao enviar para ${signer.email}:`, error);
                failed++;
            }
        }

        return { success, failed };
    }

    /**
     * Envia lembrete para um assinante usando SMTP2GO API
     */
    async sendReminder(order: ServiceOrder, signer: OSSigner): Promise<void> {
        try {
            const config = await this.loadConfig();
            const signatureLink = `${config.os_base_url}/assinar/${order.id}/${signer.id}`;

            const emailHTML = this.createReminderTemplate({
                signerName: signer.name,
                orderTitle: order.title,
                signatureLink
            });

            await this.sendEmail({
                to: signer.email,
                toName: signer.name,
                subject: `⏰ Lembrete: Assinatura Pendente - ${order.title}`,
                html: emailHTML,
                config
            });

            // Atualizar contador de lembretes
            await supabase
                .from('os_signers')
                .update({
                    last_reminder_sent_at: new Date().toISOString()
                })
                .eq('id', signer.id);

            // Registrar no log
            await supabase.rpc('log_os_event', {
                p_os_id: order.id,
                p_signer_id: signer.id,
                p_event_type: 'reminder_sent',
                p_event_description: `Lembrete enviado para ${signer.email}`
            });

            console.log('✅ Lembrete enviado para:', signer.email);
        } catch (error) {
            console.error('❌ Erro ao enviar lembrete:', error);
            throw error;
        }
    }

    /**
     * Envia e-mail via Netlify Function (sem CORS!)
     */
    private async sendEmail(params: {
        to: string;
        toName: string;
        subject: string;
        html: string;
        config: EmailConfig;
    }): Promise<void> {
        try {
            console.log('📧 Enviando e-mail via Netlify Function...');

            // Determinar URL da função baseado no ambiente
            const functionUrl = window.location.hostname === 'localhost'
                ? 'http://localhost:8888/.netlify/functions/send-os-email' // Dev local
                : '/.netlify/functions/send-os-email'; // Produção

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: params.to,
                    toName: params.toName,
                    subject: params.subject,
                    html: params.html
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.details || result.error || `HTTP ${response.status}`);
            }

            console.log('✅ E-mail enviado com sucesso via Netlify!', result);
        } catch (error: any) {
            console.error('❌ Erro ao enviar e-mail:', error);
            throw new Error(`Falha ao enviar e-mail: ${error.message}`);
        }
    }

    /**
     * Envia e-mail via Resend API (Recomendado!)
     */
    private async sendViaResend(params: {
        to: string;
        toName: string;
        subject: string;
        html: string;
        config: EmailConfig;
    }): Promise<void> {
        try {
            if (!params.config.resend_api_key) {
                throw new Error('API Key do Resend não configurada. Configure resend_api_key no banco.');
            }

            const payload = {
                from: `${params.config.os_email_name} <${params.config.os_email_from}>`,
                to: [`${params.toName} <${params.to}>`],
                subject: params.subject,
                html: params.html,
                reply_to: params.config.os_email_from
            };

            console.log('📧 Enviando e-mail via Resend...');

            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${params.config.resend_api_key}`
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Resend API error: ${response.status}`);
            }

            console.log('✅ E-mail enviado com sucesso via Resend!', result);
        } catch (error: any) {
            console.error('❌ Erro Resend:', error);
            throw new Error(`Falha ao enviar e-mail via Resend: ${error.message}`);
        }
    }

    /**
     * Envia e-mail via API do SMTP2GO
     */
    private async sendViaSMTP2GO(params: {
        to: string;
        toName: string;
        subject: string;
        html: string;
        config: EmailConfig;
    }): Promise<void> {
        try {
            // Verificar se tem API Key
            if (!params.config.smtp2go_api_key) {
                throw new Error('API Key do SMTP2GO não configurada. Configure smtp2go_api_key no banco.');
            }

            // Payload da API do SMTP2GO
            const payload = {
                api_key: params.config.smtp2go_api_key,
                to: [`${params.toName} <${params.to}>`],
                sender: `${params.config.os_email_name} <${params.config.os_email_from}>`,
                subject: params.subject,
                html_body: params.html,
                custom_headers: [
                    {
                        header: 'Reply-To',
                        value: params.config.os_email_from
                    }
                ]
            };

            console.log('📧 Enviando e-mail via SMTP2GO...');

            // Enviar via API REST do SMTP2GO
            const response = await fetch('https://api.smtp2go.com/v3/email/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Smtp2go-Api-Key': params.config.smtp2go_api_key
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            // Log da resposta para debug
            console.log('📧 SMTP2GO Response:', result);

            if (!response.ok) {
                const errorMsg = result.data?.error || result.data?.error_code || `HTTP ${response.status}`;
                throw new Error(`SMTP2GO API error: ${errorMsg}`);
            }

            if (result.data?.error || result.data?.failed > 0) {
                const errorMsg = result.data?.error || 'Falha ao enviar e-mail';
                throw new Error(errorMsg);
            }

            console.log('✅ E-mail enviado com sucesso via SMTP2GO!');
        } catch (error: any) {
            console.error('❌ Erro SMTP2GO:', error);
            throw new Error(`Falha ao enviar e-mail via SMTP2GO: ${error.message}`);
        }
    }

    /**
     * Template HTML do e-mail de solicitação de assinatura
     */
    private createEmailTemplate(params: {
        signerName: string;
        orderTitle: string;
        orderDescription: string;
        createdByName: string;
        expiresAt: string;
        totalSigners: number;
        signatureLink: string;
    }): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nova OS para Assinatura</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                                🏢 GGV - Ordem de Serviço
                            </h1>
                            <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">
                                Nova solicitação de assinatura
                            </p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; color: #1f2937;">
                                Olá <strong>${params.signerName}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 30px 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                                Você recebeu uma nova Ordem de Serviço para assinatura digital:
                            </p>

                            <!-- OS Info Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-left: 4px solid #3b82f6; border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280;">
                                            <strong style="color: #1f2937;">📄 Documento:</strong><br>
                                            <span style="font-size: 18px; color: #1f2937;">${params.orderTitle}</span>
                                        </p>
                                        ${params.orderDescription ? `
                                        <p style="margin: 0 0 12px 0; font-size: 14px; color: #4b5563; line-height: 1.5;">
                                            ${params.orderDescription}
                                        </p>
                                        ` : ''}
                                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
                                            <strong style="color: #1f2937;">👤 Enviado por:</strong> ${params.createdByName}
                                        </p>
                                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
                                            <strong style="color: #1f2937;">📅 Válido até:</strong> ${params.expiresAt}
                                        </p>
                                        <p style="margin: 0; font-size: 14px; color: #6b7280;">
                                            <strong style="color: #1f2937;">👥 Total de assinantes:</strong> ${params.totalSigners}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                                <tr>
                                    <td align="center">
                                        <a href="${params.signatureLink}" 
                                           style="display: inline-block; padding: 16px 40px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                                            📝 Visualizar e Assinar Documento
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Instructions -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                                <tr>
                                    <td>
                                        <p style="margin: 0 0 15px 0; font-size: 16px; color: #1f2937; font-weight: 600;">
                                            ✅ O que você precisa fazer:
                                        </p>
                                        <ol style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
                                            <li>Clique no botão acima</li>
                                            <li>Revise o documento PDF com atenção</li>
                                            <li>Assine digitalmente quando estiver pronto</li>
                                        </ol>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
                                <strong>GGV - Sistema de Gestão de Documentos</strong>
                            </p>
                            <p style="margin: 0 0 15px 0; font-size: 12px; color: #9ca3af;">
                                Este documento requer assinatura digital para ser válido.
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                Dúvidas? Entre em contato conosco respondendo este e-mail.
                            </p>
                        </td>
                    </tr>
                </table>

                <!-- Disclaimer -->
                <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                    <tr>
                        <td align="center" style="padding: 20px;">
                            <p style="margin: 0; font-size: 11px; color: #9ca3af; line-height: 1.5;">
                                Este é um e-mail automático enviado por assinatura@grupoggv.com<br>
                                © ${new Date().getFullYear()} GGV. Todos os direitos reservados.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `.trim();
    }

    /**
     * Template HTML do e-mail de lembrete
     */
    private createReminderTemplate(params: {
        signerName: string;
        orderTitle: string;
        signatureLink: string;
    }): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lembrete de Assinatura</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                                ⏰ Lembrete de Assinatura
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; color: #1f2937;">
                                Olá <strong>${params.signerName}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 30px 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                                Este é um lembrete amigável de que ainda há uma Ordem de Serviço aguardando sua assinatura:
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0; font-size: 18px; color: #1f2937; font-weight: 600;">
                                            📄 ${params.orderTitle}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                                <tr>
                                    <td align="center">
                                        <a href="${params.signatureLink}" 
                                           style="display: inline-block; padding: 16px 40px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);">
                                            📝 Assinar Agora
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">
                                Seu tempo é valioso. A assinatura leva apenas alguns minutos!
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                GGV - Sistema de Gestão de Documentos
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `.trim();
    }
}

// Exportar instância única (singleton)
export const osEmailService = new OSEmailService();

