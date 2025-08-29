import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    })
  }

  try {
    const { to, subject, html, from = 'noreply@grupoggv.com' } = await req.json()

    console.log('📧 EDGE FUNCTION - Enviando e-mail:', { to, subject, from })

    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY não configurado')
      return new Response(
        JSON.stringify({ error: 'Serviço de e-mail não configurado' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Usar Resend API como fallback
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `GGV Inteligência <${from}>`,
        to: [to],
        subject,
        html,
        reply_to: 'contato@grupoggv.com'
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ RESEND API Error:', error)
      throw new Error(`Resend API error: ${response.status} - ${error}`)
    }

    const result = await response.json()
    console.log('✅ E-mail enviado via Resend:', result)

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )

  } catch (error) {
    console.error('❌ EDGE FUNCTION Error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor',
        details: 'Falha no envio de e-mail via Edge Function'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
