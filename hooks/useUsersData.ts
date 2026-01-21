import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UserRole } from '../types';
import { listProfiles, setUserFunction, setUserRole, setUserCargo } from '../services/supabaseService';

export type UserFunction = 'SDR' | 'Closer' | 'Gestor' | 'Analista de Marketing' | '-';
export interface UiUser { 
  id: string; 
  name: string; 
  email: string; 
  role: UserRole; 
  func: UserFunction | string;
  cargo?: string;
  department?: string;
  isActive: boolean;
}

export function useUsersData() {
  const [users, setUsers] = useState<UiUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [funcFilter, setFuncFilter] = useState<UserFunction | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100); // ✅ Aumentado para 100

  const originalRef = useRef<Map<string, UiUser>>(new Map());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // ✅ Para gestão de usuários, trazer TODOS (incluindo inativos)
      // O filtro de status será aplicado depois no useMemo
      const rows = await listProfiles(true); // true = incluir inativos
      const mapped: UiUser[] = rows.map((r: any) => ({
        id: r.id,
        name: r.name || r.email || r.id,
        email: r.email || '-',
        role: r.role as UserRole,
        func: (r.user_function as any) || '-',
        cargo: r.cargo || '-',
        department: r.department || null,
        isActive: r.is_active !== undefined ? r.is_active : true,
      }));
      // ordenar por nome
      mapped.sort((a, b) => a.name.localeCompare(b.name));
      setUsers(mapped);
      originalRef.current = new Map(mapped.map(u => [u.id, u]));
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Dados filtrados
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      const okQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const okRole = roleFilter === 'ALL' || u.role === roleFilter;
      const okFunc = funcFilter === 'ALL' || u.func === funcFilter;
      const okStatus = statusFilter === 'ALL' || 
                      (statusFilter === 'ACTIVE' && u.isActive) ||
                      (statusFilter === 'INACTIVE' && !u.isActive);
      return okQ && okRole && okFunc && okStatus;
    });
  }, [users, search, roleFilter, funcFilter, statusFilter]);

  const total = filtered.length;
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const updateUser = useCallback(async (id: string, patch: Partial<Pick<UiUser, 'role' | 'func' | 'isActive' | 'cargo'>>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
    try {
      if (patch.role) await setUserRole(id, patch.role);
      if (patch.func && patch.func !== '-') await setUserFunction(id, patch.func as any);
      if (patch.func === '-') {
        await setUserFunction(id, undefined as any);
      }
      if (patch.cargo !== undefined) {
        await setUserCargo(id, patch.cargo === '-' ? null : patch.cargo);
      }
      if (patch.isActive !== undefined) {
        const { toggleUserStatus } = await import('../services/supabaseService');
        await toggleUserStatus(id, patch.isActive);
      }
    } catch (e) {
      const original = originalRef.current.get(id);
      if (original) setUsers(prev => prev.map(u => u.id === id ? original : u));
      throw e;
    }
  }, []);

  const bulkUpdate = useCallback(async (ids: string[], patch: Partial<Pick<UiUser, 'role' | 'func' | 'isActive' | 'cargo'>>) => {
    // otimista
    setUsers(prev => prev.map(u => ids.includes(u.id) ? { ...u, ...patch } : u));
    try {
      const { toggleUserStatus } = await import('../services/supabaseService');
      await Promise.allSettled(ids.map(async (id) => {
        if (patch.role) await setUserRole(id, patch.role);
        if (patch.func && patch.func !== '-') await setUserFunction(id, patch.func as any);
        if (patch.func === '-') await setUserFunction(id, undefined as any);
        if (patch.cargo !== undefined) await setUserCargo(id, patch.cargo === '-' ? null : patch.cargo);
        if (patch.isActive !== undefined) await toggleUserStatus(id, patch.isActive);
      }));
    } catch (e) {
      await refresh();
      throw e;
    }
  }, [refresh]);

  return {
    users: paged,
    total,
    loading,
    error,
    page,
    pageSize,
    setPage,
    setPageSize,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    funcFilter,
    setFuncFilter,
    statusFilter,
    setStatusFilter,
    refresh,
    updateUser,
    bulkUpdate,
  } as const;
}


