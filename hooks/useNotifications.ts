/**
 * 🔔 Hook de Notificações - Sistema inteligente de feedbacks
 * Detecta novos feedbacks e gerencia estado de leitura
 */

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export interface NotificationItem {
  id: string;
  feedback_id: string;
  call_id: string;
  content: string;
  author_name: string;
  author_email: string;
  created_at: string;
  is_read: boolean;
  call_enterprise?: string;
  call_person?: string;
  call_sdr?: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Buscar notificações não lidas
  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      // Buscar feedbacks recentes com dados da chamada
      const { data, error } = await supabase.rpc('get_recent_feedbacks_with_calls', {
        p_limit: 20 // Últimos 20 feedbacks
      });
      
      if (error) {
        console.error('❌ Erro ao carregar notificações:', error);
        return;
      }

      if (data) {
        console.log('🔔 Notificações carregadas:', data.length);
        
        // Mapear para formato de notificação
        const mappedNotifications: NotificationItem[] = data.map((item: any) => ({
          id: `feedback_${item.feedback_id}`,
          feedback_id: item.feedback_id,
          call_id: item.call_id,
          content: item.content,
          author_name: item.author_name || 'Usuário',
          author_email: item.author_email || '',
          created_at: item.created_at,
          is_read: item.is_read || false,
          call_enterprise: item.call_enterprise,
          call_person: item.call_person,
          call_sdr: item.call_sdr
        }));

        setNotifications(mappedNotifications);
        
        // Contar não lidas
        const unread = mappedNotifications.filter(n => !n.is_read).length;
        setUnreadCount(unread);
        
        console.log(`🔔 ${unread} notificações não lidas de ${mappedNotifications.length} total`);
      }
    } catch (err) {
      console.error('❌ Erro geral ao carregar notificações:', err);
    } finally {
      setLoading(false);
    }
  };

  // Marcar notificação como lida
  const markAsRead = async (feedbackId: string) => {
    try {
      const { error } = await supabase
        .from('call_feedbacks')
        .update({ is_read: true })
        .eq('id', feedbackId);

      if (!error) {
        setNotifications(prev => 
          prev.map(n => 
            n.feedback_id === feedbackId 
              ? { ...n, is_read: true }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('❌ Erro ao marcar como lida:', err);
    }
  };

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter(n => !n.is_read)
        .map(n => n.feedback_id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('call_feedbacks')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (!error) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true }))
        );
        setUnreadCount(0);
        console.log('✅ Todas as notificações marcadas como lidas');
      }
    } catch (err) {
      console.error('❌ Erro ao marcar todas como lidas:', err);
    }
  };

  // Navegar para chamada específica
  const navigateToCall = (callId: string, feedbackId: string) => {
    console.log('🎯 Navegando para chamada:', { callId, feedbackId });

    markAsRead(feedbackId);
    setIsOpen(false);

    // Forçar navegação FULL para que o BrowserRouter resolva '/chamadas'
    const target = `${window.location.origin}/chamadas#/calls/${callId}`;
    console.log('🔗 Navegando via href direto:', target);
    window.location.href = target;
  };

  // Carregar ao montar + polling para novas notificações
  useEffect(() => {
    loadNotifications();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Listener para novas notificações via realtime (opcional)
  useEffect(() => {
    const channel = supabase
      .channel('feedbacks')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'call_feedbacks' 
        }, 
        (payload) => {
          console.log('🔔 Nova notificação em tempo real:', payload);
          loadNotifications(); // Recarregar quando houver novo feedback
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    isOpen,
    setIsOpen,
    markAsRead,
    markAllAsRead,
    navigateToCall,
    refresh: loadNotifications
  };
};
