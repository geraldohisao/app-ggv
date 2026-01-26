// Netlify Function: Generate a secure impersonation magic link
// Endpoint: /.netlify/functions/impersonate-link

const Sentry = require('@sentry/serverless');

Sentry.AWSLambda.init({
  dsn: process.env.SENTRY_DSN || process.env.SENTRY_SERVER_DSN || '',
  environment: process.env.CONTEXT || process.env.NODE_ENV || 'development',
  tracesSampleRate: 0.1,
});

exports.handler = Sentry.AWSLambda.wrapHandler(async (event, _context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    const APP_DOMAIN = process.env.APP_DOMAIN || process.env.VITE_APP_DOMAIN || 'https://app.grupoggv.com';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Missing Supabase configuration' })
      };
    }

    const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!bearerToken) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing Authorization header' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const { target_email, target_user_id, reason = '' } = body || {};

    if (!target_email && !target_user_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'target_email or target_user_id is required' })
      };
    }

    // Validate caller via Supabase auth API
    const callerRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${bearerToken}`
      }
    });

    if (!callerRes.ok) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid session' }) };
    }

    const caller = await callerRes.json();
    const callerId = caller?.id;
    const callerEmail = caller?.email || '';

    // Check caller role in profiles (must be SuperAdmin)
    const roleRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${callerId}&select=role,email`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!roleRes.ok) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Failed to validate permissions' }) };
    }

    const roleData = await roleRes.json();
    const callerRole = roleData?.[0]?.role || '';
    if (callerRole !== 'SuperAdmin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only SuperAdmin can impersonate' }) };
    }

    // Resolve target user
    let targetUserId = target_user_id || null;
    let targetEmail = target_email || null;

    if (!targetUserId && targetEmail) {
      const targetRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(targetEmail)}&select=id,email`, {
        method: 'GET',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });

      if (!targetRes.ok) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Target user not found' }) };
      }

      const targetData = await targetRes.json();
      if (!targetData?.length) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Target user not found' }) };
      }
      targetUserId = targetData[0].id;
      targetEmail = targetData[0].email;
    }

    if (!targetEmail && targetUserId) {
      const emailRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${targetUserId}&select=id,email`, {
        method: 'GET',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      if (!emailRes.ok) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Target user not found' }) };
      }
      const emailData = await emailRes.json();
      if (!emailData?.length) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Target user not found' }) };
      }
      targetEmail = emailData[0].email;
      targetUserId = emailData[0].id;
    }

    // Generate magic link using Supabase Admin API
    const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'magiclink',
        email: targetEmail,
        options: {
          redirectTo: APP_DOMAIN
        }
      })
    });

    if (!linkRes.ok) {
      const errText = await linkRes.text().catch(() => '');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to generate magic link', details: errText }) };
    }

    const linkPayload = await linkRes.json();
    const actionLink = linkPayload?.action_link || linkPayload?.actionLink;
    if (!actionLink) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Magic link missing in response' }) };
    }

    // Audit log (best-effort) - write to both impersonation_audit and audit_events
    try {
      const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || event.headers['client-ip'] || null;
      const userAgent = event.headers['user-agent'] || null;
      const requestId = event.headers['x-request-id'] || event.headers['x-nf-request-id'] || `impersonate-${Date.now()}`;
      
      // Legacy impersonation_audit table
      await fetch(`${SUPABASE_URL}/rest/v1/impersonation_audit`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          admin_user_id: callerId,
          admin_email: callerEmail,
          target_user_id: targetUserId,
          target_email: targetEmail,
          reason,
          ip_address: ip,
          user_agent: userAgent,
          request_id: requestId
        })
      }).catch(() => {});
      
      // New unified audit_events table
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/insert_audit_event_full`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_event_type: 'impersonation.start',
          p_severity: 'warning',
          p_source: 'netlify',
          p_actor_user_id: callerId,
          p_actor_email: callerEmail,
          p_actor_role: callerRole,
          p_actor_impersonated_by: null,
          p_subject_type: 'user',
          p_subject_id: targetUserId,
          p_request_id: requestId,
          p_ip_address: ip,
          p_user_agent: userAgent,
          p_url: null,
          p_metadata: { target_email: targetEmail, reason }
        })
      }).catch(() => {});
    } catch {}

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        action_link: actionLink,
        target_email: targetEmail,
        target_user_id: targetUserId
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal error', details: error.message })
    };
  }
});
