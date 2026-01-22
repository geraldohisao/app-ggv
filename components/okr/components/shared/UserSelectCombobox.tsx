import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { OKRUser } from '../../hooks/useOKRUsers';

interface UserSelectComboboxProps {
  users: OKRUser[];
  value: string | null;
  onChange: (value: string | null) => void;
  loading?: boolean;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  /** Campo a retornar: 'id' (padrão) ou 'name' */
  returnField?: 'id' | 'name';
  /** Se true, o campo é obrigatório */
  required?: boolean;
}

export const UserSelectCombobox: React.FC<UserSelectComboboxProps> = ({
  users,
  value,
  onChange,
  loading = false,
  placeholder = 'Selecione um responsável',
  label,
  disabled = false,
  returnField = 'id',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedUser = useMemo(() => {
    if (!value) return null;
    // Procurar por id ou name dependendo do returnField
    if (returnField === 'name') {
      return users.find(u => u.name.toLowerCase() === value.toLowerCase()) || null;
    }
    return users.find(u => u.id === value) || null;
  }, [users, value, returnField]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const searchLower = search.toLowerCase();
    return users.filter(
      u =>
        u.name?.toLowerCase().includes(searchLower) ||
        u.email?.toLowerCase().includes(searchLower) ||
        u.cargo?.toLowerCase().includes(searchLower) ||
        u.department?.toLowerCase().includes(searchLower)
    );
  }, [users, search]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fechar com ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen]);

  const handleSelect = (user: OKRUser | null) => {
    if (user) {
      onChange(returnField === 'name' ? user.name : user.id);
    } else {
      onChange(null);
    }
    setIsOpen(false);
    setSearch('');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-indigo-500',
      'bg-emerald-500',
      'bg-amber-500',
      'bg-rose-500',
      'bg-violet-500',
      'bg-cyan-500',
      'bg-pink-500',
      'bg-teal-500',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Trigger / Display */}
      <div
        role="button"
        tabIndex={disabled || loading ? -1 : 0}
        aria-disabled={disabled || loading}
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (disabled || loading) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left
          ${isOpen ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-transparent'}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'bg-slate-50 hover:bg-slate-100 cursor-pointer'}
        `}
      >
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-sm">Carregando...</span>
          </div>
        ) : selectedUser ? (
          <>
            {/* Avatar do usuário selecionado */}
            {selectedUser.avatar_url ? (
              <img
                src={selectedUser.avatar_url}
                alt={selectedUser.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className={`w-8 h-8 rounded-full ${getAvatarColor(selectedUser.name)} flex items-center justify-center`}>
                <span className="text-white text-xs font-bold">{getInitials(selectedUser.name)}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{selectedUser.name}</p>
              {(selectedUser.cargo || selectedUser.department) && (
                <p className="text-xs text-slate-400 truncate">
                  {[selectedUser.cargo, selectedUser.department].filter(Boolean).join(' • ')}
                </p>
              )}
            </div>
            {/* Botão limpar */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(null);
              }}
              className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg transition-colors"
              title="Remover responsável"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-sm text-slate-400 flex-1">{placeholder}</span>
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Campo de busca */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, cargo ou área..."
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border-none text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Lista de usuários */}
          <div className="max-h-64 overflow-y-auto">
            {/* Opção "Nenhum" */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                ${!value ? 'bg-indigo-50' : 'hover:bg-slate-50'}
              `}
            >
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <span className="text-sm text-slate-500">Nenhum responsável</span>
              {!value && (
                <svg className="w-4 h-4 text-indigo-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {/* Separador */}
            <div className="border-t border-slate-100" />

            {filteredUsers.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-slate-400">Nenhum usuário encontrado</p>
                <p className="text-xs text-slate-300 mt-1">Tente buscar por outro termo</p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = returnField === 'name' 
                  ? value?.toLowerCase() === user.name.toLowerCase()
                  : value === user.id;
                return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelect(user)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                    ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}
                  `}
                >
                  {/* Avatar */}
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-8 h-8 rounded-full ${getAvatarColor(user.name)} flex items-center justify-center`}>
                      <span className="text-white text-xs font-bold">{getInitials(user.name)}</span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {[user.cargo, user.department].filter(Boolean).join(' • ') || user.email}
                    </p>
                  </div>

                  {/* Check se selecionado */}
                  {isSelected && (
                    <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
              })
            )}
          </div>

          {/* Footer com contagem */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              {filteredUsers.length} de {users.length} usuários
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
