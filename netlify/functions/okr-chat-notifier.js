/**
 * OKR Chat Notifier - Scheduled Function
 * 
 * Runs on a schedule to:
 * 1. Generate sprint reminders (48h before end)
 * 2. Generate overdue task alerts
 * 3. Process pending notifications from outbox
 * 4. Send messages via Google Chat API (DM to users)
 * 
 * Schedule: Every 15 minutes during business hours (UTC adjusted for Brazil)
 * Brazil business hours: 09:00-18:00 BRT (UTC-3) = 12:00-21:00 UTC
 */

const { createClient } = require('@supabase/supabase-js');
const { getGoogleChatClient } = require('./_lib/googleChatClient');
const { buildNotificationCard } = require('./_lib/chatMessageTemplates');

// Netlify scheduled function config
// Runs every 15 minutes
exports.config = {
  schedule: '*/15 * * * *'
};

// Supabase client with service role for full access
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
function getSupabase() {
  if (!supabase && supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabase;
}

/**
 * Check if current time is within business hours (Brazil)
 * Business hours: Monday-Friday, 09:00-18:00 BRT (America/Sao_Paulo)
 */
function isBusinessHours() {
  const now = new Date();
  
  // Get current time in Brazil timezone
  const brazilTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  
  const dayOfWeek = brazilTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = brazilTime.getHours();
  
  // Skip weekends
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    console.log('⏭️ Skipping: Weekend');
    return false;
  }
  
  // Skip outside business hours (09:00-18:00)
  if (hour < 9 || hour >= 18) {
    console.log(`⏭️ Skipping: Outside business hours (current: ${hour}:00 BRT)`);
    return false;
  }
  
  console.log(`✅ Business hours: ${brazilTime.toLocaleString('pt-BR')} BRT`);
  return true;
}

/**
 * Generate sprint reminders and overdue alerts
 * Calls the SQL functions that populate the outbox
 */
async function generateAlerts(db) {
  console.log('📋 Generating scheduled alerts...');
  
  const results = {
    sprintReminders: { created: 0, processed: 0 },
    overdueAlerts: { created: 0, processed: 0 }
  };
  
  try {
    // Generate sprint reminders (48h before end)
    const { data: sprintData, error: sprintError } = await db.rpc('fn_generate_sprint_reminders');
    
    if (sprintError) {
      console.error('❌ Error generating sprint reminders:', sprintError);
    } else if (sprintData && sprintData.length > 0) {
      results.sprintReminders = sprintData[0];
      console.log(`📅 Sprint reminders: ${results.sprintReminders.notifications_created} created from ${results.sprintReminders.sprints_processed} sprints`);
    }
  } catch (err) {
    console.error('❌ Exception in sprint reminders:', err);
  }
  
  try {
    // Generate overdue task alerts
    const { data: overdueData, error: overdueError } = await db.rpc('fn_generate_overdue_alerts');
    
    if (overdueError) {
      console.error('❌ Error generating overdue alerts:', overdueError);
    } else if (overdueData && overdueData.length > 0) {
      results.overdueAlerts = overdueData[0];
      console.log(`⏰ Overdue alerts: ${results.overdueAlerts.notifications_created} created from ${results.overdueAlerts.tasks_processed} tasks`);
    }
  } catch (err) {
    console.error('❌ Exception in overdue alerts:', err);
  }
  
  return results;
}

/**
 * Get or create DM space for a user
 * Uses cache in google_chat_dm_spaces table
 */
async function getOrCreateDmSpace(db, chatClient, userId, email) {
  // Check cache first
  const { data: cached, error: cacheError } = await db
    .from('google_chat_dm_spaces')
    .select('space_name')
    .eq('user_id', userId)
    .single();
  
  if (cached && cached.space_name) {
    console.log(`💾 Using cached DM space for ${email}`);
    return cached.space_name;
  }
  
  // Create new DM space via API
  console.log(`🔄 Creating DM space for ${email}...`);
  const space = await chatClient.findOrCreateDmSpace(email);
  
  // Cache the space name
  await db
    .from('google_chat_dm_spaces')
    .upsert({
      user_id: userId,
      email: email,
      space_name: space.spaceName,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });
  
  return space.spaceName;
}

/**
 * Process pending notifications from outbox
 */
async function processOutbox(db, chatClient) {
  console.log('📬 Processing notification outbox...');
  
  // Fetch pending notifications (limit to avoid timeout)
  const { data: notifications, error: fetchError } = await db
    .from('okr_notification_outbox')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(20);
  
  if (fetchError) {
    console.error('❌ Error fetching notifications:', fetchError);
    return { processed: 0, sent: 0, failed: 0 };
  }
  
  if (!notifications || notifications.length === 0) {
    console.log('📭 No pending notifications');
    return { processed: 0, sent: 0, failed: 0 };
  }
  
  console.log(`📨 Processing ${notifications.length} notifications...`);
  
  const results = { processed: 0, sent: 0, failed: 0 };
  
  for (const notification of notifications) {
    results.processed++;
    
    try {
      const payload = notification.payload;
      const email = payload.recipient_email;
      
      if (!email) {
        throw new Error('No recipient email in payload');
      }
      
      // Get or create DM space
      const spaceName = await getOrCreateDmSpace(
        db, 
        chatClient, 
        notification.recipient_user_id, 
        email
      );
      
      // Build and send message using templates
      const { card, fallbackText } = buildNotificationCard(notification);
      
      await chatClient.sendCardMessage(spaceName, card, fallbackText);
      
      // Mark as sent
      await db
        .from('okr_notification_outbox')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', notification.id);
      
      results.sent++;
      console.log(`✅ Sent notification ${notification.id} to ${email}`);
      
    } catch (err) {
      results.failed++;
      console.error(`❌ Failed to send notification ${notification.id}:`, err.message);
      
      // Update with failure info
      const retryCount = (notification.retry_count || 0) + 1;
      const newStatus = retryCount >= 3 ? 'failed' : 'pending';
      
      await db
        .from('okr_notification_outbox')
        .update({
          status: newStatus,
          retry_count: retryCount,
          fail_reason: err.message,
          // If still pending, schedule for 5 minutes later
          scheduled_for: newStatus === 'pending' 
            ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
            : undefined
        })
        .eq('id', notification.id);
    }
  }
  
  return results;
}

/**
 * Main handler
 */
exports.handler = async (event, context) => {
  console.log('🚀 OKR Chat Notifier started');
  
  const startTime = Date.now();
  
  // Check business hours
  if (!isBusinessHours()) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Skipped: Outside business hours',
        timestamp: new Date().toISOString()
      })
    };
  }
  
  // Initialize clients
  const db = getSupabase();
  const chatClient = getGoogleChatClient();
  
  if (!db) {
    console.error('❌ Supabase not configured');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database not configured' })
    };
  }
  
  if (!chatClient.isConfigured()) {
    console.warn('⚠️ Google Chat not configured - running in dry-run mode');
  }
  
  const results = {
    alerts: null,
    outbox: null,
    duration: 0,
    chatConfigured: chatClient.isConfigured()
  };
  
  try {
    // Step 1: Generate alerts (sprint reminders + overdue)
    results.alerts = await generateAlerts(db);
    
    // Step 2: Process outbox (only if Chat is configured)
    if (chatClient.isConfigured()) {
      results.outbox = await processOutbox(db, chatClient);
    } else {
      console.log('⏭️ Skipping outbox processing: Chat not configured');
      results.outbox = { processed: 0, sent: 0, failed: 0, skipped: true };
    }
    
  } catch (err) {
    console.error('❌ Error in notifier:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
  
  results.duration = Date.now() - startTime;
  
  console.log(`✅ Notifier completed in ${results.duration}ms`);
  console.log('📊 Results:', JSON.stringify(results, null, 2));
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'OKR notifications processed',
      ...results,
      timestamp: new Date().toISOString()
    })
  };
};
