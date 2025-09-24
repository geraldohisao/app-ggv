import React from 'react';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';
import { useUser } from '../../contexts/UserContext';

/**
 * Componente de debug para verificar permissões de administrador
 * Útil para identificar problemas em produção
 */
export const AdminPermissionsDebug: React.FC = () => {
  const { user: contextUser } = useUser();
  const { isAdmin, isSuperAdmin, isAdminOrSuperAdmin, user } = useAdminPermissions();
  
  // Verificar localStorage
  const localStorageData = {
    ggv_user_email: localStorage.getItem('ggv_user_email'),
    ggv_user_name: localStorage.getItem('ggv_user_name'),
    ggv_user_id: localStorage.getItem('ggv_user_id'),
    user_email: localStorage.getItem('user_email'),
    user_name: localStorage.getItem('user_name'),
    user_id: localStorage.getItem('user_id'),
    email: localStorage.getItem('email'),
    name: localStorage.getItem('name'),
    id: localStorage.getItem('id')
  };
  
  // Verificar todas as chaves do localStorage
  const allLocalStorageKeys = Object.keys(localStorage).filter(k => 
    k.includes('user') || k.includes('email') || k.includes('name') || k.includes('id')
  );
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
      <h3 className="text-lg font-semibold text-yellow-800 mb-3">🔍 Debug - Permissões de Administrador</h3>
      
      <div className="space-y-3 text-sm">
        <div>
          <strong>Contexto de Usuário:</strong>
          <pre className="bg-white p-2 rounded text-xs overflow-auto">
            {JSON.stringify(contextUser, null, 2)}
          </pre>
        </div>
        
        <div>
          <strong>Hook de Permissões:</strong>
          <pre className="bg-white p-2 rounded text-xs overflow-auto">
            {JSON.stringify({ isAdmin, isSuperAdmin, isAdminOrSuperAdmin, user }, null, 2)}
          </pre>
        </div>
        
        <div>
          <strong>LocalStorage (Dados de Usuário):</strong>
          <pre className="bg-white p-2 rounded text-xs overflow-auto">
            {JSON.stringify(localStorageData, null, 2)}
          </pre>
        </div>
        
        <div>
          <strong>Chaves do LocalStorage:</strong>
          <pre className="bg-white p-2 rounded text-xs overflow-auto">
            {JSON.stringify(allLocalStorageKeys, null, 2)}
          </pre>
        </div>
        
        <div>
          <strong>URL Atual:</strong>
          <div className="bg-white p-2 rounded text-xs break-all">
            {window.location.href}
          </div>
        </div>
        
        <div>
          <strong>Hostname:</strong>
          <div className="bg-white p-2 rounded text-xs">
            {window.location.hostname}
          </div>
        </div>
        
        <div>
          <strong>Ambiente:</strong>
          <div className="bg-white p-2 rounded text-xs">
            {window.location.hostname === 'app.grupoggv.com' ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPermissionsDebug;
