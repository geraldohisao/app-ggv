import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { User, UserRole } from '../../types';

interface RobustAuthProps {
  onAuthSuccess: (user: User) => void;
  onAuthError: (error: string) => void;
}

export const RobustAuth: React.FC<RobustAuthProps> = ({ onAuthSuccess, onAuthError }) => {
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState('initializing');

  useEffect(() => {
    if (processing) return;
    
    console.log('🚀 ROBUST AUTH - Iniciando sistema robusto...');
    setProcessing(true);
    setStep('checking-url');
    
    handleAuth();
  }, []);

  const handleAuth = async () => {
    try {
      // Passo 1: Verificar se há tokens na URL
      setStep('parsing-tokens');
      const tokens = parseTokensFromUrl();
      
      if (!tokens.accessToken) {
        throw new Error('Nenhum token de acesso encontrado na URL');
      }

      console.log('✅ ROBUST AUTH - Tokens encontrados, processando...');
      setStep('creating-session');

      // Passo 2: Criar sessão no Supabase
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken || ''
          });

          if (error) {
            console.warn('⚠️ ROBUST AUTH - Erro na sessão Supabase, criando perfil direto:', error);
            // Fallback: criar perfil direto dos tokens
            const user = await createUserFromToken(tokens.accessToken);
            if (user) {
              cleanUrl();
              onAuthSuccess(user);
              return;
            }
            throw error;
          }

          if (data.user) {
            console.log('✅ ROBUST AUTH - Sessão criada com sucesso');
            setStep('creating-profile');
            
            const user = createUserProfile(data.user);
            cleanUrl();
            onAuthSuccess(user);
            return;
          }
        } catch (sessionError) {
          console.warn('⚠️ ROBUST AUTH - Falha na sessão, tentando perfil direto:', sessionError);
        }
      }

      // Passo 3: Fallback - criar perfil direto dos tokens
      setStep('fallback-profile');
      const user = await createUserFromToken(tokens.accessToken);
      if (user) {
        cleanUrl();
        onAuthSuccess(user);
        return;
      }

      throw new Error('Falha em todos os métodos de autenticação');

    } catch (error: any) {
      console.error('❌ ROBUST AUTH - Erro:', error);
      setStep('error');
      onAuthError(error.message || 'Erro na autenticação');
    }
  };

  const parseTokensFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
    
    return {
      accessToken: urlParams.get('access_token') || hashParams.get('access_token'),
      refreshToken: urlParams.get('refresh_token') || hashParams.get('refresh_token'),
      expiresIn: urlParams.get('expires_in') || hashParams.get('expires_in'),
      tokenType: urlParams.get('token_type') || hashParams.get('token_type')
    };
  };

  const createUserFromToken = async (accessToken: string): Promise<User | null> => {
    try {
      // Decodificar JWT
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      
      const email = payload.email || '';
      const name = payload.user_metadata?.full_name || 
                   payload.user_metadata?.name || 
                   email.split('@')[0] || 
                   'Usuário';

      return {
        id: payload.sub || `temp-${Date.now()}`,
        email,
        name: formatName(name),
        initials: getInitials(name),
        role: isAdminEmail(email) ? UserRole.SuperAdmin : UserRole.User
      };
    } catch (error) {
      console.error('❌ ROBUST AUTH - Erro ao criar usuário do token:', error);
      return null;
    }
  };

  const createUserProfile = (supabaseUser: any): User => {
    const email = supabaseUser.email || '';
    const name = supabaseUser.user_metadata?.full_name || 
                 supabaseUser.user_metadata?.name || 
                 email.split('@')[0] || 
                 'Usuário';

    return {
      id: supabaseUser.id,
      email,
      name: formatName(name),
      initials: getInitials(name),
      role: isAdminEmail(email) ? UserRole.SuperAdmin : UserRole.User
    };
  };

  const formatName = (name: string): string => {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const isAdminEmail = (email: string): boolean => {
    return email === 'geraldo@grupoggv.com' || email === 'geraldo@ggvinteligencia.com.br';
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
      
      // Preservar deal_id se existir
      const dealId = new URLSearchParams(window.location.search).get('deal_id');
      const cleanUrl = url.origin + url.pathname + (dealId ? `?deal_id=${dealId}` : '');
      
      // Limpar hash também
      window.history.replaceState({}, document.title, cleanUrl);
      
      console.log('🧹 ROBUST AUTH - URL limpa');
    } catch (error) {
      console.warn('⚠️ ROBUST AUTH - Erro ao limpar URL:', error);
    }
  };

  const getStepMessage = () => {
    switch (step) {
      case 'initializing': return 'Iniciando autenticação...';
      case 'checking-url': return 'Verificando parâmetros...';
      case 'parsing-tokens': return 'Processando tokens...';
      case 'creating-session': return 'Criando sessão...';
      case 'creating-profile': return 'Carregando perfil...';
      case 'fallback-profile': return 'Finalizando login...';
      case 'error': return 'Erro na autenticação';
      default: return 'Processando...';
    }
  };

  if (processing) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-4">
        <div className="flex items-center gap-2 text-blue-700">
          <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-sm font-medium">{getStepMessage()}</span>
        </div>
        
        <div className="text-xs text-blue-600 text-center max-w-sm">
          {step === 'error' ? (
            <div className="text-red-600">
              Falha na autenticação. Tente novamente ou use o login de emergência.
            </div>
          ) : (
            'Processando seu login com segurança...'
          )}
        </div>

        {step === 'error' && (
          <div className="mt-3 flex flex-col gap-2">
            <button
              onClick={() => {
                console.log('🚨 ROBUST AUTH - Limpando e recarregando...');
                localStorage.clear();
                const dealId = new URLSearchParams(window.location.search).get('deal_id');
                window.location.href = window.location.origin + window.location.pathname + 
                    (dealId ? `?deal_id=${dealId}` : '');
              }}
              className="text-xs text-red-600 hover:text-red-800 underline"
            >
              Limpar e tentar novamente
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
};
