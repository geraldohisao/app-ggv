// Netlify Function: Feedback forwarder to Google Chat webhook
// Endpoint: /.netlify/functions/feedback

const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

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
      type = 'Sugestão',
      title = '',
      description = '',
      includeMeta = true,
      context = {},
      images = [],
      imagesBase64 = [] // array de data URLs ou base64 (image/png;base64,...)
    } = body;

    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Descrição é obrigatória (mín. 5 caracteres).' })
      };
    }

    const {
      user = {},
      url = '',
      userAgent = '',
      appVersion = '',
    } = context || {};

    // Pretty-print User Agent → "Chrome 139 · macOS 13.6" (fallback: raw UA)
    const prettifyUserAgent = (ua) => {
      if (!ua || typeof ua !== 'string') return '';
      let browser = '', version = '';
      if (/Edg\/(\d+[\.\d+]*)/.test(ua)) { browser = 'Edge'; version = RegExp.$1; }
      else if (/Chrome\/(\d+[\.\d+]*)/.test(ua)) { browser = 'Chrome'; version = RegExp.$1; }
      else if (/Firefox\/(\d+[\.\d+]*)/.test(ua)) { browser = 'Firefox'; version = RegExp.$1; }
      else if (/Version\/(\d+[\.\d+]*)\s+Safari\//.test(ua)) { browser = 'Safari'; version = RegExp.$1; }

      let os = '';
      const paren = ua.match(/\(([^)]+)\)/)?.[1] || '';
      if (/Mac OS X ([\d_]+)/.test(paren)) {
        os = `macOS ${RegExp.$1.replace(/_/g, '.')}`;
      } else if (/Windows NT ([\d.]+)/.test(paren)) {
        const v = RegExp.$1;
        os = `Windows ${v === '10.0' ? '10' : v}`;
      } else if (/Android ([\d.]+)/.test(paren)) {
        os = `Android ${RegExp.$1}`;
      } else if (/CPU (?:iPhone )?OS ([\d_]+)/.test(paren)) {
        os = `iOS ${RegExp.$1.replace(/_/g, '.')}`;
      }

      if (browser) {
        return `${browser} \`${version}\`${os ? ` · ${os}` : ''}`;
      }
      return ua;
    };

    // Compose human-friendly message (Google Chat markdown)
    const typeEmoji = (type || '').toLowerCase() === 'bug' ? '🐞' : '✨';
    const lines = [];
    lines.push(`${typeEmoji} *Novo feedback* (${type})`);
    lines.push(`*Título*: ${title || '(sem título)'}`);
    lines.push('');
    lines.push('*Descrição*:');
    lines.push(description.trim());

    if (includeMeta) {
      lines.push('');
      lines.push('— *Meta*');
      if (user && (user.email || user.name)) {
        lines.push(`• *Usuário*: ${user.name || 'N/A'} (${user.email || 'sem email'})${user.role ? ` • ${user.role}` : ''}`);
      }
      if (url) lines.push(`• *Página*: ${url}`);
      const niceUA = prettifyUserAgent(userAgent);
      if (niceUA) lines.push(`• *Navegador*: ${niceUA}`);
      if (appVersion) lines.push(`• *Versão*: ${appVersion}`);
      const timestamp = new Date().toISOString();
      lines.push(`• *Enviado*: ${timestamp}`);
    }

    const text = lines.join('\n');

    const webhookUrl =
      process.env.GOOGLE_CHAT_WEBHOOK_URL ||
      // Fallback: provided by the user (consider moving to env var in production)
      'https://chat.googleapis.com/v1/spaces/AAQAMN9CQQU/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=kZkEuSHZ8k_AfpIgeFQ7kFHxJgsjG4cDQMczyBmGojw';

    // Prepare image URLs
    const imageUrls = [];

    // 1) Use direct URLs provided
    if (Array.isArray(images)) {
      for (const u of images) {
        if (typeof u === 'string' && /^https?:\/\//i.test(u)) imageUrls.push(u);
      }
    }

    // 2) If base64 images provided, upload to Supabase storage using service role
    if (Array.isArray(imagesBase64) && imagesBase64.length && SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY)) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY, { auth: { persistSession: false } });
        // ensure bucket exists and public (only possible with service role; ignore errors otherwise)
        if (SUPABASE_SERVICE_ROLE_KEY) {
          try { await supabase.storage.createBucket('feedback', { public: true }); } catch {}
        }
        for (const b64 of imagesBase64.slice(0, 6)) {
          if (typeof b64 !== 'string') continue;
          let mime = 'image/png';
          let data = b64;
          const m = b64.match(/^data:(.+?);base64,(.*)$/);
          if (m) { mime = m[1]; data = m[2]; }
          const buffer = Buffer.from(data, 'base64');
          const ext = mime.split('/')[1] || 'png';
          const path = `u/${(context?.user?.email || 'anon').replace(/[^a-zA-Z0-9._-]/g,'_')}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: upErr } = await supabase.storage.from('feedback').upload(path, buffer, { contentType: mime, upsert: true });
          if (!upErr) {
            const { data } = supabase.storage.from('feedback').getPublicUrl(path);
            if (data?.publicUrl) imageUrls.push(data.publicUrl);
          }
        }
      } catch (e) {
        // ignore upload errors; still send text-only message
        console.warn('feedback upload error:', e?.message);
      }
    }

    // Build message payload; include image cards if present
    let payload = { text };
    try {
      if (imageUrls.length > 0) {
        const cards = imageUrls
          .slice(0, 6)
          .map((u) => ({ card: { sections: [{ widgets: [{ image: { imageUrl: u } }] }] } }));
        if (cards.length > 0) {
          payload = { text, cardsV2: cards, cards: cards.map(c => c.card) };
        }
      }
    } catch {}

    // Post to Google Chat webhook
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
        body: JSON.stringify({ error: 'Falha ao enviar ao Google Chat', status: res.status, details: errText })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro interno', details: error.message })
    };
  }
};


