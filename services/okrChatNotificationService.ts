/**
 * OKR Chat Notification Service
 * 
 * Frontend service for sending immediate Google Chat notifications.
 * Uses the okr-chat-send Netlify function.
 * 
 * Note: Most notifications are handled automatically via database triggers
 * and the scheduled okr-chat-notifier function. Use this service only for
 * immediate/manual notifications.
 */

import { supabase } from './supabaseClient';

// ============================================
// TYPES
// ============================================

export type NotificationType = 
  | 'task_assigned' 
  | 'sprint_reminder_48h' 
  | 'task_overdue' 
  | 'custom';

export interface TaskAssignedPayload {
  title: string;
  description?: string;
  due_date?: string;
  priority?: 'baixa' | 'media' | 'alta' | 'urgente';
  sprint_id?: string;
  sprint_title?: string;
  item_type?: 'iniciativa' | 'atividade' | 'impedimento' | 'decisão' | 'marco';
  deep_link?: string;
  recipient_name?: string;
}

export interface SprintReminderPayload {
  sprint_title: string;
  end_date: string;
  department?: string;
  deep_link?: string;
  recipient_name?: string;
}

export interface TaskOverduePayload {
  title: string;
  due_date: string;
  days_overdue: number;
  sprint_id?: string;
  sprint_title?: string;
  item_type?: string;
  deep_link?: string;
  recipient_name?: string;
}

export interface SendNotificationParams {
  type: NotificationType;
  recipientEmail: string;
  recipientUserId?: string;
  payload?: TaskAssignedPayload | SprintReminderPayload | TaskOverduePayload | Record<string, any>;
  message?: string; // For custom type
}

export interface SendNotificationResult {
  success: boolean;
  messageId?: string;
  spaceName?: string;
  error?: string;
}

// ============================================
// SERVICE
// ============================================

const API_ENDPOINT = '/api/okr/chat-send';

/**
 * Get the current user's auth token
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Send a notification via Google Chat
 * 
 * @example
 * // Send task assigned notification
 * await sendChatNotification({
 *   type: 'task_assigned',
 *   recipientEmail: 'user@example.com',
 *   payload: {
 *     title: 'Nova tarefa importante',
 *     due_date: '2024-12-31',
 *     priority: 'alta',
 *     sprint_title: 'Sprint 2024-Q4',
 *     deep_link: '/okr/sprints/abc123'
 *   }
 * });
 * 
 * @example
 * // Send custom message
 * await sendChatNotification({
 *   type: 'custom',
 *   recipientEmail: 'user@example.com',
 *   message: 'Olá! Esta é uma mensagem personalizada.'
 * });
 */
export async function sendChatNotification(
  params: SendNotificationParams
): Promise<SendNotificationResult> {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      console.warn('⚠️ Not authenticated, cannot send Chat notification');
      return { success: false, error: 'Not authenticated' };
    }
    
    const body = {
      type: params.type,
      recipient_email: params.recipientEmail,
      recipient_user_id: params.recipientUserId,
      payload: params.payload,
      message: params.message
    };
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Chat notification failed:', data.error);
      return { 
        success: false, 
        error: data.error || `HTTP ${response.status}` 
      };
    }
    
    console.log('✅ Chat notification sent:', data.message_id);
    return {
      success: true,
      messageId: data.message_id,
      spaceName: data.space_name
    };
    
  } catch (error: any) {
    console.error('❌ Error sending Chat notification:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error' 
    };
  }
}

/**
 * Send a task assigned notification
 * Convenience method with typed payload
 */
export async function notifyTaskAssigned(
  recipientEmail: string,
  payload: TaskAssignedPayload,
  recipientUserId?: string
): Promise<SendNotificationResult> {
  return sendChatNotification({
    type: 'task_assigned',
    recipientEmail,
    recipientUserId,
    payload
  });
}

/**
 * Send a sprint reminder notification
 * Convenience method with typed payload
 */
export async function notifySprintReminder(
  recipientEmail: string,
  payload: SprintReminderPayload,
  recipientUserId?: string
): Promise<SendNotificationResult> {
  return sendChatNotification({
    type: 'sprint_reminder_48h',
    recipientEmail,
    recipientUserId,
    payload
  });
}

/**
 * Send a task overdue notification
 * Convenience method with typed payload
 */
export async function notifyTaskOverdue(
  recipientEmail: string,
  payload: TaskOverduePayload,
  recipientUserId?: string
): Promise<SendNotificationResult> {
  return sendChatNotification({
    type: 'task_overdue',
    recipientEmail,
    recipientUserId,
    payload
  });
}

/**
 * Send a custom text message
 * Convenience method for simple messages
 */
export async function sendCustomMessage(
  recipientEmail: string,
  message: string,
  recipientUserId?: string
): Promise<SendNotificationResult> {
  return sendChatNotification({
    type: 'custom',
    recipientEmail,
    recipientUserId,
    message
  });
}

// ============================================
// UTILITIES
// ============================================

/**
 * Check if Google Chat notifications are available
 * (checks if the endpoint is reachable)
 */
export async function isChatNotificationAvailable(): Promise<boolean> {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'OPTIONS'
    });
    return response.status === 204;
  } catch {
    return false;
  }
}

/**
 * Get notification status from outbox (for debugging/admin)
 */
export async function getNotificationStatus(notificationId: string): Promise<any> {
  const { data, error } = await supabase
    .from('okr_notification_outbox')
    .select('*')
    .eq('id', notificationId)
    .single();
  
  if (error) {
    console.error('Error fetching notification status:', error);
    return null;
  }
  
  return data;
}

/**
 * Get pending notifications count (for admin dashboard)
 */
export async function getPendingNotificationsCount(): Promise<number> {
  const { count, error } = await supabase
    .from('okr_notification_outbox')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  
  if (error) {
    console.error('Error fetching pending count:', error);
    return 0;
  }
  
  return count || 0;
}

export default {
  sendChatNotification,
  notifyTaskAssigned,
  notifySprintReminder,
  notifyTaskOverdue,
  sendCustomMessage,
  isChatNotificationAvailable,
  getNotificationStatus,
  getPendingNotificationsCount
};
