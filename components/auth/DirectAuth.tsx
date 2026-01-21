import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { User, UserRole } from '../../types';
import { GoogleIcon } from '../ui/icons';

interface DirectAuthProps {
  onAuthSuccess: (user: User) => void;
  onAuthError: (error: string) => void;
}

export const DirectAuth: React.FC<DirectAuthProps> = ({ onAuthSuccess, onAuthError }) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (!supabase) {
      onAuthError('Supabase não configurado');
      return;
    }

    setLoading(true);
    console.log('🚀 DIRECT AUTH - Iniciando login direto com Google...');

    try {
      // Forçar uso do domínio correto com path completo
      const isProduction = window.location.hostname === 'app.grupoggv.com';
      const redirectOrigin = isProduction ? 'https://app.grupoggv.com' : window.location.origin;
      
      // Construir URL de callback completa
      const currentPath = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const dealId = searchParams.get('deal_id');
      
      let redirectUrl = redirectOrigin;
      if (currentPath && currentPath !== '/') {
        redirectUrl += currentPath;
      }
      if (dealId) {
        redirectUrl += `?deal_id=${dealId}`;
      }
      
      console.log('🌐 DIRECT AUTH - Configuração de redirect:', {
        hostname: window.location.hostname,
        isProduction,
        redirectOrigin,
        redirectUrl,
        currentPath,
        dealId
      });

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            scope: 'openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.compose'
          }
        }
      });

      if (error) {
        console.error('❌ DIRECT AUTH - Erro no OAuth:', error);
        onAuthError(`Erro no login: ${error.message}`);
      } else {
        console.log('✅ DIRECT AUTH - Redirecionamento iniciado');
        // O redirecionamento vai acontecer automaticamente
      }
    } catch (error: any) {
      console.error('❌ DIRECT AUTH - Erro geral:', error);
      onAuthError(`Erro no login: ${error.message || 'Tente novamente'}`);
    } finally {
      setLoading(false);
    }
  };

  // Verificar se estamos processando o retorno do OAuth
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
    
    const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
    const error = urlParams.get('error') || hashParams.get('error');
    
    if (error) {
      console.error('❌ DIRECT AUTH - Erro OAuth na URL:', error);
      onAuthError(`Erro de autenticação: ${error}`);
      return;
    }
    
    if (accessToken) {
      console.log('🎯 DIRECT AUTH - Token encontrado, processando...');
      processOAuthReturn(accessToken);
    }
  }, []);

  const processOAuthReturn = async (accessToken: string) => {
    try {
      console.log('🔐 DIRECT AUTH - Processando retorno OAuth...');
      
      // Verificar se temos uma sessão válida no Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('✅ DIRECT AUTH - Sessão Supabase encontrada');
        
        const email = session.user.email || '';
        const name = session.user.user_metadata?.full_name || 
                     session.user.user_metadata?.name || 
                     email.split('@')[0] || 
                     'Usuário';
        
        // Foto do Google OAuth
        const avatarUrl = session.user.user_metadata?.avatar_url || 
                         session.user.user_metadata?.picture || 
                         undefined;

        const user: User = {
          id: session.user.id,
          email,
          name: formatName(name),
          initials: getInitials(name),
          role: isAdminEmail(email) ? UserRole.SuperAdmin : UserRole.User,
          avatar_url: avatarUrl
        };

        console.log('✅ DIRECT AUTH - Usuário criado com sessão Supabase:', { ...user, avatar_url: !!avatarUrl });
        
        // Limpar URL
        cleanUrl();
        
        onAuthSuccess(user);
        return;
      }
      
      // Fallback: decodificar JWT se não tiver sessão Supabase
      console.log('⚠️ DIRECT AUTH - Sem sessão Supabase, usando fallback JWT');
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      
      const email = payload.email || '';
      const name = payload.user_metadata?.full_name || 
                   payload.user_metadata?.name || 
                   email.split('@')[0] || 
                   'Usuário';
      
      // Foto do Google OAuth (fallback)
      const avatarUrl = payload.user_metadata?.avatar_url || 
                       payload.user_metadata?.picture || 
                       undefined;

      const user: User = {
        id: payload.sub || `google-${Date.now()}`,
        email,
        name: formatName(name),
        initials: getInitials(name),
        role: isAdminEmail(email) ? UserRole.SuperAdmin : UserRole.User,
        avatar_url: avatarUrl
      };

      console.log('✅ DIRECT AUTH - Usuário criado (fallback):', { ...user, avatar_url: !!avatarUrl });
      
      // Limpar URL
      cleanUrl();
      
      onAuthSuccess(user);
      
    } catch (error: any) {
      console.error('❌ DIRECT AUTH - Erro ao processar token:', error);
      onAuthError('Erro ao processar autenticação');
    }
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
      
      console.log('🧹 DIRECT AUTH - URL limpa');
    } catch (error) {
      console.warn('⚠️ DIRECT AUTH - Erro ao limpar URL:', error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
      <div className="w-full max-w-sm mx-auto">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center border border-slate-100">
          {/* Logo fixo do Grupo GGV */}
          <div className="mb-5 flex items-center justify-center">
            <img
              src="https://ggvinteligencia.com.br/wp-content/uploads/2025/08/Logo-Grupo-GGV-Preto-Vertical-1.png"
              alt="Grupo GGV"
              className="h-10 w-auto object-contain"
              loading="eager"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>

          {/* Título / Subtítulo */}
          <h1 className="text-3xl font-extrabold text-slate-900">Bem-vindo(a)</h1>
          <p className="text-slate-500 mt-2">Acesse sua conta GGV</p>

          {/* Botão Google */}
          <div className="flex justify-center mt-6">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full max-w-xs inline-flex items-center justify-center px-5 py-3 rounded-full shadow-sm bg-white border border-slate-300 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                  Redirecionando...
                </>
              ) : (
                <>
                  <GoogleIcon className="w-5 h-5 mr-3" />
                  Continuar com o Google
                </>
              )}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">Use sua conta corporativa para entrar.</p>
        </div>

        {/* Rodapé */}
        <div className="mt-8 text-center text-xs text-slate-500">© 2025 Grupo GGV | Inteligência em Vendas</div>
      </div>
    </div>
  );
};
