import { useEffect, useCallback } from 'react';

/**
 * Hook para manter a sessão ativa renovando o timestamp em qualquer atividade
 */
export const useSessionKeepAlive = () => {
  const renewSession = useCallback(() => {
    const savedUser = localStorage.getItem('ggv-user');
    if (savedUser) {
      const newTimestamp = Date.now().toString();
      localStorage.setItem('ggv-user-timestamp', newTimestamp);
      sessionStorage.setItem('ggv-user-timestamp', newTimestamp);
      console.log('🔄 SESSION - Timestamp renovado por atividade do usuário');
    }
  }, []);

  useEffect(() => {
    // Lista de eventos que indicam atividade do usuário
    const activityEvents = [
      'click',
      'keydown',
      'scroll',
      'mousemove',
      'touchstart',
      'focus',
      'blur'
    ];

    // Throttle para evitar muitas renovações
    let lastRenewal = 0;
    const throttleTime = 5 * 60 * 1000; // 5 minutos

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastRenewal > throttleTime) {
        renewSession();
        lastRenewal = now;
      }
    };

    // Adicionar listeners para todos os eventos de atividade
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Renovar a cada 30 minutos automaticamente
    const interval = setInterval(renewSession, 30 * 60 * 1000);

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(interval);
    };
  }, [renewSession]);

  return renewSession;
};
