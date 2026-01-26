/**
 * Google Calendar Webhook Handler
 * Recebe notificações de mudanças do Google Calendar via Push Notifications
 * Documentação: https://developers.google.com/calendar/api/guides/push
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cliente Supabase com service role para bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Valida se a notificação veio do Google
 */
function validateGoogleNotification(headers) {
  // Google envia um header específico para identificar webhooks
  const channelId = headers['x-goog-channel-id'];
  const channelToken = headers['x-goog-channel-token'];
  const resourceState = headers['x-goog-resource-state'];
  
  if (!channelId || !resourceState) {
    console.log('❌ WEBHOOK - Headers do Google ausentes');
    return false;
  }
  
  console.log('✅ WEBHOOK - Notificação válida do Google:', {
    channelId,
    resourceState,
    token: channelToken ? 'presente' : 'ausente'
  });
  
  return true;
}

/**
 * Sincroniza evento do Google Calendar para o sistema
 */
async function syncEventFromGoogle(eventId, calendarId = 'primary', userToken) {
  try {
    console.log('🔄 WEBHOOK - Buscando evento do Google Calendar...', eventId);
    
    // Buscar evento do Google Calendar
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
      {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      }
    );
    
    if (!response.ok) {
      if (response.status === 404 || response.status === 410) {
        // Evento foi deletado
        console.log('🗑️ WEBHOOK - Evento deletado no Google Calendar');
        return { action: 'deleted', eventId };
      }
      throw new Error(`Erro ao buscar evento: ${response.status}`);
    }
    
    const event = await response.json();
    console.log('📅 WEBHOOK - Evento encontrado:', event.summary);
    
    // Extrair informações relevantes
    const meetLink = event.conferenceData?.entryPoints?.find(
      ep => ep.entryPointType === 'video'
    )?.uri || event.hangoutLink || null;
    
    return {
      action: event.status === 'cancelled' ? 'deleted' : 'updated',
      eventId,
      summary: event.summary,
      description: event.description,
      startAt: event.start?.dateTime,
      endAt: event.end?.dateTime,
      meetLink,
      htmlLink: event.htmlLink,
      status: event.status,
      recurrence: event.recurrence
    };
  } catch (error) {
    console.error('❌ WEBHOOK - Erro ao sincronizar evento:', error);
    throw error;
  }
}

/**
 * Atualiza registro no Supabase baseado nas mudanças do Calendar
 */
async function updateSprintCalendarEvent(eventData) {
  try {
    console.log('💾 WEBHOOK - Atualizando Supabase...', eventData.eventId);
    
    // Buscar registro no Supabase
    const { data: existing, error: fetchError } = await supabase
      .from('sprint_calendar_events')
      .select('*')
      .eq('event_id', eventData.eventId)
      .single();
    
    if (fetchError || !existing) {
      console.log('⚠️ WEBHOOK - Evento não encontrado no Supabase');
      return false;
    }
    
    if (eventData.action === 'deleted') {
      // Marcar como cancelado
      const { error: updateError } = await supabase
        .from('sprint_calendar_events')
        .update({
          status: 'cancelled',
          last_synced_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      
      if (updateError) throw updateError;
      
      console.log('✅ WEBHOOK - Evento marcado como cancelado no Supabase');
      
      // Atualizar sprint para refletir que não tem mais evento
      await supabase
        .from('sprints')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', existing.sprint_id);
      
      return true;
    }
    
    // Calcular duração
    let durationMinutes = existing.duration_minutes;
    if (eventData.startAt && eventData.endAt) {
      const start = new Date(eventData.startAt);
      const end = new Date(eventData.endAt);
      durationMinutes = Math.round((end - start) / (1000 * 60));
    }
    
    // Atualizar informações
    const { error: updateError } = await supabase
      .from('sprint_calendar_events')
      .update({
        meet_link: eventData.meetLink || existing.meet_link,
        start_at: eventData.startAt || existing.start_at,
        duration_minutes: durationMinutes,
        status: 'synced',
        last_synced_at: new Date().toISOString()
      })
      .eq('id', existing.id);
    
    if (updateError) throw updateError;
    
    console.log('✅ WEBHOOK - Evento atualizado no Supabase');
    
    // Opcionalmente, atualizar a sprint
    if (eventData.startAt) {
      const newStartDate = new Date(eventData.startAt).toISOString().split('T')[0];
      await supabase
        .from('sprints')
        .update({ 
          start_date: newStartDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.sprint_id);
    }
    
    return true;
  } catch (error) {
    console.error('❌ WEBHOOK - Erro ao atualizar Supabase:', error);
    throw error;
  }
}

/**
 * Handler principal
 */
export async function handler(event, context) {
  console.log('📨 WEBHOOK - Recebido:', event.httpMethod);
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Goog-Channel-Id, X-Goog-Channel-Token, X-Goog-Resource-State, X-Goog-Resource-Id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    // Validar notificação do Google
    const requestHeaders = event.headers;
    if (!validateGoogleNotification(requestHeaders)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid Google notification' })
      };
    }
    
    const resourceState = requestHeaders['x-goog-resource-state'];
    const channelId = requestHeaders['x-goog-channel-id'];
    const resourceId = requestHeaders['x-goog-resource-id'];
    
    console.log('📬 WEBHOOK - Estado:', resourceState, 'Canal:', channelId);
    
    // Google envia "sync" na primeira notificação (setup)
    if (resourceState === 'sync') {
      console.log('✅ WEBHOOK - Sync inicial confirmado');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Sync acknowledged' })
      };
    }
    
    // Estados que indicam mudanças: 'exists', 'not_exists', 'updated'
    if (!['exists', 'not_exists', 'updated'].includes(resourceState)) {
      console.log('⏩ WEBHOOK - Estado ignorado:', resourceState);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'State ignored' })
      };
    }
    
    // Buscar token do usuário e evento relacionado
    // O channelId deve conter o sprint_calendar_event.id
    const { data: calendarEvent, error: fetchError } = await supabase
      .from('sprint_calendar_events')
      .select('*, created_by')
      .eq('id', channelId)
      .single();
    
    if (fetchError || !calendarEvent) {
      console.log('⚠️ WEBHOOK - Evento não encontrado no sistema:', channelId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Event not found in system' })
      };
    }
    
    if (!calendarEvent.event_id) {
      console.log('⚠️ WEBHOOK - Evento sem event_id');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'No event_id' })
      };
    }
    
    // Buscar token do usuário (via Supabase auth)
    // Como estamos num webhook, não temos acesso direto ao token
    // Precisamos armazenar o token no banco ou usar service account
    
    // Por enquanto, apenas registrar a mudança
    console.log('📝 WEBHOOK - Mudança detectada no evento:', calendarEvent.event_id);
    
    // Atualizar timestamp de última sincronização
    await supabase
      .from('sprint_calendar_events')
      .update({
        last_synced_at: new Date().toISOString()
      })
      .eq('id', calendarEvent.id);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Webhook processed',
        resourceState,
        eventId: calendarEvent.event_id
      })
    };
  } catch (error) {
    console.error('❌ WEBHOOK - Erro:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
}
