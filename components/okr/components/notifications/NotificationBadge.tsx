import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as notificationService from '../../services/notification.service';
import type { TaskNotification } from '../../services/notification.service';

interface NotificationBadgeProps {
  onTaskClick?: (taskId: string) => void;
  className?: string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  onTaskClick,
  className = '',
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Buscar contagem de não lidas
  const fetchUnreadCount = useCallback(async () => {
    const count = await notificationService.countUnreadNotifications();
    setUnreadCount(count);
  }, []);

  // Buscar notificações
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.getMyNotifications(20, false);
      setNotifications(data);
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling para atualizar contagem
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // 1 minuto
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Buscar notificações quando abre o dropdown
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handlers
  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAllAsRead = async () => {
    await notificationService.markAllNotificationsAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = async (notification: TaskNotification) => {
    // Marcar como lida
    if (!notification.is_read) {
      await notificationService.markNotificationsAsRead([notification.id]);
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Navegar para a task se houver callback
    if (notification.task_id && onTaskClick) {
      onTaskClick(notification.task_id);
      setIsOpen(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    const notification = notifications.find(n => n.id === notificationId);
    
    // Remover da lista
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    if (notification && !notification.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    
    await notificationService.deleteNotification(notificationId);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Botão do Badge */}
      <button
        onClick={handleToggle}
        className={`
          relative p-2 rounded-xl transition-all
          ${isOpen 
            ? 'bg-indigo-100 text-indigo-600' 
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          }
        `}
        title="Notificações"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
          />
        </svg>
        
        {/* Badge de contagem */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Notificações</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Lista de notificações */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-slate-500">
                <svg className="w-6 h-6 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="font-medium">Sem notificações</p>
                <p className="text-sm">Você está em dia!</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`
                    px-4 py-3 border-b border-slate-50 cursor-pointer transition-all group
                    ${notification.is_read 
                      ? 'bg-white hover:bg-slate-50' 
                      : 'bg-indigo-50/50 hover:bg-indigo-50'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Ícone */}
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-lg border
                      ${notificationService.getNotificationColor(notification.type)}
                    `}>
                      {notificationService.getNotificationIcon(notification.type)}
                    </div>
                    
                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${notification.is_read ? 'text-slate-700' : 'text-slate-900'}`}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-slate-500 truncate">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {notificationService.formatNotificationTime(notification.created_at)}
                      </p>
                    </div>

                    {/* Botão de deletar */}
                    <button
                      onClick={(e) => handleDelete(e, notification.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all flex-shrink-0"
                      title="Remover"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-500 text-center">
                {unreadCount > 0 
                  ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}`
                  : 'Todas as notificações foram lidas'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBadge;
