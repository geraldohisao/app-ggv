// Netlify Function: Audit Event Ingestion
// Endpoint: /.netlify/functions/audit-event
// Purpose: Receive and persist audit events from frontend with validation, rate limiting, and sanitization

const Sentry = require('@sentry/serverless');

Sentry.AWSLambda.init({
  dsn: process.env.SENTRY_DSN || process.env.SENTRY_SERVER_DSN || '',
  environment: process.env.CONTEXT || process.env.NODE_ENV || 'development',
  tracesSampleRate: 0.1,
});

// ============================================================
// RATE LIMITING (in-memory, per-function-instance)
// ============================================================

const rateLimitCache = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // Max 30 events per minute per user

function isRateLimited(userId) {
  const now = Date.now();
  const key = `audit:${userId}`;
  
  if (!rateLimitCache.has(key)) {
    rateLimitCache.set(key, { count: 1, windowStart: now });
    return false;
  }
  
  const entry = rateLimitCache.get(key);
  
  // Reset window if expired
  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitCache.set(key, { count: 1, windowStart: now });
    return false;
  }
  
  // Increment and check
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  return false;
}

// Clean old entries periodically (basic cleanup)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitCache.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitCache.delete(key);
    }
  }
}, 60000);

// ============================================================
// ALLOWED EVENT TYPES (must match SQL function)
// ============================================================

const ALLOWED_EVENT_TYPES = new Set([
  // Authentication events
  'auth.login',
  'auth.logout',
  'auth.session_expired',
  
  // Impersonation events
  'impersonation.start',
  'impersonation.stop',
  
  // OKR events
  'okr.created',
  'okr.updated',
  'okr.deleted',
  'kr.created',
  'kr.updated',
  'kr.deleted',
  
  // Sprint events
  'sprint.created',
  'sprint.updated',
  'sprint.deleted',
  'sprint.status_changed',
  
  // Checkin events
  'checkin.created',
  'checkin.updated',
  'checkin.submitted',
  
  // Calendar integration events
  'calendar.sync_started',
  'calendar.sync_completed',
  'calendar.sync_failed',
  'calendar.event_created',
  'calendar.event_updated',
  'calendar.event_deleted',
  
  // User management events
  'user.role_changed',
  'user.department_changed',
  'user.deactivated',
  'user.reactivated',
  
  // Diagnostic events
  'diagnostic.started',
  'diagnostic.completed',
  'diagnostic.shared',
  
  // Call analysis events
  'call.analyzed',
  'call.feedback_submitted',
  
  // Integration events
  'integration.connected',
  'integration.disconnected',
  'integration.error',
  
  // Admin actions
  'admin.settings_changed',
  'admin.bulk_action',
]);

// ============================================================
// SENSITIVE KEYS TO REMOVE FROM METADATA
// ============================================================

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
  'authorization',
  'auth',
  'bearer',
  'cookie',
  'session',
  'credentials',
  'private_key',
  'privatekey',
]);

function sanitizeMetadata(obj, depth = 0) {
  if (depth > 5 || !obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeMetadata(item, depth + 1));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Skip sensitive keys
    if (SENSITIVE_KEYS.has(lowerKey)) {
      continue;
    }
    
    // Check if key contains sensitive words
    if (SENSITIVE_KEYS.has(lowerKey) || 
        lowerKey.includes('password') || 
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('api_key')) {
      continue;
    }
    
    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMetadata(value, depth + 1);
    } else if (typeof value === 'string' && value.length > 1000) {
      // Truncate very long strings
      sanitized[key] = value.substring(0, 1000) + '...[truncated]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// ============================================================
// MAIN HANDLER
// ============================================================

exports.handler = Sentry.AWSLambda.wrapHandler(async (event, _context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    // Check environment configuration
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Missing Supabase configuration' })
      };
    }

    // Validate authorization header
    const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    
    if (!bearerToken) {
      return { 
        statusCode: 401, 
        headers, 
        body: JSON.stringify({ error: 'Missing Authorization header' }) 
      };
    }

    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON body' })
      };
    }

    const {
      event_type,
      severity = 'info',
      subject_type = null,
      subject_id = null,
      metadata = {},
      url = null,
      impersonated_by = null,
    } = body;

    // Validate required fields
    if (!event_type) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'event_type is required' })
      };
    }

    // Validate event type against allowlist
    if (!ALLOWED_EVENT_TYPES.has(event_type)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Event type not allowed: ${event_type}` })
      };
    }

    // Validate severity
    const validSeverities = ['info', 'warning', 'critical'];
    const normalizedSeverity = validSeverities.includes(severity) ? severity : 'info';

    // Validate caller via Supabase auth API
    const callerRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${bearerToken}`
      }
    });

    if (!callerRes.ok) {
      return { 
        statusCode: 401, 
        headers, 
        body: JSON.stringify({ error: 'Invalid session' }) 
      };
    }

    const caller = await callerRes.json();
    const callerId = caller?.id;
    const callerEmail = caller?.email || '';

    if (!callerId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Could not identify user' })
      };
    }

    // Rate limiting check
    if (isRateLimited(callerId)) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'Too many requests. Please slow down.' })
      };
    }

    // Get caller role from profiles
    const roleRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${callerId}&select=role,email`,
      {
        method: 'GET',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    let callerRole = 'USER';
    if (roleRes.ok) {
      const roleData = await roleRes.json();
      callerRole = roleData?.[0]?.role || 'USER';
    }

    // Extract request context
    const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
               event.headers['client-ip'] || 
               null;
    const userAgent = event.headers['user-agent'] || null;
    const requestId = event.headers['x-request-id'] || 
                      event.headers['x-nf-request-id'] || 
                      `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Sanitize metadata
    const sanitizedMetadata = sanitizeMetadata(metadata);

    // Insert audit event using the RPC function
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/insert_audit_event_full`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        p_event_type: event_type,
        p_severity: normalizedSeverity,
        p_source: 'frontend',
        p_actor_user_id: callerId,
        p_actor_email: callerEmail,
        p_actor_role: callerRole,
        p_actor_impersonated_by: impersonated_by || null,
        p_subject_type: subject_type,
        p_subject_id: subject_id,
        p_request_id: requestId,
        p_ip_address: ip,
        p_user_agent: userAgent,
        p_url: url,
        p_metadata: sanitizedMetadata
      })
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text().catch(() => '');
      console.error('Failed to insert audit event:', errText);
      
      // Return success anyway to not block frontend (best-effort audit)
      return {
        statusCode: 202,
        headers,
        body: JSON.stringify({ 
          ok: true, 
          warning: 'Event accepted but persistence may have failed',
          request_id: requestId
        })
      };
    }

    const eventId = await insertRes.json();

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        ok: true,
        event_id: eventId,
        request_id: requestId
      })
    };

  } catch (error) {
    console.error('Audit event error:', error);
    Sentry.captureException(error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal error', 
        details: error.message 
      })
    };
  }
});
