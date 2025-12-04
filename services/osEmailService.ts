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
                subject: `Solicitação de Assinatura - ${order.title}`,
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
                subject: `Lembrete: Assinatura Pendente - ${order.title}`,
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
     * Template HTML do e-mail - Design minimalista tipo ClickSign
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
        // Gerar lista de assinantes (se tiver acesso)
        const signersListHTML = ''; // Será preenchido futuramente quando tivermos todos os signers
        
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Solicitação de Assinatura</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; max-width: 600px;">
                    
                    <!-- Logo -->
                    <tr>
                        <td align="center" style="padding: 40px 0 30px 0;">
                            <img src="https://ggvinteligencia.com.br/wp-content/uploads/2025/08/Logo-Grupo-GGV-Preto-Vertical-1.png" 
                                 alt="Grupo GGV" 
                                 width="180" 
                                 height="auto"
                                 style="display: block; border: 0; outline: none; max-width: 180px; height: auto;">
                        </td>
                    </tr>

                    <!-- Título Principal -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 700; line-height: 1.3; text-align: center;">
                                Solicitação de Assinatura de <span style="background-color: #fef3c7; padding: 2px 8px; border-radius: 4px;">Grupo GGV</span>
                            </h1>
                        </td>
                    </tr>

                    <!-- Subtítulo -->
                    <tr>
                        <td style="padding: 0 30px 40px 30px;">
                            <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
                                Facilite sua assinatura, revise o documento e assine digitalmente.
                            </p>
                        </td>
                    </tr>

                    <!-- CTA Button -->
                    <tr>
                        <td align="center" style="padding: 0 30px 40px 30px;">
                            <a href="${params.signatureLink}" 
                               style="display: inline-block; padding: 18px 60px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.3px;">
                                Visualizar para assinar
                            </a>
                        </td>
                    </tr>

                    <!-- Aviso de múltiplos documentos (se aplicável) -->
                    ${params.totalSigners > 1 ? `
                    <tr>
                        <td style="padding: 0 30px 40px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px;">
                                <tr>
                                    <td style="padding: 16px 20px;">
                                        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                                            <span style="font-size: 18px; margin-right: 8px;">⚠️</span>
                                            <strong>Você tem outros documentos pendentes.</strong> 
                                            Após assinar este, não esqueça de verificar os demais.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    ` : ''}

                    <!-- Divisor -->
                    <tr>
                        <td style="padding: 0 30px;">
                            <div style="height: 1px; background-color: #e5e7eb;"></div>
                        </td>
                    </tr>

                    <!-- Seção: Documento -->
                    <tr>
                        <td style="padding: 40px 30px 30px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 22px; font-weight: 700;">
                                Documento
                            </h2>
                            <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                ${params.orderTitle}
                            </p>
                            ${params.orderDescription ? `
                            <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                                ${params.orderDescription}
                            </p>
                            ` : ''}
                        </td>
                    </tr>

                    <!-- Divisor -->
                    <tr>
                        <td style="padding: 0 30px;">
                            <div style="height: 1px; background-color: #e5e7eb;"></div>
                        </td>
                    </tr>

                    <!-- Seção: Assinaturas Esperadas -->
                    <tr>
                        <td style="padding: 30px 30px 30px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 22px; font-weight: 700;">
                                Assinaturas esperadas neste processo
                            </h2>
                            <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.8;">
                                <strong style="text-decoration: underline;">${params.signerName}</strong>
                            </p>
                            <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
                                Total de ${params.totalSigners} assinante(s)
                            </p>
                        </td>
                    </tr>

                    <!-- Data Limite -->
                    <tr>
                        <td style="padding: 0 30px 40px 30px;">
                            <p style="margin: 0; color: #374151; font-size: 16px;">
                                Data limite para assinatura: <strong>${params.expiresAt}</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Divisor -->
                    <tr>
                        <td style="padding: 0 30px;">
                            <div style="height: 1px; background-color: #e5e7eb;"></div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px; text-align: center;">
                            <p style="margin: 0 0 10px 0; font-size: 13px; color: #6b7280;">
                                Enviado por <strong>${params.createdByName}</strong>
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                © ${new Date().getFullYear()} Grupo GGV. Todos os direitos reservados.
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
     * Template HTML do e-mail de lembrete - Design minimalista
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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; max-width: 600px;">
                    
                    <!-- Logo -->
                    <tr>
                        <td align="center" style="padding: 40px 0 30px 0;">
                            <img src="https://ggvinteligencia.com.br/wp-content/uploads/2025/08/Logo-Grupo-GGV-Preto-Vertical-1.png" 
                                 alt="Grupo GGV" 
                                 width="180" 
                                 height="auto"
                                 style="display: block; border: 0; outline: none; max-width: 180px; height: auto;">
                        </td>
                    </tr>

                    <!-- Título -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 700; line-height: 1.3; text-align: center;">
                                Lembrete: Assinatura Pendente
                            </h1>
                        </td>
                    </tr>

                    <!-- Mensagem -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
                                Olá <strong>${params.signerName}</strong>,
                            </p>
                            <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
                                Você ainda tem um documento aguardando sua assinatura:
                            </p>
                        </td>
                    </tr>

                    <!-- Documento -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px;">
                                <tr>
                                    <td style="padding: 20px; text-align: center;">
                                        <p style="margin: 0; font-size: 18px; color: #1a1a1a; font-weight: 600;">
                                            ${params.orderTitle}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- CTA Button -->
                    <tr>
                        <td align="center" style="padding: 0 30px 40px 30px;">
                            <a href="${params.signatureLink}" 
                               style="display: inline-block; padding: 18px 60px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.3px;">
                                Visualizar para assinar
                            </a>
                        </td>
                    </tr>

                    <!-- Mensagem final -->
                    <tr>
                        <td style="padding: 0 30px 40px 30px;">
                            <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center; line-height: 1.6;">
                                Por favor, assine o documento o quanto antes para darmos continuidade ao processo.
                            </p>
                        </td>
                    </tr>

                    <!-- Divisor -->
                    <tr>
                        <td style="padding: 0 30px;">
                            <div style="height: 1px; background-color: #e5e7eb;"></div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                © ${new Date().getFullYear()} Grupo GGV. Todos os direitos reservados.
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

