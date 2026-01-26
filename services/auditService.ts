/**
 * Audit Event Service
 * 
 * Provides a simple API for logging audit events from the frontend.
 * Events are sent to the backend where they are validated, sanitized, and persisted.
 */

import { supabase } from './supabaseClient';

// ============================================================
// TYPES
// ============================================================

export type AuditSeverity = 'info' | 'warning' | 'critical';

export type AuditEventType =
  // Authentication events
  | 'auth.login'
  | 'auth.logout'
  | 'auth.session_expired'
  // Impersonation events
  | 'impersonation.start'
  | 'impersonation.stop'
  // OKR events
  | 'okr.created'
  | 'okr.updated'
  | 'okr.deleted'
  | 'kr.created'
  | 'kr.updated'
  | 'kr.deleted'
  // Sprint events
  | 'sprint.created'
  | 'sprint.updated'
  | 'sprint.deleted'
  | 'sprint.status_changed'
  // Checkin events
  | 'checkin.created'
  | 'checkin.updated'
  | 'checkin.submitted'
  // Calendar integration events
  | 'calendar.sync_started'
  | 'calendar.sync_completed'
  | 'calendar.sync_failed'
  | 'calendar.event_created'
  | 'calendar.event_updated'
  | 'calendar.event_deleted'
  // User management events
  | 'user.role_changed'
  | 'user.department_changed'
  | 'user.deactivated'
  | 'user.reactivated'
  // Diagnostic events
  | 'diagnostic.started'
  | 'diagnostic.completed'
  | 'diagnostic.shared'
  // Call analysis events
  | 'call.analyzed'
  | 'call.feedback_submitted'
  // Integration events
  | 'integration.connected'
  | 'integration.disconnected'
  | 'integration.error'
  // Admin actions
  | 'admin.settings_changed'
  | 'admin.bulk_action';

export interface AuditEventPayload {
  event_type: AuditEventType;
  severity?: AuditSeverity;
  subject_type?: string;
  subject_id?: string;
  metadata?: Record<string, unknown>;
  impersonated_by?: string;
}

export interface AuditEventResult {
  ok: boolean;
  event_id?: number;
  request_id?: string;
  error?: string;
}

// ============================================================
// CONFIGURATION
// ============================================================

const API_ENDPOINT = '/api/audit-event';
const BATCH_INTERVAL_MS = 2000; // Batch events every 2 seconds
const MAX_BATCH_SIZE = 10;
const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 2;

// ============================================================
// EVENT QUEUE (batching support)
// ============================================================

let eventQueue: AuditEventPayload[] = [];
let batchTimeout: NodeJS.Timeout | null = null;
let isProcessing = false;

// ============================================================
// MAIN API
// ============================================================

/**
 * Log an audit event.
 * Events are batched and sent to the backend for persistence.
 * 
 * @param event - The audit event to log
 * @returns Promise that resolves when the event is queued (not necessarily sent)
 */
export async function logAuditEvent(event: AuditEventPayload): Promise<void> {
  // Add to queue
  eventQueue.push({
    ...event,
    metadata: {
      ...event.metadata,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
    },
  });

  // Schedule batch processing
  if (!batchTimeout && !isProcessing) {
    batchTimeout = setTimeout(processBatch, BATCH_INTERVAL_MS);
  }

  // Process immediately if queue is getting large
  if (eventQueue.length >= MAX_BATCH_SIZE) {
    if (batchTimeout) {
      clearTimeout(batchTimeout);
      batchTimeout = null;
    }
    await processBatch();
  }
}

/**
 * Log an audit event immediately (bypasses batching).
 * Use this for critical events that need to be logged right away.
 * 
 * @param event - The audit event to log
 * @returns Promise with the result
 */
export async function logAuditEventImmediate(event: AuditEventPayload): Promise<AuditEventResult> {
  return sendEvent(event);
}

/**
 * Flush all pending events in the queue.
 * Call this before page unload or logout.
 */
export async function flushAuditEvents(): Promise<void> {
  if (batchTimeout) {
    clearTimeout(batchTimeout);
    batchTimeout = null;
  }
  await processBatch();
}

// ============================================================
// INTERNAL FUNCTIONS
// ============================================================

async function processBatch(): Promise<void> {
  if (isProcessing || eventQueue.length === 0) {
    return;
  }

  isProcessing = true;

  try {
    // Take current batch
    const batch = eventQueue.splice(0, MAX_BATCH_SIZE);

    // Send events (in parallel for speed)
    await Promise.allSettled(batch.map(event => sendEvent(event)));
  } catch (error) {
    console.error('Failed to process audit event batch:', error);
  } finally {
    isProcessing = false;
    batchTimeout = null;

    // Schedule next batch if there are more events
    if (eventQueue.length > 0) {
      batchTimeout = setTimeout(processBatch, BATCH_INTERVAL_MS);
    }
  }
}

async function sendEvent(event: AuditEventPayload, retryCount = 0): Promise<AuditEventResult> {
  try {
    // Get current session token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      console.warn('Audit event skipped: no session token');
      return { ok: false, error: 'No session' };
    }

    const payload: AuditEventPayload & { url?: string } = {
      ...event,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Retry on server errors
      if (response.status >= 500 && retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        return sendEvent(event, retryCount + 1);
      }

      return {
        ok: false,
        error: errorData.error || `HTTP ${response.status}`,
      };
    }

    const result = await response.json();
    return {
      ok: true,
      event_id: result.event_id,
      request_id: result.request_id,
    };
  } catch (error) {
    console.error('Failed to send audit event:', error);

    // Retry on network errors
    if (retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return sendEvent(event, retryCount + 1);
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================
// CONVENIENCE FUNCTIONS
// ============================================================

/**
 * Log authentication event
 */
export function logAuthEvent(
  action: 'login' | 'logout' | 'session_expired',
  metadata?: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    event_type: `auth.${action}` as AuditEventType,
    severity: action === 'session_expired' ? 'warning' : 'info',
    metadata,
  });
}

/**
 * Log impersonation event
 */
export function logImpersonationEvent(
  action: 'start' | 'stop',
  targetUserId: string,
  targetEmail: string,
  impersonatedBy?: string
): Promise<void> {
  return logAuditEvent({
    event_type: `impersonation.${action}` as AuditEventType,
    severity: 'warning',
    subject_type: 'user',
    subject_id: targetUserId,
    impersonated_by: impersonatedBy,
    metadata: {
      target_email: targetEmail,
    },
  });
}

/**
 * Log OKR event
 */
export function logOkrEvent(
  action: 'created' | 'updated' | 'deleted',
  okrId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    event_type: `okr.${action}` as AuditEventType,
    subject_type: 'okr',
    subject_id: okrId,
    metadata,
  });
}

/**
 * Log KR event
 */
export function logKrEvent(
  action: 'created' | 'updated' | 'deleted',
  krId: string,
  okrId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    event_type: `kr.${action}` as AuditEventType,
    subject_type: 'kr',
    subject_id: krId,
    metadata: {
      ...metadata,
      okr_id: okrId,
    },
  });
}

/**
 * Log sprint event
 */
export function logSprintEvent(
  action: 'created' | 'updated' | 'deleted' | 'status_changed',
  sprintId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    event_type: `sprint.${action}` as AuditEventType,
    subject_type: 'sprint',
    subject_id: sprintId,
    metadata,
  });
}

/**
 * Log checkin event
 */
export function logCheckinEvent(
  action: 'created' | 'updated' | 'submitted',
  checkinId: string,
  sprintId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    event_type: `checkin.${action}` as AuditEventType,
    subject_type: 'checkin',
    subject_id: checkinId,
    metadata: {
      ...metadata,
      sprint_id: sprintId,
    },
  });
}

/**
 * Log calendar integration event
 */
export function logCalendarEvent(
  action: 'sync_started' | 'sync_completed' | 'sync_failed' | 'event_created' | 'event_updated' | 'event_deleted',
  metadata?: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    event_type: `calendar.${action}` as AuditEventType,
    severity: action === 'sync_failed' ? 'warning' : 'info',
    subject_type: 'calendar',
    metadata,
  });
}

/**
 * Log integration event
 */
export function logIntegrationEvent(
  action: 'connected' | 'disconnected' | 'error',
  integrationType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    event_type: `integration.${action}` as AuditEventType,
    severity: action === 'error' ? 'warning' : 'info',
    subject_type: 'integration',
    subject_id: integrationType,
    metadata,
  });
}

// ============================================================
// PAGE UNLOAD HANDLER
// ============================================================

if (typeof window !== 'undefined') {
  // Attempt to flush on page unload
  window.addEventListener('beforeunload', () => {
    // Use sendBeacon for reliability if available
    if (navigator.sendBeacon && eventQueue.length > 0) {
      const events = eventQueue.splice(0, eventQueue.length);
      // sendBeacon doesn't support auth headers, so these events might be lost
      // Consider storing in localStorage for retry on next visit
      console.debug(`Audit: ${events.length} events pending on unload`);
    }
  });

  // Also flush on visibility change to hidden
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushAuditEvents().catch(() => {});
    }
  });
}
