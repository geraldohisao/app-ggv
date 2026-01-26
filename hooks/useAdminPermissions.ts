import { UserRole, User } from '../types';

/**
 * Hook para verificar permissões de administrador
 * Retorna se o usuário atual tem permissões de admin ou super admin
 * Funciona tanto no contexto principal quanto no dashboard de chamadas
 * Versão robusta para produção e desenvolvimento
 */
export function useAdminPermissions() {
  // IMPORTANTE:
  // Este hook precisa ser estável mesmo durante impersonação e em módulos diferentes.
  // A fonte mais confiável aqui é o storage:
  // - se existir `ggv-impersonation`, usar SEMPRE o `impersonatedUser` (para não vazar role do usuário original).
  // - caso contrário, usar `ggv-user`.
  // Evitamos depender de Context aqui para não criar ciclos/erros em runtime.

  const safeGet = (key: string): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(key) || sessionStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const toUser = (raw: any): User | null => {
    if (!raw?.id || !raw?.email || !raw?.name) return null;
    return {
      id: raw.id,
      email: raw.email,
      name: raw.name,
      initials:
        raw.initials ||
        String(raw.name)
          .split(' ')
          .map((n: string) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase(),
      role: (raw.role as UserRole) || UserRole.User,
    } as User;
  };

  const readCurrentUser = (): User | null => {
    try {
      const impRaw = safeGet('ggv-impersonation');
      if (impRaw) {
        const parsed = JSON.parse(impRaw) as any;
        const impUser = toUser(parsed?.impersonatedUser);
        if (impUser) return impUser;
      }

      const userRaw = safeGet('ggv-user');
      if (userRaw) {
        const parsed = JSON.parse(userRaw) as any;
        const u = toUser(parsed);
        if (u) return u;
      }
    } catch {
      // ignore
    }
    return null;
  };

  const currentUser: User | null = readCurrentUser();
  
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
