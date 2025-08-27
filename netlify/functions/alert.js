// Netlify Function: Critical error alerts to Google Chat and Slack
// Endpoint: /.netlify/functions/alert

// Helper function to format Slack message
function formatSlackMessage(title, message, context, incidentHash) {
  const { user = {}, url = '', stack = '', componentStack = '', userAgent = '', appVersion = '', tags = [] } = context || {};
  const timestamp = new Date().toISOString();
  
  // Build Slack blocks for rich formatting
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🚨 ALERTA CRÍTICO",
        emoji: true
      }
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Título:*\n${title}`
        },
        {
          type: "mrkdwn",
          text: `*Incidente:*\n${incidentHash}`
        }
      ]
    }
  ];

  if (message) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Mensagem:*\n${message}`
      }
    });
  }

  // Add metadata section
  const metaFields = [];
  if (user && (user.email || user.name)) {
    metaFields.push({
      type: "mrkdwn",
      text: `*Usuário:*\n${user.name || 'N/A'} (${user.email || 'sem email'})${user.role ? ` • ${user.role}` : ''}`
    });
  }
  if (url) metaFields.push({ type: "mrkdwn", text: `*Página:*\n${url}` });
  if (appVersion) metaFields.push({ type: "mrkdwn", text: `*Versão:*\n${appVersion}` });
  if (userAgent) metaFields.push({ type: "mrkdwn", text: `*Navegador:*\n${userAgent.slice(0, 100)}...` });
  if (tags && Array.isArray(tags) && tags.length) metaFields.push({ type: "mrkdwn", text: `*Tags:*\n${tags.join(', ')}` });
  metaFields.push({ type: "mrkdwn", text: `*Enviado:*\n${timestamp}` });

  if (metaFields.length) {
    blocks.push({
      type: "section",
      fields: metaFields
    });
  }

  // Add stack trace if available
  if (stack) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Stack:*\n\`\`\`${String(stack).slice(0, 2000)}\`\`\``
      }
    });
  }

  if (componentStack) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Componente:*\n\`\`\`${String(componentStack).slice(0, 2000)}\`\`\``
      }
    });
  }

  // Add environment info
  const envInfo = [];
  try {
    envInfo.push(`Node: ${process.version}`);
    if (process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_REF) {
      envInfo.push(`Commit: ${process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_REF}`);
    }
    if (process.env.VERCEL_ENV || process.env.CONTEXT || process.env.NODE_ENV) {
      envInfo.push(`Env: ${process.env.VERCEL_ENV || process.env.CONTEXT || process.env.NODE_ENV}`);
    }
  } catch {}
  
  if (envInfo.length) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Ambiente:*\n${envInfo.join('\n')}`
      }
    });
  }

  // Add action buttons
  const actionUrl = url || process.env.APP_DOMAIN || 'https://app.grupoggv.com';
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Abrir Página",
          emoji: true
        },
        url: actionUrl,
        action_id: "open_page"
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Pesquisar Incidente",
          emoji: true
        },
        url: `https://www.google.com/search?q=${incidentHash}`,
        action_id: "search_incident"
      }
    ]
  });

  return { blocks };
}

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

    // Use incident hash from client or generate one
    const incidentHash = body.incidentHash || (() => {
      const crypto = require('crypto');
      const incidentKey = JSON.stringify({ title, message, url, stack: String(stack).slice(0, 600), componentStack: String(componentStack).slice(0, 600) });
      return crypto.createHash('sha1').update(incidentKey).digest('hex').slice(0, 12);
    })();

    const lines = [];
    lines.push(`🚨 *ALERTA CRÍTICO*`);
    lines.push(`*Título*: ${title}`);
    lines.push(`*Incidente*: ${incidentHash}`);
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

    // Include basic build/environment context
    const envInfo = [];
    try {
      envInfo.push(`• *Node*: ${process.version}`);
      if (process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_REF) {
        envInfo.push(`• *Commit*: ${process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_REF}`);
      }
      if (process.env.VERCEL_ENV || process.env.CONTEXT || process.env.NODE_ENV) {
        envInfo.push(`• *Env*: ${process.env.VERCEL_ENV || process.env.CONTEXT || process.env.NODE_ENV}`);
      }
    } catch {}
    if (envInfo.length) {
      lines.push('');
      lines.push('— *Ambiente*');
      lines.push(envInfo.join('\n'));
    }

    const text = lines.join('\n');

    const googleChatWebhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

    // Check if at least one webhook is configured
    if (!googleChatWebhookUrl && !slackWebhookUrl) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing GOOGLE_CHAT_WEBHOOK_URL or SLACK_WEBHOOK_URL environment variable' }) };
    }

    const notificationResults = [];
    const notificationPromises = [];

    // Send to Google Chat if configured
    if (googleChatWebhookUrl) {
      let googleChatPayload = { text };
      try {
        const actionUrl = url || process.env.APP_DOMAIN || 'https://app.grupoggv.com';
        googleChatPayload = {
          text,
          cardsV2: [
            {
              card: {
                header: { title: 'Ações Rápidas' },
                sections: [
                  {
                    widgets: [
                      { buttonList: { buttons: [
                        { text: 'Abrir Página', onClick: { openLink: { url: actionUrl } } },
                        { text: 'Copiar Incidente', onClick: { openLink: { url: `https://www.google.com/search?q=${incidentHash}` } } }
                      ] } }
                    ]
                  }
                ]
              }
            }
          ],
          cards: [
            {
              header: 'Ações Rápidas',
              sections: [
                {
                  widgets: [
                    { buttons: [
                      { textButton: { text: 'Abrir Página', onClick: { openLink: { url: actionUrl } } } },
                      { textButton: { text: 'Copiar Incidente', onClick: { openLink: { url: `https://www.google.com/search?q=${incidentHash}` } } } }
                    ] }
                  ]
                }
              ]
            }
          ]
        };
      } catch {}

      const googleChatPromise = fetch(googleChatWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(googleChatPayload)
      }).then(async (res) => {
        if (res.ok) {
          return { platform: 'Google Chat', status: 'success' };
        } else {
          const errText = await res.text().catch(() => '');
          return { platform: 'Google Chat', status: 'error', error: errText, statusCode: res.status };
        }
      }).catch((error) => {
        return { platform: 'Google Chat', status: 'error', error: error.message };
      });

      notificationPromises.push(googleChatPromise);
    }

    // Send to Slack if configured
    if (slackWebhookUrl) {
      const slackPayload = formatSlackMessage(title, message, context, incidentHash);

      const slackPromise = fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackPayload)
      }).then(async (res) => {
        if (res.ok) {
          return { platform: 'Slack', status: 'success' };
        } else {
          const errText = await res.text().catch(() => '');
          return { platform: 'Slack', status: 'error', error: errText, statusCode: res.status };
        }
      }).catch((error) => {
        return { platform: 'Slack', status: 'error', error: error.message };
      });

      notificationPromises.push(slackPromise);
    }

    // Wait for all notifications to complete
    const results = await Promise.all(notificationPromises);
    notificationResults.push(...results);

    // Check if any notification was successful
    const hasSuccess = results.some(result => result.status === 'success');
    const hasErrors = results.some(result => result.status === 'error');

    if (!hasSuccess) {
      // All notifications failed
      return { 
        statusCode: 502, 
        headers, 
        body: JSON.stringify({ 
          error: 'Failed to send alerts to all platforms', 
          results: notificationResults 
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
          status_code: context?.status || null,
          context
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
      body: JSON.stringify({ 
        ok: true, 
        notifications: notificationResults,
        successCount: results.filter(r => r.status === 'success').length,
        errorCount: results.filter(r => r.status === 'error').length
      }) 
    };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal error', details: error.message }) };
  }
};


