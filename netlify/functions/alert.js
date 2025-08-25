// Netlify Function: Critical error alerts to Google Chat
// Endpoint: /.netlify/functions/alert

exports.handler = async (event, _context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      title = 'Erro crítico no app',
      message = '',
      context = {},
    } = body;

    const {
      user = {},
      url = '',
      stack = '',
      componentStack = '',
      userAgent = '',
      appVersion = '',
      tags = []
    } = context || {};

    const lines = [];
    lines.push(`🚨 *ALERTA CRÍTICO*`);
    lines.push(`*Título*: ${title}`);
    if (message) {
      lines.push('*Mensagem*:');
      lines.push(message);
    }
    lines.push('');
    lines.push('— *Meta*');
    if (user && (user.email || user.name)) {
      lines.push(`• *Usuário*: ${user.name || 'N/A'} (${user.email || 'sem email'})${user.role ? ` • ${user.role}` : ''}`);
    }
    if (url) lines.push(`• *Página*: ${url}`);
    if (appVersion) lines.push(`• *Versão*: ${appVersion}`);
    if (userAgent) lines.push(`• *Navegador*: ${userAgent}`);
    if (tags && Array.isArray(tags) && tags.length) lines.push(`• *Tags*: ${tags.join(', ')}`);
    const timestamp = new Date().toISOString();
    lines.push(`• *Enviado*: ${timestamp}`);
    lines.push('');
    if (stack) {
      lines.push('*Stack*:');
      lines.push('```');
      lines.push(String(stack).slice(0, 2000));
      lines.push('```');
    }
    if (componentStack) {
      lines.push('*Componente*:');
      lines.push('```');
      lines.push(String(componentStack).slice(0, 2000));
      lines.push('```');
    }

    const text = lines.join('\n');

    const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
    if (!webhookUrl) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing GOOGLE_CHAT_WEBHOOK_URL environment variable' }) };
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Failed to send alert', status: res.status, details: errText }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal error', details: error.message }) };
  }
};


