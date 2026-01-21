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

