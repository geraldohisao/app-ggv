// Netlify Function para enviar e-mails de OS via Resend
// Deploy automático quando fizer push para produção

const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { to, toName, subject, html } = JSON.parse(event.body);

    console.log('📧 NETLIFY OS - Enviando e-mail de OS:', { to, subject });

    if (!to || !subject || !html) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: to, subject, html' })
      };
    }

    // Usar Resend API
    const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_Rx1e7UEW_9rF9qbh9QxLE7azY8sNAE7XS';
    const FROM_EMAIL = process.env.OS_EMAIL_FROM || 'assinatura@grupoggv.com';
    const FROM_NAME = process.env.OS_EMAIL_NAME || 'GGV Assinaturas';

    // Payload para Resend
    const payload = {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: toName ? [`${toName} <${to}>`] : [to],
      subject: subject,
      html: html,
      reply_to: FROM_EMAIL
    };

    console.log('📧 Enviando via Resend API...');

    // Chamar Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || `Resend error: ${response.status}`);
    }

    console.log('✅ E-mail enviado via Resend:', result.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        messageId: result.id,
        message: 'E-mail de OS enviado com sucesso'
      })
    };

  } catch (error) {
    console.error('❌ NETLIFY OS Function Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Erro ao enviar e-mail de OS',
        details: error.message
      })
    };
  }
};

