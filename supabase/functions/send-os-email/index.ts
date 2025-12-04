// Edge Function para enviar e-mails de OS via SMTP
// Deploy: supabase functions deploy send-os-email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Interface para o corpo da requisição
interface EmailRequest {
  to: string
  toName: string
  subject: string
  html: string
  orderId?: string
  signerId?: string
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { to, toName, subject, html, orderId, signerId }: EmailRequest = await req.json()

    // Validações
    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Buscar configurações de e-mail do banco
    const { data: configData, error: configError } = await supabase
      .from('email_config')
      .select('config_key, config_value')

    if (configError) throw configError

    // Montar objeto de configuração
    const config: Record<string, string> = {}
    configData?.forEach((item: any) => {
      config[item.config_key] = item.config_value
    })

    // Enviar via SMTP usando biblioteca
    const emailSent = await sendSMTPEmail({
      from: {
        email: config.os_email_from,
        name: config.os_email_name
      },
      to: {
        email: to,
        name: toName
      },
      subject,
      html,
      smtp: {
        host: config.smtp_host,
        port: parseInt(config.smtp_port),
        user: config.os_email_user,
        password: config.os_email_password
      }
    })

    if (!emailSent.success) {
      throw new Error(emailSent.error || 'Failed to send email')
    }

    // Registrar no log de auditoria (se orderId e signerId fornecidos)
    if (orderId && signerId) {
      await supabase.rpc('log_os_event', {
        p_os_id: orderId,
        p_signer_id: signerId,
        p_event_type: 'email_sent',
        p_event_description: `E-mail enviado para ${to}`,
        p_metadata: { email: to, subject }
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email sent to ${to}`,
        messageId: emailSent.messageId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send email', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Função auxiliar para enviar e-mail via SMTP
 * Usa a biblioteca SMTP do Deno
 */
async function sendSMTPEmail(params: {
  from: { email: string; name: string }
  to: { email: string; name: string }
  subject: string
  html: string
  smtp: {
    host: string
    port: number
    user: string
    password: string
  }
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Importar biblioteca SMTP
    const { SMTPClient } = await import('https://deno.land/x/denomailer@1.6.0/mod.ts')

    // Criar cliente SMTP
    const client = new SMTPClient({
      connection: {
        hostname: params.smtp.host,
        port: params.smtp.port,
        tls: true,
        auth: {
          username: params.smtp.user,
          password: params.smtp.password
        }
      }
    })

    // Enviar e-mail
    await client.send({
      from: `${params.from.name} <${params.from.email}>`,
      to: `${params.to.name} <${params.to.email}>`,
      subject: params.subject,
      html: params.html
    })

    await client.close()

    return { 
      success: true, 
      messageId: `${Date.now()}-${Math.random().toString(36).substring(7)}` 
    }

  } catch (error: any) {
    console.error('SMTP Error:', error)
    return { 
      success: false, 
      error: error.message 
    }
  }
}

