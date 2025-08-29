const nodemailer = require('nodemailer');

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
    const { to, subject, html } = JSON.parse(event.body);

    console.log('📧 NETLIFY FUNCTION - Enviando e-mail:', { to, subject });

    if (!to || !subject || !html) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: to, subject, html' })
      };
    }

    // Configurar transportador de e-mail usando variáveis de ambiente
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || 'noreply@grupoggv.com',
        pass: process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD
      }
    });

    // Configurar e-mail
    const mailOptions = {
      from: `"GGV Inteligência" <${process.env.GMAIL_USER || 'noreply@grupoggv.com'}>`,
      to: to,
      subject: subject,
      html: html,
      replyTo: 'contato@grupoggv.com'
    };

    // Enviar e-mail
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ E-mail enviado via Netlify Functions:', info.messageId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        messageId: info.messageId,
        message: 'E-mail enviado com sucesso'
      })
    };

  } catch (error) {
    console.error('❌ NETLIFY FUNCTION Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message,
        message: 'Falha no envio de e-mail'
      })
    };
  }
};
