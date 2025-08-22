import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';

/**
 * Hook para manter a sessão ativa renovando o timestamp em qualquer atividade
 * Agora integrado com o Supabase para sincronizar ambas as sessões
 */
export const useSessionKeepAlive = () => {
  const lastRenewalRef = useRef(0);
  const isRenewingRef = useRef(false);

  const renewSession = useCallback(async () => {
    // Evitar renovações simultâneas
    if (isRenewingRef.current) return;
    
    const savedUser = localStorage.getItem('ggv-user');
    if (!savedUser) return;

    try {
      isRenewingRef.current = true;
      const newTimestamp = Date.now().toString();
      
      // Atualizar timestamps locais
      localStorage.setItem('ggv-user-timestamp', newTimestamp);
      sessionStorage.setItem('ggv-user-timestamp', newTimestamp);
      
      // Também renovar a sessão do Supabase se existir
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // Forçar renovação do token do Supabase
            await supabase.auth.refreshSession();
            console.log('🔄 SESSION - Sessão Supabase renovada junto com timestamp local');
          }
        } catch (supabaseError) {
          // Se der erro no Supabase, não é crítico - continuamos com o sistema local
          console.warn('⚠️ SESSION - Erro ao renovar sessão Supabase (não crítico):', supabaseError);
        }
      }
      
      console.log('🔄 SESSION - Timestamp renovado por atividade do usuário (100h válidas)');
    } catch (error) {
      console.error('❌ SESSION - Erro ao renovar sessão:', error);
    } finally {
      isRenewingRef.current = false;
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
      'blur',
      'visibilitychange'  // Detectar quando o usuário volta para a aba
    ];

    // Throttle para evitar muitas renovações - reduzido para 3 minutos
    const throttleTime = 3 * 60 * 1000; // 3 minutos

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastRenewalRef.current > throttleTime) {
        renewSession();
        lastRenewalRef.current = now;
      }
    };

    // Adicionar listeners para todos os eventos de atividade
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Renovar automaticamente a cada 15 minutos (mais frequente para garantir)
    const interval = setInterval(renewSession, 15 * 60 * 1000);

    // Renovar imediatamente quando o hook for inicializado
    renewSession();

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
