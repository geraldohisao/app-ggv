import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { fetchOrCreateUserWithRole } from '../services/supabaseService';
import { User } from '../types';

export function useUserWithRole() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        if (!supabase) {
          setLoading(false);
          return;
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setUser(null);
          setLoading(false);
          return;
        }
        const full = await fetchOrCreateUserWithRole();
        if (isMounted) setUser(full);
      } catch (e) {
        console.error('useUserWithRole error:', e);
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Rodar uma vez ao montar
    init();

    // Reagir a mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      init();
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return { user, loading } as const;
}


