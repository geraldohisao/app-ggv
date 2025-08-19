import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../services/supabaseClient';

interface UserContextType {
    user: User | null;
    loading: boolean;
    login: () => Promise<void>;
    logout: () => void;
    loginAsTestUser: () => void;
}

export const UserContext = createContext<UserContextType>({
    user: null,
    loading: true,
    login: async () => {},
    logout: () => {},
    loginAsTestUser: () => {},
});

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Função para criar usuário a partir da sessão
    const createUserFromSession = (session: any): User => {
        const email = session.user.email || '';
        const forcedRole = (email === 'geraldo@grupoggv.com' || email === 'geraldo@ggvinteligencia.com.br')
            ? UserRole.SuperAdmin
            : UserRole.User;
        const rawName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário';
        const properName = rawName
            .split(' ')
            .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1))
            .join(' ');
        
        return {
            id: session.user.id,
            email,
            name: properName,
            initials: (properName || 'U').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase(),
            role: forcedRole,
        };
    };

    useEffect(() => {
        console.log('🔐 GOOGLE AUTH - Iniciando...');
        
        if (!supabase) {
            console.log('🔐 GOOGLE AUTH - Supabase não configurado');
            setLoading(false);
            return;
        }

        // Verificação inicial de sessão
        const checkSession = async () => {
            try {
                console.log('🔍 GOOGLE AUTH - Verificando sessão existente...');
                
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('❌ GOOGLE AUTH - Erro ao obter sessão:', error);
                    setUser(null);
                    setLoading(false);
                    return;
                }

                if (session?.user) {
                    const user = createUserFromSession(session);
                    console.log('✅ GOOGLE AUTH - Usuário encontrado:', user.email, 'Role:', user.role);
                    setUser(user);
                } else {
                    console.log('🔐 GOOGLE AUTH - Nenhuma sessão encontrada');
                    setUser(null);
                }
                
                setLoading(false);
            } catch (error) {
                console.error('❌ GOOGLE AUTH - Erro na verificação:', error);
                setUser(null);
                setLoading(false);
            }
        };

        checkSession();

        // Listener para mudanças de autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔄 GOOGLE AUTH - Evento:', event);
            
            if (event === 'SIGNED_IN' && session?.user) {
                const user = createUserFromSession(session);
                console.log('✅ GOOGLE AUTH - Login realizado:', user.email);
                setUser(user);
            } else if (event === 'SIGNED_OUT') {
                console.log('🔐 GOOGLE AUTH - Logout realizado');
                setUser(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const login = async () => {
        if (!supabase) {
            throw new Error('Supabase não configurado');
        }
        
        try {
            console.log('🔐 GOOGLE AUTH - Iniciando login com Google...');
            
            // Determinar URL de redirect correta
            const isProduction = window.location.hostname === 'app.grupoggv.com';
            const redirectUrl = isProduction ? 'https://app.grupoggv.com' : window.location.origin;
            
            console.log('🔐 GOOGLE AUTH - Redirect URL:', redirectUrl);

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    scopes: 'openid email profile',
                    queryParams: {
                        prompt: 'select_account'
                    }
                }
            });

            if (error) {
                console.error('❌ GOOGLE AUTH - Erro no OAuth:', error);
                throw new Error(`Erro no login: ${error.message}`);
            }

            console.log('🔄 GOOGLE AUTH - Redirecionando para Google...');
        } catch (error) {
            console.error('❌ GOOGLE AUTH - Erro no login:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            console.log('🔐 GOOGLE AUTH - Fazendo logout...');
            
            if (supabase) {
                await supabase.auth.signOut();
            }
            setUser(null);
            console.log('✅ GOOGLE AUTH - Logout realizado');
        } catch (error) {
            console.error('❌ GOOGLE AUTH - Erro no logout:', error);
            setUser(null);
        }
    };

    // Manter função vazia para compatibilidade, mas não usar
    const loginAsTestUser = () => {
        console.log('⚠️ GOOGLE AUTH - Login de teste desabilitado');
    };

    return (
        <UserContext.Provider value={{
            user,
            loading,
            login,
            logout,
            loginAsTestUser
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser deve ser usado dentro de UserProvider');
    }
    return context;
};
