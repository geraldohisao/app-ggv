import React, { useEffect, useRef } from 'react';
import { useUser } from '../../contexts/DirectUserContext';
import { supabase } from '../../services/supabaseClient';

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

interface PendingLog {
  created_at: string;
  level: LogLevel;
  category: string;
  message: string;
  data: any;
  source?: string;
  url?: string;
  app_version?: string;
  session_id?: string;
  user_email?: string;
  user_role?: string;
  user_id?: string | null;
}

/**
 * Captura global de logs e persiste no Supabase (public.debug_logs)
 * - Intercepta console.info/warn/error/debug
 * - Faz buffer e envia em lote para reduzir custo (até 20 itens ou 5s)
 * - Apenas quando usuário está autenticado
 */
const LogCapture: React.FC = () => {
  const { user } = useUser();
  const bufferRef = useRef<PendingLog[]>([]);
  const flushTimerRef = useRef<number | null>(null);
  const originalConsoleRef = useRef<{ log: any; warn: any; error: any; debug: any; info: any } | null>(null);
  const sessionIdRef = useRef<string>('');

  useEffect(() => {
    try {
      // Criar/recuperar session_id lógico
      const existing = sessionStorage.getItem('dbg.sessionId');
      if (existing) {
        sessionIdRef.current = existing;
      } else {
        const sid = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        sessionStorage.setItem('dbg.sessionId', sid);
        sessionIdRef.current = sid;
      }

      // Guard: apenas com usuário autenticado
      if (!user) return;

      // Salvar métodos originais
      originalConsoleRef.current = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
        info: console.info
      };

      const enqueue = (level: LogLevel, args: any[], category = 'console') => {
        try {
          // Evitar recursion por mensagens do próprio sistema
          if (Array.isArray(args) && typeof args[0] === 'string' && args[0].includes('[DEBUG-PANEL]')) {
            return;
          }

          const message = args
            .map(a => (typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })()))
            .join(' ')
            .slice(0, 1000);

          const data = args.length > 1 ? (() => { try { return JSON.parse(JSON.stringify(args)); } catch { return { raw: String(args) }; } })() : (args[0] ?? null);

          const pending: PendingLog = {
            created_at: new Date().toISOString(),
            level,
            category,
            message,
            data,
            source: undefined,
            url: window.location.href,
            app_version: (window as any).__APP_VERSION__ || undefined,
            session_id: sessionIdRef.current,
            user_email: user?.email,
            user_role: user?.role,
            user_id: user?.id || null
          };

          bufferRef.current.push(pending);

          // Flush policies: lote de 20 ou a cada 5s
          if (bufferRef.current.length >= 20) {
            void flush();
          } else if (flushTimerRef.current === null) {
            flushTimerRef.current = window.setTimeout(() => {
              flushTimerRef.current = null;
              void flush();
            }, 5000) as unknown as number;
          }
        } catch {
          // ignore
        }
      };

      const wrap = (level: LogLevel, original: any) =>
        (...args: any[]) => {
          try { enqueue(level, args); } catch {}
          try { return original.apply(console, args); } catch { return undefined; }
        };

      // Interceptar
      console.log = wrap('info', originalConsoleRef.current.log);
      console.info = wrap('info', originalConsoleRef.current.info);
      console.warn = wrap('warn', originalConsoleRef.current.warn);
      console.error = wrap('error', originalConsoleRef.current.error);
      console.debug = wrap('debug', originalConsoleRef.current.debug);

      // Também capturar erros globais leves como logs
      const handleError = (event: ErrorEvent) => {
        enqueue('error', [event.message, { filename: event.filename, lineno: event.lineno, colno: event.colno }], 'global-error');
      };
      const handleRejection = (event: PromiseRejectionEvent) => {
        enqueue('error', [String(event.reason)], 'promise-rejection');
      };
      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleRejection);

      return () => {
        // Restaurar console
        if (originalConsoleRef.current) {
          console.log = originalConsoleRef.current.log;
          console.info = originalConsoleRef.current.info;
          console.warn = originalConsoleRef.current.warn;
          console.error = originalConsoleRef.current.error;
          console.debug = originalConsoleRef.current.debug;
        }
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleRejection);
      };
    } catch {
      // noop
    }
  }, [user?.id, user?.email, user?.role]);

  const flush = async () => {
    if (bufferRef.current.length === 0) return;
    const batch = bufferRef.current.splice(0, bufferRef.current.length);
    try {
      await supabase.from('debug_logs').insert(batch.map(item => ({
        created_at: item.created_at,
        level: item.level,
        category: item.category,
        message: item.message,
        data: item.data ?? {},
        source: item.source,
        url: item.url,
        app_version: item.app_version,
        session_id: item.session_id,
        user_email: item.user_email,
        user_role: item.user_role,
        user_id: item.user_id
      })));
    } catch (e) {
      // Silencioso para não gerar loops de erro
    }
  };

  // Componente não renderiza UI
  return null;
};

export default LogCapture;


