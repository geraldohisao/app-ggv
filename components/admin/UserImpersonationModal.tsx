import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useUser } from '../../contexts/DirectUserContext';
import { listProfilesOnly } from '../../services/supabaseService';
import { UserRole } from '../../types';

interface UserImpersonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProfileItem {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  function?: 'SDR' | 'Closer' | 'Gestor';
  is_active?: boolean;
}

const UserImpersonationModal: React.FC<UserImpersonationModalProps> = ({ isOpen, onClose }) => {
  const { user, isImpersonating, originalUser, startImpersonation, stopImpersonation } = useUser();
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [switching, setSwitching] = useState(false);

  // Load profiles when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProfiles();
    }
  }, [isOpen]);

  const loadProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listProfilesOnly();
      // Filter to only active users
      const activeProfiles = data.filter(p => p.is_active !== false);
      setProfiles(activeProfiles);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  // Filter profiles based on search term
  const filteredProfiles = useMemo(() => {
    if (!searchTerm.trim()) return profiles;
    const term = searchTerm.toLowerCase();
    return profiles.filter(p => 
      p.name?.toLowerCase().includes(term) || 
      p.email?.toLowerCase().includes(term)
    );
  }, [profiles, searchTerm]);

  const handleSelectUser = async (profile: ProfileItem) => {
    // Don't allow selecting current user
    const currentUserId = isImpersonating ? originalUser?.id : user?.id;
    if (profile.id === currentUserId) return;

    setSwitching(true);
    try {
      const success = await startImpersonation(profile.id);
      if (success) {
        onClose();
      } else {
        setError('Falha ao trocar visão. Tente novamente.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao trocar visão');
    } finally {
      setSwitching(false);
    }
  };

  const handleStopImpersonation = () => {
    stopImpersonation();
    onClose();
  };

  const handleClose = () => {
    setSearchTerm('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const realUser = originalUser || user;

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[2147483646] transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-[2147483647] transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Trocar Visão</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Visualize o sistema como outro usuário
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Current Status Banner */}
          {isImpersonating && originalUser && (
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  <span className="text-sm text-amber-800">
                    Vendo como: <strong>{user?.name}</strong>
                  </span>
                </div>
                <button
                  onClick={handleStopImpersonation}
                  className="text-xs px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded transition-colors"
                >
                  Voltar para {originalUser.name?.split(' ')[0]}
                </button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <svg 
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="p-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                  {error}
                </div>
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário disponível'}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filteredProfiles.map((profile) => {
                  const isCurrentUser = profile.id === (isImpersonating ? originalUser?.id : user?.id);
                  const isViewingAs = isImpersonating && profile.id === user?.id;
                  
                  return (
                    <li key={profile.id}>
                      <button
                        onClick={() => handleSelectUser(profile)}
                        disabled={switching || isCurrentUser}
                        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                          isCurrentUser 
                            ? 'bg-gray-50 cursor-not-allowed opacity-60' 
                            : isViewingAs
                            ? 'bg-blue-50 hover:bg-blue-100'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          isViewingAs ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {(profile.name || profile.email || 'U')
                            .split(' ')
                            .map((n: string) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate">
                              {profile.name || 'Sem nome'}
                            </p>
                            {isCurrentUser && (
                              <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">
                                Você
                              </span>
                            )}
                            {isViewingAs && (
                              <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                Ativo
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate">{profile.email}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {profile.role && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                profile.role === UserRole.SuperAdmin 
                                  ? 'bg-purple-100 text-purple-700'
                                  : profile.role === UserRole.Admin
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {profile.role === UserRole.SuperAdmin ? 'Super Admin' : 
                                 profile.role === UserRole.Admin ? 'Admin' : 'User'}
                              </span>
                            )}
                            {profile.function && (
                              <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                                {profile.function}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Arrow */}
                        {!isCurrentUser && (
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              {isImpersonating 
                ? `Logado como ${realUser?.name}. A visão atual é de ${user?.name}.`
                : `Logado como ${realUser?.name}`}
            </p>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default UserImpersonationModal;
