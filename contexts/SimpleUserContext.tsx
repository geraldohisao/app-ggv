import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../services/supabaseClient';
import { RobustAuth } from '../components/auth/RobustAuth';

interface UserContextType {
    user: User | null;
    loading: boolean;
    login: () => Promise<void>;
    logout: () => void;
}

export const UserContext = createContext<UserContextType>({
    user: null,
    loading: true,
    login: async () => {},
    logout: () => {},
});

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [useRobustAuth, setUseRobustAuth] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        console.log('🔐 AUTH - Iniciando contexto simples...');
        
        if (!supabase) {
            console.log('🔐 AUTH - Supabase não configurado');
            setLoading(false);
            return;
        }

        // Verificar se há tokens OAuth na URL
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
        const hasOAuthTokens = urlParams.has('access_token') || hashParams.has('access_token') || 
                              urlParams.has('code') || urlParams.has('error');
        
        if (hasOAuthTokens) {
            console.log('🔄 AUTH - Detectado retorno do OAuth, usando autenticação robusta...');
            setUseRobustAuth(true);
            return;
        }

        // Timeout de segurança para evitar loading infinito
        const safetyTimeout = setTimeout(() => {
            console.log('⚠️ SIMPLE AUTH - Timeout de segurança ativado, parando loading...');
            setLoading(false);
        }, 30000); // 30 segundos

        // Verificação simples de sessão
        const checkSession = async () => {
            try {
                console.log('🔍 SIMPLE AUTH - Iniciando verificação de sessão...');
                
                // Primeiro verificar se há usuário de emergência
                const emergencyUser = localStorage.getItem('ggv-emergency-user');
                if (emergencyUser) {
                    try {
                        const user = JSON.parse(emergencyUser);
                        console.log('🚨 SIMPLE AUTH - Usuário de emergência encontrado:', user.email);
                        setUser(user);
                        setLoading(false);
                        clearTimeout(safetyTimeout);
                        return;
                    } catch (e) {
                        console.warn('⚠️ SIMPLE AUTH - Erro ao carregar usuário de emergência:', e);
                        localStorage.removeItem('ggv-emergency-user');
                    }
                }

                console.log('🔍 SIMPLE AUTH - Verificando sessão do Supabase...');
                
                // Usar timeout mais curto para evitar travamento
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout na verificação de sessão')), 5000)
                );
                
                const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
                
                if (error) {
                    console.error('❌ SIMPLE AUTH - Erro ao obter sessão:', error);
                    // Não falhar completamente, apenas continuar sem sessão
                    setUser(null);
                    setLoading(false);
                    clearTimeout(safetyTimeout);
                    return;
                }
                
                console.log('🔐 AUTH - Sessão:', session ? 'ENCONTRADA' : 'NÃO ENCONTRADA');
                
                if (session?.user) {
                    console.log('👤 SIMPLE AUTH - Processando dados do usuário...');
                    // Criar usuário simples sem consultar o banco (evita problemas RLS)
                    const email = session.user.email || '';
                    const forcedRole = (email === 'geraldo@grupoggv.com' || email === 'geraldo@ggvinteligencia.com.br')
                      ? UserRole.SuperAdmin
                      : UserRole.User;
                    const rawName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário';
                    const properName = rawName
                      .split(' ')
                      .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1))
                      .join(' ');
                    const simpleUser: User = {
                        id: session.user.id,
                        email,
                        name: properName,
                        initials: (properName || 'U').split(' ').map((n: string) => n[0]).slice(0,2).join('').toUpperCase(),
                        role: forcedRole,
                    };
                    console.log('✅ SIMPLE AUTH - Usuário criado:', simpleUser.email, 'Role:', simpleUser.role);
                    setUser(simpleUser);
                } else {
                    console.log('🔐 SIMPLE AUTH - Nenhuma sessão encontrada');
                    setUser(null);
                }
            } catch (error) {
                console.error('❌ AUTH - Erro na verificação:', error);
                // Em caso de erro, não bloquear completamente
                console.log('🔧 SIMPLE AUTH - Continuando sem sessão devido ao erro');
                setUser(null);
            } finally {
                console.log('🏁 SIMPLE AUTH - Finalizando verificação, parando loading...');
                setLoading(false);
                clearTimeout(safetyTimeout);
            }
        };

        checkSession();

        // Listener para mudanças de auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔐 AUTH - Mudança:', event);
            if (session?.user) {
                const email = session.user.email || '';
                const forcedRole = (email === 'geraldo@grupoggv.com' || email === 'geraldo@ggvinteligencia.com.br')
                  ? UserRole.SuperAdmin
                  : UserRole.User;
                const rawName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário';
                const properName = rawName
                  .split(' ')
                  .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1))
                  .join(' ');
                const simpleUser: User = {
                    id: session.user.id,
                    email,
                    name: properName,
                    initials: (properName || 'U').split(' ').map((n: string) => n[0]).slice(0,2).join('').toUpperCase(),
                    role: forcedRole,
                };
                console.log('🔐 SIMPLE AUTH - Usuário atualizado:', simpleUser.email, 'Role:', simpleUser.role);
                setUser(simpleUser);
            } else {
                console.log('🔐 SIMPLE AUTH - Usuário desconectado');
                setUser(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const login = async () => {
        if (!supabase) return;
        
        try {
            // Forçar uso do domínio correto em produção
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
            
            console.log('🔐 SIMPLE LOGIN - Domínio detectado:', {
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
                        scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send'
                    }
                }
            });
            
            if (error) {
                console.error('Erro no login:', error);
            }
        } catch (error) {
            console.error('Erro no login:', error);
        }
    };

    const logout = () => {
        // Limpar usuário de emergência se existir
        localStorage.removeItem('ggv-emergency-user');
        
        if (!supabase) return;
        
        supabase.auth.signOut().then(() => {
            setUser(null);
            window.location.reload();
        });
    };



    const handleRobustAuthSuccess = (authenticatedUser: User) => {
        console.log('✅ ROBUST AUTH SUCCESS - Usuário autenticado:', authenticatedUser.email);
        setUser(authenticatedUser);
        setLoading(false);
        setUseRobustAuth(false);
        setAuthError(null);
    };

    const handleRobustAuthError = (error: string) => {
        console.error('❌ ROBUST AUTH ERROR:', error);
        setAuthError(error);
        setLoading(false);
        setUseRobustAuth(false);
    };

    // Se deve usar autenticação robusta, renderizar o componente de auth
    if (useRobustAuth) {
        return (
            <UserContext.Provider value={{
                user,
                loading,
                login,
                logout
            }}>
                <div className="flex items-center justify-center min-h-screen bg-slate-100">
                    <div className="bg-white p-8 rounded-2xl shadow-lg">
                        <RobustAuth 
                            onAuthSuccess={handleRobustAuthSuccess}
                            onAuthError={handleRobustAuthError}
                        />
                        {authError && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                                {authError}
                            </div>
                        )}
                    </div>
                </div>
            </UserContext.Provider>
        );
    }

    return (
        <UserContext.Provider value={{
            user,
            loading,
            login,
            logout
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
