import React, { useEffect, useState } from 'react';
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
    <div className="flex flex-col gap-4 mb-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative max-w-xs w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input 
            value={local} 
            onChange={(e) => setLocal(e.target.value)} 
            placeholder="Buscar usuário..." 
            className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg w-full text-sm focus:ring-brand-500 focus:border-brand-500 transition-shadow" 
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            Total: {total}
          </span>
          <button 
            onClick={onRefresh} 
            className="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            title="Atualizar lista"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-gray-100">
        <select 
          value={roleFilter} 
          onChange={e => setRoleFilter(e.target.value as any)} 
          className="px-3 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:ring-brand-500 focus:border-brand-500"
        >
          <option value="ALL">Todos os Níveis</option>
          <option value={UserRole.User}>USER</option>
          <option value={UserRole.Admin}>ADMIN</option>
          <option value={UserRole.SuperAdmin}>SUPER_ADMIN</option>
        </select>

        {/* Mantendo filtro de função por compatibilidade, mas talvez devesse ser Cargo no futuro */}
        <select 
          value={funcFilter} 
          onChange={e => setFuncFilter(e.target.value as any)} 
          className="px-3 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:ring-brand-500 focus:border-brand-500"
        >
          <option value="ALL">Todas as Funções</option>
          <option value="SDR">SDR</option>
          <option value="Closer">Closer</option>
          <option value="Gestor">Gestor</option>
          <option value="Analista de Marketing">Analista de Marketing</option>
        </select>

        {statusFilter !== undefined && setStatusFilter && (
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value as any)} 
            className={`px-3 py-1.5 text-xs border rounded-md font-medium focus:ring-brand-500 focus:border-brand-500 ${
              statusFilter === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' :
              statusFilter === 'INACTIVE' ? 'bg-red-50 text-red-700 border-red-200' :
              'bg-white border-gray-300'
            }`}
          >
            <option value="ACTIVE">Apenas Ativos</option>
            <option value="INACTIVE">Apenas Inativos</option>
            <option value="ALL">Todos</option>
          </select>
        )}
        
        <button 
          onClick={onClear} 
          className="ml-auto text-xs text-gray-500 hover:text-gray-700 hover:underline px-2"
        >
          Limpar filtros
        </button>
      </div>
    </div>
  );
};

export default UserToolbar;
