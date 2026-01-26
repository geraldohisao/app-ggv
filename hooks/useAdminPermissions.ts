import { useContext } from 'react';
import { UserContext as DirectUserContext } from '../contexts/DirectUserContext';
import { UserContext as LegacyUserContext } from '../contexts/UserContext';
import { UserRole, User } from '../types';

/**
 * Hook para verificar permissões de administrador
 * Retorna se o usuário atual tem permissões de admin ou super admin
 * Funciona tanto no contexto principal quanto no dashboard de chamadas
 * Versão robusta para produção e desenvolvimento
 */
export function useAdminPermissions() {
  // Importante: durante impersonação, o user do contexto "Direto" já é o usuário impersonado.
  // O contexto legado e o localStorage podem conter o usuário original (Admin) e causar vazamento de permissões.
  const direct = useContext(DirectUserContext);
  const legacy = useContext(LegacyUserContext);

  let currentUser: User | null = (direct as any)?.user || (legacy as any)?.user || null;

  const tryReadImpersonatedUser = (): User | null => {
    try {
      const raw =
        localStorage.getItem('ggv-impersonation') || sessionStorage.getItem('ggv-impersonation');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as any;
      const imp = parsed?.impersonatedUser;
      if (!imp?.id || !imp?.email || !imp?.name) return null;
      return {
        id: imp.id,
        email: imp.email,
        name: imp.name,
        initials:
          imp.initials ||
          String(imp.name)
            .split(' ')
            .map((n: string) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase(),
        role: (imp.role as UserRole) || UserRole.User,
      } as User;
    } catch {
      return null;
    }
  };

  const tryReadStoredUser = (): User | null => {
    try {
      // Priorizar impersonação (se existir) para não vazar o role do usuário original.
      const imp = tryReadImpersonatedUser();
      if (imp) return imp;

      const raw = localStorage.getItem('ggv-user') || sessionStorage.getItem('ggv-user');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as any;
      if (!parsed?.id || !parsed?.email || !parsed?.name) return null;
      return {
        id: parsed.id,
        email: parsed.email,
        name: parsed.name,
        initials:
          parsed.initials ||
          String(parsed.name)
            .split(' ')
            .map((n: string) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase(),
        role: (parsed.role as UserRole) || UserRole.User,
      } as User;
    } catch {
      return null;
    }
  };

  if (!currentUser) {
    currentUser = tryReadStoredUser();
  }
  
  const isAdmin = currentUser?.role === UserRole.Admin;
  const isSuperAdmin = currentUser?.role === UserRole.SuperAdmin;
  const isAdminOrSuperAdmin = isAdmin || isSuperAdmin;
  
  return {
    isAdmin,
    isSuperAdmin,
    isAdminOrSuperAdmin,
    user: currentUser
  };
}

/**
 * Hook para verificar se o usuário pode acessar funcionalidades administrativas
 * Inclui análise manual e reprocessamento
 */
export function useAdminFeatures() {
  const { isAdminOrSuperAdmin, user } = useAdminPermissions();
  
  return {
    canAccessManualAnalysis: isAdminOrSuperAdmin,
    canAccessReprocessing: isAdminOrSuperAdmin,
    canAccessBulkOperations: isAdminOrSuperAdmin,
    user
  };
}
