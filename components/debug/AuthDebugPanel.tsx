import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { supabase } from '../../services/supabaseClient';

interface AuthDebugPanelProps {
  visible?: boolean;
}

export const AuthDebugPanel: React.FC<AuthDebugPanelProps> = ({ visible = false }) => {
  const { user, loading } = useUser();
  const [authEvents, setAuthEvents] = useState<string[]>([]);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  useEffect(() => {
    if (!supabase || !visible) return;

    const addEvent = (event: string) => {
      const timestamp = new Date().toLocaleTimeString();
      setAuthEvents(prev => [...prev.slice(-9), `${timestamp}: ${event}`]);
    };

    addEvent('Debug panel inicializado');

    // Monitor auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      addEvent(`Auth event: ${event}`);
      setSessionInfo(session ? {
        user_id: session.user?.id,
        email: session.user?.email,
        expires_at: new Date(session.expires_at! * 1000).toLocaleString()
      } : null);
    });

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionInfo(session ? {
        user_id: session.user?.id,
        email: session.user?.email,
        expires_at: new Date(session.expires_at! * 1000).toLocaleString()
      } : null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 w-80 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs font-mono z-50">
      <div className="mb-2 font-bold">🔍 Auth Debug Panel</div>
      
      <div className="mb-2">
        <div className="text-yellow-300">Estado:</div>
        <div>Loading: {loading ? '✓' : '✗'}</div>
        <div>User: {user ? `✓ (${user.email})` : '✗'}</div>
        <div>Supabase: {supabase ? '✓' : '✗'}</div>
      </div>

      {sessionInfo && (
        <div className="mb-2">
          <div className="text-yellow-300">Sessão:</div>
          <div>ID: {sessionInfo.user_id?.slice(-8)}</div>
          <div>Email: {sessionInfo.email}</div>
          <div>Expira: {sessionInfo.expires_at}</div>
        </div>
      )}

      <div className="mb-2">
        <div className="text-yellow-300">URL:</div>
        <div className="break-all">{window.location.href.slice(0, 50)}...</div>
      </div>

      <div>
        <div className="text-yellow-300">Eventos (últimos 10):</div>
        <div className="max-h-32 overflow-y-auto">
          {authEvents.map((event, i) => (
            <div key={i} className="text-xs">{event}</div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={() => setAuthEvents([])}
          className="px-2 py-1 bg-gray-700 rounded text-xs"
        >
          Limpar
        </button>
        <button
          onClick={() => {
            if (supabase) {
              supabase.auth.getSession().then(({ data: { session } }) => {
                console.log('🔍 DEBUG - Sessão atual:', session);
                const timestamp = new Date().toLocaleTimeString();
                setAuthEvents(prev => [...prev.slice(-9), `${timestamp}: Sessão manual: ${session ? 'ATIVA' : 'INATIVA'}`]);
              });
            }
          }}
          className="px-2 py-1 bg-blue-700 rounded text-xs"
        >
          Verificar Sessão
        </button>
        <button
          onClick={() => {
            const url = window.location.href;
            const hasAuth = url.includes('access_token') || url.includes('#access_token');
            const timestamp = new Date().toLocaleTimeString();
            setAuthEvents(prev => [...prev.slice(-9), `${timestamp}: URL tem auth: ${hasAuth ? 'SIM' : 'NÃO'}`]);
            console.log('🔍 DEBUG - URL completa:', url);
          }}
          className="px-2 py-1 bg-green-700 rounded text-xs"
        >
          Check URL
        </button>
      </div>
    </div>
  );
};

// Hook para ativar o debug panel em desenvolvimento
export const useAuthDebug = () => {
  const [debugVisible, setDebugVisible] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+Shift+D para ativar/desativar o debug
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setDebugVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return { debugVisible, setDebugVisible };
};

// Função global de diagnóstico (disponível no console como window.diagAuth)
declare global {
  interface Window {
    diagAuth: () => void;
  }
}

// Instalar função de diagnóstico no window
if (typeof window !== 'undefined') {
  window.diagAuth = async () => {
    console.log('🔍 DIAGNÓSTICO DE AUTENTICAÇÃO');
    console.log('================================');
    
    // 1. URL atual
    console.log('📍 URL:', window.location.href);
    console.log('   - Tem access_token na URL:', window.location.href.includes('access_token'));
    console.log('   - Tem access_token no hash:', window.location.hash.includes('access_token'));
    
    // 2. Supabase
    const { supabase } = await import('../../services/supabaseClient');
    console.log('🔧 Supabase cliente:', supabase ? 'CONFIGURADO' : 'NÃO CONFIGURADO');
    
    if (supabase) {
      try {
        // 3. Sessão atual
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('👤 Sessão atual:', session ? 'ATIVA' : 'INATIVA');
        if (session) {
          console.log('   - User ID:', session.user.id);
          console.log('   - Email:', session.user.email);
          console.log('   - Expira em:', new Date(session.expires_at! * 1000).toLocaleString());
        }
        if (error) {
          console.error('   - Erro ao obter sessão:', error);
        }
        
        // 4. Local Storage
        console.log('💾 LocalStorage:');
        const keys = Object.keys(localStorage).filter(k => k.includes('supabase'));
        keys.forEach(key => {
          console.log(`   - ${key}: ${localStorage.getItem(key)?.slice(0, 50)}...`);
        });
        
      } catch (error) {
        console.error('❌ Erro no diagnóstico:', error);
      }
    }
    
    console.log('================================');
    console.log('💡 Para limpar e tentar novamente:');
    console.log('   localStorage.clear(); window.location.reload();');
  };
}
