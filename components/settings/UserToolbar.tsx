import React, { useEffect, useMemo, useState } from 'react';
import { UserRole } from '../../types';

type Props = {
  total: number;
  search: string; setSearch: (v: string) => void;
  roleFilter: UserRole | 'ALL'; setRoleFilter: (r: UserRole | 'ALL') => void;
  funcFilter: 'ALL' | 'SDR' | 'Closer' | 'Gestor'; setFuncFilter: (f: any) => void;
  statusFilter?: 'ALL' | 'ACTIVE' | 'INACTIVE'; setStatusFilter?: (s: 'ALL' | 'ACTIVE' | 'INACTIVE') => void;
  onRefresh: () => void; onClear: () => void;
};

export const UserToolbar: React.FC<Props> = ({ total, search, setSearch, roleFilter, setRoleFilter, funcFilter, setFuncFilter, statusFilter, setStatusFilter, onRefresh, onClear }) => {
  const [local, setLocal] = useState(search);
  useEffect(() => setLocal(search), [search]);
  useEffect(() => {
    const t = setTimeout(() => setSearch(local), 300);
    return () => clearTimeout(t);
  }, [local, setSearch]);

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-3 text-xs">
      <div className="text-slate-500">Registros: {total}</div>
      <div className="flex flex-wrap items-center gap-2">
        <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Buscar por nome ou email" className="px-3 py-1.5 border rounded-lg w-56" />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as any)} className="px-2 py-1.5 border rounded-lg">
          <option value="ALL">Todos os níveis</option>
          <option value={UserRole.User}>USER</option>
          <option value={UserRole.Admin}>ADMIN</option>
          <option value={UserRole.SuperAdmin}>SUPER_ADMIN</option>
        </select>
        <select value={funcFilter} onChange={e => setFuncFilter(e.target.value as any)} className="px-2 py-1.5 border rounded-lg">
          <option value="ALL">Todas funções</option>
          <option value="SDR">SDR</option>
          <option value="Closer">Closer</option>
          <option value="Gestor">Gestor</option>
          <option value="Analista de Marketing">Analista de Marketing</option>
        </select>
        {statusFilter !== undefined && setStatusFilter && (
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="px-2 py-1.5 border rounded-lg font-medium">
            <option value="ACTIVE">✅ Apenas Ativos</option>
            <option value="INACTIVE">🔴 Apenas Inativos</option>
            <option value="ALL">Todos (Ativos + Inativos)</option>
          </select>
        )}
        <button onClick={onRefresh} className="px-3 py-1.5 border rounded-lg hover:bg-slate-50 transition">Atualizar</button>
        <button onClick={onClear} className="px-3 py-1.5 border rounded-lg hover:bg-slate-50 transition">Limpar filtros</button>
      </div>
    </div>
  );
};

export default UserToolbar;


