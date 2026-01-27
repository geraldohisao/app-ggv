import { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';

export interface OKRUser {
  id: string;
  name: string;
  email: string;
  cargo: string | null;
  department: string | null;
  role: string;
  avatar_url?: string | null;
}

export function useOKRUsers() {
  const [users, setUsers] = useState<OKRUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase.rpc('list_users_for_okr');
        
        if (error) {
          console.error('Erro ao buscar usuários:', error);
          setUsers([]);
        } else {
          // #region agent log
          const host = typeof window !== 'undefined' ? window.location.hostname : '';
          const isLocal = host === 'localhost' || host === '127.0.0.1';
          const geraldo = data?.find(u => u.name?.toLowerCase().includes('geraldo'));
          if (isLocal) {
            fetch('http://127.0.0.1:7242/ingest/d9f25aad-ab08-4cdf-bf8b-99a2626827e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useOKRUsers.ts:26',message:'RPC list_users_for_okr returned',data:{totalUsers:data?.length,geraldoFound:!!geraldo,geraldoName:geraldo?.name,geraldoAvatarUrl:geraldo?.avatar_url,geraldoEmail:geraldo?.email},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
          }
          // #endregion
          setUsers(data || []);
        }
      } catch (err) {
        console.error('Erro:', err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return { users, loading };
}

/**
 * Formata usuário para exibição no select
 * Ex: "João Silva (CEO - Geral)"
 */
export function formatUserLabel(user: OKRUser): string {
  const parts = [user.name];
  
  if (user.cargo) {
    parts.push(user.cargo);
  }
  
  if (user.department) {
    parts.push(user.department.charAt(0).toUpperCase() + user.department.slice(1));
  }
  
  return parts.length > 1 
    ? `${parts[0]} (${parts.slice(1).join(' - ')})`
    : parts[0];
}

