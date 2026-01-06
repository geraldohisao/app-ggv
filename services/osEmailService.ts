import { supabase } from './supabaseClient';
import { ServiceOrder, OSSigner } from '../types';
import { format } from 'date-fns';

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
            const logoUrl = await this.getLogoUrl();

            // Link direto para este documento
            const signatureLink = `${config.os_base_url}/assinar/${order.id}/${signer.id}`;

            // Formatar data de expiração
            const expiresAt = order.expires_at 
                ? new Date(order.expires_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                })
                : 'Sem prazo definido';

            // Template do e-mail com logo Base64 inline
            const emailHTML = this.createEmailTemplate({
                signerName: signer.name,
                orderTitle: order.title,
                orderDescription: order.description || '',
                createdByName: order.created_by_name || 'Sistema',
                expiresAt,
                totalSigners: order.total_signers || 0,
                signatureLink,
                logoHTML: `
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="background:#ffffff; border-radius:8px; padding:8px;">
                        <tr>
                            <td align="center">
                                <img src="${logoUrl}" alt="GRUPO GGV" width="180" height="auto" style="display:block; margin:0 auto; border:0; outline:none; text-decoration:none; max-width:180px; background:#ffffff;">
                            </td>
                        </tr>
                    </table>`
            });

            // Enviar via Resend (confiável, não depende de autenticação)
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
            const logoUrl = await this.getLogoUrl();
            const signatureLink = `${config.os_base_url}/assinar/${order.id}/${signer.id}`;

            const emailHTML = this.createReminderTemplate({
                signerName: signer.name,
                orderTitle: order.title,
                signatureLink,
                logoHTML: `
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="background:#ffffff; border-radius:8px; padding:8px;">
                        <tr>
                            <td align="center">
                                <img src="${logoUrl}" alt="GRUPO GGV" width="180" height="auto" style="display:block; margin:0 auto; border:0; outline:none; text-decoration:none; max-width:180px; background:#ffffff;">
                            </td>
                        </tr>
                    </table>`
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
     * Envia e-mail de cancelamento de documento
     */
    async sendCancelled(order: ServiceOrder, signers: OSSigner[], reason: string = 'Documento cancelado'): Promise<void> {
        const config = await this.loadConfig();
        const logoBase64 = await this.getLogoBase64();

        const emailHTML = `
        <div style="font-family: Arial, sans-serif; color: #1f2937; max-width: 640px; margin: 0 auto; padding: 24px 20px; background: #ffffff;">
          <div style="text-align:center; margin-bottom: 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="background:#ffffff; border-radius:8px; padding:8px;">
              <tr>
                <td align="center">
                  <img src="${logoUrl}" alt="GRUPO GGV" width="180" height="auto" style="display:block; margin:0 auto; border:0; outline:none; text-decoration:none; max-width:180px; background:#ffffff;">
                </td>
              </tr>
            </table>
          </div>
          <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; text-align:center; color:#111827;">
            Documento cancelado
          </h2>
          <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; text-align:center; color:#4b5563;">
            ${reason}.
          </p>
          <div style="background:#f3f4f6; border-radius: 10px; padding:16px 20px; margin-bottom:16px;">
            <p style="margin:0; font-size:15px; color:#111827;"><strong>Documento:</strong> ${order.file_name}</p>
            <p style="margin:6px 0 0 0; font-size:14px; color:#4b5563;">${order.title || ''}</p>
          </div>
          <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align:center; margin-top: 16px;">
            Caso tenha dúvidas, contate o remetente.
          </p>
        </div>`;

        for (const signer of signers) {
            await this.sendEmail({
                to: signer.email,
                toName: signer.name,
                subject: `Documento cancelado - ${order.title}`,
                html: emailHTML,
                config
            });

            // Log
            if (order.id && signer.id) {
                await supabase.rpc('log_os_event', {
                    p_os_id: order.id,
                    p_signer_id: signer.id,
                    p_event_type: 'email_sent_cancelled',
                    p_event_description: `Cancelamento enviado para ${signer.email}`,
                    p_metadata: { email: signer.email }
                });
            }
        }
    }

    /**
     * Envia e-mail de documento finalizado com o PDF em anexo
     */
    async sendFinalized(order: ServiceOrder, signers: OSSigner[]): Promise<void> {
        const config = await this.loadConfig();
        const logoBase64 = await this.getLogoBase64();

        // Escolher PDF final (com termo, se existir)
        console.log('📄 Dados da OS para download:', {
            final_file_path: (order as any).final_file_path,
            final_file_name: (order as any).final_file_name,
            file_path: order.file_path,
            file_name: order.file_name
        });

        const candidatePaths = [
            (order as any).final_file_path,
            `${order.file_path}.final.pdf`,
            order.file_path
        ].filter(Boolean);

        console.log('🔍 Gerando link de download para:', candidatePaths);

        let chosenPath = '';
        let chosenName = (order as any).final_file_name || order.file_name;

        // Verificar qual arquivo existe
        for (const path of candidatePaths) {
            try {
                console.log(`📥 Verificando: ${path}`);
                const { data, error } = await supabase.storage
                    .from('service-orders')
                    .list('', { 
                        search: (path as string).split('/').pop() 
                    });
                
                if (error) {
                    console.warn(`❌ Falha ao verificar ${path}:`, error);
                    continue;
                }
                
                chosenPath = path as string;
                if ((order as any).final_file_name) {
                    chosenName = (order as any).final_file_name;
                } else if (path === `${order.file_path}.final.pdf`) {
                    chosenName = order.file_name.replace(/\.pdf$/i, '') + '-assinado.pdf';
                }
                console.log(`✅ PDF encontrado: ${chosenPath} (${chosenName})`);
                break;
            } catch (e) {
                console.warn(`⚠️ Erro ao verificar ${path}:`, e);
            }
        }

        if (!chosenPath) {
            // Se não encontrou, usar o path final_file_path ou file_path
            chosenPath = (order as any).final_file_path || order.file_path;
        }

        // Gerar URL pública do PDF final
        const { data: publicUrlData } = await supabase.storage
            .from('service-orders')
            .createSignedUrl(chosenPath, 60 * 60 * 24 * 30); // 30 dias

        const downloadUrl = publicUrlData?.signedUrl || '';

        const signed = signers.filter(s => s.status === 'SIGNED');
        const listHTML = signed
            .map(s => `<li><strong>${s.name || s.email}</strong> assinou</li>`)
            .join('');

        const emailHTML = `
        <div style="font-family: Arial, sans-serif; color: #1f2937; max-width: 640px; margin: 0 auto;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding:16px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="background:#ffffff; border-radius:8px; padding:8px;">
                  <tr>
                    <td align="center">
                      <img src="${logoUrl}" alt="GRUPO GGV" width="180" height="auto" style="display:block; margin:0 auto; border:0; outline:none; text-decoration:none; max-width:180px; background:#ffffff;">
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <div style="background:#e7f7ec; padding:16px; border-radius:8px; color:#166534; font-weight:600; text-align:center; margin-bottom:24px;">
            ✅ Documento assinado e finalizado com sucesso!
          </div>
          <h2 style="margin-top:24px; font-size:22px; color:#111827;">Documento Finalizado</h2>
          <p style="font-size:15px; margin:8px 0 16px 0;"><strong>Documento:</strong> ${order.file_name}</p>
          <p style="font-size:15px; margin:0 0 8px 0;"><strong>Título:</strong> ${order.title}</p>
          <p style="font-size:15px; margin:0 0 16px 0;"><strong>Finalizado em:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          
          <div style="background:#f3f4f6; padding:20px; border-radius:8px; margin:20px 0;">
            <h3 style="font-size:18px; margin:0 0 12px 0; color:#111827;">📄 Baixar Documento Assinado</h3>
            <p style="margin:0 0 16px 0; font-size:14px; color:#4b5563;">Clique no botão abaixo para fazer o download do documento com todas as assinaturas:</p>
            <a href="${downloadUrl}" 
               style="display:inline-block; background:#1a1a1a; color:#ffffff; padding:14px 32px; text-decoration:none; border-radius:8px; font-weight:600; font-size:16px;">
              📥 Baixar Documento Assinado
            </a>
            <p style="margin:16px 0 0 0; font-size:12px; color:#6b7280;">Link válido por 30 dias</p>
          </div>

          <hr style="margin:24px 0; border:0; border-top:1px solid #e5e7eb;" />
          <h3 style="font-size:18px; margin-bottom:8px; color:#111827;">Assinaturas Realizadas</h3>
          <ul style="padding-left:18px; line-height:1.8; color:#374151;">${listHTML}</ul>
        </div>`;

        for (const signer of signed) {
            await this.sendEmail({
                to: signer.email,
                toName: signer.name,
                subject: `Documento finalizado - ${order.title}`,
                html: emailHTML,
                config
            });

            // Log
            await supabase.rpc('log_os_event', {
                p_os_id: order.id,
                p_signer_id: signer.id,
                p_event_type: 'email_sent_finalized',
                p_event_description: `Documento finalizado enviado para ${signer.email}`,
                p_metadata: { email: signer.email }
            });
        }
    }

    /**
     * Obtém URL do logo Grupo GGV Preto Vertical
     * NOTA: Esta URL tem limitações (WEBP com headers incorretos)
     * Para melhor resultado, hospedar no Supabase Storage
     */
    private async getLogoUrl(): Promise<string> {
        try {
            // Preferir chave dedicada para e-mail (sem impactar o restante do sistema)
            const { data: emailLogo, error: emailError } = await supabase
                .from('brand_logos')
                .select('url')
                .eq('key', 'grupo_ggv_email')
                .single();

            if (!emailError && emailLogo?.url) {
                const logoEmailUrl = emailLogo.url;
                console.log('✅ Logo URL (grupo_ggv_email):', logoEmailUrl);
                return logoEmailUrl;
            }

            // Fallback: chave original do sistema
            const { data, error } = await supabase
                .from('brand_logos')
                .select('url')
                .eq('key', 'grupo_ggv')
                .single();

            const baseUrl = (error || !data?.url)
                ? 'https://mwlekwyxbfbxfxskywgx.supabase.co/storage/v1/object/public/Logo%20Grupo%20GGV/LOGO_GrupoGGV-horizontal.png'
                : data.url;

            const logoUrl = `${baseUrl}?format=png`;
            console.log('✅ Logo URL (grupo_ggv fallback):', logoUrl);
            return logoUrl;
        } catch (e) {
            console.error('❌ Erro ao buscar logo:', e);
            return 'https://ggvinteligencia.com.br/wp-content/uploads/2026/01/LOGO_GrupoGGV-horizontal-scaled.png?format=png';
        }
    }

    /**
     * Converte ArrayBuffer para Base64
     */
    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Envia e-mail via Netlify Function (sem CORS!)
     */
    /**
     * Envia e-mail via Resend (confiável, não depende de autenticação)
     */
    private async sendEmail(params: {
        to: string;
        toName: string;
        subject: string;
        html: string;
        config: EmailConfig;
        attachments?: any[];
    }): Promise<void> {
        try {
            console.log('📧 OS EMAIL - Iniciando envio via Resend...');
            console.log('📧 OS EMAIL - Destinatário:', params.to);
            console.log('📧 OS EMAIL - Assunto:', params.subject);
            console.log('📧 OS EMAIL - Tamanho HTML:', params.html.length);
            
            // Verificar se o logo está no HTML
            const logoMatch = params.html.match(/<img[^>]+src="([^"]+)"[^>]*alt="GRUPO GGV"/);
            if (logoMatch) {
                console.log(`✅ OS EMAIL - Logo URL encontrado no HTML:`, logoMatch[1]);
            } else {
                console.warn('⚠️ OS EMAIL - Logo NÃO encontrado no HTML!');
            }

            // Determinar URL da Netlify Function
            const functionUrl = window.location.hostname === 'localhost'
                ? 'http://localhost:8888/.netlify/functions/send-os-email'
                : '/.netlify/functions/send-os-email';

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: params.to,
                    toName: params.toName,
                    subject: params.subject,
                    html: params.html,
                    attachments: params.attachments || []
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.details || result.error || `HTTP ${response.status}`);
            }

            console.log('✅ OS EMAIL - Enviado com sucesso via Resend!', result);
        } catch (error: any) {
            console.error('❌ OS EMAIL - Erro ao enviar:', error);
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
        logoHTML: string;
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
                            ${params.logoHTML}
                        </td>
                    </tr>

                    <!-- Título Principal -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 700; line-height: 1.3; text-align: center;">
                                Solicitação de Assinatura de Grupo GGV
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
        logoHTML: string;
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
                            ${params.logoHTML}
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

