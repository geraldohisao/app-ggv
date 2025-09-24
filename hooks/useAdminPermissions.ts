import { useUser } from '../contexts/UserContext';
import { UserRole, User } from '../types';

/**
 * Hook para verificar permissões de administrador
 * Retorna se o usuário atual tem permissões de admin ou super admin
 * Funciona tanto no contexto principal quanto no dashboard de chamadas
 */
export function useAdminPermissions() {
  const { user } = useUser();
  
  // Fallback: tentar detectar usuário do localStorage se o contexto não estiver disponível
  let currentUser = user;
  
  if (!currentUser) {
    try {
      const userEmail = localStorage.getItem('ggv_user_email');
      const userName = localStorage.getItem('ggv_user_name');
      const userId = localStorage.getItem('ggv_user_id');
      
      if (userEmail && userName && userId) {
        // Detectar role baseado no email (mesma lógica do contexto)
        const isSuperAdminEmail = userEmail === 'geraldo@grupoggv.com' || userEmail === 'geraldo@ggvinteligencia.com.br';
        const role = isSuperAdminEmail ? UserRole.SuperAdmin : UserRole.User;
        
        currentUser = {
          id: userId,
          email: userEmail,
          name: userName,
          initials: userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase(),
          role: role
        };
        
        console.log('🔍 ADMIN PERMISSIONS - Usuário detectado do localStorage:', currentUser);
      }
    } catch (error) {
      console.warn('⚠️ ADMIN PERMISSIONS - Erro ao detectar usuário do localStorage:', error);
    }
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
