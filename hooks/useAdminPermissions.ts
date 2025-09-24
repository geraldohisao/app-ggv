import { useUser } from '../contexts/UserContext';
import { UserRole, User } from '../types';

/**
 * Hook para verificar permissões de administrador
 * Retorna se o usuário atual tem permissões de admin ou super admin
 * Funciona tanto no contexto principal quanto no dashboard de chamadas
 * Versão robusta para produção e desenvolvimento
 */
export function useAdminPermissions() {
  const { user } = useUser();
  
  // Fallback: tentar detectar usuário do localStorage se o contexto não estiver disponível
  let currentUser = user;
  
  if (!currentUser) {
    try {
      // Primeiro, tentar ler do objeto ggv-user (formato principal)
      const ggvUser = localStorage.getItem('ggv-user');
      if (ggvUser) {
        try {
          const userData = JSON.parse(ggvUser);
          console.log('🔍 ADMIN PERMISSIONS - Dados do ggv-user encontrados:', userData);
          
          if (userData.email && userData.name && userData.id) {
            // Detectar role baseado no email (mesma lógica do contexto)
            const isSuperAdminEmail = userData.email === 'geraldo@grupoggv.com' || userData.email === 'geraldo@ggvinteligencia.com.br';
            const role = isSuperAdminEmail ? UserRole.SuperAdmin : UserRole.User;
            
            currentUser = {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              initials: userData.initials || userData.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase(),
              role: role
            };
            
            console.log('✅ ADMIN PERMISSIONS - Usuário detectado do ggv-user:', currentUser);
          }
        } catch (parseError) {
          console.warn('⚠️ ADMIN PERMISSIONS - Erro ao parsear ggv-user:', parseError);
        }
      }
      
      // Fallback: tentar chaves individuais (compatibilidade)
      if (!currentUser) {
        const userEmail = localStorage.getItem('ggv_user_email') || 
                         localStorage.getItem('user_email') || 
                         localStorage.getItem('email');
        const userName = localStorage.getItem('ggv_user_name') || 
                        localStorage.getItem('user_name') || 
                        localStorage.getItem('name');
        const userId = localStorage.getItem('ggv_user_id') || 
                      localStorage.getItem('user_id') || 
                      localStorage.getItem('id');
        
        console.log('🔍 ADMIN PERMISSIONS - Tentando chaves individuais:', {
          userEmail,
          userName,
          userId,
          localStorageKeys: Object.keys(localStorage).filter(k => k.includes('user') || k.includes('email') || k.includes('name'))
        });
        
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
          
          console.log('✅ ADMIN PERMISSIONS - Usuário detectado das chaves individuais:', currentUser);
        } else {
          console.warn('⚠️ ADMIN PERMISSIONS - Dados de usuário incompletos no localStorage:', {
            hasEmail: !!userEmail,
            hasName: !!userName,
            hasId: !!userId
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ ADMIN PERMISSIONS - Erro ao detectar usuário do localStorage:', error);
    }
  } else {
    console.log('✅ ADMIN PERMISSIONS - Usuário detectado do contexto:', currentUser);
  }
  
  const isAdmin = currentUser?.role === UserRole.Admin;
  const isSuperAdmin = currentUser?.role === UserRole.SuperAdmin;
  const isAdminOrSuperAdmin = isAdmin || isSuperAdmin;
  
  console.log('🔐 ADMIN PERMISSIONS - Verificação de permissões:', {
    user: currentUser?.name,
    email: currentUser?.email,
    role: currentUser?.role,
    isAdmin,
    isSuperAdmin,
    isAdminOrSuperAdmin
  });
  
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
