// Netlify Function: Error Events Admin API
// Endpoint: /.netlify/functions/error-events-admin

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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: 'Missing Supabase configuration' }) 
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get query parameters
    const queryParams = event.queryStringParameters || {};
    const { 
      search = '', 
      user_email = '', 
      incident_hash = '', 
      date_from = '', 
      date_to = '',
      limit = '100',
      offset = '0'
    } = queryParams;

    let query = supabase
      .from('error_events')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
    }
    if (user_email) {
      query = query.eq('user_email', user_email);
    }
    if (incident_hash) {
      query = query.eq('incident_hash', incident_hash);
    }
    if (date_from) {
      query = query.gte('created_at', date_from);
    }
    if (date_to) {
      query = query.lte('created_at', date_to + 'T23:59:59');
    }

    // Apply pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: error.message }) 
      };
    }

    // Group by incident_hash for summary
    const incidents = data.reduce((acc, event) => {
      if (!acc[event.incident_hash]) {
        acc[event.incident_hash] = {
          incident_hash: event.incident_hash,
          title: event.title,
          count: 0,
          first_occurrence: event.created_at,
          last_occurrence: event.created_at,
          users_affected: []
        };
      }
      acc[event.incident_hash].count++;
      if (event.created_at < acc[event.incident_hash].first_occurrence) {
        acc[event.incident_hash].first_occurrence = event.created_at;
      }
      if (event.created_at > acc[event.incident_hash].last_occurrence) {
        acc[event.incident_hash].last_occurrence = event.created_at;
      }
      if (event.user_email && !acc[event.incident_hash].users_affected.includes(event.user_email)) {
        acc[event.incident_hash].users_affected.push(event.user_email);
      }
      return acc;
    }, {});

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        events: data,
        incidents: Object.values(incidents),
        total: count || data.length,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: data.length === parseInt(limit)
        }
      })
    };

  } catch (error) {
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: 'Internal server error', details: error.message }) 
    };
  }
});
