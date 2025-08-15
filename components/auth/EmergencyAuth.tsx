import React from 'react';
import { User, UserRole } from '../../types';

interface EmergencyAuthProps {
  onAuthSuccess: (user: User) => void;
}

export const EmergencyAuth: React.FC<EmergencyAuthProps> = ({ onAuthSuccess }) => {
  const handleEmergencyLogin = () => {
    console.log('🚨 EMERGENCY AUTH - Forçando login...');
    
    // Extrair informações básicas da URL se possível
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
    
    const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
    
    let userEmail = 'usuario@ggv.com.br';
    let userName = 'Usuário GGV';
    let userId = 'emergency-' + Date.now();
    
    // Tentar extrair dados do token JWT se disponível
    if (accessToken) {
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        userEmail = payload.email || userEmail;
        userName = payload.user_metadata?.full_name || payload.user_metadata?.name || userName;
        userId = payload.sub || userId;
        console.log('📋 EMERGENCY AUTH - Dados extraídos do token:', { email: userEmail, name: userName, id: userId });
      } catch (error) {
        console.warn('⚠️ EMERGENCY AUTH - Não foi possível extrair dados do token, usando padrões');
      }
    }
    
    // Criar perfil de emergência
    const emergencyUser: User = {
      id: userId,
      email: userEmail,
      name: userName,
      initials: userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase(),
      role: userEmail === 'geraldo@grupoggv.com' ? UserRole.SuperAdmin : UserRole.User,
    };
    
    // Salvar no localStorage para persistir
    localStorage.setItem('ggv-emergency-user', JSON.stringify(emergencyUser));
    
    // Limpar URL
    const url = new URL(window.location.href);
    const params = url.searchParams;
    
    // Remover parâmetros OAuth
    ['access_token', 'expires_in', 'refresh_token', 'token_type', 'type', 'code', 'state', 'error', 'error_description'].forEach(param => {
      params.delete(param);
    });
    
    // Preservar deal_id
    const dealId = new URLSearchParams(window.location.search).get('deal_id');
    const cleanUrl = url.origin + url.pathname + (dealId ? `?deal_id=${dealId}` : '');
    
    // Limpar hash e atualizar URL
    window.history.replaceState({}, document.title, cleanUrl);
    
    console.log('🎉 EMERGENCY AUTH - Login de emergência realizado:', emergencyUser.email);
    console.log('💾 EMERGENCY AUTH - Usuário salvo no localStorage');
    
    // Recarregar página para que o UserContext pegue o usuário do localStorage
    window.location.reload();
  };

  return (
    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="text-center">
        <h3 className="text-sm font-bold text-red-800 mb-2">Problema no Login?</h3>
        <p className="text-xs text-red-700 mb-3">
          Se o login não está funcionando, você pode forçar a entrada no sistema:
        </p>
        <button
          onClick={handleEmergencyLogin}
          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg"
        >
          🚨 Forçar Login de Emergência
        </button>
        <p className="text-xs text-red-600 mt-2">
          (Isso criará um perfil temporário para você acessar o sistema)
        </p>
      </div>
    </div>
  );
};
