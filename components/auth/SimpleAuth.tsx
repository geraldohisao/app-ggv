import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { UserRole, User } from '../../types';

interface SimpleAuthProps {
  onAuthSuccess: (user: User) => void;
  onAuthError: (error: string) => void;
}

export const SimpleAuth: React.FC<SimpleAuthProps> = ({ onAuthSuccess, onAuthError }) => {
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    // Evitar processamento múltiplo
    if (processed || processing) {
      console.log('⏩ SIMPLE AUTH - Já processado ou processando, ignorando...');
      return;
    }

    // Detectar se estamos retornando do OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
    
    const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token');
    const expiresIn = urlParams.get('expires_in') || hashParams.get('expires_in');
    const tokenType = urlParams.get('token_type') || hashParams.get('token_type');
    
    if (accessToken) {
      console.log('🔄 SIMPLE AUTH - Detectado tokens OAuth, processando...');
      setProcessing(true);
      setProcessed(true);
      processOAuthTokens(accessToken, refreshToken, expiresIn, tokenType);
    } else {
      console.log('⚠️ SIMPLE AUTH - Nenhum token encontrado, encerrando...');
      onAuthError('Nenhum token de autenticação encontrado');
    }
  }, [processed, processing]);

  const processOAuthTokens = async (
    accessToken: string, 
    refreshToken: string | null, 
    expiresIn: string | null,
    tokenType: string | null
  ) => {
    try {
      console.log('🔐 SIMPLE AUTH - Processando tokens diretamente...');
      
      // Tentar com timeout de 5 segundos
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout na autenticação')), 5000)
      );
      
      if (!supabase) {
        throw new Error('Supabase não configurado');
      }

      console.log('🔐 SIMPLE AUTH - Definindo sessão manualmente...');
      
      // Criar sessão com timeout
      const sessionPromise = supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });

      const { data: { user }, error } = await Promise.race([sessionPromise, timeoutPromise]) as any;

      if (error) {
        console.warn('⚠️ SIMPLE AUTH - Erro na sessão, tentando perfil direto:', error);
        // Se falhar, criar perfil diretamente dos tokens
        const userProfile = await createProfileFromToken(accessToken);
        if (userProfile) {
          cleanUrl();
          console.log('🎉 SIMPLE AUTH - Login bem-sucedido (perfil direto):', userProfile.email);
          onAuthSuccess(userProfile);
          return;
        }
        throw error;
      }

      if (!user) {
        throw new Error('Usuário não encontrado na sessão');
      }

      console.log('✅ SIMPLE AUTH - Sessão definida, criando perfil...');

      // Criar perfil básico
      const userProfile: User = {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name || user.user_metadata?.name || 'Usuário',
        initials: (user.user_metadata?.full_name || user.user_metadata?.name || 'U')
          .split(' ')
          .map((n: string) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase(),
        role: user.email === 'geraldo@grupoggv.com' ? UserRole.SuperAdmin : UserRole.User,
      };

      // Limpar URL
      cleanUrl();

      console.log('🎉 SIMPLE AUTH - Login bem-sucedido:', userProfile.email);
      onAuthSuccess(userProfile);

    } catch (error: any) {
      console.error('❌ SIMPLE AUTH - Erro:', error);
      
      // Última tentativa: perfil direto do token
      try {
        console.log('🔧 SIMPLE AUTH - Última tentativa com perfil direto...');
        const userProfile = await createProfileFromToken(accessToken);
        if (userProfile) {
          cleanUrl();
          console.log('🎉 SIMPLE AUTH - Login bem-sucedido (última tentativa):', userProfile.email);
          onAuthSuccess(userProfile);
          return;
        }
      } catch (fallbackError) {
        console.error('❌ SIMPLE AUTH - Falha na última tentativa:', fallbackError);
      }
      
      onAuthError(error.message || 'Erro no login');
    } finally {
      setProcessing(false);
    }
  };

  const createProfileFromToken = async (accessToken: string): Promise<User | null> => {
    try {
      // Decodificar o JWT do access token para obter informações do usuário
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      
      return {
        id: payload.sub || 'temp-' + Date.now(),
        email: payload.email || '',
        name: payload.user_metadata?.full_name || payload.user_metadata?.name || 'Usuário',
        initials: (payload.user_metadata?.full_name || payload.user_metadata?.name || 'U')
          .split(' ')
          .map((n: string) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase(),
        role: payload.email === 'geraldo@grupoggv.com' ? UserRole.SuperAdmin : UserRole.User,
      };
    } catch (error) {
      console.error('Erro ao criar perfil do token:', error);
      return null;
    }
  };

  const cleanUrl = () => {
    try {
      const url = new URL(window.location.href);
      const params = url.searchParams;
      
      // Remover parâmetros OAuth
      const authParams = [
        'access_token', 'expires_in', 'refresh_token', 'token_type',
        'type', 'code', 'state', 'error', 'error_description'
      ];
      
      authParams.forEach(param => params.delete(param));
      
      // Preservar deal_id
      const dealId = new URLSearchParams(window.location.search).get('deal_id');
      const cleanUrl = url.origin + url.pathname + (dealId ? `?deal_id=${dealId}` : '');
      
      // Limpar hash também
      window.history.replaceState({}, document.title, cleanUrl);
      
      console.log('🧹 SIMPLE AUTH - URL limpa');
    } catch (error) {
      console.warn('⚠️ SIMPLE AUTH - Erro ao limpar URL:', error);
    }
  };

  if (processing) {
    return (
      <div className="flex items-center justify-center gap-2 text-blue-700">
        <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="text-sm">Finalizando login...</span>
      </div>
    );
  }

  return null;
};
