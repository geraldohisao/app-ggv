/**
 * Google Calendar Service
 * Gerencia integração com Google Calendar para eventos de sprint
 */

import { supabase } from './supabaseClient';
import { getDriveAccessToken } from './googleMeetTranscriptService';

// ============================================
// TYPES
// ============================================

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: { email: string; responseStatus?: string }[];
  conferenceData?: {
    createRequest?: { requestId: string };
    entryPoints?: { entryPointType: string; uri: string }[];
  };
  recurrence?: string[];
  htmlLink?: string;
}

export interface CreateCalendarEventParams {
  sprintId: string;
  title: string;
  description?: string;
  startAt: Date;
  durationMinutes: number;
  timezone?: string;
  attendeeEmails?: string[];
  recurrenceRule?: string;
}

export interface CalendarEventResult {
  eventId: string;
  meetLink: string | null;
  htmlLink: string | null;
  status: 'synced' | 'error';
  error?: string;
}

export interface SprintCalendarEvent {
  id?: string;
  sprint_id: string;
  calendar_id: string;
  event_id: string | null;
  meet_link: string | null;
  start_at: string;
  duration_minutes: number;
  recurrence_rrule: string | null;
  timezone: string;
  attendees_emails: string[] | null;
  status: 'pending' | 'synced' | 'error' | 'cancelled';
  last_sync_error: string | null;
  last_synced_at: string | null;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// TOKEN MANAGEMENT
// ============================================

const TOKEN_CACHE_KEY = 'ggv_calendar_token_cache';
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutos de buffer

interface TokenCache {
  access_token: string;
  expires_at: number;
  source: 'supabase' | 'oauth';
}

let cachedAccessToken: string | null = null;

function saveTokenToCache(token: string, expiresIn: number = 3600, source: 'supabase' | 'oauth' = 'oauth'): void {
  try {
    const cache: TokenCache = {
      access_token: token,
      expires_at: Date.now() + (expiresIn * 1000) - TOKEN_EXPIRY_BUFFER,
      source
    };
    localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(cache));
    console.log(`💾 CALENDAR - Token salvo no cache (${source})`);
  } catch (error) {
    console.warn('⚠️ CALENDAR - Erro ao salvar token no cache:', error);
  }
}

async function getTokenFromCache(): Promise<string | null> {
  try {
    const cacheStr = localStorage.getItem(TOKEN_CACHE_KEY);
    if (!cacheStr) return null;
    
    const cache: TokenCache = JSON.parse(cacheStr);
    
    if (cache.source === 'supabase') {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        localStorage.removeItem(TOKEN_CACHE_KEY);
        return null;
      }
      return cache.access_token;
    }
    
    if (Date.now() < cache.expires_at) {
      console.log(`💾 CALENDAR - Token ${cache.source} válido encontrado no cache`);
      return cache.access_token;
    } else {
      localStorage.removeItem(TOKEN_CACHE_KEY);
      return null;
    }
  } catch (error) {
    console.warn('⚠️ CALENDAR - Erro ao ler token do cache:', error);
    localStorage.removeItem(TOKEN_CACHE_KEY);
    return null;
  }
}

/**
 * Obtém access token para Google Calendar API
 * Reutiliza o mesmo token do Drive (ambos são do Google OAuth)
 */
export async function getCalendarAccessToken(): Promise<string> {
  // Calendar e Drive usam o mesmo token OAuth do Google
  // Vamos reutilizar a lógica do Drive que já tem refresh token implementado
  console.log('📅 CALENDAR - Obtendo token (compartilhado com Drive)...');
  return await getDriveAccessToken();
}

/**
 * Testa se o token tem permissões de Calendar
 */
export async function testCalendarPermissions(token: string): Promise<boolean> {
  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ============================================
// RECURRENCE RULE HELPERS
// ============================================

/**
 * Converte tipo de sprint em RRULE
 */
export function sprintTypeToRRule(sprintType: string, startDate: Date): string | null {
  const dayOfWeek = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][startDate.getDay()];
  
  switch (sprintType) {
    case 'semanal':
      return `RRULE:FREQ=WEEKLY;BYDAY=${dayOfWeek}`;
    case 'mensal':
      return `RRULE:FREQ=MONTHLY;BYMONTHDAY=${startDate.getDate()}`;
    case 'trimestral':
      return `RRULE:FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=${startDate.getDate()}`;
    case 'semestral':
      return `RRULE:FREQ=MONTHLY;INTERVAL=6;BYMONTHDAY=${startDate.getDate()}`;
    case 'anual':
      return `RRULE:FREQ=YEARLY;BYMONTH=${startDate.getMonth() + 1};BYMONTHDAY=${startDate.getDate()}`;
    default:
      return null;
  }
}

/**
 * Calcula data/hora de término baseado na duração
 */
function calculateEndTime(startAt: Date, durationMinutes: number): Date {
  return new Date(startAt.getTime() + durationMinutes * 60 * 1000);
}

// ============================================
// GOOGLE CALENDAR API
// ============================================

/**
 * Cria evento no Google Calendar com Google Meet
 */
export async function createCalendarEvent(params: CreateCalendarEventParams): Promise<CalendarEventResult> {
  try {
    console.log('📅 CALENDAR - Criando evento...', params);
    
    const token = await getCalendarAccessToken();
    // NOTE: Do not pre-check permissions with calendarList.
    // Some minimal scopes (e.g. calendar.events) can create events but may not read calendarList.
    // We'll rely on the create event response itself for permission errors.

    const timezone = params.timezone || 'America/Sao_Paulo';
    const endAt = calculateEndTime(params.startAt, params.durationMinutes);
    
    const event: CalendarEvent = {
      summary: params.title,
      description: params.description || `Sprint: ${params.title}`,
      start: {
        dateTime: params.startAt.toISOString(),
        timeZone: timezone
      },
      end: {
        dateTime: endAt.toISOString(),
        timeZone: timezone
      },
      conferenceData: {
        createRequest: {
          requestId: `sprint-${params.sprintId}-${Date.now()}`
        }
      }
    };

    // Adicionar convidados
    if (params.attendeeEmails && params.attendeeEmails.length > 0) {
      event.attendees = params.attendeeEmails.map(email => ({ email }));
    }

    // Adicionar recorrência
    if (params.recurrenceRule) {
      event.recurrence = [params.recurrenceRule];
    }

    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('❌ CALENDAR - Erro ao criar evento:', errorData);
      throw new Error(errorData?.error?.message || `Erro ${res.status}: ${res.statusText}`);
    }

    const createdEvent = await res.json();
    console.log('✅ CALENDAR - Evento criado:', createdEvent.id);

    // Extrair link do Meet
    const meetLink = createdEvent.conferenceData?.entryPoints?.find(
      (ep: any) => ep.entryPointType === 'video'
    )?.uri || createdEvent.hangoutLink || null;

    return {
      eventId: createdEvent.id,
      meetLink,
      htmlLink: createdEvent.htmlLink || null,
      status: 'synced'
    };
  } catch (error: any) {
    console.error('❌ CALENDAR - Erro:', error);
    return {
      eventId: '',
      meetLink: null,
      htmlLink: null,
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Atualiza evento existente no Google Calendar
 */
export async function updateCalendarEvent(
  eventId: string,
  params: Partial<CreateCalendarEventParams>
): Promise<CalendarEventResult> {
  try {
    console.log('📅 CALENDAR - Atualizando evento...', eventId);
    
    const token = await getCalendarAccessToken();
    
    const updates: Partial<CalendarEvent> = {};
    
    if (params.title) {
      updates.summary = params.title;
    }
    
    if (params.description) {
      updates.description = params.description;
    }
    
    if (params.startAt && params.durationMinutes) {
      const timezone = params.timezone || 'America/Sao_Paulo';
      const endAt = calculateEndTime(params.startAt, params.durationMinutes);
      updates.start = { dateTime: params.startAt.toISOString(), timeZone: timezone };
      updates.end = { dateTime: endAt.toISOString(), timeZone: timezone };
    }
    
    if (params.attendeeEmails) {
      updates.attendees = params.attendeeEmails.map(email => ({ email }));
    }
    
    if (params.recurrenceRule) {
      updates.recurrence = [params.recurrenceRule];
    }

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `Erro ${res.status}`);
    }

    const updatedEvent = await res.json();
    console.log('✅ CALENDAR - Evento atualizado:', updatedEvent.id);

    const meetLink = updatedEvent.conferenceData?.entryPoints?.find(
      (ep: any) => ep.entryPointType === 'video'
    )?.uri || updatedEvent.hangoutLink || null;

    return {
      eventId: updatedEvent.id,
      meetLink,
      htmlLink: updatedEvent.htmlLink || null,
      status: 'synced'
    };
  } catch (error: any) {
    console.error('❌ CALENDAR - Erro ao atualizar:', error);
    return {
      eventId,
      meetLink: null,
      htmlLink: null,
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Cancela/deleta evento do Google Calendar
 */
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  try {
    console.log('🗑️ CALENDAR - Deletando evento...', eventId);
    
    const token = await getCalendarAccessToken();
    
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (!res.ok && res.status !== 404) {
      throw new Error(`Erro ao deletar evento: ${res.status}`);
    }

    console.log('✅ CALENDAR - Evento deletado');
    return true;
  } catch (error) {
    console.error('❌ CALENDAR - Erro ao deletar:', error);
    return false;
  }
}

/**
 * Busca detalhes de um evento
 */
export async function getCalendarEvent(eventId: string): Promise<CalendarEvent | null> {
  try {
    const token = await getCalendarAccessToken();
    
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error('❌ CALENDAR - Erro ao buscar evento:', error);
    return null;
  }
}

// ============================================
// SUPABASE INTEGRATION
// ============================================

/**
 * Salva/atualiza metadados do evento no Supabase
 */
export async function saveSprintCalendarEvent(
  sprintId: string,
  eventResult: CalendarEventResult,
  params: CreateCalendarEventParams
): Promise<SprintCalendarEvent | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Usuário não autenticado');

    const eventData: Partial<SprintCalendarEvent> = {
      sprint_id: sprintId,
      calendar_id: 'primary',
      event_id: eventResult.eventId || null,
      meet_link: eventResult.meetLink,
      start_at: params.startAt.toISOString(),
      duration_minutes: params.durationMinutes,
      recurrence_rrule: params.recurrenceRule || null,
      timezone: params.timezone || 'America/Sao_Paulo',
      attendees_emails: params.attendeeEmails || null,
      status: eventResult.status,
      last_sync_error: eventResult.error || null,
      last_synced_at: eventResult.status === 'synced' ? new Date().toISOString() : null,
      created_by: userData.user.id
    };

    // Verificar se já existe um evento para essa sprint
    const { data: existing } = await supabase
      .from('sprint_calendar_events')
      .select('id')
      .eq('sprint_id', sprintId)
      .neq('status', 'cancelled')
      .single();

    let result;
    if (existing) {
      // Atualizar existente
      const { data, error } = await supabase
        .from('sprint_calendar_events')
        .update(eventData)
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Criar novo
      const { data, error } = await supabase
        .from('sprint_calendar_events')
        .insert(eventData)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }

    console.log('✅ CALENDAR - Evento salvo no Supabase:', result.id);
    return result;
  } catch (error) {
    console.error('❌ CALENDAR - Erro ao salvar no Supabase:', error);
    return null;
  }
}

/**
 * Busca evento de calendar de uma sprint
 */
export async function getSprintCalendarEvent(sprintId: string): Promise<SprintCalendarEvent | null> {
  try {
    const { data, error } = await supabase
      .from('sprint_calendar_events')
      .select('*')
      .eq('sprint_id', sprintId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('❌ CALENDAR - Erro ao buscar evento:', error);
    return null;
  }
}

/**
 * Cancela evento de calendar de uma sprint
 */
export async function cancelSprintCalendarEvent(sprintId: string): Promise<boolean> {
  try {
    const existing = await getSprintCalendarEvent(sprintId);
    
    if (!existing) return true;

    // Deletar do Google Calendar
    if (existing.event_id) {
      await deleteCalendarEvent(existing.event_id);
    }

    // Marcar como cancelado no Supabase
    const { error } = await supabase
      .from('sprint_calendar_events')
      .update({ status: 'cancelled' })
      .eq('id', existing.id);

    if (error) throw error;
    
    console.log('✅ CALENDAR - Evento cancelado');
    return true;
  } catch (error) {
    console.error('❌ CALENDAR - Erro ao cancelar:', error);
    return false;
  }
}

// ============================================
// WEBHOOK MANAGEMENT
// ============================================

/**
 * Registra webhook para receber notificações de mudanças no evento
 */
export async function registerCalendarWebhook(
  eventId: string,
  calendarEventRecordId: string
): Promise<boolean> {
  try {
    console.log('🔔 CALENDAR - Registrando webhook...', eventId);
    
    const token = await getCalendarAccessToken();
    
    // URL do webhook (Netlify Function)
    const webhookUrl = window.location.origin.includes('localhost')
      ? 'https://app.grupoggv.com/.netlify/functions/calendar-webhook'
      : `${window.location.origin}/.netlify/functions/calendar-webhook`;
    
    // Registrar webhook (watch)
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}/watch`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: calendarEventRecordId, // Usar ID do registro do Supabase
          type: 'web_hook',
          address: webhookUrl,
          // Webhook expira em 7 dias (máximo permitido)
          expiration: Date.now() + (7 * 24 * 60 * 60 * 1000)
        })
      }
    );
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      console.warn('⚠️ CALENDAR - Não foi possível registrar webhook:', error);
      return false;
    }
    
    const watchResponse = await res.json();
    console.log('✅ CALENDAR - Webhook registrado:', watchResponse.id);
    
    return true;
  } catch (error) {
    console.error('❌ CALENDAR - Erro ao registrar webhook:', error);
    return false;
  }
}

/**
 * Cancela webhook de um evento
 */
export async function stopCalendarWebhook(
  channelId: string,
  resourceId: string
): Promise<boolean> {
  try {
    console.log('🔕 CALENDAR - Cancelando webhook...', channelId);
    
    const token = await getCalendarAccessToken();
    
    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/channels/stop',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: channelId,
          resourceId: resourceId
        })
      }
    );
    
    if (!res.ok) {
      console.warn('⚠️ CALENDAR - Não foi possível cancelar webhook');
      return false;
    }
    
    console.log('✅ CALENDAR - Webhook cancelado');
    return true;
  } catch (error) {
    console.error('❌ CALENDAR - Erro ao cancelar webhook:', error);
    return false;
  }
}

// ============================================
// MAIN SYNC FUNCTION
// ============================================

/**
 * Sincroniza sprint com Google Calendar
 * Cria ou atualiza evento conforme necessário
 */
export async function syncSprintWithCalendar(params: CreateCalendarEventParams): Promise<SprintCalendarEvent | null> {
  try {
    console.log('🔄 CALENDAR - Iniciando sincronização...', params.sprintId);

    // Verificar se já existe evento
    const existing = await getSprintCalendarEvent(params.sprintId);

    let result: CalendarEventResult;

    if (existing?.event_id) {
      // Atualizar evento existente
      result = await updateCalendarEvent(existing.event_id, params);
    } else {
      // Criar novo evento
      result = await createCalendarEvent(params);
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d9f25aad-ab08-4cdf-bf8b-99a2626827e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'googleCalendarService.ts:syncSprintWithCalendar',message:'calendar_result',data:{sprintId:params.sprintId,usedExisting:!!existing?.event_id,resultStatus:result.status,hasEventId:!!result.eventId},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    // Salvar no Supabase
    const savedEvent = await saveSprintCalendarEvent(params.sprintId, result, params);

    // Se o Google Calendar foi chamado mas falhou salvar no Supabase,
    // retorna um objeto de erro para a UI exibir feedback claro.
    if (!savedEvent) {
      console.warn('⚠️ CALENDAR - Evento no Google processado, mas falhou ao salvar no Supabase.');
      return {
        sprint_id: params.sprintId,
        calendar_id: 'primary',
        event_id: result.eventId || null,
        meet_link: result.meetLink || null,
        start_at: params.startAt.toISOString(),
        duration_minutes: params.durationMinutes,
        recurrence_rrule: params.recurrenceRule || null,
        timezone: params.timezone || 'America/Sao_Paulo',
        attendees_emails: params.attendeeEmails || null,
        status: 'error',
        last_sync_error: result.error || 'Falha ao salvar a sincronização no sistema (Supabase/RLS).',
        last_synced_at: null,
        created_by: null,
      } satisfies SprintCalendarEvent;
    }

    // Registrar webhook para sincronização bidirecional
    if (result.eventId) {
      await registerCalendarWebhook(result.eventId, savedEvent.id!);
    }

    return savedEvent;
  } catch (error) {
    console.error('❌ CALENDAR - Erro na sincronização:', error);
    return null;
  }
}
