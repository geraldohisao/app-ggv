// Netlify Function: Critical error alerts to Slack
// Endpoint: /.netlify/functions/slack-alert

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
      tags = [],
      status = null,
      method = null,
      responsePreview = null
    } = context || {};

    // Use incident hash from client or generate one
    const incidentHash = body.incidentHash || (() => {
      const crypto = require('crypto');
      const incidentKey = JSON.stringify({ 
        title, 
        message, 
        url, 
        stack: String(stack).slice(0, 600), 
        componentStack: String(componentStack).slice(0, 600) 
      });
      return crypto.createHash('sha1').update(incidentKey).digest('hex').slice(0, 12);
    })();

    // Build rich Slack message with blocks
    const timestamp = new Date().toISOString();
    
    const blocks = [];

    // Header block
    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: `🚨 ALERTA CRÍTICO`,
        emoji: true
      }
    });

    // Main info section
    const mainFields = [];
    mainFields.push({
      type: "mrkdwn",
      text: `*Título:*\n${title}`
    });
    mainFields.push({
      type: "mrkdwn",
      text: `*Incidente:*\n${incidentHash}`
    });

    if (message && message !== title) {
      mainFields.push({
        type: "mrkdwn",
        text: `*Mensagem:*\n${message}`
      });
    }

    blocks.push({
      type: "section",
      fields: mainFields
    });

    // Context information
    const contextFields = [];
    
    if (user && (user.email || user.name)) {
      contextFields.push({
        type: "mrkdwn",
        text: `*Usuário:*\n${user.name || 'N/A'} (${user.email || 'sem email'})${user.role ? ` • ${user.role}` : ''}`
      });
    }
    
    if (url) {
      contextFields.push({
        type: "mrkdwn",
        text: `*Página:*\n${url}`
      });
    }

    if (method && status) {
      contextFields.push({
        type: "mrkdwn",
        text: `*Request:*\n${method} ${status}`
      });
    }

    if (appVersion) {
      contextFields.push({
        type: "mrkdwn",
        text: `*Versão:*\n${appVersion}`
      });
    }

    if (userAgent) {
      contextFields.push({
        type: "mrkdwn",
        text: `*Navegador:*\n${userAgent.slice(0, 100)}${userAgent.length > 100 ? '...' : ''}`
      });
    }

    if (tags && Array.isArray(tags) && tags.length) {
      contextFields.push({
        type: "mrkdwn",
        text: `*Tags:*\n${tags.join(', ')}`
      });
    }

    contextFields.push({
      type: "mrkdwn",
      text: `*Timestamp:*\n${timestamp}`
    });

    if (contextFields.length > 0) {
      // Split context fields into chunks of 10 (Slack limit)
      for (let i = 0; i < contextFields.length; i += 10) {
        blocks.push({
          type: "section",
          fields: contextFields.slice(i, i + 10)
        });
      }
    }

    // Environment info
    const envFields = [];
    try {
      envFields.push({
        type: "mrkdwn",
        text: `*Node:*\n${process.version}`
      });
      
      if (process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_REF) {
        const commit = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_REF || '').slice(0, 8);
        envFields.push({
          type: "mrkdwn",
          text: `*Commit:*\n${commit}`
        });
      }
      
      if (process.env.VERCEL_ENV || process.env.CONTEXT || process.env.NODE_ENV) {
        envFields.push({
          type: "mrkdwn",
          text: `*Ambiente:*\n${process.env.VERCEL_ENV || process.env.CONTEXT || process.env.NODE_ENV}`
        });
      }
    } catch {}

    if (envFields.length > 0) {
      blocks.push({
        type: "section",
        fields: envFields
      });
    }

    // Stack trace (as code block)
    if (stack) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Stack Trace:*\n\`\`\`\n${String(stack).slice(0, 2500)}\n\`\`\``
        }
      });
    }

    // Component stack (as code block)
    if (componentStack) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Component Stack:*\n\`\`\`\n${String(componentStack).slice(0, 1500)}\n\`\`\``
        }
      });
    }

    // Response preview (if available)
    if (responsePreview) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Response Preview:*\n\`\`\`\n${String(responsePreview).slice(0, 1000)}\n\`\`\``
        }
      });
    }

    // Action buttons
    const actionUrl = url || process.env.APP_DOMAIN || 'https://app.grupoggv.com';
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "🔗 Abrir Página",
            emoji: true
          },
          url: actionUrl,
          style: "primary"
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "🔍 Buscar Incidente",
            emoji: true
          },
          url: `https://www.google.com/search?q=${incidentHash}`,
          style: "danger"
        }
      ]
    });

    // Slack webhook URL
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: 'Missing SLACK_WEBHOOK_URL environment variable' }) 
      };
    }

    // Send to Slack
    const payload = {
      username: "Sistema de Alertas",
      icon_emoji: ":rotating_light:",
      blocks: blocks
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { 
        statusCode: 502, 
        headers, 
        body: JSON.stringify({ 
          error: 'Failed to send alert to Slack', 
          status: res.status, 
          details: errText 
        }) 
      };
    }

    // Optional: persist in Supabase if server env available
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
      if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
        const persistBody = {
          incident_hash: incidentHash,
          title,
          message,
          url,
          user_email: user?.email || null,
          user_role: user?.role || null,
          user_id: user?.id || null,
          user_agent: userAgent || null,
          app_version: appVersion || null,
          stack: stack || null,
          component_stack: componentStack || null,
          status_code: status || null,
          method: method || null,
          response_preview: responsePreview || null,
          context,
          notification_channel: 'slack'
        };
        await fetch(`${SUPABASE_URL}/rest/v1/error_events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          body: JSON.stringify(persistBody)
        }).catch(() => {});
      }
    } catch {}

    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ ok: true, channel: 'slack' }) 
    };
  } catch (error) {
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ 
        error: 'Internal error', 
        details: error.message 
      }) 
    };
  }
};