/**
 * 🔔 Centro de Notificações - Sino + Balões de Feedback
 * Interface moderna com melhores práticas de UX/UI
 */

import React from 'react';
import { useNotifications } from '../hooks/useNotifications';

const getAuthorInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const getRelativeTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return date.toLocaleDateString('pt-BR');
};

export const NotificationCenter: React.FC = () => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    isOpen, 
    setIsOpen,
    markAsRead,
    markAllAsRead,
    navigateToCall 
  } = useNotifications();

  return (
    <div className="relative">
      {/* Botão do Sino */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-all duration-200 ${
          isOpen 
            ? 'bg-indigo-100 text-indigo-600' 
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
        title={unreadCount > 0 ? `${unreadCount} notificação${unreadCount > 1 ? 'ões' : ''} não lida${unreadCount > 1 ? 's' : ''}` : 'Sem notificações'}
      >
        {/* Ícone do sino */}
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
          />
        </svg>
        
        {/* Badge com contador */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Painel de Notificações */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h3 className="font-medium text-slate-800">
              🔔 Notificações {unreadCount > 0 && `(${unreadCount})`}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Lista de Notificações */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-slate-500">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                <span className="ml-2 text-sm">Carregando...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <div className="text-3xl mb-2">🔕</div>
                <p className="text-sm">Nenhuma notificação</p>
                <p className="text-xs text-slate-400 mt-1">
                  Feedbacks aparecerão aqui
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 ${
                    !notification.is_read ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''
                  }`}
                  onClick={() => navigateToCall(notification.call_id, notification.feedback_id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar do autor do feedback */}
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-medium">
                        {getAuthorInitials(notification.author_name)}
                      </span>
                    </div>
                    
                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-800">
                          {notification.author_name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {getRelativeTime(notification.created_at)}
                        </span>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                        )}
                      </div>
                      
                      {/* Empresa e pessoa da chamada */}
                      <div className="text-xs text-slate-600 mb-1">
                        📞 {notification.call_enterprise || 'Empresa'} • {notification.call_person || 'Contato'}
                      </div>
                      
                      {/* Preview do feedback */}
                      <div className="text-sm text-slate-700 line-clamp-2">
                        "{notification.content.substring(0, 80)}{notification.content.length > 80 ? '...' : ''}"
                      </div>
                      
                      {/* Call to action */}
                      <div className="text-xs text-indigo-600 mt-1 font-medium">
                        Clique para ver a chamada →
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rodapé com ações */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    window.location.hash = '/feedbacks';
                    setIsOpen(false);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-800 font-medium"
                >
                  📋 Ver todos os feedbacks
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overlay para fechar quando clicar fora */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationCenter;

