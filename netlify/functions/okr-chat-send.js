/**
 * OKR Chat Send - HTTP Endpoint for Immediate Message Sending
 * 
 * Allows the frontend to send immediate notifications via Google Chat.
 * Requires authentication via Supabase JWT or service key.
 * 
 * POST /.netlify/functions/okr-chat-send
 * 
 * Body:
 * {
 *   "type": "task_assigned" | "sprint_reminder_48h" | "task_overdue" | "custom",
 *   "recipient_email": "user@example.com",
 *   "recipient_user_id": "uuid", // optional, for caching
 *   "payload": {
 *     "title": "...",
 *     "description": "...",
 *     "deep_link": "/okr/...",
 *     ...
 *   },
 *   "message": "Custom message text" // only for type="custom"
 * }
 */

const { createClient } = require('@supabase/supabase-js');
const { getGoogleChatClient } = require('./_lib/googleChatClient');
const { buildNotificationCard, buildTextMessage } = require('./_lib/chatMessageTemplates');

// Supabase clients
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Verify JWT token and extract user
 */
async function verifyAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Missing or invalid Authorization header' };
  }
  
  const token = authHeader.substring(7);
  
  // Check if it's the service role key (for server-to-server calls)
  if (token === supabaseServiceKey) {
    return { authenticated: true, isServiceRole: true, user: null };
  }
  
  // Verify JWT with Supabase
  if (!supabaseUrl || !supabaseAnonKey) {
    return { authenticated: false, error: 'Supabase not configured' };
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return { authenticated: false, error: error?.message || 'Invalid token' };
  }
  
  return { authenticated: true, isServiceRole: false, user };
}

/**
 * Log notification event for audit
 */
async function logNotificationEvent(db, event) {
  try {
    // Insert directly into outbox with status based on result
    await db
      .from('okr_notification_outbox')
      .insert({
        type: event.type === 'custom' ? 'task_assigned' : event.type,
        recipient_user_id: event.recipient_user_id || null,
        entity_table: 'direct_send',
        entity_id: event.recipient_user_id || '00000000-0000-0000-0000-000000000000',
        payload: event.payload,
        status: event.success ? 'sent' : 'failed',
        sent_at: event.success ? new Date().toISOString() : null,
        fail_reason: event.error || null,
        dedupe_key: `direct:${event.recipient_email}:${Date.now()}`
      });
  } catch (err) {
    console.error('Failed to log notification event:', err);
  }
}

/**
 * Get or create DM space (with caching)
 */
async function getOrCreateDmSpace(db, chatClient, userId, email) {
  if (userId) {
    // Try cache first
    const { data: cached } = await db
      .from('google_chat_dm_spaces')
      .select('space_name')
      .eq('user_id', userId)
      .single();
    
    if (cached && cached.space_name) {
      return cached.space_name;
    }
  }
  
  // Create new DM space
  const space = await chatClient.findOrCreateDmSpace(email);
  
  // Cache if we have user_id
  if (userId) {
    await db
      .from('google_chat_dm_spaces')
      .upsert({
        user_id: userId,
        email: email,
        space_name: space.spaceName,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .catch(() => {}); // Ignore cache errors
  }
  
  return space.spaceName;
}

/**
 * Main handler
 */
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Google Chat disabled: return no-op response
  return {
    statusCode: 204,
    headers,
    body: ''
  };
  
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  
  // Only POST allowed
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  console.log('📨 OKR Chat Send - Request received');
  
  // Verify authentication
  const auth = await verifyAuth(event.headers.authorization || event.headers.Authorization);
  
  if (!auth.authenticated) {
    console.log('❌ Authentication failed:', auth.error);
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: auth.error || 'Unauthorized' })
    };
  }
  
  console.log('✅ Authenticated:', auth.isServiceRole ? 'service_role' : auth.user?.email);
  
  // Parse body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON body' })
    };
  }
  
  // Validate required fields
  const { type, recipient_email, recipient_user_id, payload, message } = body;
  
  if (!recipient_email) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'recipient_email is required' })
    };
  }
  
  if (!type) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'type is required' })
    };
  }
  
  // Check if Chat is configured
  const chatClient = getGoogleChatClient();
  
  if (!chatClient.isConfigured()) {
    console.error('❌ Google Chat not configured');
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ 
        error: 'Google Chat not configured',
        message: 'GOOGLE_CHAT_SERVICE_ACCOUNT_JSON environment variable not set'
      })
    };
  }
  
  // Initialize Supabase with service role
  const db = createClient(supabaseUrl, supabaseServiceKey);
  
  const logEvent = {
    type,
    recipient_email,
    recipient_user_id,
    payload: payload || { message },
    success: false,
    error: null
  };
  
  try {
    // Get or create DM space
    const spaceName = await getOrCreateDmSpace(
      db,
      chatClient,
      recipient_user_id,
      recipient_email
    );
    
    // Send message based on type
    let result;
    
    if (type === 'custom' || !['task_assigned', 'sprint_reminder_48h', 'task_overdue'].includes(type)) {
      // Send plain text message
      const textMessage = message || payload?.message || payload?.title || 'Notificação OKR';
      result = await chatClient.sendTextMessage(spaceName, textMessage);
    } else {
      // Build and send card message
      const notification = {
        id: `direct-${Date.now()}`,
        type,
        payload: {
          recipient_name: payload?.recipient_name || recipient_email.split('@')[0],
          recipient_email,
          ...payload
        }
      };
      
      const { card, fallbackText } = buildNotificationCard(notification);
      result = await chatClient.sendCardMessage(spaceName, card, fallbackText);
    }
    
    console.log('✅ Message sent:', result.name);
    
    logEvent.success = true;
    await logNotificationEvent(db, logEvent);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message_id: result.name,
        space_name: spaceName
      })
    };
    
  } catch (err) {
    console.error('❌ Failed to send message:', err.message);
    
    logEvent.error = err.message;
    await logNotificationEvent(db, logEvent);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: err.message
      })
    };
  }
};
