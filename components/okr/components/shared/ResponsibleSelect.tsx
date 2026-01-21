import React, { useState, useEffect, useRef } from 'react';
import { OKRUser, formatUserLabel } from '../../hooks/useOKRUsers';

interface ResponsibleSelectProps {
  mode: 'none' | 'internal' | 'external';
  onModeChange: (mode: 'none' | 'internal' | 'external') => void;
  selectedUserId: string;
  onUserSelect: (userId: string) => void;
  externalName: string;
  onExternalNameChange: (name: string) => void;
  users: OKRUser[];
  loading?: boolean;
}

export const ResponsibleSelect: React.FC<ResponsibleSelectProps> = ({
  mode,
  onModeChange,
  selectedUserId,
  onUserSelect,
  externalName,
  onExternalNameChange,
  users,
  loading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtra usuários
  const filteredUsers = users.filter(user => {
    const label = formatUserLabel(user).toLowerCase();
    return label.includes(searchTerm.toLowerCase());
  });

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="space-y-3">
      {/* Segmented Control */}
      <div className="flex p-1 bg-slate-100 rounded-xl w-full">
        <button
          type="button"
          onClick={() => onModeChange('none')}
          className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
            mode === 'none'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Nenhum
        </button>
        <button
          type="button"
          onClick={() => onModeChange('internal')}
          className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
            mode === 'internal'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Interno
        </button>
        <button
          type="button"
          onClick={() => onModeChange('external')}
          className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
            mode === 'external'
              ? 'bg-white text-rose-600 shadow-sm'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Externo
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[60px]">
        {mode === 'none' && (
          <div className="h-[50px] flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50">
            <span className="text-xs text-slate-400 font-medium">Nenhum responsável atribuído</span>
          </div>
        )}

        {mode === 'external' && (
          <input
            value={externalName}
            onChange={(e) => onExternalNameChange(e.target.value)}
            placeholder="Nome da pessoa externa..."
            className="w-full bg-slate-50 rounded-2xl px-5 py-3 border-none focus:ring-2 focus:ring-rose-500 text-sm font-bold text-slate-700 placeholder:text-slate-300 transition-all"
            autoFocus
          />
        )}

        {mode === 'internal' && (
          <div className="relative" ref={wrapperRef}>
            {/* Trigger Button / Search Input when open */}
            <div
              onClick={() => setIsOpen(true)}
              className={`
                w-full bg-slate-50 rounded-2xl border-2 transition-all cursor-pointer relative
                ${isOpen ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-transparent hover:bg-slate-100'}
              `}
            >
              <div className="px-5 py-3 flex items-center justify-between">
                {selectedUser ? (
                  <div className="flex items-center gap-3 overflow-hidden">
                    {/* Avatar Placeholder */}
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black flex-shrink-0">
                      {selectedUser.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="text-sm font-bold text-slate-700 truncate">{selectedUser.name}</span>
                      <span className="text-[10px] text-slate-400 truncate font-medium uppercase tracking-wider">
                        {selectedUser.cargo || selectedUser.department || 'Membro'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-sm font-bold text-slate-400">Selecione um usuário...</span>
                )}
                
                <svg className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar usuário..."
                  className="w-full bg-slate-50 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 border-none focus:ring-2 focus:ring-indigo-500 mb-2"
                  autoFocus
                />
                
                <div className="max-h-[200px] overflow-y-auto space-y-1 custom-scrollbar">
                  {loading ? (
                    <div className="p-4 text-center text-xs text-slate-400">Carregando...</div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">Nenhum usuário encontrado.</div>
                  ) : (
                    filteredUsers.map(user => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          onUserSelect(user.id);
                          setIsOpen(false);
                          setSearchTerm('');
                        }}
                        className={`
                          w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors
                          ${selectedUserId === user.id ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-50 text-slate-700'}
                        `}
                      >
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-xs font-black
                          ${selectedUserId === user.id ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-200 text-slate-500'}
                        `}>
                          {user.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold">{user.name}</p>
                          <p className="text-[10px] opacity-70 uppercase tracking-wider">
                            {user.cargo || user.department}
                          </p>
                        </div>
                        {selectedUserId === user.id && (
                          <svg className="w-4 h-4 ml-auto text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
