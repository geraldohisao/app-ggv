import { supabase } from '../../../services/supabaseClient';

// ============================================
// TYPES
// ============================================

export type NotificationType = 'due_today' | 'due_tomorrow' | 'overdue' | 'assigned' | 'comment_added';

export interface TaskNotification {
  id: string;
  task_id?: string;
  sprint_item_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  read_at?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  task_title?: string;
}

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Busca notificações do usuário
 */
export async function getMyNotifications(limit = 20, unreadOnly = false): Promise<TaskNotification[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_my_notifications', {
        p_limit: limit,
        p_unread_only: unreadOnly,
      });

    if (error) {
      console.error('❌ Erro ao buscar notificações:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ Erro ao buscar notificações:', error);
    return [];
  }
}

/**
 * Conta notificações não lidas
 */
export async function countUnreadNotifications(): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('count_unread_notifications');

    if (error) {
      console.error('❌ Erro ao contar notificações:', error);
      throw error;
    }

    return data || 0;
  } catch (error) {
    console.error('❌ Erro ao contar notificações:', error);
    return 0;
  }
}

/**
 * Marca notificações específicas como lidas
 */
export async function markNotificationsAsRead(notificationIds: string[]): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('mark_notifications_read', {
        p_notification_ids: notificationIds,
      });

    if (error) {
      console.error('❌ Erro ao marcar notificações como lidas:', error);
      throw error;
    }

    return data || 0;
  } catch (error) {
    console.error('❌ Erro ao marcar notificações como lidas:', error);
    return 0;
  }
}

/**
 * Marca todas as notificações como lidas
 */
export async function markAllNotificationsAsRead(): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('mark_all_notifications_read');

    if (error) {
      console.error('❌ Erro ao marcar todas notificações como lidas:', error);
      throw error;
    }

    return data || 0;
  } catch (error) {
    console.error('❌ Erro ao marcar todas notificações como lidas:', error);
    return 0;
  }
}

/**
 * Deleta uma notificação
 */
export async function deleteNotification(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('task_notifications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao deletar notificação:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('❌ Erro ao deletar notificação:', error);
    return false;
  }
}

/**
 * Retorna ícone para o tipo de notificação
 */
export function getNotificationIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    due_today: '📅',
    due_tomorrow: '🔔',
    overdue: '🚨',
    assigned: '👤',
    comment_added: '💬',
  };
  return icons[type] || '📌';
}

/**
 * Retorna cor de badge para o tipo de notificação
 */
export function getNotificationColor(type: NotificationType): string {
  const colors: Record<NotificationType, string> = {
    due_today: 'bg-amber-100 text-amber-700 border-amber-200',
    due_tomorrow: 'bg-blue-100 text-blue-700 border-blue-200',
    overdue: 'bg-rose-100 text-rose-700 border-rose-200',
    assigned: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    comment_added: 'bg-violet-100 text-violet-700 border-violet-200',
  };
  return colors[type] || 'bg-slate-100 text-slate-700 border-slate-200';
}

/**
 * Formata tempo relativo
 */
export function formatNotificationTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `há ${diffMins}min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays < 7) return `há ${diffDays}d`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
