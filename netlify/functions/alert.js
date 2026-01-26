// Netlify Function: Critical error alerts to Google Chat
// Endpoint: /.netlify/functions/alert

const Sentry = require('@sentry/serverless');

Sentry.AWSLambda.init({
  dsn: process.env.SENTRY_DSN || process.env.SENTRY_SERVER_DSN || '',
  environment: process.env.CONTEXT || process.env.NODE_ENV || 'development',
  tracesSampleRate: 0.1,
});

exports.handler = Sentry.AWSLambda.wrapHandler(async (event, _context) => {
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

    const normalizePayload = (payload) => {
      // Sentry Issue Alert webhook shape
      if (payload?.data?.issue) {
        const issue = payload.data.issue || {};
        const eventData = payload.data.event || {};
        const user = eventData.user || {};
        const exception = eventData.exception?.values?.[0] || {};
        const requestUrl = eventData.request?.url || issue.permalink || issue.web_url || '';

        return {
          title: issue.title || issue.type || 'Sentry Issue',
          message: exception.value || issue.culprit || issue.shortId || 'Sentry issue triggered',
          incidentHash: issue.id || issue.shortId,
          context: {
            user: {
              id: user.id,
              email: user.email,
              name: user.username || user.name
            },
            url: requestUrl,
            stack: exception.stacktrace ? JSON.stringify(exception.stacktrace).slice(0, 2000) : '',
            userAgent: eventData.userAgent || '',
            appVersion: issue.release || eventData.release || '',
            tags: issue.tags || [],
            sentry: {
              issueId: issue.id,
              shortId: issue.shortId,
              permalink: issue.permalink || issue.web_url || '',
              level: issue.level || eventData.level,
              environment: issue.environment || payload?.environment,
              firstSeen: issue.firstSeen,
              lastSeen: issue.lastSeen
            }
          }
        };
      }

      // Batched debug events (from gateway)
      if (Array.isArray(payload?.events) && payload.events.length) {
        const primary = payload.events[0];
        return {
          title: primary.title || 'Evento de debug',
          message: `${primary.message || ''}${payload.events.length > 1 ? ` (batch: ${payload.events.length})` : ''}`,
          incidentHash: primary.incidentHash,
          context: {
            user: primary.context?.user,
            url: primary.url,
            stack: primary.context?.stack,
            componentStack: primary.context?.componentStack,
            userAgent: primary.userAgent || '',
            appVersion: primary.context?.appVersion || '',
            tags: [primary.level, primary.category].filter(Boolean),
            batchSize: payload.events.length
          }
        };
      }

      // Default (existing client payload)
      return {
        title: payload.title || 'Erro crítico no app',
        message: payload.message || '',
        incidentHash: payload.incidentHash,
        context: payload.context || {}
      };
    };

    const normalized = normalizePayload(body);
    const {
      title = 'Erro crítico no app',
      message = '',
      context = {},
      incidentHash: incomingIncidentHash
    } = normalized;

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
    const incidentHash = incomingIncidentHash || (() => {
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
    if (tags && Array.isArray(tags) && tags.length) lines.push(`• *Tags*: ${tags.map(tag => tag?.key && tag?.value ? `${tag.key}:${tag.value}` : String(tag)).join(', ')}`);
    if (context?.sentry?.permalink) lines.push(`• *Sentry*: ${context.sentry.permalink}`);
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

    const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
    if (!webhookUrl) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing GOOGLE_CHAT_WEBHOOK_URL environment variable' }) };
    }

    // Try to send Google Chat message with cards for quick actions
    let payload = { text };
    try {
      const actionUrl = url || process.env.APP_DOMAIN || 'https://app.grupoggv.com';
      payload = {
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

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Failed to send alert', status: res.status, details: errText }) };
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

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal error', details: error.message }) };
  }
});


